import { NextRequest, NextResponse } from "next/server"
import { asanaClient } from "@/lib/integrations/asana"
import { logger, logError } from "@/lib/logger"
import { withAuth } from "@/lib/api/middleware"
import type { ApiResponse } from "@/lib/types"

interface AsanaStatusData {
  connected: boolean
  configured: boolean
  message?: string
  error?: string
  user?: {
    gid: string
    name: string
    email: string
  }
  workspaces?: {
    gid: string
    name: string
  }[]
}

/**
 * GET /api/asana/status
 * Check Asana connection status and get current user info
 */
export const GET = withAuth(async (request, auth) => {
  try {
    // Check if Asana is configured
    if (!asanaClient.isConfigured()) {
      return NextResponse.json<ApiResponse<AsanaStatusData>>({
        success: true,
        data: {
          connected: false,
          configured: false,
          message: "Asana access token not configured",
        },
      })
    }

    // Try to get current user to verify connection
    try {
      const me = await asanaClient.getMe()
      const workspaces = await asanaClient.getWorkspaces()

      return NextResponse.json<ApiResponse<AsanaStatusData>>({
        success: true,
        data: {
          connected: true,
          configured: true,
          user: {
            gid: me.gid,
            name: me.name,
            email: me.email,
          },
          workspaces: workspaces.map((w) => ({
            gid: w.gid,
            name: w.name,
          })),
        },
      })
    } catch (error) {
      return NextResponse.json<ApiResponse<AsanaStatusData>>({
        success: true,
        data: {
          connected: false,
          configured: true,
          message: "Failed to connect to Asana - check access token",
          error: "Unknown error",
        },
      })
    }
  } catch (error) {
    logError(logger, "Asana status error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to check Asana status" },
      { status: 500 }
    )
  }
})
