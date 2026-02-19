import { NextRequest, NextResponse } from "next/server"
import { verifySync, NobleCryptoPlugin, ScureBase32Plugin } from "otplib"
import { getUserAuthContext } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { generateId, hashPassword } from "@/lib/auth/password"
import { randomBytes } from "crypto"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

/**
 * POST /api/auth/2fa/verify-setup
 * Verify TOTP code to confirm setup, generate backup codes, and enable 2FA.
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

    if (auth.user.totpEnabled) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Two-factor authentication is already enabled" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const code = body?.code as string

    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Please enter a valid 6-digit code" },
        { status: 400 }
      )
    }

    // Fetch the user's pending TOTP secret
    const user = await db.users.findById(auth.user.id)
    if (!user?.totpSecret) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No 2FA setup in progress. Please start setup again." },
        { status: 400 }
      )
    }

    // Verify the TOTP code
    const plugins = { crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() }
    const result = verifySync({ token: code, secret: user.totpSecret, digits: 6, period: 30, ...plugins })
    const isValid = result.valid
    if (!isValid) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid code. Please check your authenticator app and try again." },
        { status: 400 }
      )
    }

    // Generate 10 backup codes
    const backupCodes: string[] = []
    for (let i = 0; i < 10; i++) {
      const code = randomBytes(4).toString("hex") // 8-char hex codes
      backupCodes.push(code)
    }

    // Delete any existing backup codes and insert new ones
    await sql`DELETE FROM totp_backup_codes WHERE user_id = ${user.id}`

    for (const backupCode of backupCodes) {
      const hashedCode = await hashPassword(backupCode)
      await sql`
        INSERT INTO totp_backup_codes (id, user_id, code_hash, created_at)
        VALUES (${generateId()}, ${user.id}, ${hashedCode}, NOW())
      `
    }

    // Enable 2FA
    await db.users.update(user.id, { totpEnabled: true })

    logger.info({ userId: user.id }, "2FA enabled successfully")

    return NextResponse.json<ApiResponse<{ backupCodes: string[] }>>({
      success: true,
      data: { backupCodes },
      message: "Two-factor authentication enabled. Save your backup codes securely.",
    })
  } catch (error) {
    logError(logger, "2FA verify-setup error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to enable two-factor authentication" },
      { status: 500 }
    )
  }
}
