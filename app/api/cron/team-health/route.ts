import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse, Organization, TeamHealthDimensions } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { CONFIG } from "@/lib/config"
import * as Sentry from "@sentry/nextjs"
import { sql } from "@/lib/db/sql"

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const isProduction = process.env.NODE_ENV === "production"
  if (!cronSecret) {
    if (isProduction) return false
    return true
  }
  return request.headers.get("authorization") === `Bearer ${cronSecret}`
}

function isHealthCheckTime(org: Organization): boolean {
  const timezone = org.settings?.timezone || CONFIG.organization.defaultTimezone
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
    })
    const currentHour = parseInt(formatter.format(now), 10)
    return currentHour === 17 // 5 PM Friday
  } catch {
    return new Date().getUTCHours() === 17
  }
}

function getWeekStartDate(timezone: string): string {
  try {
    const now = new Date()
    // Get current day in timezone
    const dayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" })
    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    const dayOfWeek = dayFormatter.format(now)
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const dayIndex = days.indexOf(dayOfWeek)
    // Go back to Monday
    const mondayOffset = dayIndex === 0 ? 6 : dayIndex - 1
    const monday = new Date(now)
    monday.setDate(monday.getDate() - mondayOffset)
    return dateFormatter.format(monday)
  } catch {
    const now = new Date()
    const day = now.getDay()
    const mondayOffset = day === 0 ? 6 : day - 1
    now.setDate(now.getDate() - mondayOffset)
    return now.toISOString().split("T")[0]
  }
}

/**
 * Compute team health dimensions from existing data
 * Weights: EOD 25%, tasks 20%, rocks 20%, meetings 15%, mood 10%, escalation 10%
 */
