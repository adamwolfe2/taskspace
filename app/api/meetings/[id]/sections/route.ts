import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import type { RouteContext } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateMeetingSectionSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"
import type { MeetingSection, SectionType } from "@/lib/db/meetings"

// PATCH /api/meetings/[id]/sections - Update a section (start, complete, update data)
export const PATCH = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params
    const { sectionType, action, data } = await validateBody(request, updateMeetingSectionSchema)

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

    // Meeting must be in progress
    if (meeting.status !== "in_progress") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Meeting must be in progress to update sections" },
        { status: 400 }
      )
    }

    let updatedSection: MeetingSection | null = null

    switch (action) {
      case "start":
        updatedSection = await meetings.startSection(id, sectionType)
        break
      case "complete":
        const result = await meetings.completeSection(id, sectionType, data)
        updatedSection = result.completedSection
        break
      case "update":
        updatedSection = await meetings.updateSectionData(id, sectionType, data || {})
        break
      default:
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Invalid action" },
          { status: 400 }
        )
    }

    if (!updatedSection) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to update section" },
        { status: 500 }
      )
    }

    logger.info(`Section ${sectionType} ${action}ed in meeting ${id}`)

    return NextResponse.json<ApiResponse<MeetingSection>>({
      success: true,
      data: updatedSection,
      message: `Section ${action}ed successfully`,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Update section error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update section" },
      { status: 500 }
    )
  }
})
