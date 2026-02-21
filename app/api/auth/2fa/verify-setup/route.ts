import { NextRequest, NextResponse } from "next/server"
import { verifySync, NobleCryptoPlugin, ScureBase32Plugin } from "otplib"
import { getUserAuthContext } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { generateId, hashPassword } from "@/lib/auth/password"
import { withTransaction } from "@/lib/db/transactions"
import { randomBytes } from "crypto"
import { twoFactorVerifySetupSchema } from "@/lib/validation/schemas"
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
    const parsed = twoFactorVerifySetupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid code" },
        { status: 400 }
      )
    }
    const { code } = parsed.data

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

    // Generate 10 backup codes (before transaction to avoid bcrypt inside tx)
    const backupCodes: string[] = []
    const hashedBackupCodes: string[] = []
    for (let i = 0; i < 10; i++) {
      const code = randomBytes(4).toString("hex") // 8-char hex codes
      backupCodes.push(code)
      hashedBackupCodes.push(await hashPassword(code))
    }

    // Atomically: delete old backup codes, insert new ones, enable 2FA
    await withTransaction(async (client) => {
      await client.sql`DELETE FROM totp_backup_codes WHERE user_id = ${user.id}`

      // Batch insert all backup codes in a single UNNEST query
      const backupCodeIds = hashedBackupCodes.map(() => generateId())
      // @ts-expect-error - client.query has union type with incompatible signatures
      await client.query(
        `INSERT INTO totp_backup_codes (id, user_id, code_hash, created_at)
         SELECT unnest($1::text[]), $2::text, unnest($3::text[]), NOW()`,
        [backupCodeIds, user.id, hashedBackupCodes]
      )

      await client.sql`
        UPDATE users SET totp_enabled = true, updated_at = NOW() WHERE id = ${user.id}
      `
    })

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
