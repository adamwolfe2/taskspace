import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateMeetingNotesSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import { isTerminalState } from "@/lib/api/meetings"
import type { ApiResponse } from "@/lib/types"
import type { SectionType } from "@/lib/db/meetings"

// GET /api/meetings/[id]/notes - Get all notes for a meeting
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

    // Notes are stored in section data
    const notes = meeting.sections.map((section) => ({
      section: section.sectionType,
      content: section.data.notes || "",
      orderIndex: section.orderIndex,
    }))

    return NextResponse.json<ApiResponse<typeof notes>>({
      success: true,
      data: notes,
    })
  } catch (error) {
    logger.error({ error }, "Get meeting notes error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get meeting notes" },
      { status: 500 }
    )
  }
}

// POST /api/meetings/[id]/notes - Create/update notes for a section
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
    const { section, content } = await validateBody(request, updateMeetingNotesSchema)

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

    // STATE MACHINE VALIDATION: Prevent note modifications on completed meetings
    if (isTerminalState(meeting.status)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Cannot modify notes on a ${meeting.status} meeting. Notes are read-only after meeting ends.` },
        { status: 400 }
      )
    }

    // Get existing section data
    const existingSection = meeting.sections.find((s) => s.sectionType === section)
    if (!existingSection) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Section not found" },
        { status: 404 }
      )
    }

    // Update section data with notes
    const updatedData = {
      ...existingSection.data,
      notes: content,
      updatedBy: auth.user.id,
      updatedAt: new Date().toISOString(),
    }

    const updatedSection = await meetings.updateSectionData(id, section, updatedData)

    if (!updatedSection) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to update notes" },
        { status: 500 }
      )
    }

    logger.info(`Notes updated for section ${section} in meeting ${id}`)

    return NextResponse.json<ApiResponse<typeof updatedSection>>({
      success: true,
      data: updatedSection,
      message: "Notes updated successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Update meeting notes error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update meeting notes" },
      { status: 500 }
    )
  }
}
