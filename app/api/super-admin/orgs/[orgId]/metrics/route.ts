import { NextRequest, NextResponse } from "next/server"
import { withSuperAdmin, type RouteContext } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logError, logger } from "@/lib/logger"

interface Performer {
  name: string
  score: number
  streak: number
}

interface StreakEntry {
  name: string
  currentStreak: number
}

interface OrgMetricsData {
  avgFocusScore: number
  focusScoreTrend: "up" | "down" | "stable"
  topPerformers: Performer[]
  memberEngagementRate: number
  streakLeaderboard: StreakEntry[]
}

/**
 * Compute the consecutive weekday EOD streak for a user, counting backwards
 * from today. Returns the number of consecutive weekdays with an EOD submission.
 */
function computeStreak(
  eodDates: Set<string>,
  today: Date
): number {
  let streak = 0
  const current = new Date(today)

  // Start from today and walk backwards
  for (let i = 0; i < 365; i++) {
    const dayOfWeek = current.getDay()

    // Skip weekends (Saturday=6, Sunday=0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      current.setDate(current.getDate() - 1)
      continue
    }

    const dateStr = current.toISOString().split("T")[0]
    if (eodDates.has(dateStr)) {
      streak++
    } else {
      // For today specifically, a missing EOD doesn't break the streak
      // (they may not have submitted yet today)
      if (i === 0 && dayOfWeek !== 0 && dayOfWeek !== 6) {
        current.setDate(current.getDate() - 1)
        continue
      }
      break
    }

    current.setDate(current.getDate() - 1)
  }

  return streak
}

/**
 * GET /api/super-admin/orgs/[orgId]/metrics
 *
 * Returns aggregated productivity metrics for an organization:
 * focus scores, trends, top performers, engagement rate, and streak leaderboard.
 */
