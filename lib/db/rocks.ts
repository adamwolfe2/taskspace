/**
 * Rocks Database Operations
 *
 * Enhanced rock management with confidence tracking, check-ins, and task linking.
 * Part of SESSION 7: Rocks ↔ Tasks Linking System
 */

import { sql } from "./sql"
import { generateId } from "@/lib/auth/password"
import { sanitizeText } from "@/lib/utils/sanitize"

// ============================================
// TYPES
// ============================================

export type RockConfidence = "on_track" | "at_risk" | "off_track"
export type RockStatus = "on-track" | "at-risk" | "blocked" | "completed"

export interface Rock {
  id: string
  organizationId: string
  workspaceId?: string
  userId?: string // Optional for draft members
  ownerEmail?: string // For draft members who haven't accepted invitation
  userName?: string
  title: string
  description?: string
  progress: number
  dueDate?: string
  status: RockStatus
  confidence: RockConfidence
  confidenceNotes?: string
  confidenceUpdatedAt?: string
  completedAt?: string
  bucket?: string
  outcome?: string
  doneWhen?: string[]
  quarter?: string
  createdAt: string
  updatedAt: string
}

export interface RockMilestone {
  id: string
  rockId: string
  text: string
  completed: boolean
  completedAt?: string
  position: number
  createdAt: string
  updatedAt: string
}

export interface RockCheckin {
  id: string
  rockId: string
  userId?: string
  userName?: string
  confidence: RockConfidence
  notes?: string
  progressAtCheckin: number
  weekStart: string
  createdAt: string
}

export interface RockTask {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  assigneeId: string
  assigneeName?: string
  completedAt?: string
  createdAt: string
}

export interface RockSummary {
  id: string
  title: string
  description?: string
  userId: string
  userName?: string
  progress: number
  dueDate?: string
  status: RockStatus
  confidence: RockConfidence
  confidenceNotes?: string
  quarter?: string
  taskCount: number
  completedTaskCount: number
  daysRemaining?: number
  isOverdue: boolean
  createdAt: string
}

export interface RockAtRisk {
  id: string
  title: string
  userId: string
  userName?: string
  progress: number
  dueDate?: string
  confidence: RockConfidence
  confidenceNotes?: string
  daysRemaining?: number
  riskReason: string
}

// ============================================
// PARSERS
// ============================================

function parseRock(row: Record<string, unknown>): Rock {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    workspaceId: row.workspace_id as string | undefined,
    userId: row.user_id as string,
    userName: row.user_name as string | undefined,
    title: row.title as string,
    description: row.description as string | undefined,
    progress: Number(row.progress) || 0,
    dueDate: row.due_date ? formatDate(row.due_date) : undefined,
    status: (row.status as RockStatus) || "on-track",
    confidence: (row.confidence as RockConfidence) || "on_track",
    confidenceNotes: row.confidence_notes as string | undefined,
    confidenceUpdatedAt: row.confidence_updated_at
      ? (row.confidence_updated_at as Date).toISOString()
      : undefined,
    completedAt: row.completed_at
      ? (row.completed_at as Date).toISOString()
      : undefined,
    bucket: row.bucket as string | undefined,
    outcome: row.outcome as string | undefined,
    doneWhen: parseJsonArray(row.done_when),
    quarter: row.quarter as string | undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

function parseCheckin(row: Record<string, unknown>): RockCheckin {
  return {
    id: row.id as string,
    rockId: row.rock_id as string,
    userId: row.user_id as string | undefined,
    userName: row.user_name as string | undefined,
    confidence: (row.confidence as RockConfidence) || "on_track",
    notes: row.notes as string | undefined,
    progressAtCheckin: Number(row.progress_at_checkin) || 0,
    weekStart: formatDate(row.week_start),
    createdAt: (row.created_at as Date)?.toISOString() || "",
  }
}

function parseMilestone(row: Record<string, unknown>): RockMilestone {
  return {
    id: row.id as string,
    rockId: row.rock_id as string,
    text: row.text as string,
    completed: Boolean(row.completed),
    completedAt: row.completed_at
      ? (row.completed_at as Date).toISOString()
      : undefined,
    position: Number(row.position) || 0,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

function parseTask(row: Record<string, unknown>): RockTask {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    status: row.status as string,
    priority: row.priority as string,
    dueDate: row.due_date ? formatDate(row.due_date) : undefined,
    assigneeId: row.assignee_id as string,
    assigneeName: row.assignee_name as string | undefined,
    completedAt: row.completed_at
      ? (row.completed_at as Date).toISOString()
      : undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
  }
}

function parseSummary(row: Record<string, unknown>): RockSummary {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    userId: row.user_id as string,
    userName: row.user_name as string | undefined,
    progress: Number(row.progress) || 0,
    dueDate: row.due_date ? formatDate(row.due_date) : undefined,
    status: (row.status as RockStatus) || "on-track",
    confidence: (row.confidence as RockConfidence) || "on_track",
    confidenceNotes: row.confidence_notes as string | undefined,
    quarter: row.quarter as string | undefined,
    taskCount: Number(row.task_count) || 0,
    completedTaskCount: Number(row.completed_task_count) || 0,
    daysRemaining: row.days_remaining !== null ? Number(row.days_remaining) : undefined,
    isOverdue: Boolean(row.is_overdue),
    createdAt: (row.created_at as Date)?.toISOString() || "",
  }
}

function parseAtRisk(row: Record<string, unknown>): RockAtRisk {
  return {
    id: row.id as string,
    title: row.title as string,
    userId: row.user_id as string,
    userName: row.user_name as string | undefined,
    progress: Number(row.progress) || 0,
    dueDate: row.due_date ? formatDate(row.due_date) : undefined,
    confidence: (row.confidence as RockConfidence) || "on_track",
    confidenceNotes: row.confidence_notes as string | undefined,
    daysRemaining: row.days_remaining !== null ? Number(row.days_remaining) : undefined,
    riskReason: row.risk_reason as string,
  }
}

function formatDate(date: unknown): string {
  if (!date) return ""
  if (typeof date === "string") {
    const d = new Date(date)
    if (isNaN(d.getTime())) return date
    return d.toISOString().split("T")[0]
  }
  if (date instanceof Date) {
    return date.toISOString().split("T")[0]
  }
  return ""
}

function parseJsonArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value as string[]
  if (typeof value === "string") {
    try {
      return JSON.parse(value)
    } catch {
      return []
    }
  }
  return []
}

