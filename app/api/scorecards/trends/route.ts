import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { getScorecardTrends } from "@/lib/db/scorecard"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

// GET /api/scorecards/trends?workspaceId=xxx&weeks=13
export const GET = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const weeks = parseInt(searchParams.get("weeks") || "13", 10)

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace ID is required" },
        { status: 400 }
      )
    }

    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      )
    }

    const trends = await getScorecardTrends(workspaceId, weeks)

    return NextResponse.json<ApiResponse<typeof trends>>({
      success: true,
      data: trends,
    })
  } catch (error) {
    logger.error({ error }, "Get scorecard trends error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get scorecard trends" },
      { status: 500 }
    )
  }
})
