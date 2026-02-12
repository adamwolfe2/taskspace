import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import type { RouteContext } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateMeetingSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import { isTerminalState } from "@/lib/api/meetings"
import type { ApiResponse } from "@/lib/types"
import type { MeetingWithDetails, MeetingSection } from "@/lib/db/meetings"

// GET /api/meetings/[id] - Get meeting with full details
export const GET = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params
    const meeting = await meetings.getById(id)

    if (!meeting) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Meeting not found" },
        { status: 404 }
      )
    }

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(meeting.workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
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
})

// PATCH /api/meetings/[id] - Update meeting details
export const PATCH = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params

    const meeting = await meetings.getById(id)
    if (!meeting) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Meeting not found" },
        { status: 404 }
      )
    }

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(meeting.workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
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

    // STATE MACHINE VALIDATION: Once completed or cancelled, meetings are read-only
    // Only admins can modify terminal state meetings
    if (isTerminalState(meeting.status)) {
      const isAdmin = auth.member.role === 'admin' || auth.member.role === 'owner'
      if (!isAdmin) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `Cannot modify a ${meeting.status} meeting. Meetings in terminal states are read-only.` },
          { status: 400 }
        )
      }
      // Log admin override for audit
      logger.warn(`Admin ${auth.user.id} modifying ${meeting.status} meeting ${id}`)
    }

    const { notes, attendees, title } = await validateBody(request, updateMeetingSchema)
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
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Update meeting error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update meeting" },
      { status: 500 }
    )
  }
})

// DELETE /api/meetings/[id] - Cancel/delete a meeting
export const DELETE = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params
    const meeting = await meetings.getById(id)

    if (!meeting) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Meeting not found" },
        { status: 404 }
      )
    }

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(meeting.workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
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
})
