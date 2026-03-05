import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/push/subscribe
 * Subscribe the authenticated user's browser to push notifications.
 * Upserts into push_subscriptions keyed on (user_id, endpoint).
 *
 * Body: { endpoint: string, p256dh: string, auth: string }
 */
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const { endpoint, p256dh, auth: authKey } = body

    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "endpoint is required" },
        { status: 400 }
      )
    }

    if (!p256dh || typeof p256dh !== "string") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "p256dh is required" },
        { status: 400 }
      )
    }

    if (!authKey || typeof authKey !== "string") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "auth key is required" },
        { status: 400 }
      )
    }

    const id = generateId()

    // Upsert — update keys if the subscription endpoint already exists for this user
    await sql`
      INSERT INTO push_subscriptions (id, user_id, org_id, endpoint, p256dh, auth, created_at, updated_at)
      VALUES (
        ${id},
        ${auth.user.id},
        ${auth.organization.id},
        ${endpoint},
        ${p256dh},
        ${authKey},
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id, endpoint)
      DO UPDATE SET
        p256dh     = EXCLUDED.p256dh,
        auth       = EXCLUDED.auth,
        updated_at = NOW()
    `

    logger.info({ userId: auth.user.id, orgId: auth.organization.id }, "Push subscription upserted")

    return NextResponse.json<ApiResponse<{ id: string }>>(
      {
        success: true,
        data: { id },
        message: "Successfully subscribed to push notifications",
      },
      { status: 201 }
    )
  } catch (error) {
    logError(logger, "POST /api/push/subscribe error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to subscribe to push notifications" },
      { status: 500 }
    )
  }
})
