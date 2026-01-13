import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"
import type { MeetingSection, SectionType } from "@/lib/db/meetings"

// PATCH /api/meetings/[id]/sections - Update a section (start, complete, update data)
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
    const { sectionType, action, data } = body as {
      sectionType: SectionType
      action: "start" | "complete" | "update"
      data?: Record<string, unknown>
    }

    if (!sectionType) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Section type is required" },
        { status: 400 }
      )
    }

    if (!action) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Action is required" },
        { status: 400 }
      )
    }

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
        updatedSection = await meetings.completeSection(id, sectionType, data)
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
    logger.error("Update section error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update section" },
      { status: 500 }
    )
  }
}
