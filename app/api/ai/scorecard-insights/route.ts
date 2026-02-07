import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { generateScorecardInsights } from "@/lib/ai/claude-client"
import { getScorecardTrends } from "@/lib/db/scorecard"
import { aiRateLimit } from "@/lib/api/rate-limit"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { aiScorecardInsightsSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
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

    const trends = await getScorecardTrends(workspaceId, 13)
    const insights = await generateScorecardInsights(trends)

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
