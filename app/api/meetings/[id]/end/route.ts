import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { logger } from "@/lib/logger"
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
    const body = await request.json()
    const { rating, notes } = body

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

    // Can only end meetings that are in progress
    if (meeting.status !== "in_progress") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Can only end meetings that are in progress" },
        { status: 400 }
      )
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 10)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Rating must be between 1 and 10" },
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
    logger.error({ error }, "End meeting error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to end meeting" },
      { status: 500 }
    )
  }
}
