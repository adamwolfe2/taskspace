import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/middleware"
import * as googleCalendar from "@/lib/google-calendar"
import type { ApiResponse } from "@/lib/types"

// GET /api/google-calendar - Get connection status and auth URL
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const isConfigured = googleCalendar.isConfigured()
    const token = await db.googleCalendarTokens.findByUserId(auth.user.id, auth.organization.id)

    let calendars: Array<{ id: string; summary: string; primary?: boolean }> = []
    if (token && isConfigured) {
      try {
        const accessToken = await googleCalendar.getValidAccessToken(auth.user.id, auth.organization.id)
        if (accessToken) {
          calendars = await googleCalendar.getCalendarList(accessToken)
        }
      } catch (error) {
        console.error("Failed to get calendars:", error)
      }
    }

    // Generate auth URL with state for CSRF protection
    let authUrl: string | null = null
    if (isConfigured && !token) {
      const state = Buffer.from(JSON.stringify({
        userId: auth.user.id,
        orgId: auth.organization.id,
        timestamp: Date.now(),
      })).toString('base64')
      authUrl = googleCalendar.getAuthUrl(state)
    }

    return NextResponse.json<ApiResponse<{
      isConfigured: boolean
      isConnected: boolean
      syncEnabled: boolean
      calendarId: string | null
      lastSyncAt: string | null
      calendars: Array<{ id: string; summary: string; primary?: boolean }>
      authUrl: string | null
    }>>({
      success: true,
      data: {
        isConfigured,
        isConnected: !!token,
        syncEnabled: token?.syncEnabled ?? false,
        calendarId: token?.calendarId ?? null,
        lastSyncAt: token?.lastSyncAt ?? null,
        calendars,
        authUrl,
      },
    })
  } catch (error) {
    console.error("Get Google Calendar status error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get Google Calendar status" },
      { status: 500 }
    )
  }
}

// PATCH /api/google-calendar - Update settings
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { syncEnabled, calendarId } = body

    const token = await db.googleCalendarTokens.findByUserId(auth.user.id, auth.organization.id)
    if (!token) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Google Calendar is not connected" },
        { status: 400 }
      )
    }

    await db.googleCalendarTokens.update(auth.user.id, auth.organization.id, {
      syncEnabled: syncEnabled ?? token.syncEnabled,
      calendarId: calendarId ?? token.calendarId,
    })

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Settings updated successfully",
    })
  } catch (error) {
    console.error("Update Google Calendar settings error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    )
  }
}

// DELETE /api/google-calendar - Disconnect
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    await db.googleCalendarTokens.delete(auth.user.id, auth.organization.id)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Google Calendar disconnected successfully",
    })
  } catch (error) {
    console.error("Disconnect Google Calendar error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to disconnect Google Calendar" },
      { status: 500 }
    )
  }
}
