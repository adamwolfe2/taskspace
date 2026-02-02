import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"
import type { MeetingWithDetails, MeetingSection } from "@/lib/db/meetings"

// GET /api/meetings/[id] - Get meeting with full details
export async function GET(
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

    return NextResponse.json<ApiResponse<MeetingWithDetails>>({
      success: true,
      data: meeting,
    })
  } catch (error) {
    logger.error({ error }, "Get meeting error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get meeting" },
      { status: 500 }
    )
  }
}

// PATCH /api/meetings/[id] - Update meeting details
export async function PATCH(
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

    const { notes, attendees, title } = body
    const updates: Record<string, unknown> = {}
    if (notes !== undefined) updates.notes = notes
    if (attendees !== undefined) updates.attendees = JSON.stringify(attendees)
    if (title !== undefined) updates.title = title

    const updated = await meetings.update(id, updates)

    return NextResponse.json<ApiResponse<MeetingWithDetails | null>>({
      success: true,
      data: updated,
      message: "Meeting updated successfully",
    })
  } catch (error) {
    logger.error({ error }, "Update meeting error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update meeting" },
      { status: 500 }
    )
  }
}

// DELETE /api/meetings/[id] - Cancel/delete a meeting
export async function DELETE(
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

    // Can't delete completed meetings
    if (meeting.status === "completed") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Cannot delete completed meetings" },
        { status: 400 }
      )
    }

    await meetings.cancel(id)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Meeting cancelled successfully",
    })
  } catch (error) {
    logger.error({ error }, "Delete meeting error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete meeting" },
      { status: 500 }
    )
  }
}
