import { NextResponse } from "next/server"
import { asanaClient } from "@/lib/integrations/asana"
import { logger, logError } from "@/lib/logger"
import { withAuth } from "@/lib/api/middleware"
import type { ApiResponse } from "@/lib/types"

/**
 * GET /api/asana/projects?workspace=<workspaceGid>
 * Get all projects in a workspace
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

    const projects = await asanaClient.getProjects(workspaceGid)

    return NextResponse.json<ApiResponse<{ projects: { gid: string; name: string }[] }>>({
      success: true,
      data: {
        projects: projects.map((p) => ({
          gid: p.gid,
          name: p.name,
        })),
      },
    })
  } catch (error) {
    logError(logger, "Asana projects error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch Asana projects" },
      { status: 500 }
    )
  }
})
