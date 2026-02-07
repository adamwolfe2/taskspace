import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { prioritizeTasks } from "@/lib/ai/claude-client"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { aiPrioritizeSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

export const POST = withAuth(async (request, auth) => {
  try {
    const { workspaceId, tasks, rocks } = await validateBody(request, aiPrioritizeSchema)

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
