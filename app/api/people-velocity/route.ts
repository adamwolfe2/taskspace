import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { generateId } from "@/lib/auth/password"
import { sql } from "@/lib/db/sql"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse, PeopleVelocity, PeopleVelocityMetrics } from "@/lib/types"

function rowToVelocity(row: Record<string, unknown>): PeopleVelocity {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    userId: row.user_id as string,
    weekStart: (row.week_start as Date)?.toISOString().split("T")[0] || (row.week_start as string),
    metrics: (row.metrics as PeopleVelocityMetrics) || {
      tasksCompleted: 0,
      tasksDue: 0,
      rockMilestonesHit: 0,
      eodStreak: 0,
      avgMood: 0,
      velocityScore: 0,
    },
    computedAt: (row.computed_at as Date)?.toISOString() || new Date().toISOString(),
  }
}

/**
 * Compute velocity metrics for a user+week from live data and upsert into cache.
 */
async function computeAndCacheVelocity(
  orgId: string,
  userId: string,
  workspaceId: string,
  weekStart: string
): Promise<PeopleVelocity> {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndStr = weekEnd.toISOString().split("T")[0]

  // Tasks completed this week
  const tasksCompletedResult = await sql`
    SELECT COUNT(*) AS count
    FROM assigned_tasks
    WHERE org_id = ${orgId}
      AND workspace_id = ${workspaceId}
      AND assigned_to = ${userId}
      AND status = 'completed'
      AND updated_at::date >= ${weekStart}::date
      AND updated_at::date <= ${weekEndStr}::date
  `
  const tasksCompleted = parseInt((tasksCompletedResult.rows[0]?.count as string) || "0", 10)

  // Tasks due this week (measure workload)
  const tasksDueResult = await sql`
    SELECT COUNT(*) AS count
    FROM assigned_tasks
    WHERE org_id = ${orgId}
      AND workspace_id = ${workspaceId}
      AND assigned_to = ${userId}
      AND due_date::date >= ${weekStart}::date
      AND due_date::date <= ${weekEndStr}::date
  `
  const tasksDue = parseInt((tasksDueResult.rows[0]?.count as string) || "0", 10)

  // Rock milestone hits: rocks where progress increased or status changed this week
  const rockMilestonesResult = await sql`
    SELECT COUNT(*) AS count
    FROM rocks
    WHERE org_id = ${orgId}
      AND workspace_id = ${workspaceId}
      AND (assigned_to = ${userId} OR created_by = ${userId})
      AND updated_at::date >= ${weekStart}::date
      AND updated_at::date <= ${weekEndStr}::date
      AND (status = 'completed' OR progress >= 25)
  `
  const rockMilestonesHit = parseInt((rockMilestonesResult.rows[0]?.count as string) || "0", 10)

  // EOD submissions this week — streak count
  const eodResult = await sql`
    SELECT COUNT(*) AS count
    FROM eod_reports
    WHERE org_id = ${orgId}
      AND user_id = ${userId}
      AND date::date >= ${weekStart}::date
      AND date::date <= ${weekEndStr}::date
  `
  const eodStreak = parseInt((eodResult.rows[0]?.count as string) || "0", 10)

  // Average mood from EOD reports (mood stored as integer 1-5 in some fields)
  const moodResult = await sql`
    SELECT AVG(COALESCE((parsed_data->>'mood')::float, 3)) AS avg_mood
    FROM eod_reports
    WHERE org_id = ${orgId}
      AND user_id = ${userId}
      AND date::date >= ${weekStart}::date
      AND date::date <= ${weekEndStr}::date
      AND parsed_data IS NOT NULL
  `
  const avgMood = Math.round((parseFloat((moodResult.rows[0]?.avg_mood as string) || "3") || 3) * 10) / 10

  // Velocity score: weighted composite (0–100)
  const completionRate = tasksDue > 0 ? Math.min(tasksCompleted / tasksDue, 1) : (tasksCompleted > 0 ? 1 : 0)
  const velocityScore = Math.round(
    completionRate * 40 +
    Math.min(eodStreak / 5, 1) * 30 +
    Math.min(rockMilestonesHit / 3, 1) * 20 +
    (avgMood / 5) * 10
  )

  const metrics: PeopleVelocityMetrics = {
    tasksCompleted,
    tasksDue,
    rockMilestonesHit,
    eodStreak,
    avgMood,
    velocityScore,
  }

  const id = "pv_" + generateId()
  await sql`
    INSERT INTO people_velocity_cache (id, org_id, user_id, week_start, metrics, computed_at)
    VALUES (
      ${id},
      ${orgId},
      ${userId},
      ${weekStart}::date,
      ${JSON.stringify(metrics)}::jsonb,
      NOW()
    )
    ON CONFLICT (org_id, user_id, week_start)
    DO UPDATE SET
      metrics = EXCLUDED.metrics,
      computed_at = NOW()
  `

  return {
    id,
    orgId,
    userId,
    weekStart,
    metrics,
    computedAt: new Date().toISOString(),
  }
}

