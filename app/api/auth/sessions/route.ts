import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * DELETE /api/auth/sessions
 * Revokes all other sessions for the current user (keeps the current session).
 * This is a "log out everywhere else" feature.
 */
export const DELETE = withAuth(async (request: NextRequest, auth) => {
  try {
    const currentToken = request.cookies.get("session_token")?.value

    if (!currentToken) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No active session found" },
        { status: 400 }
      )
    }

    const deletedCount = await db.sessions.deleteOthersByUserAndToken(auth.user.id, currentToken)

    logger.info({ userId: auth.user.id, deletedCount }, "Revoked other sessions")

    return NextResponse.json<ApiResponse<{ revokedCount: number }>>({
      success: true,
      data: { revokedCount: deletedCount },
      message: `Successfully revoked ${deletedCount} other session${deletedCount === 1 ? "" : "s"}`,
    })
  } catch (error) {
    logError(logger, "Revoke sessions error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "An error occurred while revoking sessions" },
      { status: 500 }
    )
  }
})
