import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { generateManagerInsights } from "@/lib/ai/claude-client"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

export const POST = withAuth(async (request, auth) => {
  try {
    const { workspaceId, directReports, rocks, tasks, eodReports } = await request.json()

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
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    const insights = await generateManagerInsights({ directReports, rocks, tasks, eodReports })

    return NextResponse.json<ApiResponse<typeof insights>>({
      success: true,
      data: insights,
    })
  } catch (error) {
    logger.error({ error }, "Manager insights error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to generate manager insights" },
      { status: 500 }
    )
  }
})
