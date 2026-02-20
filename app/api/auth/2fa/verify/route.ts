import { NextRequest, NextResponse } from "next/server"
import { verifySync, NobleCryptoPlugin, ScureBase32Plugin } from "otplib"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { verifyPassword, generateId, generateToken, getExpirationDate } from "@/lib/auth/password"
import { logger, logError, logAuthEvent } from "@/lib/logger"
import { check2faRateLimit, getRateLimitHeaders } from "@/lib/auth/rate-limit"
import { twoFactorVerifySchema } from "@/lib/validation/schemas"
import type { Session, ApiResponse, AuthResponse } from "@/lib/types"

/**
 * POST /api/auth/2fa/verify
 * Verify TOTP code during login. Called after password is verified
 * when user has 2FA enabled. Accepts either a TOTP code or backup code.
 *
 * Expects: { userId, code, organizationId? }
 * The userId comes from the login response (returned as pendingTwoFactor).
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 attempts per 15 minutes per IP
    const rateLimit = check2faRateLimit(request)
    if (!rateLimit.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Too many verification attempts. Please wait a few minutes." },
        { status: 429, headers: getRateLimitHeaders(rateLimit, 5) }
      )
    }

    const body = await request.json()
    const parsed = twoFactorVerifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid request" },
        { status: 400 }
      )
    }
    const { userId, code, organizationId } = parsed.data

    const user = await db.users.findById(userId)
    if (!user || !user.totpEnabled || !user.totpSecret) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid request" },
        { status: 400 }
      )
    }

    let isValid = false
    let usedBackupCode = false

    // Try TOTP code first (6 digits)
    if (/^\d{6}$/.test(code)) {
      const plugins = { crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() }
      const result = verifySync({ token: code, secret: user.totpSecret, digits: 6, period: 30, ...plugins })
      isValid = result.valid
    }

    // If TOTP didn't work, try backup codes (8 hex chars)
    if (!isValid) {
      const { rows: backupCodes } = await sql`
        SELECT id, code_hash FROM totp_backup_codes
        WHERE user_id = ${userId} AND used_at IS NULL
      `

      for (const bc of backupCodes) {
        const matches = await verifyPassword(code, bc.code_hash as string)
        if (matches) {
          // CAS update: only mark used if not already consumed by a concurrent request
          const { rowCount } = await sql`
            UPDATE totp_backup_codes SET used_at = NOW()
            WHERE id = ${bc.id as string} AND used_at IS NULL
          `
          if (rowCount && rowCount > 0) {
            isValid = true
            usedBackupCode = true
          }
          break
        }
      }
    }

    if (!isValid) {
      logAuthEvent("login", userId, false, { twoFactor: true })
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid verification code" },
        { status: 401 }
      )
    }

    // 2FA verified — create full session (same logic as login route)
    let memberships = await db.members.findByUserId(userId)

    // Fallback: if no memberships found by user_id, try by email
    if (memberships.length === 0) {
      const emailMemberships = await db.members.findByEmail(user.email)
      if (emailMemberships.length > 0) {
        for (const m of emailMemberships) {
          if (!m.userId) {
            await db.members.linkUserId(m.id, userId)
          }
        }
        memberships = await db.members.findByUserId(userId)
        if (memberships.length === 0) {
          memberships = emailMemberships
        }
      }
    }

    let selectedOrgId = organizationId
    if (!selectedOrgId) {
      const activeMembership = memberships.find(m => m.status === "active")
      selectedOrgId = activeMembership?.organizationId || memberships[0]?.organizationId
    }

    if (!selectedOrgId) {
      // User has no orgs — create session for onboarding
      const now = new Date().toISOString()
      await db.users.update(userId, { lastLoginAt: now })
      await db.sessions.enforceSessionLimit(userId, 5)

      const sessionToken = generateToken()
      const session: Session = {
        id: generateId(),
        userId,
        organizationId: "",
        token: sessionToken,
        expiresAt: getExpirationDate(24 * 7),
        createdAt: now,
        lastActiveAt: now,
      }
      await db.sessions.create(session)

      logAuthEvent("login", userId, true, { twoFactor: true, usedBackupCode })
      const { passwordHash: _, totpSecret: _s, ...safeUser } = user

      const response = NextResponse.json<ApiResponse<AuthResponse>>({
        success: true,
        data: { user: safeUser, token: sessionToken, expiresAt: session.expiresAt },
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

    const membership = memberships.find(m => m.organizationId === selectedOrgId)
    if (!membership) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Not a member of this organization" },
        { status: 403 }
      )
    }

    const organization = await db.organizations.findById(selectedOrgId)
    if (!organization) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()

    // Rotate old session
    const existingToken = request.cookies.get("session_token")?.value
    if (existingToken) {
      await db.sessions.deleteByToken(existingToken)
    }

    await db.users.update(userId, { lastLoginAt: now })
    await db.sessions.enforceSessionLimit(userId, 5)

    const sessionToken = generateToken()
    const session: Session = {
      id: generateId(),
      userId,
      organizationId: selectedOrgId,
      token: sessionToken,
      expiresAt: getExpirationDate(24 * 7),
      createdAt: now,
      lastActiveAt: now,
    }

    await db.sessions.create(session)

    logAuthEvent("login", userId, true, { twoFactor: true, usedBackupCode })

    const { passwordHash: _, totpSecret: _s, ...safeUser } = user

    const response = NextResponse.json<ApiResponse<AuthResponse>>({
      success: true,
      data: {
        user: safeUser,
        organization,
        member: membership,
        token: sessionToken,
        expiresAt: session.expiresAt,
      },
      message: usedBackupCode
        ? "Login successful. You used a backup code — consider regenerating your backup codes."
        : "Login successful",
    })

    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(session.expiresAt),
      path: "/",
    })

    return response
  } catch (error) {
    logError(logger, "2FA verify error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Verification failed. Please try again." },
      { status: 500 }
    )
  }
}