export const GET = withSuperAdmin(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    const params = await context!.params
    const orgId = params.orgId

    if (!orgId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "orgId is required" },
        { status: 400 }
      )
    }

    // Verify the super admin has membership in this org
    const { rows: memberCheck } = await sql`
      SELECT id FROM organization_members
      WHERE organization_id = ${orgId}
        AND user_id = ${auth.user.id}
        AND role IN ('owner', 'admin')
        AND status = 'active'
    `
    if (memberCheck.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
    }

    // Get all active members with their stats in a single query
    const { rows: memberStats } = await sql`
      SELECT
        om.user_id,
        COALESCE(u.name, om.name, 'Unknown') as name,
        -- EOD count in last 30 days (for focus score)
        (SELECT COUNT(DISTINCT er.date)::int FROM eod_reports er
         WHERE er.user_id = om.user_id AND er.organization_id = ${orgId}
           AND er.date >= CURRENT_DATE - INTERVAL '30 days') as eod_count_30d,
        -- Weekdays in last 30 days (for rate calculation)
        (SELECT COUNT(*)::int FROM generate_series(
          CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '1 day'::interval
        ) d(dt) WHERE EXTRACT(DOW FROM d.dt) NOT IN (0, 6)) as weekdays_30d,
        -- Average rock progress (0-100)
        COALESCE((SELECT AVG(r.progress)::int FROM rocks r
         WHERE r.user_id = om.user_id AND r.organization_id = ${orgId}
           AND r.status != 'completed'), 0) as rock_progress,
        -- Task completion rate: completed / (completed + active) in last 30 days
        COALESCE((SELECT
          CASE WHEN COUNT(*)::int = 0 THEN 0
          ELSE ROUND(
            COUNT(*) FILTER (WHERE at2.status = 'completed')::numeric /
            NULLIF(COUNT(*)::numeric, 0) * 100
          )::int END
         FROM assigned_tasks at2
         WHERE at2.assignee_id = om.user_id AND at2.organization_id = ${orgId}
           AND at2.created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as task_completion_rate,
        -- Whether user submitted EOD in last 7 days (for engagement)
        (SELECT COUNT(DISTINCT er.date)::int FROM eod_reports er
         WHERE er.user_id = om.user_id AND er.organization_id = ${orgId}
           AND er.date >= CURRENT_DATE - INTERVAL '7 days') > 0 as engaged_7d
      FROM organization_members om
      LEFT JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = ${orgId}
        AND om.status = 'active'
        AND om.user_id IS NOT NULL
    `

    if (memberStats.length === 0) {
      return NextResponse.json<ApiResponse<OrgMetricsData>>({
        success: true,
        data: {
          avgFocusScore: 0,
          focusScoreTrend: "stable",
          topPerformers: [],
          memberEngagementRate: 0,
          streakLeaderboard: [],
        },
      })
    }

    // Get EOD dates for streak calculation (last 365 days for all members)
    const { rows: eodDateRows } = await sql`
      SELECT user_id, date
      FROM eod_reports
      WHERE organization_id = ${orgId}
        AND date >= CURRENT_DATE - INTERVAL '365 days'
      ORDER BY date DESC
    `

    // Group EOD dates by user
    const eodDatesByUser = new Map<string, Set<string>>()
    for (const row of eodDateRows) {
      const userId = row.user_id as string
      const dateStr = (row.date as Date)?.toISOString?.()?.split("T")[0] || String(row.date)
      if (!eodDatesByUser.has(userId)) {
        eodDatesByUser.set(userId, new Set())
      }
      eodDatesByUser.get(userId)!.add(dateStr)
    }

    const today = new Date()

    // Compute per-member focus scores and streaks
    const memberScores: { name: string; score: number; streak: number }[] = []

    for (const row of memberStats) {
      const userId = row.user_id as string
      const name = row.name as string
      const eodCount30d = row.eod_count_30d as number
      const weekdays30d = Math.max(row.weekdays_30d as number, 1)
      const rockProgress = row.rock_progress as number
      const taskCompletionRate = row.task_completion_rate as number

      // EOD rate over last 30 weekdays (0-100)
      const eodRate30d = Math.min(Math.round((eodCount30d / weekdays30d) * 100), 100)

      // Focus score: (eodRate * 0.5) + (rockProgress * 0.3) + (taskCompletionRate * 0.2)
      const focusScore = Math.round(
        (eodRate30d * 0.5) + (rockProgress * 0.3) + (taskCompletionRate * 0.2)
      )

      // Compute streak
      const userEodDates = eodDatesByUser.get(userId) || new Set<string>()
      const streak = computeStreak(userEodDates, today)

      memberScores.push({ name, score: focusScore, streak })
    }

    // Average focus score
    const avgFocusScore = Math.round(
      memberScores.reduce((sum, m) => sum + m.score, 0) / memberScores.length
    )

    // Compute prior period focus score for trend (7-37 days ago vs 0-30 days ago)
    // We use a simplified approach: query the prior period stats
    const { rows: priorStats } = await sql`
      SELECT
        om.user_id,
        (SELECT COUNT(DISTINCT er.date)::int FROM eod_reports er
         WHERE er.user_id = om.user_id AND er.organization_id = ${orgId}
           AND er.date >= CURRENT_DATE - INTERVAL '37 days'
           AND er.date < CURRENT_DATE - INTERVAL '7 days') as eod_count_prior,
        (SELECT COUNT(*)::int FROM generate_series(
          CURRENT_DATE - INTERVAL '37 days', CURRENT_DATE - INTERVAL '8 days', '1 day'::interval
        ) d(dt) WHERE EXTRACT(DOW FROM d.dt) NOT IN (0, 6)) as weekdays_prior,
        COALESCE((SELECT AVG(r.progress)::int FROM rocks r
         WHERE r.user_id = om.user_id AND r.organization_id = ${orgId}
           AND r.status != 'completed'), 0) as rock_progress_prior,
        COALESCE((SELECT
          CASE WHEN COUNT(*)::int = 0 THEN 0
          ELSE ROUND(
            COUNT(*) FILTER (WHERE at2.status = 'completed')::numeric /
            NULLIF(COUNT(*)::numeric, 0) * 100
          )::int END
         FROM assigned_tasks at2
         WHERE at2.assignee_id = om.user_id AND at2.organization_id = ${orgId}
           AND at2.created_at >= CURRENT_DATE - INTERVAL '37 days'
           AND at2.created_at < CURRENT_DATE - INTERVAL '7 days'), 0) as task_rate_prior
      FROM organization_members om
      WHERE om.organization_id = ${orgId}
        AND om.status = 'active'
        AND om.user_id IS NOT NULL
    `

    let priorAvgFocusScore = 0
    if (priorStats.length > 0) {
      let totalPriorScore = 0
      for (const row of priorStats) {
        const eodCountPrior = row.eod_count_prior as number
        const weekdaysPrior = Math.max(row.weekdays_prior as number, 1)
        const rockProgressPrior = row.rock_progress_prior as number
        const taskRatePrior = row.task_rate_prior as number
        const eodRatePrior = Math.min(Math.round((eodCountPrior / weekdaysPrior) * 100), 100)
        totalPriorScore += Math.round(
          (eodRatePrior * 0.5) + (rockProgressPrior * 0.3) + (taskRatePrior * 0.2)
        )
      }
      priorAvgFocusScore = Math.round(totalPriorScore / priorStats.length)
    }

    // Determine trend
    const scoreDiff = avgFocusScore - priorAvgFocusScore
    let focusScoreTrend: "up" | "down" | "stable" = "stable"
    if (scoreDiff >= 3) {
      focusScoreTrend = "up"
    } else if (scoreDiff <= -3) {
      focusScoreTrend = "down"
    }

    // Member engagement rate: % of active members who submitted EOD in last 7 days
    const engagedCount = memberStats.filter((r) => r.engaged_7d === true).length
    const memberEngagementRate = Math.round((engagedCount / memberStats.length) * 100)

    // Top 3 performers by focus score
    const topPerformers: Performer[] = [...memberScores]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((m) => ({ name: m.name, score: m.score, streak: m.streak }))

    // Top 5 streaks
    const streakLeaderboard: StreakEntry[] = [...memberScores]
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 5)
      .map((m) => ({ name: m.name, currentStreak: m.streak }))

    const data: OrgMetricsData = {
      avgFocusScore,
      focusScoreTrend,
      topPerformers,
      memberEngagementRate,
      streakLeaderboard,
    }

    return NextResponse.json<ApiResponse<OrgMetricsData>>({
      success: true,
      data,
    })
  } catch (error) {
    logError(logger, "Org metrics fetch error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch organization metrics" },
      { status: 500 }
    )
  }
})
