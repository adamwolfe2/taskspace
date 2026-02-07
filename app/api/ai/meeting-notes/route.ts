import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { generateMeetingNotesSummary } from "@/lib/ai/claude-client"
import { aiRateLimit } from "@/lib/api/rate-limit"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { aiMeetingNotesSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

export const POST = withAuth(async (request, auth) => {
  try {
    // Rate limit: 20 meeting notes requests per user per hour
    const rateCheck = aiRateLimit(auth.user.id, 'meeting-notes')
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
    }

    const validated = await validateBody(request, aiMeetingNotesSchema)
    const { workspaceId } = validated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meetingData = validated.meetingData as any

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

    const summary = await generateMeetingNotesSummary(meetingData)

    return NextResponse.json<ApiResponse<typeof summary>>({
      success: true,
      data: summary,
    })
  } catch (error) {
    logger.error({ error }, "Meeting notes summary error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to generate meeting notes summary" },
      { status: 500 }
    )
  }
})
