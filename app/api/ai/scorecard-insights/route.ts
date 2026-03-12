import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { generateScorecardInsights } from "@/lib/ai/claude-client"
import { getScorecardTrends } from "@/lib/db/scorecard"
import { aiRateLimit } from "@/lib/api/rate-limit"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import { validateBody } from "@/lib/validation/middleware"
import { aiScorecardInsightsSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import { aiCache, CacheKeys } from "@/lib/cache"
import type { ApiResponse } from "@/lib/types"

export const POST = withAuth(async (request, auth) => {
  try {
    // Rate limit: 20 scorecard insights requests per user per hour
    const rateCheck = aiRateLimit(auth.user.id, 'scorecard-insights')
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

    const { workspaceId } = await validateBody(request, aiScorecardInsightsSchema)

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

    // Check cache first (4-hour TTL)
    const today = new Date().toISOString().split("T")[0]
    const cacheKey = CacheKeys.scorecardInsights(workspaceId, today)
    const cached = aiCache.get(cacheKey)
    if (cached) {
      return NextResponse.json<ApiResponse<typeof cached>>({
        success: true,
        data: cached,
        message: "Cached scorecard insights",
      })
    }

    const trends = await getScorecardTrends(workspaceId, 13)
    const { result: insights, usage } = await generateScorecardInsights(trends)

    // Cache the result
    aiCache.set(cacheKey, insights)

    // Record AI usage
    await recordUsage({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "scorecard-insights",
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      reservationId: creditCheck.reservationId,
    })

    return NextResponse.json<ApiResponse<typeof insights>>({
      success: true,
      data: insights,
    })
  } catch (error) {
    logger.error({ error }, "Scorecard insights error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to generate scorecard insights" },
      { status: 500 }
    )
  }
})
