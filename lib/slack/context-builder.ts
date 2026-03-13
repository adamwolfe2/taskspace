/**
 * EOD Check-in Context Builder
 *
 * Fetches all relevant context for a user's daily EOD check-in via Slack.
 * Pulls data from Taskspace (rocks, tasks, scorecard) and optionally Asana.
 */

import { sql } from "@/lib/db/sql"
import { logger, logError } from "@/lib/logger"

// ============================================
// TYPES
// ============================================

export interface UserCheckinContext {
  userName: string
  rocks: Array<{
    id: string
    title: string
    progress: number // 0-100
    status: "on-track" | "at-risk" | "blocked" | "completed"
  }>
  openTasks: Array<{
    id: string
    title: string
    rockTitle?: string
    dueDate?: string
  }>
  weeklyMeasurable?: {
    metricName: string
    weeklyGoal: number
    currentValue?: number
  }
  asanaTasks?: {
    completedToday: Array<{ name: string }>
    inProgress: Array<{ name: string }>
    blocked: Array<{ name: string }>
  }
}

// ============================================
// MAIN EXPORT
// ============================================

/**
 * Build the full context for a user's EOD check-in.
 * Fetches rocks, open tasks, weekly measurable, and optionally Asana tasks.
 */
export async function buildUserContext(
  orgId: string,
  userId: string,
  options?: { includeAsana?: boolean }
): Promise<UserCheckinContext> {
  const [userName, rocks, openTasks, weeklyMeasurable] = await Promise.all([
    fetchUserName(orgId, userId),
    fetchRocks(orgId, userId),
    fetchOpenTasks(orgId, userId),
    fetchWeeklyMeasurable(orgId, userId),
  ])

  let asanaTasks: UserCheckinContext["asanaTasks"] | undefined
  if (options?.includeAsana) {
    asanaTasks = await fetchAsanaTasks(orgId, userId)
  }

  return {
    userName,
    rocks,
    openTasks,
    weeklyMeasurable,
    asanaTasks,
  }
}

// ============================================
// DATA FETCHERS
// ============================================

/**
 * Get the user's display name from organization_members + users.
 */
async function fetchUserName(orgId: string, userId: string): Promise<string> {
  try {
    const { rows } = await sql`
      SELECT COALESCE(NULLIF(om.name, ''), u.name, u.email) as display_name
      FROM organization_members om
      JOIN users u ON u.id = om.user_id
      WHERE om.organization_id = ${orgId} AND om.user_id = ${userId}
      LIMIT 1
    `
    return rows[0]?.display_name as string || "there"
  } catch (error) {
    logError(logger, "Failed to fetch user name for EOD context", error)
    return "there"
  }
}

/**
 * Get the user's active rocks for the most recent quarter.
 */
async function fetchRocks(
  orgId: string,
  userId: string
): Promise<UserCheckinContext["rocks"]> {
  try {
    const { rows } = await sql`
      SELECT r.id, r.title, r.progress, r.status
      FROM rocks r
      WHERE r.organization_id = ${orgId}
        AND r.user_id = ${userId}
        AND r.quarter = (
          SELECT r2.quarter
          FROM rocks r2
          WHERE r2.organization_id = ${orgId}
          ORDER BY r2.quarter DESC
          LIMIT 1
        )
      ORDER BY r.title ASC
    `
    return rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      progress: Number(row.progress) || 0,
      status: (row.status as UserCheckinContext["rocks"][number]["status"]) || "on-track",
    }))
  } catch (error) {
    logError(logger, "Failed to fetch rocks for EOD context", error)
    return []
  }
}

/**
 * Get the user's open (incomplete) tasks, limited to 10 most urgent.
 */
async function fetchOpenTasks(
  orgId: string,
  userId: string
): Promise<UserCheckinContext["openTasks"]> {
  try {
    const { rows } = await sql`
      SELECT at.id, at.title, at.due_date, r.title as rock_title
      FROM assigned_tasks at
      LEFT JOIN rocks r ON r.id = at.rock_id
      WHERE at.organization_id = ${orgId}
        AND at.user_id = ${userId}
        AND at.status != 'completed'
      ORDER BY at.due_date ASC NULLS LAST
      LIMIT 10
    `
    return rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      rockTitle: (row.rock_title as string) || undefined,
      dueDate: row.due_date
        ? (row.due_date as Date).toISOString?.().split("T")[0] ?? (row.due_date as string)
        : undefined,
    }))
  } catch (error) {
    logError(logger, "Failed to fetch open tasks for EOD context", error)
    return []
  }
}

/**
 * Get the user's active weekly measurable from the legacy team_member_metrics table.
 */
