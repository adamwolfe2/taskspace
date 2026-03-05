import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/push/unsubscribe
 * Remove a push subscription for the authenticated user.
 *
 * Body: { endpoint: string }
 */
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "endpoint is required" },
        { status: 400 }
      )
    }

    const { rowCount } = await sql`
      DELETE FROM push_subscriptions
      WHERE user_id = ${auth.user.id}
        AND endpoint = ${endpoint}
    `

    if ((rowCount ?? 0) === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Subscription not found" },
        { status: 404 }
      )
    }

    logger.info({ userId: auth.user.id }, "Push subscription removed")

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Successfully unsubscribed from push notifications",
    })
  } catch (error) {
    logError(logger, "POST /api/push/unsubscribe error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to unsubscribe from push notifications" },
      { status: 500 }
    )
  }
})
