import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse, PeopleVelocity, PeopleVelocityMetrics } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// GET /api/people/velocity - Compute per-week velocity metrics for a user
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const weeksParam = searchParams.get("weeks")
    const weeks = weeksParam ? parseInt(weeksParam, 10) : 13

    if (!userId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "userId is required" },
        { status: 400 }
      )
    }

    if (isNaN(weeks) || weeks < 1 || weeks > 52) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "weeks must be a number between 1 and 52" },
        { status: 400 }
      )
    }

    // Build week start dates (most recent first)
    const weekStarts: string[] = []
    const today = new Date()
    // Start from the beginning of the current ISO week (Monday)
    const currentWeekStart = new Date(today)
    const dayOfWeek = currentWeekStart.getDay() // 0=Sun
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    currentWeekStart.setDate(currentWeekStart.getDate() + diffToMonday)
    currentWeekStart.setHours(0, 0, 0, 0)

    for (let i = 0; i < weeks; i++) {
      const ws = new Date(currentWeekStart)
      ws.setDate(ws.getDate() - i * 7)
      weekStarts.push(ws.toISOString().split("T")[0])
    }

    const velocityData: PeopleVelocity[] = await Promise.all(
      weekStarts.map(async (weekStart) => {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        const weekEndStr = weekEnd.toISOString().split("T")[0]

        // Tasks completed this week
        const completedTasksResult = await sql`
          SELECT COUNT(*) AS count
          FROM assigned_tasks
          WHERE assignee_id = ${userId}
            AND org_id = ${auth.organization.id}
            AND status = 'completed'
            AND completed_at::date >= ${weekStart}::date
            AND completed_at::date <= ${weekEndStr}::date
        `
        const tasksCompleted = parseInt(completedTasksResult.rows[0]?.count as string, 10) || 0

        // Tasks due this week
        const tasksDueResult = await sql`
          SELECT COUNT(*) AS count
          FROM assigned_tasks
          WHERE assignee_id = ${userId}
            AND org_id = ${auth.organization.id}
            AND due_date::date >= ${weekStart}::date
            AND due_date::date <= ${weekEndStr}::date
        `
        const tasksDue = parseInt(tasksDueResult.rows[0]?.count as string, 10) || 0

        // Rock milestones hit this week (milestones stored as JSONB array)
        const milestonesResult = await sql`
          SELECT COALESCE(
            (SELECT COUNT(*)
             FROM rocks r,
               jsonb_array_elements(r.milestones) AS m
             WHERE r.user_id = ${userId}
               AND r.org_id = ${auth.organization.id}
               AND (m->>'completed')::boolean = true
               AND (m->>'completedAt')::date >= ${weekStart}::date
               AND (m->>'completedAt')::date <= ${weekEndStr}::date
            ), 0
          ) AS count
        `
        const rockMilestonesHit = parseInt(milestonesResult.rows[0]?.count as string, 10) || 0

        // EOD reports submitted this week
        const eodResult = await sql`
          SELECT COUNT(*) AS count
          FROM eod_reports
          WHERE user_id = ${userId}
            AND org_id = ${auth.organization.id}
            AND date::date >= ${weekStart}::date
            AND date::date <= ${weekEndStr}::date
        `
        const _eodCount = parseInt(eodResult.rows[0]?.count as string, 10) || 0

        // Average mood this week (from eod_reports mood field if available)
        const moodResult = await sql`
          SELECT AVG(
            CASE
              WHEN mood = 'great' THEN 5
              WHEN mood = 'good' THEN 4
              WHEN mood = 'okay' THEN 3
              WHEN mood = 'poor' THEN 2
              WHEN mood = 'bad' THEN 1
              ELSE 3
            END
          ) AS avg_mood
          FROM eod_reports
          WHERE user_id = ${userId}
            AND org_id = ${auth.organization.id}
            AND date::date >= ${weekStart}::date
            AND date::date <= ${weekEndStr}::date
        `
        const avgMood = parseFloat(moodResult.rows[0]?.avg_mood as string) || 3

        // Compute EOD streak up to end of this week
        const streakResult = await sql`
          SELECT COUNT(*) AS count
          FROM eod_reports
          WHERE user_id = ${userId}
            AND org_id = ${auth.organization.id}
            AND date::date >= ${weekStart}::date
            AND date::date <= ${weekEndStr}::date
        `
        const eodStreak = parseInt(streakResult.rows[0]?.count as string, 10) || 0

        // Velocity score: weighted average
        // Tasks: 40%, Rock milestones: 20%, EOD: 25%, Mood: 15%
        const taskScore = tasksDue > 0 ? Math.min((tasksCompleted / tasksDue) * 100, 100) : tasksCompleted > 0 ? 100 : 50
        const milestoneScore = rockMilestonesHit > 0 ? Math.min(rockMilestonesHit * 20, 100) : 50
        const eodScore = Math.min(eodStreak * 20, 100) // 5 days = 100%
        const moodScore = (avgMood / 5) * 100

        const velocityScore = Math.round(
          taskScore * 0.4 +
          milestoneScore * 0.2 +
          eodScore * 0.25 +
          moodScore * 0.15
        )

        const metrics: PeopleVelocityMetrics = {
          tasksCompleted,
          tasksDue,
          rockMilestonesHit,
          eodStreak,
          avgMood: Math.round(avgMood * 10) / 10,
          velocityScore,
        }

        return {
          id: `vel_${userId}_${weekStart}`,
          orgId: auth.organization.id,
          userId,
          weekStart,
          metrics,
          computedAt: new Date().toISOString(),
        }
      })
    )

    return NextResponse.json<ApiResponse<PeopleVelocity[]>>({
      success: true,
      data: velocityData,
    })
  } catch (error) {
    logError(logger, "People velocity error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to compute velocity metrics" },
      { status: 500 }
    )
  }
})
