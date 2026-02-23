import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  hashPassword,
  generateId,
  generateToken,
  getExpirationDate,
  isTokenExpired,
} from "@/lib/auth/password"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { acceptInvitationSchema } from "@/lib/validation/schemas"
import { addWorkspaceMember, getDefaultWorkspace, getWorkspacesByOrg } from "@/lib/db/workspaces"
import type { OrganizationMember, Session, ApiResponse, AuthResponse, User } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { withTransaction } from "@/lib/db/transactions"
import { checkIpRateLimit, ipRateLimitHeaders } from "@/lib/auth/ip-rate-limit"
import { sql } from "@/lib/db/sql"

// POST /api/invitations/accept - Accept an invitation
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 accept attempts per 15 min per IP
    const rl = checkIpRateLimit(request, { endpoint: "invitation-accept", maxRequests: 10 })
    if (!rl.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Too many attempts. Please try again later." },
        { status: 429, headers: ipRateLimitHeaders(rl) }
      )
    }
    // Validate request body
    const { token, name, password } = await validateBody(request, acceptInvitationSchema)

    // SECURITY FIX: No preflight checks - all validation inside transaction to prevent TOCTOU race
    // Execute the critical section in a transaction with row-level locking
    const result = await withTransaction(async (client) => {
      const now = new Date().toISOString()

      // CRITICAL: Lock the invitation row with FOR UPDATE to prevent concurrent processing
      const { rows: invitationRows } = await client.sql<{
        id: string
        organization_id: string
        email: string
        role: string
        department: string
        token: string
        expires_at: string
        created_at: string
        invited_by: string
        status: string
        workspace_id: string | null
        placeholder_user_id: string | null
      }>`SELECT * FROM invitations WHERE token = ${token} FOR UPDATE`

      if (invitationRows.length === 0) {
        throw new Error("Invitation not found")
      }

      const lockedInvitation = invitationRows[0]

      // Check status after acquiring lock (another request may have changed it)
      if (lockedInvitation.status !== "pending") {
        if (lockedInvitation.status === "accepted") {
          // Idempotency: the invite was already accepted (e.g. server succeeded but client
          // got a network error on the first attempt). If the user was created successfully
          // and is an active member, create a fresh session and return success.
          const { rows: recoveryUserRows } = await client.sql<{ id: string; email: string; name: string; avatar: string | null }>`
            SELECT id, email, name, avatar FROM users WHERE LOWER(email) = LOWER(${lockedInvitation.email})
          `
          if (recoveryUserRows.length > 0) {
            const recoveryUser = recoveryUserRows[0]
            const { rows: recoveryMemberRows } = await client.sql<{
              id: string; role: string; department: string; joined_at: string;
              invited_by: string | null; status: string; weekly_measurable: string | null;
              timezone: string | null; eod_reminder_time: string | null;
              manager_id: string | null; job_title: string | null;
            }>`
              SELECT * FROM organization_members
              WHERE organization_id = ${lockedInvitation.organization_id}
                AND user_id = ${recoveryUser.id}
                AND status = 'active'
            `
            if (recoveryMemberRows.length > 0) {
              const rm = recoveryMemberRows[0]
              const recoveryMember: OrganizationMember = {
                id: rm.id, organizationId: lockedInvitation.organization_id,
                userId: recoveryUser.id, email: lockedInvitation.email,
                name: recoveryUser.name,
                role: rm.role as "owner" | "admin" | "member",
                department: rm.department,
                joinedAt: new Date(rm.joined_at).toISOString(),
                invitedBy: rm.invited_by || undefined,
                status: "active",
                weeklyMeasurable: rm.weekly_measurable || undefined,
                timezone: rm.timezone || undefined,
                eodReminderTime: rm.eod_reminder_time || undefined,
                managerId: rm.manager_id || undefined,
                jobTitle: rm.job_title || undefined,
              }
              const sessionToken = generateToken()
              const sessionId = generateId()
              const sessionExpiresAt = getExpirationDate(24 * 7)
              const now = new Date().toISOString()
              await client.sql`
                INSERT INTO sessions (id, user_id, organization_id, token, expires_at, created_at, last_active_at)
                VALUES (${sessionId}, ${recoveryUser.id}, ${lockedInvitation.organization_id}, ${sessionToken}, ${sessionExpiresAt}, ${now}, ${now})
              `
              throw new Error("RECOVERY_SUCCESS:" + JSON.stringify({
                userId: recoveryUser.id,
                userEmail: recoveryUser.email,
                userName: recoveryUser.name,
                userAvatar: recoveryUser.avatar,
                member: recoveryMember,
                sessionToken,
                sessionExpiresAt,
                workspaceId: lockedInvitation.workspace_id,
                organizationId: lockedInvitation.organization_id,
              }))
            }
          }
        }
        throw new Error("This invitation has already been used or expired")
      }

      // Check expiration inside transaction
      if (isTokenExpired(lockedInvitation.expires_at)) {
        await client.sql`UPDATE invitations SET status = ${"expired"} WHERE id = ${lockedInvitation.id}`
        throw new Error("This invitation has expired")
      }

      // Get organization ID for later use (fetch full org outside transaction)
      const organizationId = lockedInvitation.organization_id

      // Check if user needs to complete registration (inside transaction)
      const { rows: regCheckRows } = await client.sql<{
        id: string
        email: string
      }>`SELECT id, email FROM users WHERE LOWER(email) = LOWER(${lockedInvitation.email})`

      if (regCheckRows.length === 0 && (!name || !password)) {
        // User needs to register - fetch org name for response
        const { rows: orgRows } = await client.sql<{ name: string }>`SELECT name FROM organizations WHERE id = ${organizationId}`
        const orgName = orgRows[0]?.name || "Unknown"

        // Throw error to signal this (will be caught and handled)
        throw new Error("NEEDS_REGISTRATION:" + JSON.stringify({
          email: lockedInvitation.email,
          organizationName: orgName,
        }))
      }

      // Check if user exists (by primary email OR org-specific email) or create new user
      let user: User
      let isNewUser = false

      // First check by primary email
      const { rows: userRows } = await client.sql<{
        id: string
        email: string
        password_hash: string
        name: string
        avatar: string | null
        created_at: string
        updated_at: string
        email_verified: boolean
        last_login_at: string | null
      }>`SELECT * FROM users WHERE LOWER(email) = LOWER(${lockedInvitation.email})`

      // If not found by primary email, check org-specific emails
      let userByOrgEmail: typeof userRows | null = null
      if (userRows.length === 0) {
        const { rows: orgEmailRows } = await client.sql<{ user_id: string }>`
          SELECT user_id
          FROM organization_members
          WHERE LOWER(email) = LOWER(${lockedInvitation.email})
            AND user_id IS NOT NULL
          LIMIT 1
        `

        if (orgEmailRows.length > 0) {
          const { rows: userByOrgEmailRows } = await client.sql<{
            id: string
            email: string
            password_hash: string
            name: string
            avatar: string | null
            created_at: string
            updated_at: string
            email_verified: boolean
            last_login_at: string | null
          }>`SELECT * FROM users WHERE id = ${orgEmailRows[0].user_id}`
          userByOrgEmail = userByOrgEmailRows
        }
      }

      if (userRows.length > 0 || (userByOrgEmail && userByOrgEmail.length > 0)) {
        const row = (userRows.length > 0 ? userRows : userByOrgEmail!)[0]
        user = {
          id: row.id,
          email: row.email,
          passwordHash: row.password_hash,
          name: row.name,
          avatar: row.avatar || undefined,
          createdAt: new Date(row.created_at).toISOString(),
          updatedAt: new Date(row.updated_at).toISOString(),
          emailVerified: row.email_verified,
          lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : undefined,
        }
      } else {
        // Create new user within transaction
        const userId = generateId()
        const passwordHash = await hashPassword(password!)

        await client.sql`
          INSERT INTO users (id, email, password_hash, name, avatar, created_at, updated_at, email_verified, last_login_at)
          VALUES (${userId}, ${lockedInvitation.email.toLowerCase()}, ${passwordHash}, ${name}, ${null}, ${now}, ${now}, ${true}, ${now})
        `

        user = {
          id: userId,
          email: lockedInvitation.email.toLowerCase(),
          passwordHash,
          name: name!,
          createdAt: now,
          updatedAt: now,
          emailVerified: true,
          lastLoginAt: now,
        }
        isNewUser = true
      }

      // Check if already an active member
      const { rows: existingMemberRows } = await client.sql<{
        id: string
        organization_id: string
        user_id: string | null
        email: string
        name: string
        role: string
        department: string
        joined_at: string
        invited_by: string | null
        status: string
      }>`SELECT * FROM organization_members WHERE organization_id = ${lockedInvitation.organization_id} AND user_id = ${user.id}`

      if (existingMemberRows.length > 0 && existingMemberRows[0].status === "active") {
        // Mark invitation as accepted before throwing
        await client.sql`UPDATE invitations SET status = ${"accepted"} WHERE id = ${lockedInvitation.id}`
        throw new Error("You are already a member of this organization")
      }

      // Check for draft/invited member
      const { rows: draftMemberRows } = await client.sql<{
        id: string
        organization_id: string
        user_id: string | null
        email: string
        name: string
        role: string
        department: string
        joined_at: string
        invited_by: string | null
        status: string
        weekly_measurable: string | null
        timezone: string | null
        eod_reminder_time: string | null
        manager_id: string | null
        job_title: string | null
      }>`SELECT * FROM organization_members WHERE organization_id = ${lockedInvitation.organization_id} AND LOWER(email) = LOWER(${lockedInvitation.email})`

      let member: OrganizationMember

      if (draftMemberRows.length > 0) {
        const draftMember = draftMemberRows[0]

        // Update existing draft member
        await client.sql`
          UPDATE organization_members
          SET user_id = ${user.id}, name = ${user.name}, status = ${"active"}
          WHERE id = ${draftMember.id}
        `

        member = {
          id: draftMember.id,
          organizationId: draftMember.organization_id,
          userId: user.id,
          email: draftMember.email,
          name: user.name,
          role: draftMember.role as "owner" | "admin" | "member",
          department: draftMember.department,
          joinedAt: new Date(draftMember.joined_at).toISOString(),
          invitedBy: draftMember.invited_by || undefined,
          status: "active",
          weeklyMeasurable: draftMember.weekly_measurable || undefined,
          timezone: draftMember.timezone || undefined,
          eodReminderTime: draftMember.eod_reminder_time || undefined,
          managerId: draftMember.manager_id || undefined,
          jobTitle: draftMember.job_title || undefined,
        }
      } else {
        // Create new membership
        const memberId = generateId()

        await client.sql`
          INSERT INTO organization_members (id, organization_id, user_id, email, name, role, department, weekly_measurable, joined_at, invited_by, status)
          VALUES (${memberId}, ${lockedInvitation.organization_id}, ${user.id}, ${lockedInvitation.email}, ${user.name},
                  ${lockedInvitation.role}, ${lockedInvitation.department}, ${null}, ${now}, ${lockedInvitation.invited_by}, ${"active"})
        `

        member = {
          id: memberId,
          organizationId: lockedInvitation.organization_id,
          userId: user.id,
          email: user.email,
          name: user.name,
          role: lockedInvitation.role as "owner" | "admin" | "member",
          department: lockedInvitation.department,
          joinedAt: now,
          invitedBy: lockedInvitation.invited_by,
          status: "active",
        }
      }

      // Mark invitation as accepted (within transaction)
      await client.sql`UPDATE invitations SET status = ${"accepted"} WHERE id = ${lockedInvitation.id}`

      // Create session within transaction
      const sessionToken = generateToken()
      const sessionId = generateId()
      const sessionExpiresAt = getExpirationDate(24 * 7)

      await client.sql`
        INSERT INTO sessions (id, user_id, organization_id, token, expires_at, created_at, last_active_at)
        VALUES (${sessionId}, ${user.id}, ${lockedInvitation.organization_id}, ${sessionToken}, ${sessionExpiresAt}, ${now}, ${now})
      `

      const session: Session = {
        id: sessionId,
        userId: user.id,
        organizationId: lockedInvitation.organization_id,
        token: sessionToken,
        expiresAt: sessionExpiresAt,
        createdAt: now,
        lastActiveAt: now,
      }

      return {
        user,
        member,
        session,
        isNewUser,
        invitationEmail: lockedInvitation.email,
        workspaceId: lockedInvitation.workspace_id,
        organizationId,
        placeholderUserId: lockedInvitation.placeholder_user_id || null,
      }
    })

    // Fetch organization outside transaction (complex object with settings)
    const organization = await db.organizations.findById(result.organizationId)
    if (!organization) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
    }


    // Post-transaction operations (non-critical, can fail without rolling back)
    try {
      await db.transferPendingItems(result.invitationEmail, result.user.id)
      logger.info(`Transferred pending items for ${result.invitationEmail} to user ${result.user.id}`)
    } catch (error) {
      logError(logger, "Failed to transfer pending items", error)
    }

    // Transfer tasks/rocks from placeholder user (when migrating from placeholder email)
    if (result.placeholderUserId && result.placeholderUserId !== result.user.id) {
      try {
        // Transfer assigned tasks from placeholder user to real user
        const { rowCount: tasksTransferred } = await sql`
          UPDATE assigned_tasks
          SET assignee_id = ${result.user.id},
              assignee_name = ${result.user.name},
              updated_at = NOW()
          WHERE assignee_id = ${result.placeholderUserId}
            AND organization_id = ${result.organizationId}
        `

        // Transfer rocks owned by placeholder user to real user
        const { rowCount: rocksTransferred } = await sql`
          UPDATE rocks
          SET user_id = ${result.user.id},
              updated_at = NOW()
          WHERE user_id = ${result.placeholderUserId}
            AND organization_id = ${result.organizationId}
        `

        // Transfer EOD reports from placeholder user
        await sql`
          UPDATE eod_reports
          SET user_id = ${result.user.id}
          WHERE user_id = ${result.placeholderUserId}
            AND organization_id = ${result.organizationId}
        `

        logger.info({
          placeholderUserId: result.placeholderUserId,
          newUserId: result.user.id,
          tasksTransferred: tasksTransferred ?? 0,
          rocksTransferred: rocksTransferred ?? 0,
        }, "Transferred items from placeholder user to real user")
      } catch (error) {
        logError(logger, "Failed to transfer placeholder user items", error)
      }
    }

    // Add user to all workspaces in the org (org members get access to all workspaces)
    try {
      const orgWorkspaces = await getWorkspacesByOrg(organization.id)

      if (orgWorkspaces.length > 0) {
        await Promise.all(
          orgWorkspaces.map((ws) =>
            addWorkspaceMember(ws.id, result.user.id, "member").catch((err) =>
              logError(logger, `Failed to add user to workspace ${ws.id}`, err)
            )
          )
        )
        logger.info(`Added user ${result.user.id} to ${orgWorkspaces.length} workspace(s) in org ${organization.id}`)
      } else {
        logger.warn(`No workspaces found for org ${organization.id} — user ${result.user.id} has no workspace membership`)
      }
    } catch (error) {
      logError(logger, "Failed to add user to workspaces", error)
    }

    // Return response without password hash
    const { passwordHash: _passwordHash, totpSecret: _ts, ...safeUser } = result.user

    const response = NextResponse.json<ApiResponse<AuthResponse>>({
      success: true,
      data: {
        user: safeUser,
        organization,
        member: result.member,
        token: result.session.token,
        expiresAt: result.session.expiresAt,
      },
      message: result.isNewUser
        ? "Account created and joined organization successfully"
        : "Joined organization successfully",
    })

    // Set cookie
    response.cookies.set("session_token", result.session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(result.session.expiresAt),
      path: "/",
    })

    return response
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    // Handle business logic errors from transaction
    if (error instanceof Error) {
      if (error.message.startsWith("RECOVERY_SUCCESS:")) {
        try {
          const recoveryData = JSON.parse(error.message.substring("RECOVERY_SUCCESS:".length))
          const organization = await db.organizations.findById(recoveryData.organizationId)
          if (!organization) {
            return NextResponse.json<ApiResponse<null>>(
              { success: false, error: "Organization not found" },
              { status: 404 }
            )
          }
          const safeUser = {
            id: recoveryData.userId,
            email: recoveryData.userEmail,
            name: recoveryData.userName,
            avatar: recoveryData.userAvatar,
            emailVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          const response = NextResponse.json<ApiResponse<AuthResponse>>({
            success: true,
            data: {
              user: safeUser,
              organization,
              member: recoveryData.member,
              token: recoveryData.sessionToken,
              expiresAt: recoveryData.sessionExpiresAt,
            },
            message: "Joined organization successfully",
          })
          response.cookies.set("session_token", recoveryData.sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            expires: new Date(recoveryData.sessionExpiresAt),
            path: "/",
          })
          return response
        } catch (parseError) {
          logError(logger, "Failed to parse RECOVERY_SUCCESS data", parseError)
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "Failed to recover session. Please try logging in." },
            { status: 500 }
          )
        }
      }
      if (error.message.startsWith("NEEDS_REGISTRATION:")) {
        // This path is reached if a new user hits POST without providing name/password.
        // The frontend prevents this by showing name/password fields for new users, so this
        // is a safety net for direct API calls. Return a clear error (not success: true,
        // which would crash the client trying to access data.user).
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Please provide your name and password to complete registration" },
          { status: 422 }
        )
      }
      if (error.message.includes("already been used or expired")) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes("already a member")) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: error.message },
          { status: 409 }
        )
      }
      if (error.message.includes("not found")) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: error.message },
          { status: 404 }
        )
      }
    }

    logError(logger, "Accept invitation error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to accept invitation" },
      { status: 500 }
    )
  }
}

