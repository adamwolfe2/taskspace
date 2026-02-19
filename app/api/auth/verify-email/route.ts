import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

/**
 * GET /api/auth/verify-email?token=xxx
 *
 * Verifies a user's email address using a verification token.
 * Tokens expire after 24 hours and can only be used once.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")

    if (!token || token.length < 20) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid or missing verification token." },
        { status: 400 }
      )
    }

    // Look up token
    const verificationToken = await db.emailVerificationTokens.findByToken(token)

    if (!verificationToken) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid or expired verification link. Please request a new one." },
        { status: 400 }
      )
    }

    // Check if already used
    if (verificationToken.usedAt) {
      return NextResponse.json<ApiResponse<{ alreadyVerified: true }>>(
        { success: true, data: { alreadyVerified: true }, message: "Email already verified." }
      )
    }

    // Check if expired
    if (new Date(verificationToken.expiresAt) < new Date()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "This verification link has expired. Please request a new one." },
        { status: 400 }
      )
    }

    // Mark token as used
    await db.emailVerificationTokens.markAsUsed(verificationToken.id)

    // Update user's emailVerified flag
    await db.users.update(verificationToken.userId, { emailVerified: true })

    logger.info({ userId: verificationToken.userId, email: verificationToken.email }, "Email verified successfully")

    return NextResponse.json<ApiResponse<{ verified: true }>>({
      success: true,
      data: { verified: true },
      message: "Email verified successfully! You can now use all features.",
    })
  } catch (error) {
    logger.error({ error: String(error) }, "Email verification error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "An error occurred during verification. Please try again." },
      { status: 500 }
    )
  }
}
