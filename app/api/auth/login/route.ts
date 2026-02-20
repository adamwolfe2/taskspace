import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  verifyPassword,
  generateId,
  generateToken,
  getExpirationDate,
} from "@/lib/auth/password"
import {
  checkLoginRateLimit,
  resetLoginRateLimit,
  getRateLimitHeaders,
} from "@/lib/auth/rate-limit"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { loginSchema } from "@/lib/validation/schemas"
import { logger, logAuthEvent, formatError } from "@/lib/logger"
import type { Session, ApiResponse, AuthResponse } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = checkLoginRateLimit(request)
    if (!rateLimitResult.success) {
      const response = NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "Too many login attempts. Please wait a few minutes and try again.",
        },
        { status: 429 }
      )
      // Add rate limit headers
      const headers = getRateLimitHeaders(rateLimitResult, 5)
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value)
      }
      return response
    }

    // Validate request body
    const { email, password, organizationId } = await validateBody(request, loginSchema)

    // Find user by primary email OR org-specific email
    let user = await db.users.findByEmail(email)

    // If not found by primary email, check organization_members for org-specific emails
    if (!user) {
      const { sql } = await import("@/lib/db/sql")
      const { rows } = await sql`
        SELECT user_id
        FROM organization_members
        WHERE LOWER(email) = LOWER(${email})
          AND user_id IS NOT NULL
        LIMIT 1
      `

      if (rows.length > 0) {
        const userId = rows[0].user_id as string
        user = await db.users.findById(userId)
      }
    }

    if (!user) {
      // Check if this email has a pending/invited draft member (no user account yet)
      try {
        const { sql: sqlModule } = await import("@/lib/db/sql")
        const { rows: draftRows } = await sqlModule`
          SELECT om.status, o.name as org_name
          FROM organization_members om
          JOIN organizations o ON o.id = om.organization_id
          WHERE LOWER(om.email) = LOWER(${email})
            AND om.user_id IS NULL
          LIMIT 1
        `

        if (draftRows.length > 0) {
          const orgName = draftRows[0].org_name
          return NextResponse.json<ApiResponse<null>>(
            {
              success: false,
              error: `Your account hasn't been set up yet. Please check your email for an invitation from ${orgName}, or ask your admin to resend the invitation link.`,
            },
            { status: 401 }
          )
        }
      } catch {
        // Non-critical — fall through to generic error
      }

      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // SECURITY: Check account lockout status
    const ACCOUNT_LOCKOUT_DURATION_MS = 30 * 60 * 1000 // 30 minutes
    const MAX_FAILED_ATTEMPTS = 5

    if (user.lockedAt) {
      const lockDuration = Date.now() - new Date(user.lockedAt).getTime()

      // Auto-unlock after 30 minutes
      if (lockDuration >= ACCOUNT_LOCKOUT_DURATION_MS) {
        await db.users.update(user.id, {
          lockedAt: null,
          lockReason: null,
          failedLoginAttempts: 0,
        })
      } else {
        // Account is still locked
        const remainingMinutes = Math.ceil((ACCOUNT_LOCKOUT_DURATION_MS - lockDuration) / 60000)
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: `Account locked due to too many failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"} or contact support.`,
          },
          { status: 423 } // 423 Locked
        )
      }
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      // Increment failed login attempts
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1

      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        // Lock the account
        await db.users.update(user.id, {
          failedLoginAttempts: newFailedAttempts,
          lockedAt: new Date().toISOString(),
          lockReason: "Too many failed login attempts",
        })

        logger.warn({ userId: user.id, email: user.email }, "Account locked due to failed login attempts")

        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: "Account locked due to too many failed login attempts. Please wait 30 minutes or contact support.",
          },
          { status: 423 } // 423 Locked
        )
      } else {
        // Update failed attempts counter
        await db.users.update(user.id, {
          failedLoginAttempts: newFailedAttempts,
        })
      }

      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // SECURITY: Reset failed login attempts on successful login
    if (user.failedLoginAttempts && user.failedLoginAttempts > 0) {
      await db.users.update(user.id, {
        failedLoginAttempts: 0,
        lockedAt: null,
        lockReason: null,
      })
    }

    // SECURITY: If 2FA is enabled, return pending status instead of creating session
    if (user.totpEnabled) {
      logAuthEvent("login", user.id, true, { pendingTwoFactor: true })
      resetLoginRateLimit(request)
      return NextResponse.json<ApiResponse<{ pendingTwoFactor: true; userId: string }>>({
        success: true,
        data: { pendingTwoFactor: true, userId: user.id },
        message: "Two-factor authentication required",
      })
    }

    // Get user's organizations
    let memberships = await db.members.findByUserId(user.id)

    // Fallback: if no memberships found by user_id, try by email
    // This handles data integrity issues where user_id linkage was lost
    if (memberships.length === 0) {
      logger.warn(
        { userId: user.id, email: user.email },
        "No memberships found by user_id — trying email fallback"
      )

      const emailMemberships = await db.members.findByEmail(user.email)

      if (emailMemberships.length > 0) {
        // Auto-repair: link user_id to membership records that are missing it
        for (const membership of emailMemberships) {
          if (!membership.userId) {
            await db.members.linkUserId(membership.id, user.id)
            logger.info(
              { memberId: membership.id, userId: user.id, orgId: membership.organizationId },
              "Auto-repaired membership user_id linkage"
            )
          }
        }

        // Re-fetch with proper user_id linkage
        memberships = await db.members.findByUserId(user.id)

        // If still empty (user_id was set but to a different value), use email-matched memberships
        if (memberships.length === 0) {
          memberships = emailMemberships
          logger.warn(
            { userId: user.id, email: user.email, membershipUserIds: emailMemberships.map(m => m.userId) },
            "Email fallback found memberships with different user_ids"
          )
        }
      }
    }

    if (memberships.length === 0) {
      // User has no organizations - create a session so they can use onboarding
      const now = new Date().toISOString()

      // Session rotation: delete old session if one exists
      const existingToken = request.cookies.get("session_token")?.value
      if (existingToken) {
        await db.sessions.deleteByToken(existingToken)
      }

      await db.users.update(user.id, { lastLoginAt: now })
      await db.sessions.enforceSessionLimit(user.id, 5)

      const sessionToken = generateToken()
      const session: Session = {
        id: generateId(),
        userId: user.id,
        organizationId: "", // No org yet - will be updated after org creation
        token: sessionToken,
        expiresAt: getExpirationDate(24 * 7),
        createdAt: now,
        lastActiveAt: now,
      }
      await db.sessions.create(session)

      resetLoginRateLimit(request)
      logAuthEvent("login", user.id, true, { needsOrganization: true })

      const { passwordHash: _passwordHash, totpSecret: _ts, ...safeUser } = user

      const response = NextResponse.json<ApiResponse<AuthResponse>>({
        success: true,
        data: {
          user: safeUser,
          token: sessionToken,
          expiresAt: session.expiresAt,
        },
        message: "Login successful but no organization found",
      })

      response.cookies.set("session_token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: new Date(session.expiresAt),
        path: "/",
      })

      return response
    }

    // Determine which organization to use
    let selectedOrgId = organizationId
    if (!selectedOrgId) {
      // Default to first active membership
      const activeMembership = memberships.find(m => m.status === "active")
      if (activeMembership) {
        selectedOrgId = activeMembership.organizationId
      } else {
        selectedOrgId = memberships[0].organizationId
      }
    }

    // Verify user is member of selected organization
    const membership = memberships.find(m => m.organizationId === selectedOrgId)
    if (!membership) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You are not a member of this organization" },
        { status: 403 }
      )
    }

    // Get organization details
    const organization = await db.organizations.findById(selectedOrgId)
    if (!organization) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()

    // Session rotation: delete old session if one exists from the current cookie
    const existingToken = request.cookies.get("session_token")?.value
    if (existingToken) {
      await db.sessions.deleteByToken(existingToken)
    }

    // Update user's last login
    await db.users.update(user.id, { lastLoginAt: now })

    // Enforce concurrent session limit (max 5 active sessions per user)
    await db.sessions.enforceSessionLimit(user.id, 5)

    // Create new session
    const sessionToken = generateToken()
    const session: Session = {
      id: generateId(),
      userId: user.id,
      organizationId: selectedOrgId,
      token: sessionToken,
      expiresAt: getExpirationDate(24 * 7), // 7 days
      createdAt: now,
      lastActiveAt: now,
    }

    await db.sessions.create(session)

    // Reset rate limit on successful login
    resetLoginRateLimit(request)

    // Log successful login
    logAuthEvent("login", user.id, true, { orgId: selectedOrgId })

    // Return response without password hash or TOTP secret
    const { passwordHash: _passwordHash, totpSecret: _ts2, ...safeUser } = user

    const response = NextResponse.json<ApiResponse<AuthResponse>>({
      success: true,
      data: {
        user: safeUser,
        organization,
        member: membership,
        token: sessionToken,
        expiresAt: session.expiresAt,
      },
      message: "Login successful",
    })

    // Set cookie
    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(session.expiresAt),
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

    logger.error({ error: formatError(error) }, "Login error")
    logAuthEvent("login", undefined, false, { error: formatError(error) })

    // Never expose internal error details in responses
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "An error occurred during login. Please try again later." },
      { status: 500 }
    )
  }
}
