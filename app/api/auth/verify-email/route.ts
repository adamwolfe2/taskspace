import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { checkIpRateLimit, ipRateLimitHeaders } from "@/lib/auth/ip-rate-limit"
import { withTransaction } from "@/lib/db/transactions"
import type { ApiResponse } from "@/lib/types"

/**
 * GET /api/auth/verify-email?token=xxx
 *
 * Verifies a user's email address using a verification token.
 * Tokens expire after 24 hours and can only be used once.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 10 attempts per 15 min per IP
    const rl = checkIpRateLimit(request, { endpoint: "verify-email", maxRequests: 10 })
    if (!rl.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Too many attempts. Please try again later." },
        { status: 429, headers: ipRateLimitHeaders(rl) }
      )
    }

    const token = request.nextUrl.searchParams.get("token")

    if (!token || token.length < 20) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid or missing verification token." },
        { status: 400 }
      )
    }

    // SECURITY: All validation inside transaction with row-level locking to prevent
    // TOCTOU race condition (two concurrent requests both passing the "used" check).
    let alreadyVerified = false
    let verifiedUserId: string | undefined

    await withTransaction(async (client) => {
      // Lock token row for update — prevents concurrent verification of same token
      const { rows: tokenRows } = await client.sql<{
        id: string
        user_id: string
        email: string
        expires_at: string
        used_at: string | null
      }>`SELECT id, user_id, email, expires_at, used_at
         FROM email_verification_tokens
         WHERE token = ${token}
         FOR UPDATE`

      if (tokenRows.length === 0) {
        throw new Error("INVALID_TOKEN")
      }

      const lockedToken = tokenRows[0]

      // Already used — treat as success (idempotent)
      if (lockedToken.used_at) {
        alreadyVerified = true
        return
      }

      // Expired
      if (new Date(lockedToken.expires_at) < new Date()) {
        throw new Error("EXPIRED_TOKEN")
      }

      // Mark token as used and verify email atomically
      const now = new Date().toISOString()
      await client.sql`
        UPDATE email_verification_tokens SET used_at = ${now} WHERE id = ${lockedToken.id}
      `
      await client.sql`
        UPDATE users SET email_verified = true, updated_at = ${now} WHERE id = ${lockedToken.user_id}
      `

      verifiedUserId = lockedToken.user_id
      logger.info({ userId: lockedToken.user_id, email: lockedToken.email }, "Email verified successfully")
    })

    if (alreadyVerified) {
      return NextResponse.json<ApiResponse<{ alreadyVerified: true }>>(
        { success: true, data: { alreadyVerified: true }, message: "Email already verified." }
      )
    }

    logger.info({ userId: verifiedUserId }, "Email verification complete")

    return NextResponse.json<ApiResponse<{ verified: true }>>({
      success: true,
      data: { verified: true },
      message: "Email verified successfully! You can now use all features.",
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_TOKEN") {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Invalid or expired verification link. Please request a new one." },
          { status: 400 }
        )
      }
      if (error.message === "EXPIRED_TOKEN") {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "This verification link has expired. Please request a new one." },
          { status: 400 }
        )
      }
    }
    logger.error({ error: String(error) }, "Email verification error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "An error occurred during verification. Please try again." },
      { status: 500 }
    )
  }
}
