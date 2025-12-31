import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/middleware"
import { generateId } from "@/lib/auth/password"
import type { PushSubscription, ApiResponse } from "@/lib/types"

// GET /api/push-subscriptions - Get VAPID public key and current subscriptions
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

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
    console.error("Get push subscriptions error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get push subscriptions" },
      { status: 500 }
    )
  }
}

// POST /api/push-subscriptions - Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { subscription } = body

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid subscription data" },
        { status: 400 }
      )
    }

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
    console.error("Subscribe push error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to subscribe to push notifications" },
      { status: 500 }
    )
  }
}

// DELETE /api/push-subscriptions - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

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
    console.error("Unsubscribe push error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to unsubscribe from push notifications" },
      { status: 500 }
    )
  }
}
