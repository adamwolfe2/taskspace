import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { sql } from "@/lib/db/sql"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"
import type { SectionType } from "@/lib/db/meetings"

interface AgendaSection {
  sectionType: SectionType
  orderIndex: number
  durationTarget: number
}

interface UpdateAgendaRequest {
  sections: AgendaSection[]
}

// GET /api/meetings/[id]/agenda - Get meeting agenda
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
}

// POST /api/meetings/[id]/agenda - Update meeting agenda
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
    const body: UpdateAgendaRequest = await request.json()
    const { sections } = body

    if (!sections || !Array.isArray(sections)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Sections array is required" },
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

    // Don't allow modifying agenda of in-progress or completed meetings
    if (meeting.status === "in_progress" || meeting.status === "completed") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Cannot modify agenda of an in-progress or completed meeting" },
        { status: 400 }
      )
    }

    // Validate section types
    const validSectionTypes: SectionType[] = ["segue", "scorecard", "rocks", "headlines", "ids", "conclude"]
    const sectionTypes = sections.map((s) => s.sectionType)
    const hasInvalidTypes = sectionTypes.some((type) => !validSectionTypes.includes(type))

    if (hasInvalidTypes) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid section type" },
        { status: 400 }
      )
    }

    // Ensure all required sections are present
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

      // Validate duration
      if (durationTarget < 1 || durationTarget > 120) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `Duration for ${sectionType} must be between 1 and 120 minutes` },
          { status: 400 }
        )
      }

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
    logger.error({ error }, "Update meeting agenda error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update meeting agenda" },
      { status: 500 }
    )
  }
}
