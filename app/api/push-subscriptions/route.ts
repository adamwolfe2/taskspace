import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/api/middleware"
import { generateId } from "@/lib/auth/password"
import type { PushSubscription, ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createPushSubscriptionSchema } from "@/lib/validation/schemas"

// GET /api/push-subscriptions - Get VAPID public key and current subscriptions
export const GET = withAuth(async (request, auth) => {
  try {
    // Get VAPID public key from environment
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY

    // Get user's subscriptions
    const subscriptions = await db.pushSubscriptions.findByUserId(auth.user.id)

    return NextResponse.json<ApiResponse<{
      vapidPublicKey: string | null
      subscriptions: PushSubscription[]
      isConfigured: boolean
    }>>({
      success: true,
      data: {
        vapidPublicKey: vapidPublicKey || null,
        subscriptions,
        isConfigured: !!vapidPublicKey && !!process.env.VAPID_PRIVATE_KEY,
      },
    })
  } catch (error) {
    logError(logger, "Get push subscriptions error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get push subscriptions" },
      { status: 500 }
    )
  }
})

// POST /api/push-subscriptions - Subscribe to push notifications
export const POST = withAuth(async (request, auth) => {
  try {
    // Validate request body
    const { subscription } = await validateBody(request, createPushSubscriptionSchema, {
      errorPrefix: "Invalid subscription data",
    })

    const now = new Date().toISOString()

    const pushSubscription: PushSubscription = {
      id: generateId(),
      userId: auth.user.id,
      organizationId: auth.organization.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: request.headers.get("user-agent") || undefined,
      createdAt: now,
    }

    await db.pushSubscriptions.create(pushSubscription)

    return NextResponse.json<ApiResponse<PushSubscription>>({
      success: true,
      data: pushSubscription,
      message: "Successfully subscribed to push notifications",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Subscribe push error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to subscribe to push notifications" },
      { status: 500 }
    )
  }
})

// DELETE /api/push-subscriptions - Unsubscribe from push notifications
export const DELETE = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get("endpoint")

    if (!endpoint) {
      // Delete all subscriptions for the user
      const count = await db.pushSubscriptions.deleteByUserId(auth.user.id)
      return NextResponse.json<ApiResponse<{ deleted: number }>>({
        success: true,
        data: { deleted: count },
        message: `Unsubscribed ${count} device(s) from push notifications`,
      })
    }

    // Delete specific subscription
    const deleted = await db.pushSubscriptions.delete(endpoint)

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Subscription not found" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Successfully unsubscribed from push notifications",
    })
  } catch (error) {
    logError(logger, "Unsubscribe push error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to unsubscribe from push notifications" },
      { status: 500 }
    )
  }
})