async function computeHealthDimensions(
  orgId: string,
  workspaceId: string,
  weekStart: string
): Promise<TeamHealthDimensions & { overallScore: number }> {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekEndStr = weekEnd.toISOString().split("T")[0]

  // EOD Rate: % of active members who submitted EODs this week
  const [eodResult, memberResult] = await Promise.all([
    sql`SELECT COUNT(DISTINCT user_id) as count FROM eod_reports WHERE organization_id = ${orgId} AND date >= ${weekStart} AND date < ${weekEndStr}`,
    sql`SELECT COUNT(*) as count FROM organization_members WHERE organization_id = ${orgId} AND status = 'active'`,
  ])
  const eodSubmitters = parseInt(eodResult.rows[0]?.count || "0", 10)
  const totalMembers = parseInt(memberResult.rows[0]?.count || "1", 10)
  const eodRate = Math.round((eodSubmitters / Math.max(totalMembers, 1)) * 100)

  // Task Completion: % of tasks due this week that were completed
  const taskResult = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) as total
    FROM assigned_tasks
    WHERE organization_id = ${orgId}
      AND due_date >= ${weekStart} AND due_date < ${weekEndStr}
  `
  const tasksCompleted = parseInt(taskResult.rows[0]?.completed || "0", 10)
  const tasksDue = parseInt(taskResult.rows[0]?.total || "1", 10)
  const taskCompletion = Math.round((tasksCompleted / Math.max(tasksDue, 1)) * 100)

  // Rock Progress: average progress of active rocks
  const rockResult = await sql`
    SELECT AVG(progress) as avg_progress FROM rocks
    WHERE organization_id = ${orgId} AND status NOT IN ('completed', 'abandoned')
  `
  const rockProgress = Math.round(parseFloat(rockResult.rows[0]?.avg_progress || "0"))

  // Meeting Attendance: % of scheduled meetings that happened
  const meetingResult = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) as total
    FROM meetings
    WHERE workspace_id = ${workspaceId}
      AND scheduled_at >= ${weekStart}::date AND scheduled_at < ${weekEndStr}::date
  `
  const meetingsCompleted = parseInt(meetingResult.rows[0]?.completed || "0", 10)
  const meetingsTotal = parseInt(meetingResult.rows[0]?.total || "1", 10)
  const meetingAttendance = meetingsTotal > 0 ? Math.round((meetingsCompleted / meetingsTotal) * 100) : 80

  // Mood Score: average mood from EODs (default to 70 if no data)
  const moodResult = await sql`
    SELECT AVG(mood_score) as avg_mood FROM eod_reports
    WHERE organization_id = ${orgId} AND date >= ${weekStart} AND date < ${weekEndStr} AND mood_score IS NOT NULL
  `
  const moodScore = moodResult.rows[0]?.avg_mood ? Math.round(parseFloat(moodResult.rows[0].avg_mood)) : 70

  // Escalation Rate: inverse of % of issues that escalated (lower is better → higher score)
  const escalationResult = await sql`
    SELECT COUNT(*) as total FROM issues
    WHERE workspace_id = ${workspaceId}
      AND created_at >= ${weekStart}::date AND created_at < ${weekEndStr}::date
      AND priority >= 3
  `
  const highPriorityIssues = parseInt(escalationResult.rows[0]?.total || "0", 10)
  const escalationRate = Math.max(0, 100 - (highPriorityIssues * 10)) // Each high-priority issue costs 10 points

  // Weighted overall score
  const overallScore = Math.round(
    eodRate * 0.25 +
    taskCompletion * 0.20 +
    rockProgress * 0.20 +
    meetingAttendance * 0.15 +
    moodScore * 0.10 +
    escalationRate * 0.10
  )

  return {
    eodRate: Math.min(eodRate, 100),
    taskCompletion: Math.min(taskCompletion, 100),
    rockProgress: Math.min(rockProgress, 100),
    meetingAttendance: Math.min(meetingAttendance, 100),
    moodScore: Math.min(moodScore, 100),
    escalationRate: Math.min(escalationRate, 100),
    overallScore: Math.min(overallScore, 100),
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    logger.info({ timestamp: new Date().toISOString() }, "Running team health check")

    // Fast-exit: Friday health checks. UTC window for US timezones: 14-18 UTC
    const utcHour = new Date().getUTCHours()
    if (utcHour < 14 || utcHour > 18) {
      return NextResponse.json<ApiResponse<{ results: never[] }>>({
        success: true,
        data: { results: [] },
        message: "Outside 5 PM Friday window — skipped",
      })
    }

    const organizations = await db.organizations.findAll()
    const results: { orgId: string; success: boolean; skipped?: string; error?: string }[] = []

    for (const org of organizations) {
      if (!isHealthCheckTime(org)) {
        results.push({ orgId: org.id, success: true, skipped: "Not 5 PM" })
        continue
      }

      const timezone = org.settings?.timezone || CONFIG.organization.defaultTimezone
      const weekStart = getWeekStartDate(timezone)

      try {
        // Get workspaces for this org
        const workspaces = await sql`
          SELECT id FROM workspaces WHERE organization_id = ${org.id}
        `

        for (const ws of workspaces.rows) {
          const workspaceId = ws.id as string

          // Idempotency check
          const existing = await sql`
            SELECT id FROM team_health_snapshots
            WHERE workspace_id = ${workspaceId} AND week_start = ${weekStart}::date
          `
          if (existing.rows.length > 0) continue

          const health = await computeHealthDimensions(org.id, workspaceId, weekStart)

          await sql`
            INSERT INTO team_health_snapshots (id, org_id, workspace_id, week_start, overall_score, dimensions, computed_at, created_at)
            VALUES (
              ${generateId()},
              ${org.id},
              ${workspaceId},
              ${weekStart}::date,
              ${health.overallScore},
              ${JSON.stringify({
                eodRate: health.eodRate,
                taskCompletion: health.taskCompletion,
                rockProgress: health.rockProgress,
                meetingAttendance: health.meetingAttendance,
                moodScore: health.moodScore,
                escalationRate: health.escalationRate,
              })}::jsonb,
              NOW(),
              NOW()
            )
            ON CONFLICT (workspace_id, week_start) DO NOTHING
          `
        }

        results.push({ orgId: org.id, success: true })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logError(logger, `Team health failed for org ${org.id}`, error)
        Sentry.captureMessage("Cron team-health partially failed", {
          level: "warning",
          extra: { orgId: org.id, error: errorMessage },
        })
        results.push({ orgId: org.id, success: false, error: errorMessage })
      }
    }

    return NextResponse.json<ApiResponse<{ results: typeof results }>>({
      success: true,
      data: { results },
    })
  } catch (error) {
    logError(logger, "Team health cron error", error)
    Sentry.captureException(error, { extra: { job: "team-health" } })
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to compute team health" },
      { status: 500 }
    )
  }
}
