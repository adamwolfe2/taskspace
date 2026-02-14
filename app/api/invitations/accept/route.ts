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
import { addWorkspaceMember, getDefaultWorkspace } from "@/lib/db/workspaces"
import type { OrganizationMember, Session, ApiResponse, AuthResponse, User, Invitation } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { withTransaction } from "@/lib/db/transactions"

// POST /api/invitations/accept - Accept an invitation
export async function POST(request: NextRequest) {
  try {
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
      }>`SELECT * FROM invitations WHERE token = ${token} FOR UPDATE`

      if (invitationRows.length === 0) {
        throw new Error("Invitation not found")
      }

      const lockedInvitation = invitationRows[0]

      // Check status after acquiring lock (another request may have changed it)
      if (lockedInvitation.status !== "pending") {
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
          userByOrgEmail = await client.sql<{
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

    // Add user to workspace
    try {
      let targetWorkspaceId = result.workspaceId

      if (!targetWorkspaceId) {
        const defaultWorkspace = await getDefaultWorkspace(organization.id)
        targetWorkspaceId = defaultWorkspace?.id || null
      }

      if (targetWorkspaceId) {
        await addWorkspaceMember(targetWorkspaceId, result.user.id, "member")
        logger.info(`Added user ${result.user.id} to workspace ${targetWorkspaceId}`)
      }
    } catch (error) {
      logError(logger, "Failed to add user to workspace", error)
    }

    // Return response without password hash
    const { passwordHash: _, ...safeUser } = result.user

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
      if (error.message.startsWith("NEEDS_REGISTRATION:")) {
        // BUG FIX: Wrap JSON.parse in try-catch to prevent crashes from malformed data
        try {
          const data = JSON.parse(error.message.substring("NEEDS_REGISTRATION:".length))
          return NextResponse.json<ApiResponse<{ needsRegistration: true; email: string; organizationName: string }>>(
            {
              success: true,
              data: {
                needsRegistration: true,
                email: data.email,
                organizationName: data.organizationName,
              },
              message: "Please complete your registration",
            },
            { status: 200 }
          )
        } catch (parseError) {
          logError(logger, "Failed to parse NEEDS_REGISTRATION data", parseError)
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "Invalid invitation data format" },
            { status: 500 }
          )
        }
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
        { success: false, error: "This invitation has already been used" },
        { status: 400 }
      )
    }

    if (isTokenExpired(invitation.expiresAt)) {
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
    }>>({
      success: true,
      data: {
        email: invitation.email,
        organizationName: organization.name,
        role: invitation.role,
        department: invitation.department,
        existingUser: !!existingUser,
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