// ============================================
// WEEK CALCULATION
// ============================================

export function getWeekStart(date?: Date): string {
  const d = date ? new Date(date) : new Date()
  const dayOfWeek = d.getDay()
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  d.setDate(d.getDate() - daysToSubtract)
  return d.toISOString().split("T")[0]
}

// ============================================
// ROCK OPERATIONS
// ============================================

/**
 * Get rocks by workspace with optional status filter
 */
export async function getRocksByWorkspace(
  workspaceId: string,
  status?: RockStatus
): Promise<Rock[]> {
  let query
  if (status) {
    query = await sql`
      SELECT r.*, u.name as user_name
      FROM rocks r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.workspace_id = ${workspaceId}
        AND r.status = ${status}
      ORDER BY r.due_date ASC NULLS LAST, r.created_at DESC
    `
  } else {
    query = await sql`
      SELECT r.*, u.name as user_name
      FROM rocks r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.workspace_id = ${workspaceId}
      ORDER BY
        CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END,
        r.due_date ASC NULLS LAST,
        r.created_at DESC
    `
  }
  return query.rows.map(parseRock)
}

/**
 * Get active (non-completed) rocks for a workspace
 */
export async function getActiveRocksByWorkspace(workspaceId: string): Promise<Rock[]> {
  const { rows } = await sql`
    SELECT r.*, u.name as user_name
    FROM rocks r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.workspace_id = ${workspaceId}
      AND r.status != 'completed'
    ORDER BY r.due_date ASC NULLS LAST, r.created_at DESC
  `
  return rows.map(parseRock)
}

/**
 * Get a single rock by ID with user info (optionally workspace-scoped)
 */
export async function getRockById(rockId: string, workspaceId?: string): Promise<Rock | null> {
  if (workspaceId) {
    const { rows } = await sql`
      SELECT r.*, u.name as user_name
      FROM rocks r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.id = ${rockId} AND r.workspace_id = ${workspaceId}
      LIMIT 1
    `
    if (rows.length === 0) return null
    return parseRock(rows[0])
  }
  const { rows } = await sql`
    SELECT r.*, u.name as user_name
    FROM rocks r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.id = ${rockId}
    LIMIT 1
  `
  if (rows.length === 0) return null
  return parseRock(rows[0])
}

/**
 * Update rock confidence with notes (optionally workspace-scoped)
 */
export async function updateRockConfidence(
  rockId: string,
  confidence: RockConfidence,
  notes?: string,
  workspaceId?: string
): Promise<Rock | null> {
  const sanitizedNotes = notes ? sanitizeText(notes) : null
  if (workspaceId) {
    const { rows } = await sql`
      UPDATE rocks
      SET
        confidence = ${confidence},
        confidence_notes = ${sanitizedNotes},
        confidence_updated_at = NOW(),
        updated_at = NOW()
      WHERE id = ${rockId} AND workspace_id = ${workspaceId}
      RETURNING *
    `
    if (rows.length === 0) return null
    return parseRock(rows[0])
  }
  const { rows } = await sql`
    UPDATE rocks
    SET
      confidence = ${confidence},
      confidence_notes = ${sanitizedNotes},
      confidence_updated_at = NOW(),
      updated_at = NOW()
    WHERE id = ${rockId}
    RETURNING *
  `
  if (rows.length === 0) return null
  return parseRock(rows[0])
}

