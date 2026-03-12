import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { generateMeetingIntelligence } from "@/lib/ai/claude-client"
import { aiRateLimit } from "@/lib/api/rate-limit"
import { checkCreditsOrRespond, recordUsage, AI_CREDIT_COSTS } from "@/lib/ai/credits"
import { meetings } from "@/lib/db/meetings"
import { sql } from "@/lib/db/sql"
import { logger } from "@/lib/logger"
import type { ApiResponse, MeetingIntelligence } from "@/lib/types"

export const POST = withAuth(async (request, auth) => {
  try {
    // Rate limit: 10 meeting intelligence requests per user per hour
    const rateCheck = aiRateLimit(auth.user.id, "meeting-intelligence")
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } }
      )
    }

    // Check AI credits before processing
    const creditCheck = await checkCreditsOrRespond({
      organizationId: auth.organization.id,
      userId: auth.user.id,
    })
    if (creditCheck instanceof NextResponse) {
      return creditCheck as NextResponse<ApiResponse<null>>
    }

    // Parse and validate body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      )
    }

    if (!body || typeof body !== "object" || !("meetingId" in body)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "meetingId is required" },
        { status: 400 }
      )
    }

    const { meetingId } = body as { meetingId: string }

    if (!meetingId || typeof meetingId !== "string" || meetingId.trim() === "") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "meetingId must be a non-empty string" },
        { status: 400 }
      )
    }

    // Fetch the full meeting with sections
    const meeting = await meetings.getById(meetingId)
    if (!meeting) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Meeting not found" },
        { status: 404 }
      )
    }

    // Verify the meeting's workspace belongs to the authenticated org
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(
      meeting.workspaceId,
      auth.organization.id
    )
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Meeting not found" },
        { status: 404 }
      )
    }

    // Fetch associated issues and todos
    const [meetingIssues, meetingTodos] = await Promise.all([
      meetings.getMeetingIssues(meetingId),
      meetings.getTodos(meetingId),
    ])

    // Call AI to generate meeting intelligence
    const { result: intelligence, usage } = await generateMeetingIntelligence({
      sections: meeting.sections.map((s) => ({
        sectionType: s.sectionType,
        data: s.data,
      })),
      issues: meetingIssues.map((i) => ({
        title: i.title,
        status: i.status,
        resolution: i.resolution,
      })),
      todos: meetingTodos.map((t) => ({
        title: t.title,
        assigneeName: t.assigneeName,
        completed: t.completed,
      })),
      attendees: meeting.attendees,
      notes: meeting.notes,
    })

    // Persist AI fields on the meeting record
    await sql`
      UPDATE meetings
      SET
        ai_summary = ${intelligence.summary},
        ai_action_items = ${JSON.stringify(intelligence.actionItems)}::jsonb,
        ai_key_decisions = ${JSON.stringify(intelligence.keyDecisions)}::jsonb
      WHERE id = ${meetingId}
    `

    // Record AI usage
    await recordUsage({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "meeting-intelligence",
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      credits: AI_CREDIT_COSTS.meetingIntelligence,
      reservationId: creditCheck.reservationId,
    })

    return NextResponse.json<ApiResponse<MeetingIntelligence>>({
      success: true,
      data: intelligence,
    })
  } catch (error) {
    logger.error({ error }, "Meeting intelligence generation error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to generate meeting intelligence" },
      { status: 500 }
    )
  }
})
