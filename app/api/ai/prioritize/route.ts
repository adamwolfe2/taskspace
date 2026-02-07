import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { prioritizeTasks } from "@/lib/ai/claude-client"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

export const POST = withAuth(async (request, auth) => {
  try {
    const { workspaceId, tasks, rocks } = await request.json() as {
      workspaceId: string
      tasks: Array<{ id: string; title: string; priority: string; status: string; dueDate?: string; assigneeName?: string; rockTitle?: string }>
      rocks: Array<{ title: string; progress: number; status: string }>
    }

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

    const result = await prioritizeTasks(tasks, rocks)

    return NextResponse.json<ApiResponse<typeof result>>({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error({ error }, "Task prioritize error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to prioritize tasks" },
      { status: 500 }
    )
  }
})