/**
 * Mark a rock as completed (optionally workspace-scoped)
 */
export async function completeRock(rockId: string, workspaceId?: string): Promise<Rock | null> {
  if (workspaceId) {
    const { rows } = await sql`
      UPDATE rocks
      SET
        status = 'completed',
        progress = 100,
        completed_at = NOW(),
        confidence = 'on_track',
        updated_at = NOW()
      WHERE id = ${rockId} AND workspace_id = ${workspaceId}
      RETURNING *
    `
    if (rows.length === 0) return null
    return parseRock(rows[0])
  }
  const { rows } = await sql`
    UPDATE rocks
    SET
      status = 'completed',
      progress = 100,
      completed_at = NOW(),
      confidence = 'on_track',
      updated_at = NOW()
    WHERE id = ${rockId}
    RETURNING *
  `
  if (rows.length === 0) return null
  return parseRock(rows[0])
}

/**
 * Reopen a completed rock (optionally workspace-scoped)
 */
export async function reopenRock(rockId: string, workspaceId?: string): Promise<Rock | null> {
  if (workspaceId) {
    const { rows } = await sql`
      UPDATE rocks
      SET
        status = 'on-track',
        completed_at = NULL,
        updated_at = NOW()
      WHERE id = ${rockId} AND workspace_id = ${workspaceId}
      RETURNING *
    `
    if (rows.length === 0) return null
    return parseRock(rows[0])
  }
  const { rows } = await sql`
    UPDATE rocks
    SET
      status = 'on-track',
      completed_at = NULL,
      updated_at = NOW()
    WHERE id = ${rockId}
    RETURNING *
  `
  if (rows.length === 0) return null
  return parseRock(rows[0])
}

/**
 * Manually recalculate rock progress (triggers don't always fire)
 */
export async function recalculateRockProgress(rockId: string): Promise<number> {
  const { rows } = await sql`
    SELECT calculate_rock_progress(${rockId}) as progress
  `
  const progress = Number(rows[0]?.progress) || 0

  await sql`
    UPDATE rocks
    SET progress = ${progress}, updated_at = NOW()
    WHERE id = ${rockId}
  `

  return progress
}

// ============================================
// TASK OPERATIONS
// ============================================

/**
 * Get tasks linked to a rock
 */
export async function getRockTasks(rockId: string): Promise<RockTask[]> {
  const { rows } = await sql`
    SELECT t.*, u.name as assignee_name
    FROM assigned_tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.rock_id = ${rockId}
    ORDER BY
      CASE t.status
        WHEN 'pending' THEN 0
        WHEN 'in-progress' THEN 1
        WHEN 'completed' THEN 2
        ELSE 3
      END,
      t.due_date ASC NULLS LAST,
      t.created_at DESC
  `
  return rows.map(parseTask)
}

/**
 * Link a task to a rock
 */
export async function linkTaskToRock(taskId: string, rockId: string): Promise<boolean> {
  const rock = await getRockById(rockId)
  const { rowCount } = await sql`
    UPDATE assigned_tasks
    SET
      rock_id = ${rockId},
      rock_title = ${rock?.title || null},
      updated_at = NOW()
    WHERE id = ${taskId}
  `
  return (rowCount ?? 0) > 0
}

/**
 * Unlink a task from its rock
 */
export async function unlinkTaskFromRock(taskId: string): Promise<boolean> {
  const { rowCount } = await sql`
    UPDATE assigned_tasks
    SET
      rock_id = NULL,
      rock_title = NULL,
      updated_at = NOW()
    WHERE id = ${taskId}
  `
  return (rowCount ?? 0) > 0
}

// ============================================
// MILESTONE OPERATIONS
// ============================================

/**
 * Get milestones for a rock
 */
export async function getRockMilestones(rockId: string): Promise<RockMilestone[]> {
  const { rows } = await sql`
    SELECT * FROM rock_milestones
    WHERE rock_id = ${rockId}
    ORDER BY position ASC
  `
  return rows.map(parseMilestone)
}

// ============================================
// CHECK-IN OPERATIONS
// ============================================

/**
 * Create a weekly check-in
 */
