import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { endMeetingSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import { isValidTransition, getTransitionErrorMessage } from "@/lib/api/meetings"
import type { ApiResponse } from "@/lib/types"
import type { Meeting, MeetingStats } from "@/lib/db/meetings"

interface EndMeetingResponse {
  meeting: Meeting
  stats: MeetingStats
}

// POST /api/meetings/[id]/end - End a meeting with rating
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const { rating, notes } = await validateBody(request, endMeetingSchema)

    const meeting = await meetings.getById(id)

    if (!meeting) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Meeting not found" },
        { status: 404 }
      )
    }

    // Check workspace access
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, meeting.workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    // STATE MACHINE VALIDATION: Can only end meetings that are in progress
    if (!isValidTransition(meeting.status, "completed")) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: getTransitionErrorMessage(meeting.status, "completed") },
        { status: 400 }
      )
    }

    // End the meeting
    const endedMeeting = await meetings.end(id, rating, notes)
    if (!endedMeeting) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to end meeting" },
        { status: 500 }
      )
    }

    // Get stats
    const stats = await meetings.getStats(meeting.workspaceId)

    logger.info(`Meeting ended: ${id} with rating ${rating || "none"}`)

    return NextResponse.json<ApiResponse<EndMeetingResponse>>({
      success: true,
      data: {
        meeting: endedMeeting,
        stats,
      },
      message: "Meeting ended successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "End meeting error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to end meeting" },
      { status: 500 }
    )
  }
}
