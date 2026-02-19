import { NextResponse } from "next/server"
import { asanaClient } from "@/lib/integrations/asana"
import { logger, logError } from "@/lib/logger"
import { withAuth } from "@/lib/api/middleware"
import type { ApiResponse } from "@/lib/types"

/**
 * GET /api/asana/users?workspace=<workspaceGid>
 * Get all users in a workspace for mapping
 */
export const GET = withAuth(async (request, _auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceGid = searchParams.get("workspace")

    if (!workspaceGid) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace GID is required" },
        { status: 400 }
      )
    }

    if (!asanaClient.isConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Asana not configured" },
        { status: 400 }
      )
    }

    const users = await asanaClient.getWorkspaceUsers(workspaceGid)

    return NextResponse.json<ApiResponse<{ users: { gid: string; name: string; email: string }[] }>>({
      success: true,
      data: {
        users: users.map((u) => ({
          gid: u.gid,
          name: u.name,
          email: u.email,
        })),
      },
    })
  } catch (error) {
    logError(logger, "Asana users error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch Asana users" },
      { status: 500 }
    )
  }
})