export async function createRockCheckin(params: {
  rockId: string
  userId?: string
  confidence: RockConfidence
  notes?: string
  weekStart?: string
}): Promise<RockCheckin> {
  const id = "rc_" + generateId()
  const weekStart = params.weekStart || getWeekStart()
  const sanitizedNotes = params.notes ? sanitizeText(params.notes) : null

  // Get current progress
  const rock = await getRockById(params.rockId)
  const progress = rock?.progress || 0

  const { rows } = await sql`
    INSERT INTO rock_checkins (id, rock_id, user_id, confidence, notes, progress_at_checkin, week_start)
    VALUES (${id}, ${params.rockId}, ${params.userId || null}, ${params.confidence}, ${sanitizedNotes}, ${progress}, ${weekStart}::date)
    ON CONFLICT (rock_id, week_start)
    DO UPDATE SET
      confidence = ${params.confidence},
      notes = ${sanitizedNotes},
      progress_at_checkin = ${progress},
      user_id = ${params.userId || null}
    RETURNING *
  `

  // Also update the rock's confidence
  await updateRockConfidence(params.rockId, params.confidence, params.notes)

  return parseCheckin(rows[0])
}

/**
 * Get check-ins for a rock
 */
export async function getRockCheckins(
  rockId: string,
  limit: number = 13
): Promise<RockCheckin[]> {
  const { rows } = await sql`
    SELECT rc.*, u.name as user_name
    FROM rock_checkins rc
    LEFT JOIN users u ON u.id = rc.user_id
    WHERE rc.rock_id = ${rockId}
    ORDER BY rc.week_start DESC
    LIMIT ${limit}
  `
  return rows.map(parseCheckin)
}

/**
 * Get the latest check-in for a rock
 */
export async function getLatestRockCheckin(rockId: string): Promise<RockCheckin | null> {
  const { rows } = await sql`
    SELECT rc.*, u.name as user_name
    FROM rock_checkins rc
    LEFT JOIN users u ON u.id = rc.user_id
    WHERE rc.rock_id = ${rockId}
    ORDER BY rc.week_start DESC
    LIMIT 1
  `
  if (rows.length === 0) return null
  return parseCheckin(rows[0])
}

// ============================================
// SUMMARY OPERATIONS
// ============================================

/**
 * Get rock summary with stats for a workspace
 */
export async function getRockSummary(
  workspaceId: string,
  status?: RockStatus
): Promise<RockSummary[]> {
  const { rows } = await sql`
    SELECT * FROM get_rock_summary(${workspaceId}, ${status || null})
  `
  return rows.map(parseSummary)
}

/**
 * Get rocks at risk for a workspace
 */
export async function getRocksAtRisk(workspaceId: string): Promise<RockAtRisk[]> {
  const { rows } = await sql`
    SELECT * FROM get_rocks_at_risk(${workspaceId})
  `
  return rows.map(parseAtRisk)
}

/**
 * Get rock statistics for a workspace
 */
export async function getRockStats(workspaceId: string): Promise<{
  total: number
  onTrack: number
  atRisk: number
  offTrack: number
  completed: number
  overdue: number
}> {
  const { rows } = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE confidence = 'on_track' AND status != 'completed') as on_track,
      COUNT(*) FILTER (WHERE confidence = 'at_risk' AND status != 'completed') as at_risk,
      COUNT(*) FILTER (WHERE confidence = 'off_track' AND status != 'completed') as off_track,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed') as overdue
    FROM rocks
    WHERE workspace_id = ${workspaceId}
  `

  const row = rows[0] || {}
  return {
    total: Number(row.total) || 0,
    onTrack: Number(row.on_track) || 0,
    atRisk: Number(row.at_risk) || 0,
    offTrack: Number(row.off_track) || 0,
    completed: Number(row.completed) || 0,
    overdue: Number(row.overdue) || 0,
  }
}

// ============================================
// EXPORT
// ============================================

export const rocks = {
  // Core operations
  getByWorkspace: getRocksByWorkspace,
  getActiveByWorkspace: getActiveRocksByWorkspace,
  getById: getRockById,
  updateConfidence: updateRockConfidence,
  complete: completeRock,
  reopen: reopenRock,
  recalculateProgress: recalculateRockProgress,

  // Task operations
  getTasks: getRockTasks,
  linkTask: linkTaskToRock,
  unlinkTask: unlinkTaskFromRock,

  // Milestone operations
  getMilestones: getRockMilestones,

  // Check-in operations
  createCheckin: createRockCheckin,
  getCheckins: getRockCheckins,
  getLatestCheckin: getLatestRockCheckin,

  // Summary operations
  getSummary: getRockSummary,
  getAtRisk: getRocksAtRisk,
  getStats: getRockStats,

  // Utilities
  getWeekStart,
}

export default rocks
