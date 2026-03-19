import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  generateId,
  generateToken,
  getExpirationDate,
} from "@/lib/auth/password"
import {
  checkPasswordResetRateLimit,
  checkPasswordResetEmailRateLimit,
  getRateLimitHeaders,
} from "@/lib/auth/rate-limit"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { forgotPasswordSchema } from "@/lib/validation/schemas"
import { sendPasswordResetEmail } from "@/lib/integrations/email"
import type { PasswordResetToken, ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    // Check rate limit by IP
    const ipRateLimitResult = checkPasswordResetRateLimit(request)
    if (!ipRateLimitResult.success) {
      const response = NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "Too many password reset attempts. Please wait a few minutes and try again.",
        },
        { status: 429 }
      )
      const headers = getRateLimitHeaders(ipRateLimitResult, 3)
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value)
      }
      return response
    }

    // Validate request body
    const { email } = await validateBody(request, forgotPasswordSchema)

    // Check rate limit by email (to prevent email enumeration via timing attacks)
    const emailRateLimitResult = checkPasswordResetEmailRateLimit(email)
    if (!emailRateLimitResult.success) {
      // Return success message anyway to prevent email enumeration
      return NextResponse.json<ApiResponse<null>>({
        success: true,
        message: "If an account with that email exists, we've sent a password reset link.",
      })
    }

    // Find user by primary email OR org-specific email
    let user = await db.users.findByEmail(email)

    // Fallback: check organization_members for org-specific emails
    if (!user) {
      try {
        const { sql } = await import("@/lib/db/sql")
        const { rows } = await sql<{ user_id: string }>`
          SELECT user_id
          FROM organization_members
          WHERE LOWER(email) = LOWER(${email})
            AND user_id IS NOT NULL
          LIMIT 1
        `
        if (rows.length > 0) {
          user = await db.users.findById(rows[0].user_id)
        }
      } catch {
        // Non-critical — fall through
      }
    }

    if (user) {
      // Delete any existing reset tokens for this user
      await db.passwordResetTokens.deleteByEmail(email)

      // Create new reset token
      const now = new Date().toISOString()
      const resetToken: PasswordResetToken = {
        id: generateId(),
        userId: user.id,
        email: user.email,
        token: generateToken(),
        expiresAt: getExpirationDate(1), // 1 hour expiry
        createdAt: now,
      }

      await db.passwordResetTokens.create(resetToken)

      // Send password reset email (async, don't block on failure)
      sendPasswordResetEmail(resetToken, user.name)
        .then((result) => {
          if (!result.success) {
            logger.warn({ error: result.error }, "Failed to send password reset email")
          }
        })
        .catch((err) => logError(logger, "Email send error", err))
    }

    // Always return success to prevent email enumeration
    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "If an account with that email exists, we've sent a password reset link.",
    })
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    logError(logger, "Forgot password error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "An error occurred. Please try again later." },
      { status: 500 }
    )
  }
}