// GET /api/people-velocity?workspaceId=xxx&weeks=8
// Returns velocity data for all workspace members for the last N weeks
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const weeks = Math.min(parseInt(searchParams.get("weeks") || "8", 10), 26)
    const userId = searchParams.get("userId") // optional filter

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // Get workspace members (optionally filtered to a single user)
    const membersResult = userId
      ? await sql`
          SELECT DISTINCT om.user_id, u.name, u.email
          FROM organization_members om
          JOIN users u ON u.id = om.user_id
          WHERE om.organization_id = ${auth.organization.id}
            AND om.status = 'active'
            AND om.user_id = ${userId}
          ORDER BY u.name
          LIMIT 50
        `
      : await sql`
          SELECT DISTINCT om.user_id, u.name, u.email
          FROM organization_members om
          JOIN users u ON u.id = om.user_id
          WHERE om.organization_id = ${auth.organization.id}
            AND om.status = 'active'
          ORDER BY u.name
          LIMIT 50
        `

    if (membersResult.rows.length === 0) {
      return NextResponse.json<ApiResponse<PeopleVelocity[]>>({
        success: true,
        data: [],
      })
    }

    // Compute week starts for requested range
    const today = new Date()
    const currentDay = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1))
    monday.setHours(0, 0, 0, 0)

    const weekStarts: string[] = []
    for (let i = 0; i < weeks; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() - i * 7)
      weekStarts.push(d.toISOString().split("T")[0])
    }

    const userIds = membersResult.rows.map(r => r.user_id as string)
    const userIdsStr = `{${userIds.join(",")}}`
    const weekStartsStr = `{${weekStarts.join(",")}}`

    // Fetch cached entries for the requested range
    const cachedResult = await sql`
      SELECT id, org_id, user_id, week_start, metrics, computed_at
      FROM people_velocity_cache
      WHERE org_id = ${auth.organization.id}
        AND user_id = ANY(${userIdsStr}::text[])
        AND week_start = ANY(${weekStartsStr}::date[])
      ORDER BY week_start DESC, user_id
    `

    const cachedVelocities: PeopleVelocity[] = cachedResult.rows.map(row =>
      rowToVelocity(row as Record<string, unknown>)
    )

    // Compute missing entries for current week only (avoid recomputing historical)
    const currentWeekStart = weekStarts[0]
    const computedSet = new Set(cachedVelocities.map(v => `${v.userId}:${v.weekStart}`))
    const missingCurrentWeek = userIds.filter(uid => !computedSet.has(`${uid}:${currentWeekStart}`))

    const freshVelocities: PeopleVelocity[] = []
    for (const uid of missingCurrentWeek.slice(0, 20)) {
      try {
        const v = await computeAndCacheVelocity(auth.organization.id, uid, workspaceId, currentWeekStart)
        freshVelocities.push(v)
      } catch (err) {
        logger.warn({ err, uid }, "Failed to compute velocity for user")
      }
    }

    const allVelocities = [...freshVelocities, ...cachedVelocities]

    return NextResponse.json<ApiResponse<PeopleVelocity[]>>({
      success: true,
      data: allVelocities,
    })
  } catch (error) {
    logError(logger, "Get people velocity error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get people velocity" },
      { status: 500 }
    )
  }
})

// POST /api/people-velocity — Force recompute velocity for current week
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const { workspaceId, userId } = body as { workspaceId?: string; userId?: string }

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    const targetUserId = userId || auth.user.id

    const today = new Date()
    const day = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
    const weekStart = monday.toISOString().split("T")[0]

    const velocity = await computeAndCacheVelocity(
      auth.organization.id,
      targetUserId,
      workspaceId,
      weekStart
    )

    return NextResponse.json<ApiResponse<PeopleVelocity>>({
      success: true,
      data: velocity,
    })
  } catch (error) {
    logError(logger, "Recompute velocity error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to compute velocity" },
      { status: 500 }
    )
  }
})
