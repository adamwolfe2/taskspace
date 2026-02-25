/**
 * Public Workspace Join API
 *
 * GET  /api/join/[token]  - Return workspace branding info for join page (public, no auth)
 * POST /api/join/[token]  - Join workspace: create account OR sign in, add to org + workspace
 *
 * Rate limits:
 *   GET:  30 requests / 15 min per IP
 *   POST: 10 requests / 15 min per IP
 */

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { addWorkspaceMember } from "@/lib/db/workspaces"
import {
  hashPassword,
  verifyPassword,
  generateId,
  generateToken,
  getExpirationDate,
} from "@/lib/auth/password"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { joinWorkspaceSchema } from "@/lib/validation/schemas"
import { checkIpRateLimit, ipRateLimitHeaders } from "@/lib/auth/ip-rate-limit"
import { withTransaction } from "@/lib/db/transactions"
import { logger, logError } from "@/lib/logger"
import { isEmailConfigured, sendWelcomeEmail } from "@/lib/integrations/email"
import type { ApiResponse, AuthResponse, OrganizationMember } from "@/lib/types"

interface JoinPageInfo {
  workspaceName: string
  workspaceType: string
  organizationName: string
  logoUrl: string | null
  primaryColor: string | null
}

/**
 * GET /api/join/[token]
 * Returns branded workspace info for the public join page.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    // Rate limit: 30 lookups / 15 min per IP
    const rl = checkIpRateLimit(request, { endpoint: "join-lookup", maxRequests: 30 })
    if (!rl.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: ipRateLimitHeaders(rl) }
      )
    }

    const { token } = await context.params
    if (!token) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Token is required" },
        { status: 400 }
      )
    }

    const link = await db.workspaceInviteLinks.getByToken(token)
    if (!link) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "This invite link is no longer valid." },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<JoinPageInfo>>({
      success: true,
      data: {
        workspaceName: link.workspaceName,
        workspaceType: link.workspaceType,
        organizationName: link.organizationName,
        logoUrl: link.logoUrl,
        primaryColor: link.primaryColor,
      },
    })
  } catch (error) {
    logError(logger, "Join page lookup error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to load invite information" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/join/[token]
 * Creates account OR signs in, adds user to org + workspace, returns session.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    // Rate limit: 10 join attempts / 15 min per IP
    const rl = checkIpRateLimit(request, { endpoint: "join-submit", maxRequests: 10 })
    if (!rl.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Too many attempts. Please try again later." },
        { status: 429, headers: ipRateLimitHeaders(rl) }
      )
    }

    const { token } = await context.params
    if (!token) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Token is required" },
        { status: 400 }
      )
    }

    const { name, email, password } = await validateBody(request, joinWorkspaceSchema)

    const result = await withTransaction(async (client) => {
      const now = new Date().toISOString()

      // Lock the invite link row for the duration of this transaction
      const { rows: linkRows } = await client.sql<{
        id: string
        workspace_id: string
        organization_id: string
        token: string
        created_by: string
        workspace_name: string
      }>`
        SELECT wil.*, w.name as workspace_name
        FROM workspace_invite_links wil
        JOIN workspaces w ON w.id = wil.workspace_id
        WHERE wil.token = ${token}
        FOR UPDATE OF wil
      `

      if (linkRows.length === 0) {
        throw new Error("INVALID_LINK")
      }

      const link = linkRows[0]
      const workspaceId = link.workspace_id
      const organizationId = link.organization_id
      const workspaceName = link.workspace_name

      // Find or create user
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
        is_super_admin: boolean
        totp_enabled: boolean
        totp_secret: string | null
      }>`SELECT * FROM users WHERE LOWER(email) = LOWER(${email})`

      let userId: string
      let userName: string
      let userEmail: string
      let isNewUser = false

      if (userRows.length > 0) {
        // Existing user — verify password before granting access
        if (!password) {
          throw new Error("NEEDS_PASSWORD")
        }
        const validPassword = await verifyPassword(password, userRows[0].password_hash)
        if (!validPassword) {
          throw new Error("WRONG_PASSWORD")
        }
        userId = userRows[0].id
        userName = userRows[0].name
        userEmail = userRows[0].email
      } else {
        // New user — name + password required
        if (!name || !password) {
          throw new Error("NEEDS_REGISTRATION")
        }
        userId = generateId()
        userName = name
        userEmail = email.toLowerCase()
        const passwordHash = await hashPassword(password)

        await client.sql`
          INSERT INTO users (id, email, password_hash, name, avatar, created_at, updated_at, email_verified, last_login_at)
          VALUES (${userId}, ${userEmail}, ${passwordHash}, ${userName}, ${null}, ${now}, ${now}, ${true}, ${now})
        `
        isNewUser = true
      }

      // Find or create org membership
      const { rows: existingMemberRows } = await client.sql<{
        id: string
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
      }>`
        SELECT * FROM organization_members
        WHERE organization_id = ${organizationId}
          AND user_id = ${userId}
      `

      let member: OrganizationMember

      if (existingMemberRows.length > 0) {
        const em = existingMemberRows[0]
        if (em.status !== "active") {
          // Inactive member — reactivate
          await client.sql`
            UPDATE organization_members
            SET status = 'active', name = ${userName}, updated_at = NOW()
            WHERE id = ${em.id}
          `
        }
        member = {
          id: em.id,
          organizationId,
          userId,
          email: userEmail,
          name: userName,
          role: em.role as "owner" | "admin" | "member",
          department: em.department,
          joinedAt: new Date(em.joined_at).toISOString(),
          invitedBy: em.invited_by || undefined,
          status: "active",
          weeklyMeasurable: em.weekly_measurable || undefined,
          timezone: em.timezone || undefined,
          eodReminderTime: em.eod_reminder_time || undefined,
          managerId: em.manager_id || undefined,
          jobTitle: em.job_title || undefined,
        }
      } else {
        // New member — insert fresh
        const memberId = generateId()
        await client.sql`
          INSERT INTO organization_members (id, organization_id, user_id, email, name, role, department, joined_at, status)
          VALUES (${memberId}, ${organizationId}, ${userId}, ${userEmail}, ${userName}, ${"member"}, ${""}, ${now}, ${"active"})
        `
        member = {
          id: memberId,
          organizationId,
          userId,
          email: userEmail,
          name: userName,
          role: "member",
          department: "",
          joinedAt: now,
          status: "active",
        }
      }

      // Upsert workspace membership
      const wsMemberId = generateId()
      await client.sql`
        INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
        VALUES (${wsMemberId}, ${workspaceId}, ${userId}, ${"member"}, ${now})
        ON CONFLICT (workspace_id, user_id) DO NOTHING
      `

      // Create session
      const sessionToken = generateToken()
      const sessionId = generateId()
      const sessionExpiresAt = getExpirationDate(24 * 7)

      await client.sql`
        INSERT INTO sessions (id, user_id, organization_id, token, expires_at, created_at, last_active_at)
        VALUES (${sessionId}, ${userId}, ${organizationId}, ${sessionToken}, ${sessionExpiresAt}, ${now}, ${now})
      `

      return {
        userId,
        userName,
        userEmail,
        isNewUser,
        member,
        sessionToken,
        sessionExpiresAt,
        organizationId,
        workspaceId,
        workspaceName,
      }
    })

    // Fetch full organization object (outside transaction — no write)
    const organization = await db.organizations.findById(result.organizationId)
    if (!organization) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
    }

    // Send welcome email to new users (non-blocking — don't fail join if email fails)
    if (result.isNewUser && isEmailConfigured()) {
      sendWelcomeEmail({
        to: result.userEmail,
        name: result.userName,
        organizationName: organization.name,
        workspaceName: result.workspaceName,
      }).catch((err) => {
        logError(logger, "Failed to send welcome email after join", err)
      })
    }

    const safeUser = {
      id: result.userId,
      email: result.userEmail,
      name: result.userName,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const response = NextResponse.json<ApiResponse<AuthResponse>>({
      success: true,
      data: {
        user: safeUser,
        organization,
        member: result.member,
        token: result.sessionToken,
        expiresAt: result.sessionExpiresAt,
      },
      message: result.isNewUser
        ? "Account created and joined workspace successfully"
        : "Joined workspace successfully",
    })

    response.cookies.set("session_token", result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(result.sessionExpiresAt),
      path: "/",
    })

    return response
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    if (error instanceof Error) {
      if (error.message === "INVALID_LINK") {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "This invite link is no longer valid." },
          { status: 404 }
        )
      }
      if (error.message === "NEEDS_REGISTRATION") {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Please provide your name and password to create an account." },
          { status: 422 }
        )
      }
      if (error.message === "NEEDS_PASSWORD") {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Please enter your password to sign in." },
          { status: 422 }
        )
      }
      if (error.message === "WRONG_PASSWORD") {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Incorrect password. Please try again." },
          { status: 401 }
        )
      }
    }

    logError(logger, "Join workspace error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to join workspace" },
      { status: 500 }
    )
  }
}
