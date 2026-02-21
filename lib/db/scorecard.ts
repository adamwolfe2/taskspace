/**
 * Scorecard Database Operations
 *
 * Provides CRUD operations for workspace scorecards (EOS-style weekly KPI tracking).
 * Part of SESSION 6: Scorecard Module
 */

import { sql } from "./sql"
import { generateId } from "@/lib/auth/password"
import { logger, logError } from "@/lib/logger"

// ============================================
// TYPES
// ============================================

export interface ScorecardMetric {
  id: string
  workspaceId: string
  name: string
  description?: string
  ownerId?: string
  ownerName?: string
  targetValue?: number
  targetDirection: "above" | "below" | "exact"
  unit: string
  frequency: "weekly" | "monthly"
  displayOrder: number
  isActive: boolean
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface ScorecardEntry {
  id: string
  metricId: string
  value: number
  weekStart: string
  notes?: string
  status: "green" | "yellow" | "red" | "gray"
  enteredBy?: string
  createdAt: string
  updatedAt: string
}

export interface ScorecardSummary {
  metricId: string
  metricName: string
  metricDescription?: string
  ownerId?: string
  ownerName?: string
  targetValue?: number
  targetDirection: string
  unit: string
  displayOrder: number
  currentValue?: number
  currentStatus: "green" | "yellow" | "red" | "gray"
  currentNotes?: string
  weekStart: string
}

export interface CreateMetricParams {
  workspaceId: string
  name: string
  description?: string
  ownerId?: string
  targetValue?: number
  targetDirection?: "above" | "below" | "exact"
  unit?: string
  frequency?: "weekly" | "monthly"
  displayOrder?: number
  createdBy?: string
}

export interface UpdateMetricParams {
  name?: string
  description?: string
  ownerId?: string
  targetValue?: number
  targetDirection?: "above" | "below" | "exact"
  unit?: string
  frequency?: "weekly" | "monthly"
  displayOrder?: number
  isActive?: boolean
}

export interface UpsertEntryParams {
  metricId: string
  value: number
  weekStart: string
  notes?: string
  enteredBy?: string
}

// ============================================
// PARSERS
// ============================================

function parseMetric(row: Record<string, unknown>): ScorecardMetric {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    ownerId: row.owner_id as string | undefined,
    ownerName: row.owner_name as string | undefined,
    targetValue: row.target_value !== null ? Number(row.target_value) : undefined,
    targetDirection: (row.target_direction as ScorecardMetric["targetDirection"]) || "above",
    unit: (row.unit as string) || "",
    frequency: (row.frequency as ScorecardMetric["frequency"]) || "weekly",
    displayOrder: Number(row.display_order) || 0,
    isActive: row.is_active !== false,
    createdBy: row.created_by as string | undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

function parseEntry(row: Record<string, unknown>): ScorecardEntry {
  return {
    id: row.id as string,
    metricId: row.metric_id as string,
    value: Number(row.value),
    weekStart: formatDate(row.week_start as Date),
    notes: row.notes as string | undefined,
    status: (row.status as ScorecardEntry["status"]) || "gray",
    enteredBy: row.entered_by as string | undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

function parseSummary(row: Record<string, unknown>): ScorecardSummary {
  return {
    metricId: row.metric_id as string,
    metricName: row.metric_name as string,
    metricDescription: row.metric_description as string | undefined,
    ownerId: row.owner_id as string | undefined,
    ownerName: row.owner_name as string | undefined,
    targetValue: row.target_value !== null ? Number(row.target_value) : undefined,
    targetDirection: (row.target_direction as string) || "above",
    unit: (row.unit as string) || "",
    displayOrder: Number(row.display_order) || 0,
    currentValue: row.current_value !== null ? Number(row.current_value) : undefined,
    currentStatus: (row.current_status as ScorecardSummary["currentStatus"]) || "gray",
    currentNotes: row.current_notes as string | undefined,
    weekStart: formatDate(row.week_start as Date),
  }
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return ""
  if (typeof date === "string") {
    // Already a string, try to format it
    const d = new Date(date)
    if (isNaN(d.getTime())) return date
    return d.toISOString().split("T")[0]
  }
  return date.toISOString().split("T")[0]
}

// ============================================
// WEEK CALCULATION
// ============================================

/**
 * Get the Monday of the week for a given date (or current date if not provided).
 * Accepts an optional YYYY-MM-DD string (e.g. from getTodayInTimezone) to avoid
 * UTC conversion bugs when the server timezone differs from the org timezone.
 */
export function getWeekStart(date?: Date, todayStr?: string): string {
  // If a timezone-correct date string is provided, use it to avoid UTC shift
  const d = todayStr
    ? new Date(todayStr + "T12:00:00Z")
    : date
      ? new Date(date)
      : new Date()
  // Get the day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = d.getDay()
  // Calculate days to subtract to get to Monday
  // If Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  d.setDate(d.getDate() - daysToSubtract)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get week start dates for the last N weeks
 */
export function getLastNWeeks(numWeeks: number, fromDate?: Date): string[] {
  const weeks: string[] = []
  const startDate = fromDate ? new Date(fromDate) : new Date()

  for (let i = 0; i < numWeeks; i++) {
    const weekDate = new Date(startDate)
    weekDate.setDate(weekDate.getDate() - i * 7)
    weeks.push(getWeekStart(weekDate))
  }

  return weeks
}

// ============================================
// METRIC OPERATIONS
// ============================================

/**
 * Get all metrics for a workspace
 */
export async function getMetricsByWorkspace(workspaceId: string): Promise<ScorecardMetric[]> {
  const { rows } = await sql`
    SELECT sm.*, u.name as owner_name
    FROM scorecard_metrics sm
    LEFT JOIN users u ON u.id = sm.owner_id
    WHERE sm.workspace_id = ${workspaceId}
      AND sm.deleted_at IS NULL
      AND sm.is_active = TRUE
    ORDER BY sm.display_order ASC, sm.name ASC
  `
  return rows.map(parseMetric)
}

/**
 * Get a single metric by ID (optionally workspace-scoped)
 */
export async function getMetricById(metricId: string, workspaceId?: string): Promise<ScorecardMetric | null> {
  const { rows } = workspaceId
    ? await sql`
        SELECT sm.*, u.name as owner_name
        FROM scorecard_metrics sm
        LEFT JOIN users u ON u.id = sm.owner_id
        WHERE sm.id = ${metricId}
          AND sm.workspace_id = ${workspaceId}
          AND sm.deleted_at IS NULL
      `
    : await sql`
        SELECT sm.*, u.name as owner_name
        FROM scorecard_metrics sm
        LEFT JOIN users u ON u.id = sm.owner_id
        WHERE sm.id = ${metricId}
          AND sm.deleted_at IS NULL
      `
  if (rows.length === 0) return null
  return parseMetric(rows[0])
}

/**
 * Create a new metric
 */
export async function createMetric(params: CreateMetricParams): Promise<ScorecardMetric> {
  const id = "sm_" + generateId()
  const {
    workspaceId,
    name,
    description = null,
    ownerId = null,
    targetValue = null,
    targetDirection = "above",
    unit = "",
    frequency = "weekly",
    displayOrder = 0,
    createdBy = null,
  } = params

  const { rows: _rows } = await sql`
    INSERT INTO scorecard_metrics (
      id, workspace_id, name, description, owner_id, target_value,
      target_direction, unit, frequency, display_order, created_by
    )
    VALUES (
      ${id}, ${workspaceId}, ${name}, ${description}, ${ownerId},
      ${targetValue}, ${targetDirection}, ${unit}, ${frequency},
      ${displayOrder}, ${createdBy}
    )
    RETURNING *
  `

  // Fetch with owner name
  return (await getMetricById(id))!
}

/**
 * Update a metric
 */
export async function updateMetric(
  metricId: string,
  updates: UpdateMetricParams
): Promise<ScorecardMetric | null> {
  const metric = await getMetricById(metricId)
  if (!metric) return null

  const { rows } = await sql`
    UPDATE scorecard_metrics
    SET
      name = ${updates.name ?? metric.name},
      description = ${updates.description ?? metric.description ?? null},
      owner_id = ${updates.ownerId ?? metric.ownerId ?? null},
      target_value = ${updates.targetValue ?? metric.targetValue ?? null},
      target_direction = ${updates.targetDirection ?? metric.targetDirection},
      unit = ${updates.unit ?? metric.unit},
      frequency = ${updates.frequency ?? metric.frequency},
      display_order = ${updates.displayOrder ?? metric.displayOrder},
      is_active = ${updates.isActive ?? metric.isActive},
      updated_at = NOW()
    WHERE id = ${metricId}
    RETURNING *
  `

  if (rows.length === 0) return null
  return getMetricById(metricId)
}

/**
 * Soft delete a metric
 */
export async function deleteMetric(metricId: string): Promise<boolean> {
  const { rowCount } = await sql`
    UPDATE scorecard_metrics
    SET deleted_at = NOW(), is_active = FALSE
    WHERE id = ${metricId} AND deleted_at IS NULL
  `
  return (rowCount ?? 0) > 0
}

// ============================================
// ENTRY OPERATIONS
// ============================================

/**
 * Calculate the green/yellow/red status for a metric entry based on value vs target.
 * Green = meets or beats target; yellow = within 10% of target; red = further off.
 */
function calculateMetricStatus(
  value: number,
  targetValue: number | undefined,
  targetDirection: ScorecardMetric["targetDirection"]
): ScorecardEntry["status"] {
  if (targetValue === undefined || targetValue === null) return "gray"

  switch (targetDirection) {
    case "above": // higher is better (e.g. revenue, calls)
      if (value >= targetValue) return "green"
      if (targetValue > 0 && value >= targetValue * 0.9) return "yellow"
      return "red"
    case "below": // lower is better (e.g. errors, cost)
      if (value <= targetValue) return "green"
      if (targetValue > 0 && value <= targetValue * 1.1) return "yellow"
      return "red"
    case "exact": // must equal target
      if (value === targetValue) return "green"
      if (targetValue !== 0 && Math.abs(value - targetValue) / Math.abs(targetValue) <= 0.1) return "yellow"
      return "red"
  }
}

/**
 * Create or update a weekly entry for a metric.
 * Automatically calculates green/yellow/red status based on the metric's target.
 */
export async function upsertEntry(params: UpsertEntryParams): Promise<ScorecardEntry> {
  const id = "se_" + generateId()
  const { metricId, value, weekStart, notes = null, enteredBy = null } = params

  // Fetch metric's target to calculate on-track status
  const metric = await getMetricById(metricId)
  const status = metric
    ? calculateMetricStatus(value, metric.targetValue, metric.targetDirection)
    : "gray"

  const { rows } = await sql`
    INSERT INTO scorecard_entries (id, metric_id, value, week_start, notes, entered_by, status)
    VALUES (${id}, ${metricId}, ${value}, ${weekStart}::date, ${notes}, ${enteredBy}, ${status})
    ON CONFLICT (metric_id, week_start)
    DO UPDATE SET
      value = ${value},
      notes = ${notes},
      entered_by = ${enteredBy},
      status = ${status},
      updated_at = NOW()
    RETURNING *
  `

  return parseEntry(rows[0])
}

/**
 * Get an entry for a specific metric and week
 */
export async function getEntry(metricId: string, weekStart: string): Promise<ScorecardEntry | null> {
  const { rows } = await sql`
    SELECT * FROM scorecard_entries
    WHERE metric_id = ${metricId} AND week_start = ${weekStart}::date
  `
  if (rows.length === 0) return null
  return parseEntry(rows[0])
}

/**
 * Get all entries for a workspace for a specific week
 */
export async function getEntriesForWeek(
  workspaceId: string,
  weekStart: string
): Promise<ScorecardEntry[]> {
  const { rows } = await sql`
    SELECT se.*
    FROM scorecard_entries se
    JOIN scorecard_metrics sm ON sm.id = se.metric_id
    WHERE sm.workspace_id = ${workspaceId}
      AND sm.deleted_at IS NULL
      AND sm.is_active = TRUE
      AND se.week_start = ${weekStart}::date
    ORDER BY sm.display_order ASC, sm.name ASC
  `
  return rows.map(parseEntry)
}

/**
 * Get history for a specific metric (last N weeks)
 */
export async function getMetricHistory(
  metricId: string,
  weeks: number = 13
): Promise<ScorecardEntry[]> {
  const { rows } = await sql`
    SELECT * FROM scorecard_entries
    WHERE metric_id = ${metricId}
    ORDER BY week_start DESC
    LIMIT ${weeks}
  `
  return rows.map(parseEntry)
}

// ============================================
// SUMMARY OPERATIONS
// ============================================

/**
 * Get full scorecard summary for a workspace
 */
export async function getScorecardSummary(
  workspaceId: string,
  weekStart?: string
): Promise<ScorecardSummary[]> {
  const week = weekStart || getWeekStart()

  try {
    // Direct query instead of SQL function (SQL function may not exist)
    const { rows } = await sql`
      SELECT
        m.id as metric_id,
        m.name as metric_name,
        m.description as metric_description,
        m.owner_id,
        om.name as owner_name,
        m.target_value,
        m.target_direction,
        m.unit,
        m.display_order,
        e.value as current_value,
        COALESCE(e.status, 'gray'::text) as current_status,
        e.notes as current_notes,
        ${week} as week_start
      FROM scorecard_metrics m
      LEFT JOIN organization_members om ON m.owner_id = om.id
      LEFT JOIN scorecard_entries e ON m.id = e.metric_id AND e.week_start = ${week}::date
      WHERE m.workspace_id = ${workspaceId} AND m.is_active = true
      ORDER BY m.display_order ASC, m.name ASC
    `
    return rows.map(parseSummary)
  } catch (error) {
    logError(logger, "Error in getScorecardSummary", error)
    // Return empty array if tables don't exist yet
    return []
  }
}

/**
 * Get red (off-track) metrics for alerts
 */
export async function getRedMetrics(
  workspaceId: string,
  weekStart?: string
): Promise<ScorecardSummary[]> {
  const summary = await getScorecardSummary(workspaceId, weekStart)
  return summary.filter(item => item.currentStatus === 'red')
}

/**
 * Get scorecard statistics (counts by status)
 */
export async function getScorecardStats(
  workspaceId: string,
  weekStart?: string
): Promise<{ green: number; yellow: number; red: number; gray: number; total: number }> {
  const summary = await getScorecardSummary(workspaceId, weekStart)

  const stats = {
    green: 0,
    yellow: 0,
    red: 0,
    gray: 0,
    total: summary.length,
  }

  for (const item of summary) {
    if (item.currentStatus in stats) {
      stats[item.currentStatus as keyof typeof stats]++
    }
  }

  return stats
}

/**
 * Get 13-week rolling data for trend visualization
 */
export async function getScorecardTrends(
  workspaceId: string,
  numWeeks: number = 13
): Promise<{
  weeks: string[]
  metrics: Array<{
    metric: ScorecardMetric
    entries: Record<string, ScorecardEntry | null>
  }>
}> {
  const weeks = getLastNWeeks(numWeeks)
  const metrics = await getMetricsByWorkspace(workspaceId)

  // Get all entries for these metrics
  const metricIds = metrics.map((m) => m.id)

  if (metricIds.length === 0) {
    return { weeks, metrics: [] }
  }

  // Use PostgreSQL array literal format for ANY clause
  const metricIdArray = `{${metricIds.join(',')}}`
  const { rows } = await sql`
    SELECT * FROM scorecard_entries
    WHERE metric_id = ANY(${metricIdArray}::text[])
      AND week_start >= ${weeks[weeks.length - 1]}::date
    ORDER BY week_start DESC
  `

  const entriesByMetric = new Map<string, Map<string, ScorecardEntry>>()
  for (const row of rows) {
    const entry = parseEntry(row)
    if (!entriesByMetric.has(entry.metricId)) {
      entriesByMetric.set(entry.metricId, new Map())
    }
    entriesByMetric.get(entry.metricId)!.set(entry.weekStart, entry)
  }

  return {
    weeks,
    metrics: metrics.map((metric) => ({
      metric,
      entries: Object.fromEntries(
        weeks.map((week) => [
          week,
          entriesByMetric.get(metric.id)?.get(week) || null,
        ])
      ),
    })),
  }
}

// ============================================
// SCORECARD DB OBJECT (for compatibility with db pattern)
// ============================================

export const scorecard = {
  // Week helpers
  getWeekStart,
  getLastNWeeks,

  // Metrics
  getMetrics: getMetricsByWorkspace,
  getMetricById,
  createMetric,
  updateMetric,
  deleteMetric,

  // Entries
  upsertEntry,
  getEntry,
  getEntriesForWeek,
  getMetricHistory,

  // Summary
  getSummary: getScorecardSummary,
  getRedMetrics,
  getStats: getScorecardStats,
  getTrends: getScorecardTrends,
}

export default scorecard
