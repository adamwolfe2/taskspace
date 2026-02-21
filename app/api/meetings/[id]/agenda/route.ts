import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { sql } from "@/lib/db/sql"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateAgendaSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

// GET /api/meetings/[id]/agenda - Get meeting agenda
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

    // SECURITY: Verify meeting's workspace belongs to authenticated organization
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

    // Get sections with their durations
    const agenda = meeting.sections.map((section) => ({
      sectionType: section.sectionType,
      orderIndex: section.orderIndex,
      durationTarget: section.durationTarget,
      completed: section.completed,
      startedAt: section.startedAt,
      endedAt: section.endedAt,
    }))

    return NextResponse.json<ApiResponse<typeof agenda>>({
      success: true,
      data: agenda,
    })
  } catch (error) {
    logger.error({ error }, "Get meeting agenda error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get meeting agenda" },
      { status: 500 }
    )
  }
})

// POST /api/meetings/[id]/agenda - Update meeting agenda
export const POST = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params
    const { sections } = await validateBody(request, updateAgendaSchema)

    const meeting = await meetings.getById(id)
    if (!meeting) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Meeting not found" },
        { status: 404 }
      )
    }

    // SECURITY: Verify meeting's workspace belongs to authenticated organization
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

    // Don't allow modifying agenda of in-progress or completed meetings
    if (meeting.status === "in_progress" || meeting.status === "completed") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Cannot modify agenda of an in-progress or completed meeting" },
        { status: 400 }
      )
    }

    // Validate no duplicate section types
    const sectionTypes = sections.map((s) => s.sectionType)
    const hasDuplicates = new Set(sectionTypes).size !== sectionTypes.length
    if (hasDuplicates) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Duplicate section types not allowed" },
        { status: 400 }
      )
    }

    // Update each section
    for (const section of sections) {
      const { sectionType, orderIndex, durationTarget } = section

      // Update section
      await sql`
        UPDATE meeting_sections
        SET
          order_index = ${orderIndex},
          duration_target = ${durationTarget},
          updated_at = NOW()
        WHERE meeting_id = ${id} AND section_type = ${sectionType}
      `
    }

    // Get updated meeting
    const updatedMeeting = await meetings.getById(id)
    if (!updatedMeeting) {
      throw new Error("Failed to retrieve updated meeting")
    }

    logger.info(`Agenda updated for meeting ${id}`)

    const updatedAgenda = updatedMeeting.sections.map((section) => ({
      sectionType: section.sectionType,
      orderIndex: section.orderIndex,
      durationTarget: section.durationTarget,
      completed: section.completed,
      startedAt: section.startedAt,
      endedAt: section.endedAt,
    }))

    return NextResponse.json<ApiResponse<typeof updatedAgenda>>({
      success: true,
      data: updatedAgenda,
      message: "Agenda updated successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Update meeting agenda error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update meeting agenda" },
      { status: 500 }
    )
  }
})