// GET /api/invitations/accept - Get invitation details
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 20 token lookups per 15 min per IP
    const rl = checkIpRateLimit(request, { endpoint: "invitation-lookup", maxRequests: 20 })
    if (!rl.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Too many attempts. Please try again later." },
        { status: 429, headers: ipRateLimitHeaders(rl) }
      )
    }

    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invitation token is required" },
        { status: 400 }
      )
    }

    const invitation = await db.invitations.findByToken(token)
    if (!invitation) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid invitation" },
        { status: 404 }
      )
    }

    if (invitation.status !== "pending") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "This invitation has already been accepted. Please log in to access your account." },
        { status: 400 }
      )
    }

    if (isTokenExpired(invitation.expiresAt)) {
      // Mark as expired in DB so it's cleaned up
      await db.invitations.update(invitation.id, { status: "expired" }).catch((error) => {
        logError(logger, "Failed to expire invitation", error)
      })
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "This invitation has expired" },
        { status: 400 }
      )
    }

    const organization = await db.organizations.findById(invitation.organizationId)
    if (!organization) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
    }

    // Check if user already exists
    const existingUser = await db.users.findByEmail(invitation.email)

    return NextResponse.json<ApiResponse<{
      email: string
      organizationName: string
      role: string
      department: string
      existingUser: boolean
      logoUrl?: string
    }>>({
      success: true,
      data: {
        email: invitation.email,
        organizationName: organization.name,
        role: invitation.role,
        department: invitation.department,
        existingUser: !!existingUser,
        logoUrl: organization.logoUrl,
      },
    })
  } catch (error) {
    logError(logger, "Get invitation error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get invitation details" },
      { status: 500 }
    )
  }
}
