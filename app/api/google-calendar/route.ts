import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import * as googleCalendar from "@/lib/google-calendar"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateGoogleCalendarSettingsSchema } from "@/lib/validation/schemas"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

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

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    // CRITICAL: workspaceId is REQUIRED for data isolation
    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // Validate workspace access (unless org admin)
    if (!isAdmin(auth)) {
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
      if (!hasAccess) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "You don't have access to this workspace" },
          { status: 403 }
        )
      }
    }

    const isConfigured = googleCalendar.isConfigured()
    const token = await db.googleCalendarTokens.findByUserIdAndWorkspace(
      auth.user.id,
      auth.organization.id,
      workspaceId
    )

    let calendars: Array<{ id: string; summary: string; primary?: boolean }> = []
    if (token && isConfigured) {
      try {
        const accessToken = await googleCalendar.getValidAccessToken(
          auth.user.id,
          auth.organization.id,
          workspaceId
        )
        if (accessToken) {
          calendars = await googleCalendar.getCalendarList(accessToken)
        }
      } catch (error) {
        logError(logger, "Failed to get calendars", error)
      }
    }

    // Generate auth URL with state for CSRF protection
    let authUrl: string | null = null
    if (isConfigured && !token) {
      const state = Buffer.from(JSON.stringify({
        userId: auth.user.id,
        orgId: auth.organization.id,
        workspaceId,
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
    logError(logger, "Get Google Calendar status error", error)
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

    const { syncEnabled, calendarId, workspaceId } = await validateBody(request, updateGoogleCalendarSettingsSchema)

    // Validate workspace access
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You don't have access to this workspace" },
        { status: 403 }
      )
    }

    const token = await db.googleCalendarTokens.findByUserIdAndWorkspace(
      auth.user.id,
      auth.organization.id,
      workspaceId
    )
    if (!token) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Google Calendar is not connected" },
        { status: 400 }
      )
    }

    await db.googleCalendarTokens.updateByWorkspace(
      auth.user.id,
      auth.organization.id,
      workspaceId,
      {
        syncEnabled: syncEnabled ?? token.syncEnabled,
        calendarId: calendarId ?? token.calendarId,
      }
    )

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Settings updated successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Update Google Calendar settings error", error)
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

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    // CRITICAL: workspaceId is REQUIRED for data isolation
    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // Validate workspace access
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You don't have access to this workspace" },
        { status: 403 }
      )
    }

    await db.googleCalendarTokens.deleteByWorkspace(auth.user.id, auth.organization.id, workspaceId)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Google Calendar disconnected successfully",
    })
  } catch (error) {
    logError(logger, "Disconnect Google Calendar error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to disconnect Google Calendar" },
      { status: 500 }
    )
  }
}
