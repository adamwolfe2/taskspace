import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import type { RouteContext } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { logger } from "@/lib/logger"
import { isValidTransition, getTransitionErrorMessage } from "@/lib/api/meetings"
import type { ApiResponse } from "@/lib/types"
import type { Meeting, MeetingSection, MeetingPrep } from "@/lib/db/meetings"

interface StartMeetingResponse {
  meeting: Meeting
  sections: MeetingSection[]
  prep: MeetingPrep
}

// POST /api/meetings/[id]/start - Start a meeting and get prep data
export const POST = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params
    const meetingData = await meetings.getById(id)

    if (!meetingData) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Meeting not found" },
        { status: 404 }
      )
    }

    // Check workspace access
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, meetingData.workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    // STATE MACHINE VALIDATION: Check if transition to in_progress is valid
    if (meetingData.status === "in_progress") {
      // Meeting already started, just return current state with prep
      const prep = await meetings.getPrep(meetingData.workspaceId)
      return NextResponse.json<ApiResponse<StartMeetingResponse>>({
        success: true,
        data: {
          meeting: meetingData,
          sections: meetingData.sections,
          prep,
        },
      })
    }

    // Verify transition from current state to in_progress is valid
    if (!isValidTransition(meetingData.status, "in_progress")) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: getTransitionErrorMessage(meetingData.status, "in_progress") },
        { status: 400 }
      )
    }

    // Start the meeting - returns meeting, sections, and prep
    const result = await meetings.start(id)

    logger.info(`Meeting started: ${id} in workspace ${meetingData.workspaceId}`)

    return NextResponse.json<ApiResponse<StartMeetingResponse>>({
      success: true,
      data: {
        meeting: result.meeting,
        sections: result.sections,
        prep: result.prep,
      },
      message: "Meeting started successfully",
    })
  } catch (error) {
    logger.error({ error }, "Start meeting error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to start meeting" },
      { status: 500 }
    )
  }
})
