/**
 * Admin endpoint to unlock a user account and reset failed login attempts
 */

import { NextRequest, NextResponse } from "next/server"
import { withDangerousAdmin } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

export const POST = withDangerousAdmin(async (request: NextRequest, auth) => {
  const { email } = await request.json()

  if (!email || typeof email !== "string") {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Email is required" },
      { status: 400 }
    )
  }

  // Find and unlock the user
  const { rows, rowCount } = await sql`
    UPDATE users
    SET locked_at = NULL,
        lock_reason = NULL,
        failed_login_attempts = 0,
        updated_at = NOW()
    WHERE LOWER(email) = LOWER(${email})
    RETURNING id, email, name
  `

  if (!rowCount || rowCount === 0) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: `No user found with email: ${email}` },
      { status: 404 }
    )
  }

  const user = rows[0]
  logger.info({ adminId: auth.user.id, unlockedUserId: user.id, email: user.email }, "Admin unlocked user account")

  return NextResponse.json<ApiResponse<{ userId: string; email: string; name: string }>>({
    success: true,
    data: { userId: user.id, email: user.email, name: user.name },
    message: `Account unlocked for ${user.name} (${user.email}). They can now log in.`,
  })
})
