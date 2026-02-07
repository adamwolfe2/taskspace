import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { generateMeetingPrep } from "@/lib/ai/claude-client"
import { getScorecardTrends } from "@/lib/db/scorecard"
import { aiRateLimit } from "@/lib/api/rate-limit"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
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

    const validated = await validateBody(request, aiMeetingPrepSchema)
    const { workspaceId } = validated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rocks = validated.rocks as any
    const tasks = validated.tasks as any
    const issues = validated.issues as any

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
    const prep = await generateMeetingPrep({ rocks, tasks, issues, scorecardTrends: trends })

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
