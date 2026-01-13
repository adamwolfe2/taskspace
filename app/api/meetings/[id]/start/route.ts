import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"
import type { Meeting, MeetingSection, MeetingPrep } from "@/lib/db/meetings"

interface StartMeetingResponse {
  meeting: Meeting
  sections: MeetingSection[]
  prep: MeetingPrep
}

// POST /api/meetings/[id]/start - Start a meeting and get prep data
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

    // Can't start already started or completed meetings
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

    if (meetingData.status === "completed" || meetingData.status === "cancelled") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Cannot start a completed or cancelled meeting" },
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
    logger.error("Start meeting error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to start meeting" },
      { status: 500 }
    )
  }
}
