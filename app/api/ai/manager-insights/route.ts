import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { generateManagerInsights } from "@/lib/ai/claude-client"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { aiManagerInsightsSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

export const POST = withAuth(async (request, auth) => {
  try {
    const validated = await validateBody(request, aiManagerInsightsSchema)
    const { workspaceId } = validated
    const directReports = validated.directReports as Array<{ name: string; tasksCompleted: number; rocksOnTrack: number; eodRate: number }> | undefined
    const rocks = validated.rocks as Array<{ title: string; progress: number; status: string; ownerName?: string }> | undefined
    const tasks = validated.tasks as Array<{ title: string; status: string; assigneeName?: string }> | undefined
    const eodReports = validated.eodReports as Array<{ userId: string; date: string; sentiment?: string }> | undefined

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