async function fetchWeeklyMeasurable(
  orgId: string,
  userId: string
): Promise<UserCheckinContext["weeklyMeasurable"] | undefined> {
  try {
    const { rows } = await sql`
      SELECT tmm.metric_name, tmm.weekly_goal
      FROM team_member_metrics tmm
      JOIN organization_members om ON om.id = tmm.team_member_id
      WHERE om.organization_id = ${orgId}
        AND om.user_id = ${userId}
        AND tmm.is_active = true
      LIMIT 1
    `
    if (rows.length === 0) return undefined

    return {
      metricName: rows[0].metric_name as string,
      weeklyGoal: Number(rows[0].weekly_goal),
      currentValue: undefined, // Current week's value could be fetched separately if needed
    }
  } catch (error) {
    logError(logger, "Failed to fetch weekly measurable for EOD context", error)
    return undefined
  }
}

// ============================================
// ASANA INTEGRATION
// ============================================

const ASANA_API_BASE = "https://app.asana.com/api/1.0"

interface AsanaTask {
  gid: string
  name: string
  completed: boolean
  completed_at: string | null
  memberships?: Array<{
    section?: { name: string }
  }>
}

/**
 * Fetch Asana tasks for the user if the org has Asana integration enabled.
 * Returns completed-today, in-progress, and blocked tasks.
 */
async function fetchAsanaTasks(
  orgId: string,
  userId: string
): Promise<UserCheckinContext["asanaTasks"] | undefined> {
  const accessToken = process.env.ASANA_ACCESS_TOKEN
  if (!accessToken) {
    logger.debug("ASANA_ACCESS_TOKEN not set, skipping Asana tasks")
    return undefined
  }

  try {
    // Fetch org settings to get Asana integration config
    const { rows: orgRows } = await sql`
      SELECT settings FROM organizations WHERE id = ${orgId} LIMIT 1
    `
    if (orgRows.length === 0) return undefined

    const settings = orgRows[0].settings as Record<string, unknown> | string
    const parsed = typeof settings === "string" ? JSON.parse(settings) : settings
    const asanaConfig = parsed?.asanaIntegration as
      | { enabled: boolean; projectGid: string; userMappings: Array<{ aimsUserId: string; asanaUserGid: string }> }
      | undefined

    if (!asanaConfig?.enabled || !asanaConfig.projectGid) return undefined

    // Find the user's Asana mapping
    const mapping = asanaConfig.userMappings?.find((m) => m.aimsUserId === userId)
    if (!mapping) {
      logger.debug(`No Asana mapping found for user ${userId}`)
      return undefined
    }

    const projectGid = asanaConfig.projectGid
    const asanaUserGid = mapping.asanaUserGid

    // Build today's date string for completed_since filter (ISO 8601)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIso = today.toISOString()

    // Fetch tasks completed today
    const completedTodayTasks = await asanaFetch<AsanaTask[]>(
      accessToken,
      `/tasks?project=${projectGid}&assignee=${asanaUserGid}&completed_since=${todayIso}&opt_fields=name,completed,completed_at,memberships.section.name`
    )

    // Fetch incomplete tasks assigned to user in this project
    const incompleteTasks = await asanaFetch<AsanaTask[]>(
      accessToken,
      `/tasks?project=${projectGid}&assignee=${asanaUserGid}&completed_since=now&opt_fields=name,completed,completed_at,memberships.section.name`
    )

    // Categorize tasks
    const completedToday: Array<{ name: string }> = []
    const inProgress: Array<{ name: string }> = []
    const blocked: Array<{ name: string }> = []

    // Completed tasks from today
    if (completedTodayTasks) {
      for (const task of completedTodayTasks) {
        if (task.completed && task.completed_at) {
          completedToday.push({ name: task.name })
        }
      }
    }

    // Categorize incomplete tasks by section name
    if (incompleteTasks) {
      for (const task of incompleteTasks) {
        if (task.completed) continue

        const sectionName = task.memberships?.[0]?.section?.name?.toLowerCase() || ""
        if (sectionName.includes("block")) {
          blocked.push({ name: task.name })
        } else {
          inProgress.push({ name: task.name })
        }
      }
    }

    return { completedToday, inProgress, blocked }
  } catch (error) {
    logError(logger, "Failed to fetch Asana tasks for EOD context", error)
    return undefined
  }
}

/**
 * Make a GET request to the Asana API and return the data array.
 */
async function asanaFetch<T>(accessToken: string, path: string): Promise<T | null> {
  try {
    const response = await fetch(`${ASANA_API_BASE}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      logger.warn(`Asana API returned ${response.status} for ${path}`)
      return null
    }

    const json = (await response.json()) as { data: T }
    return json.data
  } catch (error) {
    logError(logger, `Asana API request failed: ${path}`, error)
    return null
  }
}
