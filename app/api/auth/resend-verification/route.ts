import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withUserAuth } from "@/lib/api/middleware"
import { generateId, generateToken, getExpirationDate } from "@/lib/auth/password"
import { sendVerificationEmail } from "@/lib/email"
import { logger } from "@/lib/logger"
import type { ApiResponse, EmailVerificationToken } from "@/lib/types"

/**
 * POST /api/auth/resend-verification
 *
 * Resends the email verification email to the current user.
 * Rate limited to 1 per 2 minutes per user (via token check).
 */
export const POST = withUserAuth(async (_request: NextRequest, auth) => {
  try {
    const user = auth.user

    // Already verified
    if (user.emailVerified) {
      return NextResponse.json<ApiResponse<null>>(
        { success: true, data: null, message: "Email is already verified." }
      )
    }

    // Check if a recent token exists (rate limit: don't send more than 1 per 2 minutes)
    const existingTokens = await db.emailVerificationTokens.findByEmail(user.email)
    if (existingTokens.length > 0) {
      const lastToken = existingTokens[0]
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
      if (new Date(lastToken.createdAt) > twoMinutesAgo) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Please wait 2 minutes before requesting another verification email." },
          { status: 429 }
        )
      }
    }

    // Delete old tokens for this email
    await db.emailVerificationTokens.deleteByEmail(user.email)

    // Create new verification token (24 hour expiry)
    const now = new Date().toISOString()
    const verificationToken: EmailVerificationToken = {
      id: generateId(),
      userId: user.id,
      email: user.email,
      token: generateToken(),
      expiresAt: getExpirationDate(24), // 24 hours
      createdAt: now,
    }

    await db.emailVerificationTokens.create(verificationToken)

    // Send verification email
    const emailResult = await sendVerificationEmail(verificationToken, user.name)

    if (!emailResult.success) {
      logger.warn({ userId: user.id, error: emailResult.error }, "Failed to send verification email")
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to send verification email. Please try again later." },
        { status: 500 }
      )
    }

    logger.info({ userId: user.id, email: user.email }, "Verification email resent")

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
      message: "Verification email sent! Check your inbox.",
    })
  } catch (error) {
    logger.error({ error: String(error) }, "Resend verification error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "An error occurred. Please try again." },
      { status: 500 }
    )
  }
})
