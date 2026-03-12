import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { generateMeetingPrep } from "@/lib/ai/claude-client"
import { getScorecardTrends } from "@/lib/db/scorecard"
import { aiRateLimit } from "@/lib/api/rate-limit"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import { validateBody } from "@/lib/validation/middleware"
import { aiMeetingPrepSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

export const POST = withAuth(async (request, auth) => {
  try {
    // Rate limit: 20 meeting prep requests per user per hour
    const rateCheck = aiRateLimit(auth.user.id, 'meeting-prep')
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

    const validated = await validateBody(request, aiMeetingPrepSchema)
    const { workspaceId } = validated
    // Client-provided data for AI prompt context — types are loosely validated by Zod schema
    type MeetingPrepContext = Parameters<typeof generateMeetingPrep>[0]
    const rocks = validated.rocks as MeetingPrepContext["rocks"]
    const tasks = validated.tasks as MeetingPrepContext["tasks"]
    const issues = validated.issues as MeetingPrepContext["issues"]

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

    const trends = await getScorecardTrends(workspaceId, 4)
    const { result: prep, usage } = await generateMeetingPrep({ rocks, tasks, issues, scorecardTrends: trends })

    // Record AI usage
    await recordUsage({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "meeting-prep",
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      reservationId: creditCheck.reservationId,
    })

    return NextResponse.json<ApiResponse<typeof prep>>({
      success: true,
      data: prep,
    })
  } catch (error) {
    logger.error({ error }, "Meeting prep error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to generate meeting prep" },
      { status: 500 }
    )
  }
})
