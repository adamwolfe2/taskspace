import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import { generateOneOnOnePrep } from "@/lib/ai/claude-client"
import { sql } from "@/lib/db/sql"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { oneOnOnePrepSchema } from "@/lib/validation/schemas"
import type { ApiResponse, OneOnOnePrep } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// POST /api/ai/one-on-ones/prep - Generate AI prep for a 1-on-1
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const { reportId, workspaceId, oneOnOneId } = await validateBody(request, oneOnOnePrepSchema)

    // Credit check
    const creditCheck = await checkCreditsOrRespond({
      organizationId: auth.organization.id,
      userId: auth.user.id,
    })
    if (creditCheck instanceof NextResponse) return creditCheck as NextResponse<ApiResponse<null>>

    // Fetch report's EODs from last 14 days
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split("T")[0]

    const eodsResult = await sql`
      SELECT date, challenges,
        CASE
          WHEN mood = 'great' THEN 5
          WHEN mood = 'good' THEN 4
          WHEN mood = 'okay' THEN 3
          WHEN mood = 'poor' THEN 2
          WHEN mood = 'bad' THEN 1
          ELSE NULL
        END AS mood_score,
        mood,
        ai_summary
      FROM eod_reports
      WHERE user_id = ${reportId}
        AND org_id = ${auth.organization.id}
        AND date::date >= ${fourteenDaysAgoStr}::date
      ORDER BY date DESC
      LIMIT 14
    `

    const reportEODs = eodsResult.rows.map(row => ({
      date: row.date as string,
      summary: (row.ai_summary as string) || undefined,
      sentiment: (row.mood as string) || undefined,
    }))

    // Fetch rocks for this user
    const rocksResult = await sql`
      SELECT title, progress, status
      FROM rocks
      WHERE user_id = ${reportId}
        AND org_id = ${auth.organization.id}
        AND status != 'completed'
      ORDER BY created_at DESC
      LIMIT 10
    `

    const reportRocks = rocksResult.rows.map(row => ({
      title: row.title as string,
      progress: (row.progress as number) || 0,
      status: row.status as "on-track" | "at-risk" | "blocked" | "completed",
    }))

    // Fetch task stats
    const taskStatsResult = await sql`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (
          WHERE status != 'completed'
            AND due_date IS NOT NULL
            AND due_date::date < NOW()::date
        ) AS overdue
      FROM assigned_tasks
      WHERE assignee_id = ${reportId}
        AND org_id = ${auth.organization.id}
    `

    const taskRow = taskStatsResult.rows[0] as Record<string, unknown>
    const reportTasks = {
      completed: parseInt(taskRow.completed as string, 10) || 0,
      total: parseInt(taskRow.total as string, 10) || 0,
      overdue: parseInt(taskRow.overdue as string, 10) || 0,
    }

    // Fetch mood data from EODs
    const moodData = eodsResult.rows.map(row => ({
      date: row.date as string,
      mood: (row.mood as string) || undefined,
      score: row.mood_score ? (row.mood_score as number) : undefined,
    }))

    // Generate AI prep
    const { result: prep, usage } = await generateOneOnOnePrep({
      reportEODs,
      reportRocks,
      reportTasks,
      reportMood: moodData,
    })

    // Update the one_on_one record with ai_prep if oneOnOneId is provided
    if (oneOnOneId) {
      await sql`
        UPDATE one_on_ones
        SET
          ai_prep = ${JSON.stringify(prep)}::jsonb,
          updated_at = NOW()
        WHERE id = ${oneOnOneId}
          AND org_id = ${auth.organization.id}
      `
    }

    // Record AI usage
    await recordUsage({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "one-on-one-prep",
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    })

    return NextResponse.json<ApiResponse<OneOnOnePrep>>({
      success: true,
      data: prep,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "AI 1-on-1 prep error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to generate 1-on-1 prep" },
      { status: 500 }
    )
  }
})
