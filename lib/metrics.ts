/**
 * Weekly Scorecard Metrics Helper Functions
 *
 * Helper functions for EOS-style weekly metric tracking.
 * Week always ends on Friday.
 */

import { sql } from "./db/sql"

export interface TeamMemberMetric {
  id: string
  teamMemberId: string
  metricName: string
  weeklyGoal: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface WeeklyMetricEntry {
  id: string
  teamMemberId: string
  metricId: string
  weekEnding: string // YYYY-MM-DD, always a Friday
  actualValue: number
  createdAt: string
  updatedAt: string
}

export interface ScorecardRow {
  memberId: string
  memberName: string
  department: string
  metricName: string
  weeklyGoal: number
  weeklyEntries: Map<string, number> // weekEnding -> actualValue
}

/**
 * Get the Friday of the current week
 * If today is Saturday or Sunday, returns the previous Friday
 */
export function getCurrentWeekEnding(): Date {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday, 5 = Friday, 6 = Saturday

  let daysToFriday: number
  if (dayOfWeek === 0) {
    // Sunday - go back 2 days to Friday
    daysToFriday = -2
  } else if (dayOfWeek === 6) {
    // Saturday - go back 1 day to Friday
    daysToFriday = -1
  } else {
    // Monday (1) to Friday (5) - go forward to Friday
    daysToFriday = 5 - dayOfWeek
  }

  const friday = new Date(today)
  friday.setDate(today.getDate() + daysToFriday)
  friday.setHours(0, 0, 0, 0)

  return friday
}

/**
 * Get array of last N Fridays for column headers (chronological order: oldest to newest)
 */
export function getWeekColumns(count: number = 8): Date[] {
  const fridays: Date[] = []
  const currentFriday = getCurrentWeekEnding()

  for (let i = 0; i < count; i++) {
    const friday = new Date(currentFriday)
    friday.setDate(currentFriday.getDate() - (i * 7))
    fridays.push(friday)
  }

  // Reverse to show chronologically (oldest to newest, left to right)
  return fridays.reverse()
}

/**
 * Get the Friday of the week containing a given date
 */
export function getWeekEndingForDate(date: Date): Date {
  const d = new Date(date)
  const dayOfWeek = d.getDay()

  let daysToFriday: number
  if (dayOfWeek === 0) {
    // Sunday - go back 2 days to Friday
    daysToFriday = -2
  } else if (dayOfWeek === 6) {
    // Saturday - go back 1 day to Friday
    daysToFriday = -1
  } else {
    // Monday (1) to Friday (5) - go forward to Friday
    daysToFriday = 5 - dayOfWeek
  }

  const friday = new Date(d)
  friday.setDate(d.getDate() + daysToFriday)
  friday.setHours(0, 0, 0, 0)

  return friday
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Parse date string to Date object
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Calculate week-to-date sum from daily EODs
 * This aggregates all metric_value_today values for a user within a given week
 */
export async function calculateWeekTotal(
  userId: string,
  organizationId: string,
  weekEnding: Date
): Promise<number> {
  // Calculate the Monday of that week (5 days before Friday)
  const weekStart = new Date(weekEnding)
  weekStart.setDate(weekEnding.getDate() - 4) // Monday is 4 days before Friday

  const weekEndStr = formatDateString(weekEnding)
  const weekStartStr = formatDateString(weekStart)

  const result = await sql`
    SELECT COALESCE(SUM(metric_value_today), 0) as total
    FROM eod_reports
    WHERE user_id = ${userId}
    AND organization_id = ${organizationId}
    AND date >= ${weekStartStr}
    AND date <= ${weekEndStr}
    AND metric_value_today IS NOT NULL
  `

  return parseInt(result.rows[0]?.total || '0', 10)
}

/**
 * Upsert weekly metric entry - called after EOD submission
 */
export async function upsertWeeklyMetricEntry(
  userId: string,
  organizationId: string,
  metricId: string
): Promise<void> {
  const weekEnding = getCurrentWeekEnding()
  const weekEndingStr = formatDateString(weekEnding)

  // Calculate the total for this week from EOD reports
  const total = await calculateWeekTotal(userId, organizationId, weekEnding)

  // Upsert the weekly entry
  await sql`
    INSERT INTO weekly_metric_entries (id, team_member_id, metric_id, week_ending, actual_value, created_at, updated_at)
    SELECT
      'wme_' || gen_random_uuid()::text,
      om.id,
      ${metricId},
      ${weekEndingStr}::date,
      ${total},
      NOW(),
      NOW()
    FROM organization_members om
    WHERE om.user_id = ${userId}
    AND om.organization_id = ${organizationId}
    ON CONFLICT (team_member_id, week_ending)
    DO UPDATE SET
      actual_value = ${total},
      updated_at = NOW()
  `
}

/**
 * Get active metric for a team member
 */
export async function getActiveMetricForUser(
  userId: string,
  organizationId: string
): Promise<TeamMemberMetric | null> {
  const result = await sql`
    SELECT tmm.id, tmm.team_member_id, tmm.metric_name, tmm.weekly_goal, tmm.is_active,
           tmm.created_at, tmm.updated_at
    FROM team_member_metrics tmm
    JOIN organization_members om ON tmm.team_member_id = om.id
    WHERE om.user_id = ${userId}
    AND om.organization_id = ${organizationId}
    AND tmm.is_active = true
    LIMIT 1
  `

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row.id,
    teamMemberId: row.team_member_id,
    metricName: row.metric_name,
    weeklyGoal: row.weekly_goal,
    isActive: row.is_active,
    createdAt: row.created_at?.toISOString() || '',
    updatedAt: row.updated_at?.toISOString() || '',
  }
}

/**
 * Get all metrics with weekly entries for the scorecard
 */
export async function getScorecardData(
  organizationId: string,
  weekCount: number = 8
): Promise<{
  weeks: string[]
  rows: Array<{
    memberId: string
    memberName: string
    department: string
    metricName: string
    weeklyGoal: number
    entries: Record<string, number | null> // weekEnding -> value or null
  }>
}> {
  // Get all active metrics for the organization
  const metricsResult = await sql`
    SELECT
      om.id as member_id,
      COALESCE(NULLIF(om.name, ''), u.name, 'Unknown') as member_name,
      om.department,
      tmm.id as metric_id,
      tmm.metric_name,
      tmm.weekly_goal
    FROM team_member_metrics tmm
    JOIN organization_members om ON tmm.team_member_id = om.id
    LEFT JOIN users u ON u.id = om.user_id
    WHERE om.organization_id = ${organizationId}
    AND om.status = 'active'
    AND tmm.is_active = true
    ORDER BY COALESCE(NULLIF(om.name, ''), u.name) ASC
  `

  if (metricsResult.rows.length === 0) {
    return { weeks: [], rows: [] }
  }

  // Get week columns
  const weeks = getWeekColumns(weekCount)
  const weekStrings = weeks.map(formatDateString)
  const oldestWeek = weekStrings[weekStrings.length - 1]

  // Get all weekly entries for these members within the date range
  const memberIds = metricsResult.rows.map(r => r.member_id)

  // Use native PostgreSQL array for efficient querying
  const entriesResult = await sql`
    SELECT
      team_member_id,
      week_ending,
      actual_value
    FROM weekly_metric_entries
    WHERE team_member_id = ANY(${memberIds}::text[])
    AND week_ending >= ${oldestWeek}::date
    ORDER BY week_ending DESC
  `

  // Build a map of member_id -> week_ending -> value
  const entriesMap = new Map<string, Map<string, number>>()
  for (const entry of entriesResult.rows) {
    const memberId = entry.team_member_id
    const weekEnding = entry.week_ending instanceof Date
      ? formatDateString(entry.week_ending)
      : entry.week_ending
    const value = entry.actual_value

    if (!entriesMap.has(memberId)) {
      entriesMap.set(memberId, new Map())
    }
    entriesMap.get(memberId)!.set(weekEnding, value)
  }

  // Build the result rows
  const rows = metricsResult.rows.map(metric => {
    const memberEntries = entriesMap.get(metric.member_id) || new Map()
    const entries: Record<string, number | null> = {}

    for (const weekStr of weekStrings) {
      entries[weekStr] = memberEntries.get(weekStr) ?? null
    }

    return {
      memberId: metric.member_id,
      memberName: metric.member_name || 'Unknown',
      department: metric.department || 'General',
      metricName: metric.metric_name,
      weeklyGoal: metric.weekly_goal,
      entries,
    }
  })

  return { weeks: weekStrings, rows }
}

/**
 * Set or update metric for a team member
 * Deactivates any existing active metric first
 */
export async function setTeamMemberMetric(
  memberId: string,
  metricName: string,
  weeklyGoal: number
): Promise<TeamMemberMetric> {
  console.log("setTeamMemberMetric: Deactivating existing metrics for member:", memberId)

  // Deactivate existing active metric
  const deactivateResult = await sql`
    UPDATE team_member_metrics
    SET is_active = false, updated_at = NOW()
    WHERE team_member_id = ${memberId}
    AND is_active = true
  `
  console.log("setTeamMemberMetric: Deactivated", deactivateResult.rowCount, "existing metrics")

  // Insert new metric
  console.log("setTeamMemberMetric: Inserting new metric:", metricName, "goal:", weeklyGoal)
  const result = await sql`
    INSERT INTO team_member_metrics (id, team_member_id, metric_name, weekly_goal, is_active, created_at, updated_at)
    VALUES (
      'tmm_' || gen_random_uuid()::text,
      ${memberId},
      ${metricName},
      ${weeklyGoal},
      true,
      NOW(),
      NOW()
    )
    RETURNING *
  `

  if (result.rows.length === 0) {
    console.error("setTeamMemberMetric: INSERT returned no rows!")
    throw new Error("Failed to insert metric - no rows returned")
  }

  const row = result.rows[0]
  console.log("setTeamMemberMetric: Successfully inserted metric with id:", row.id)

  return {
    id: row.id,
    teamMemberId: row.team_member_id,
    metricName: row.metric_name,
    weeklyGoal: row.weekly_goal,
    isActive: row.is_active,
    createdAt: row.created_at?.toISOString() || '',
    updatedAt: row.updated_at?.toISOString() || '',
  }
}

/**
 * Get metric history for a team member
 */
export async function getMetricHistory(memberId: string): Promise<TeamMemberMetric[]> {
  const result = await sql`
    SELECT id, team_member_id, metric_name, weekly_goal, is_active, created_at, updated_at
    FROM team_member_metrics
    WHERE team_member_id = ${memberId}
    ORDER BY created_at DESC
  `

  return result.rows.map(row => ({
    id: row.id,
    teamMemberId: row.team_member_id,
    metricName: row.metric_name,
    weeklyGoal: row.weekly_goal,
    isActive: row.is_active,
    createdAt: row.created_at?.toISOString() || '',
    updatedAt: row.updated_at?.toISOString() || '',
  }))
}
