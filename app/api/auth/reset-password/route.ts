import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  hashPassword,
  isTokenExpired,
  validatePasswordStrength,
} from "@/lib/auth/password"
import {
  checkPasswordResetRateLimit,
  getRateLimitHeaders,
} from "@/lib/auth/rate-limit"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { resetPasswordSchema } from "@/lib/validation/schemas"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { withTransaction } from "@/lib/db/transactions"

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = checkPasswordResetRateLimit(request)
    if (!rateLimitResult.success) {
      const response = NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "Too many password reset attempts. Please wait a few minutes and try again.",
        },
        { status: 429 }
      )
      const headers = getRateLimitHeaders(rateLimitResult, 3)
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value)
      }
      return response
    }

    // Validate request body
    const { token, password } = await validateBody(request, resetPasswordSchema)

    // SECURITY: Validate password strength
    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: passwordValidation.message || "Password does not meet strength requirements" },
        { status: 400 }
      )
    }

    // SECURITY FIX: No preflight checks - all validation inside transaction to prevent TOCTOU race
    // Execute in transaction with row-level locking to ensure idempotency
    const userId = await withTransaction(async (client) => {
      const now = new Date().toISOString()

      // CRITICAL: Lock the reset token row with FOR UPDATE to prevent concurrent processing
      const { rows: tokenRows } = await client.sql<{
        id: string
        email: string
        token: string
        expires_at: string
        used_at: string | null
        created_at: string
      }>`SELECT * FROM password_reset_tokens WHERE token = ${token} FOR UPDATE`

      if (tokenRows.length === 0) {
        throw new Error("Invalid or expired reset link. Please request a new one.")
      }

      const lockedToken = tokenRows[0]

      // Check if token has been used (after acquiring lock)
      if (lockedToken.used_at) {
        throw new Error("This reset link has already been used. Please request a new one.")
      }

      // Check if token is expired
      if (isTokenExpired(lockedToken.expires_at)) {
        throw new Error("This reset link has expired. Please request a new one.")
      }

      // Find user inside transaction
      const { rows: userRows } = await client.sql<{
        id: string
        email: string
      }>`SELECT id, email FROM users WHERE LOWER(email) = LOWER(${lockedToken.email})`

      if (userRows.length === 0) {
        throw new Error("User not found")
      }

      const userId = userRows[0].id

      // Update user's password inside transaction
      const hashedPassword = await hashPassword(password)
      await client.sql`
        UPDATE users
        SET password_hash = ${hashedPassword}, updated_at = ${now}
        WHERE id = ${userId}
      `

      // Mark token as used inside transaction
      await client.sql`
        UPDATE password_reset_tokens
        SET used_at = ${now}
        WHERE id = ${lockedToken.id}
      `

      // Invalidate all existing sessions for security inside transaction
      // This forces the user to log in with their new password
      await client.sql`DELETE FROM sessions WHERE user_id = ${userId}`

      return userId
    })

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Password reset successfully. Please log in with your new password.",
    })
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
      if (error.message.includes("already been used")) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes("expired")) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes("User not found")) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: error.message },
          { status: 404 }
        )
      }
      if (error.message.includes("Invalid or expired reset link")) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: error.message },
          { status: 400 }
        )
      }
    }

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
