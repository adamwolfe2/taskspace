import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import { generateId } from "@/lib/auth/password"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { pushSubscribeSchema } from "@/lib/validation/schemas"
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
    const { endpoint, p256dh, auth: authKey } = await validateBody(request, pushSubscribeSchema)

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
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    logError(logger, "POST /api/push/subscribe error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to subscribe to push notifications" },
      { status: 500 }
    )
  }
})
