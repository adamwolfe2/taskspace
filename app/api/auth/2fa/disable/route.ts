import { NextRequest, NextResponse } from "next/server"
import { getUserAuthContext } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { verifyPassword } from "@/lib/auth/password"
import { twoFactorDisableSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA. Requires current password for security.
 */
export async function POST(request: NextRequest) {
  try {
    const csrfHeader = request.headers.get("x-requested-with")
    if (csrfHeader !== "XMLHttpRequest") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden" },
        { status: 403 }
      )
    }

    const auth = await getUserAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!auth.user.totpEnabled) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Two-factor authentication is not enabled" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = twoFactorDisableSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: parsed.error.errors[0]?.message || "Password is required" },
        { status: 400 }
      )
    }
    const { password } = parsed.data

    // Verify password
    const user = await db.users.findById(auth.user.id)
    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Incorrect password" },
        { status: 401 }
      )
    }

    // Disable 2FA
    await db.users.update(user.id, { totpEnabled: false, totpSecret: null })

    // Delete all backup codes
    await sql`DELETE FROM totp_backup_codes WHERE user_id = ${user.id}`

    logger.info({ userId: user.id }, "2FA disabled")

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
      message: "Two-factor authentication has been disabled",
    })
  } catch (error) {
    logError(logger, "2FA disable error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to disable two-factor authentication" },
      { status: 500 }
    )
  }
}
