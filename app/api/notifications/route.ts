import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/api/middleware"
import type { Notification, ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// GET /api/notifications - Get user's notifications
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unread") === "true"
    const countOnly = searchParams.get("count") === "true"

    if (countOnly) {
      const count = await db.notifications.getUnreadCount(auth.user.id, auth.organization.id)
      return NextResponse.json<ApiResponse<{ count: number }>>({
        success: true,
        data: { count },
      })
    }

    const notifications = unreadOnly
      ? await db.notifications.findUnreadByUserId(auth.user.id, auth.organization.id)
      : await db.notifications.findByUserId(auth.user.id, auth.organization.id)

    return NextResponse.json<ApiResponse<Notification[]>>({
      success: true,
      data: notifications,
    })
  } catch (error) {
    logError(logger, "Get notifications error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get notifications" },
      { status: 500 }
    )
  }
})

// PATCH /api/notifications - Mark notification(s) as read
export const PATCH = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const { id, markAllRead } = body

    if (markAllRead) {
      const count = await db.notifications.markAllAsRead(auth.user.id, auth.organization.id)
      return NextResponse.json<ApiResponse<{ markedCount: number }>>({
        success: true,
        data: { markedCount: count },
        message: `Marked ${count} notification(s) as read`,
      })
    }

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Notification ID is required" },
        { status: 400 }
      )
    }

    const notification = await db.notifications.markAsRead(id)
    if (!notification) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Notification not found" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<Notification>>({
      success: true,
      data: notification,
    })
  } catch (error) {
    logError(logger, "Update notification error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update notification" },
      { status: 500 }
    )
  }
})

// DELETE /api/notifications - Delete a notification
export const DELETE = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Notification ID is required" },
        { status: 400 }
      )
    }

    const deleted = await db.notifications.delete(id)
    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Notification not found" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Notification deleted",
    })
  } catch (error) {
    logError(logger, "Delete notification error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete notification" },
      { status: 500 }
    )
  }
})
