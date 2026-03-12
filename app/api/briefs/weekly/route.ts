import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { aiCache } from "@/lib/cache"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import { generateWeeklyBrief } from "@/lib/ai/claude-client"
import { generateId } from "@/lib/auth/password"
import { sql } from "@/lib/db/sql"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse, WeeklyBriefRecord } from "@/lib/types"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { generateWeeklyBriefSchema } from "@/lib/validation/schemas"
import { checkApiRateLimit, getRateLimitHeaders } from "@/lib/auth/rate-limit"

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || auth.user.id

    const cacheKey = `weekly-brief:${auth.organization.id}:${userId}`
    const cached = aiCache.get(cacheKey)
    if (cached) {
      return NextResponse.json<ApiResponse<WeeklyBriefRecord>>({
        success: true,
        data: cached as WeeklyBriefRecord,
      })
    }

    const result = await sql`
      SELECT id, org_id, user_id, week_start, content, created_at
      FROM weekly_briefs
      WHERE org_id = ${auth.organization.id} AND user_id = ${userId}
      ORDER BY week_start DESC
      LIMIT 1
    `

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: true,
        data: null,
      })
    }

    const row = result.rows[0]
    const brief: WeeklyBriefRecord = {
      id: row.id as string,
      orgId: row.org_id as string,
      userId: row.user_id as string,
      weekStart: (row.week_start as Date)?.toISOString().split("T")[0] || "",
      content: row.content as WeeklyBriefRecord["content"],
      createdAt: (row.created_at as Date)?.toISOString() || "",
    }

    aiCache.set(cacheKey, brief)

    return NextResponse.json<ApiResponse<WeeklyBriefRecord>>({
      success: true,
      data: brief,
    })
  } catch (error) {
    logError(logger, "Fetch weekly brief error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch weekly brief" },
      { status: 500 }
    )
  }
})

// POST /api/briefs/weekly — Generate a new Monday morning brief for the current user
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const { workspaceId } = await validateBody(request, generateWeeklyBriefSchema)

    // Per-user rate limit: max 5 requests per minute
    const rateLimit = await checkApiRateLimit(request, `briefs-weekly:${auth.user.id}`, 5, 60_000)
    if (!rateLimit.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Too many requests. Please wait a moment." },
        { status: 429, headers: getRateLimitHeaders(rateLimit, 5) }
      )
    }

    // Credit check
    const creditCheck = await checkCreditsOrRespond({
      organizationId: auth.organization.id,
      userId: auth.user.id,
    })
    if (creditCheck instanceof NextResponse) return creditCheck as NextResponse<ApiResponse<null>>

    // Determine current week start (Monday)
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    const weekStart = monday.toISOString().split("T")[0]

    // Gather open rocks
    const rocksResult = await sql`
      SELECT title, progress, status
      FROM rocks
      WHERE workspace_id = ${workspaceId}
        AND org_id = ${auth.organization.id}
        AND (assigned_to = ${auth.user.id} OR created_by = ${auth.user.id})
        AND status != 'completed'
      ORDER BY progress ASC
      LIMIT 10
    `

    const rocks = rocksResult.rows.map(row => ({
      title: row.title as string,
      progress: (row.progress as number) || 0,
      status: row.status as "on-track" | "at-risk" | "blocked" | "completed",
    }))

    // Gather tasks (due soon + overdue)
    const tasksResult = await sql`
      SELECT title, due_date, status
      FROM assigned_tasks
      WHERE workspace_id = ${workspaceId}
        AND org_id = ${auth.organization.id}
        AND assigned_to = ${auth.user.id}
        AND status != 'completed'
        AND (due_date IS NULL OR due_date >= NOW() - INTERVAL '7 days')
      ORDER BY due_date ASC NULLS LAST
      LIMIT 15
    `

    const tasks = tasksResult.rows.map(row => ({
      title: row.title as string,
      dueDate: (row.due_date as Date)?.toISOString().split("T")[0] || null,
      status: row.status as "pending" | "in-progress" | "completed",
    }))

    // Gather upcoming meetings (next 7 days)
    const meetingsResult = await sql`
      SELECT title, scheduled_at
      FROM meetings
      WHERE workspace_id = ${workspaceId}
        AND org_id = ${auth.organization.id}
        AND scheduled_at >= NOW()
        AND scheduled_at <= NOW() + INTERVAL '7 days'
      ORDER BY scheduled_at ASC
      LIMIT 5
    `

    const meetings = meetingsResult.rows.map(row => ({
      title: row.title as string,
      scheduledAt: (row.scheduled_at as Date)?.toISOString() || "",
    }))

    // Gather last week's EOD summaries for this user
    const eodResult = await sql`
      SELECT date, summary
      FROM eod_reports
      WHERE org_id = ${auth.organization.id}
        AND user_id = ${auth.user.id}
        AND date >= NOW() - INTERVAL '7 days'
      ORDER BY date DESC
      LIMIT 5
    `

    const lastWeekEODs = eodResult.rows.map(row => ({
      date: (row.date as Date)?.toISOString().split("T")[0] || "",
      summary: (row.summary as string) || undefined,
    }))

    // Generate AI brief
    const { result: briefContent, usage } = await generateWeeklyBrief({
      rocks,
      tasks,
      meetings,
      lastWeekEODs,
    })

    // Upsert — one brief per user per week
    const id = "brief_" + generateId()
    await sql`
      INSERT INTO weekly_briefs (id, org_id, user_id, week_start, content, created_at)
      VALUES (
        ${id},
        ${auth.organization.id},
        ${auth.user.id},
        ${weekStart}::date,
        ${JSON.stringify(briefContent)}::jsonb,
        NOW()
      )
      ON CONFLICT (org_id, user_id, week_start)
      DO UPDATE SET
        content = EXCLUDED.content,
        created_at = NOW()
    `

    await recordUsage({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "weekly-brief",
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    })

    aiCache.delete(`weekly-brief:${auth.organization.id}:${auth.user.id}`)

    const brief: WeeklyBriefRecord = {
      id,
      orgId: auth.organization.id,
      userId: auth.user.id,
      weekStart,
      content: briefContent,
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json<ApiResponse<WeeklyBriefRecord>>({
      success: true,
      data: brief,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    logError(logger, "Generate weekly brief error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to generate weekly brief" },
      { status: 500 }
    )
  }
})
