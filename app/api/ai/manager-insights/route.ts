import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { generateManagerInsights } from "@/lib/ai/claude-client"
import { aiRateLimit } from "@/lib/api/rate-limit"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { aiManagerInsightsSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

export const POST = withAuth(async (request, auth) => {
  try {
    // Rate limit: 20 manager insights requests per user per hour
    const rateCheck = aiRateLimit(auth.user.id, 'manager-insights')
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
    }

    // Check AI credits before processing
    const creditCheck = await checkCreditsOrRespond({
      organizationId: auth.organization.id,
      userId: auth.user.id,
    })
    if (creditCheck instanceof NextResponse) {
      return creditCheck as NextResponse<ApiResponse<null>>
    }

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

    const { result: insights, usage } = await generateManagerInsights({ directReports, rocks, tasks, eodReports })

    // Record AI usage
    await recordUsage({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "manager-insights",
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    })

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
