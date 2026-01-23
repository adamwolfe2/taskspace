import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  hashPassword,
  validatePassword,
  isTokenExpired,
} from "@/lib/auth/password"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    // Validate required fields
    if (!token || !password) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Token and password are required" },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      )
    }

    // Find reset token
    const resetToken = await db.passwordResetTokens.findByToken(token)
    if (!resetToken) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      )
    }

    // Check if token has been used
    if (resetToken.usedAt) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "This reset link has already been used. Please request a new one." },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (isTokenExpired(resetToken.expiresAt)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      )
    }

    // Find user
    const user = await db.users.findByEmail(resetToken.email)
    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    // Update user's password
    const hashedPassword = await hashPassword(password)
    await db.users.update(user.id, {
      passwordHash: hashedPassword,
      updatedAt: new Date().toISOString(),
    })

    // Mark token as used
    await db.passwordResetTokens.markAsUsed(resetToken.id)

    // Optionally: Invalidate all existing sessions for security
    // This forces the user to log in with their new password
    const sessions = await db.sessions.findByUserId(user.id)
    for (const session of sessions) {
      await db.sessions.delete(session.id)
    }

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Password reset successfully. Please log in with your new password.",
    })
  } catch (error) {
    logError(logger, "Reset password error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "An error occurred. Please try again later." },
      { status: 500 }
    )
  }
}

// GET endpoint to verify token is valid
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Token is required" },
        { status: 400 }
      )
    }

    // Find reset token
    const resetToken = await db.passwordResetTokens.findByToken(token)
    if (!resetToken) {
      return NextResponse.json<ApiResponse<{ valid: false }>>(
        { success: true, data: { valid: false } }
      )
    }

    // Check if token has been used
    if (resetToken.usedAt) {
      return NextResponse.json<ApiResponse<{ valid: false }>>(
        { success: true, data: { valid: false } }
      )
    }

    // Check if token is expired
    if (isTokenExpired(resetToken.expiresAt)) {
      return NextResponse.json<ApiResponse<{ valid: false }>>(
        { success: true, data: { valid: false } }
      )
    }

    return NextResponse.json<ApiResponse<{ valid: true; email: string }>>({
      success: true,
      data: { valid: true, email: resetToken.email },
    })
  } catch (error) {
    logError(logger, "Verify reset token error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "An error occurred" },
      { status: 500 }
    )
  }
}
