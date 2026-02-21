/**
 * L10 Meetings Database Operations
 *
 * Manages L10 meetings, sections, issues, and todos.
 * Part of SESSION 8: L10 Meeting Module (THE FLAGSHIP FEATURE)
 */

import { sql } from "./sql"
import { generateId } from "@/lib/auth/password"
import { sanitizeText } from "@/lib/utils/sanitize"

// ============================================
// TYPES
// ============================================

export type MeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled"
export type SectionType = "segue" | "scorecard" | "rocks" | "headlines" | "ids" | "conclude"
export type IssueStatus = "open" | "discussing" | "resolved" | "dropped"

export interface Meeting {
  id: string
  workspaceId: string
  title: string
  status: MeetingStatus
  scheduledAt: string
  startedAt?: string
  endedAt?: string
  durationMinutes?: number
  attendees: string[]
  notes?: string
  rating?: number
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface MeetingSection {
  id: string
  meetingId: string
  sectionType: SectionType
  orderIndex: number
  durationTarget: number
  startedAt?: string
  endedAt?: string
  data: Record<string, unknown>
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface Issue {
  id: string
  workspaceId: string
  title: string
  description?: string
  priority: number
  status: IssueStatus
  sourceType?: string
  sourceId?: string
  ownerId?: string
  ownerName?: string
  createdBy?: string
  resolvedAt?: string
  resolution?: string
  createdAt: string
  updatedAt: string
}

export interface MeetingTodo {
  id: string
  meetingId: string
  issueId?: string
  title: string
  assigneeId?: string
  assigneeName?: string
  dueDate?: string
  completed: boolean
  completedAt?: string
  taskId?: string
  createdAt: string
  updatedAt: string
}

export interface MeetingPrep {
  scorecardAlerts: Array<{
    metric_id: string
    metric_name: string
    target_value?: number
    unit?: string
    current_value?: number
    status: string
    owner_name?: string
  }>
  rocksAtRisk: Array<{
    id: string
    title: string
    progress: number
    due_date?: string
    confidence: string
    confidence_notes?: string
    owner_name?: string
    days_remaining?: number
    risk_reason: string
  }>
  overdueTasks: Array<{
    id: string
    title: string
    due_date: string
    priority: string
    assignee_id?: string
    assignee_name?: string
    days_overdue: number
  }>
  openIssues: Array<{
    id: string
    title: string
    description?: string
    priority: number
    source_type?: string
    owner_id?: string
    owner_name?: string
    created_at: string
  }>
}

export interface MeetingStats {
  totalMeetings: number
  completedMeetings: number
  averageRating?: number
  averageDuration?: number
  totalIssuesResolved: number
  totalTodosCreated: number
}

export interface MeetingWithDetails extends Meeting {
  sections: MeetingSection[]
}

// ============================================
// PARSERS
// ============================================

function parseMeeting(row: Record<string, unknown>): Meeting {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    title: row.title as string,
    status: (row.status as MeetingStatus) || "scheduled",
    scheduledAt: (row.scheduled_at as Date)?.toISOString() || "",
    startedAt: row.started_at ? (row.started_at as Date).toISOString() : undefined,
    endedAt: row.ended_at ? (row.ended_at as Date).toISOString() : undefined,
    durationMinutes: row.duration_minutes ? Number(row.duration_minutes) : undefined,
    attendees: parseJsonArray(row.attendees),
    notes: row.notes as string | undefined,
    rating: row.rating ? Number(row.rating) : undefined,
    createdBy: row.created_by as string | undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

function parseSection(row: Record<string, unknown>): MeetingSection {
  return {
    id: row.id as string,
    meetingId: row.meeting_id as string,
    sectionType: row.section_type as SectionType,
    orderIndex: Number(row.order_index) || 0,
    durationTarget: Number(row.duration_target) || 5,
    startedAt: row.started_at ? (row.started_at as Date).toISOString() : undefined,
    endedAt: row.ended_at ? (row.ended_at as Date).toISOString() : undefined,
    data: parseJsonObject(row.data),
    completed: Boolean(row.completed),
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

function parseIssue(row: Record<string, unknown>): Issue {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    priority: Number(row.priority) || 0,
    status: (row.status as IssueStatus) || "open",
    sourceType: row.source_type as string | undefined,
    sourceId: row.source_id as string | undefined,
    ownerId: row.owner_id as string | undefined,
    ownerName: row.owner_name as string | undefined,
    createdBy: row.created_by as string | undefined,
    resolvedAt: row.resolved_at ? (row.resolved_at as Date).toISOString() : undefined,
    resolution: row.resolution as string | undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

function parseTodo(row: Record<string, unknown>): MeetingTodo {
  return {
    id: row.id as string,
    meetingId: row.meeting_id as string,
    issueId: row.issue_id as string | undefined,
    title: row.title as string,
    assigneeId: row.assignee_id as string | undefined,
    assigneeName: row.assignee_name as string | undefined,
    dueDate: row.due_date ? formatDate(row.due_date) : undefined,
    completed: Boolean(row.completed),
    completedAt: row.completed_at ? (row.completed_at as Date).toISOString() : undefined,
    taskId: row.task_id as string | undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
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

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value === "string") {
    try {
      return JSON.parse(value)
    } catch {
      return {}
    }
  }
  return {}
}

// ============================================
// MEETING OPERATIONS
// ============================================

export interface CreateMeetingParams {
  workspaceId: string
  title?: string
  scheduledAt: string
  attendees?: string[]
  createdBy?: string
}

/**
 * Create a new L10 meeting
 */
export async function createMeeting(params: CreateMeetingParams): Promise<Meeting> {
  const id = "mtg_" + generateId()
  const {
    workspaceId,
    title = "L10 Meeting",
    scheduledAt,
    attendees = [],
    createdBy,
  } = params

  const { rows } = await sql`
    INSERT INTO meetings (id, workspace_id, title, scheduled_at, attendees, created_by)
    VALUES (${id}, ${workspaceId}, ${title}, ${scheduledAt}::timestamptz, ${JSON.stringify(attendees)}::jsonb, ${createdBy || null})
    RETURNING *
  `

  return parseMeeting(rows[0])
}

/**
 * Get a meeting by ID with all sections (optionally workspace-scoped)
 */
export async function getMeetingById(meetingId: string, workspaceId?: string): Promise<MeetingWithDetails | null> {
  const { rows: meetingRows } = workspaceId
    ? await sql`SELECT * FROM meetings WHERE id = ${meetingId} AND workspace_id = ${workspaceId}`
    : await sql`SELECT * FROM meetings WHERE id = ${meetingId}`

  if (meetingRows.length === 0) return null

  const { rows: sectionRows } = await sql`
    SELECT * FROM meeting_sections
    WHERE meeting_id = ${meetingId}
    ORDER BY order_index ASC
  `

  const meeting = parseMeeting(meetingRows[0])
  return {
    ...meeting,
    sections: sectionRows.map(parseSection),
  }
}

/**
 * Get meetings for a workspace
 */
export async function getMeetingsByWorkspace(
  workspaceId: string,
  limit: number = 20
): Promise<Meeting[]> {
  const { rows } = await sql`
    SELECT * FROM meetings
    WHERE workspace_id = ${workspaceId}
    ORDER BY scheduled_at DESC
    LIMIT ${limit}
  `
  return rows.map(parseMeeting)
}

/**
 * List meetings with filtering options
 */
export async function listMeetings(
  workspaceId: string,
  options: { status?: MeetingStatus | null; limit?: number; offset?: number } = {}
): Promise<Meeting[]> {
  const { status, limit = 20, offset = 0 } = options

  if (status) {
    const { rows } = await sql`
      SELECT * FROM meetings
      WHERE workspace_id = ${workspaceId}
        AND status = ${status}
      ORDER BY scheduled_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    return rows.map(parseMeeting)
  }

  const { rows } = await sql`
    SELECT * FROM meetings
    WHERE workspace_id = ${workspaceId}
    ORDER BY scheduled_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `
  return rows.map(parseMeeting)
}

/**
 * Update meeting properties
 */
export async function updateMeeting(
  meetingId: string,
  updates: Record<string, unknown>
): Promise<MeetingWithDetails | null> {
  const meeting = await getMeetingById(meetingId)
  if (!meeting) return null

  // Build update parts
  const updateParts: string[] = []
  const values: unknown[] = []

  if (updates.title !== undefined) {
    updateParts.push("title = $" + (values.length + 1))
    values.push(updates.title)
  }
  if (updates.notes !== undefined) {
    updateParts.push("notes = $" + (values.length + 1))
    values.push(updates.notes)
  }
  if (updates.attendees !== undefined) {
    updateParts.push("attendees = $" + (values.length + 1) + "::jsonb")
    values.push(updates.attendees)
  }

  if (updateParts.length === 0) return meeting

  const sanitizedTitle = updates.title ? sanitizeText(updates.title as string) : meeting.title
  const sanitizedNotes = updates.notes !== undefined
    ? (updates.notes ? sanitizeText(updates.notes as string) : updates.notes as string | null)
    : (meeting.notes ?? null)
  const { rows } = await sql`
    UPDATE meetings
    SET
      title = ${sanitizedTitle},
      notes = ${sanitizedNotes},
      attendees = ${updates.attendees ? JSON.stringify(updates.attendees) : JSON.stringify(meeting.attendees)}::jsonb
    WHERE id = ${meetingId}
    RETURNING *
  `

  if (rows.length === 0) return null

  return {
    ...parseMeeting(rows[0]),
    sections: meeting.sections,
  }
}

/**
 * Get upcoming meetings for a workspace
 */
export async function getUpcomingMeetings(
  workspaceId: string,
  limit: number = 5
): Promise<Meeting[]> {
  const { rows } = await sql`
    SELECT * FROM meetings
    WHERE workspace_id = ${workspaceId}
      AND status IN ('scheduled', 'in_progress')
      AND scheduled_at >= NOW() - INTERVAL '2 hours'
    ORDER BY scheduled_at ASC
    LIMIT ${limit}
  `
  return rows.map(parseMeeting)
}

/**
 * Start a meeting - gets prep data
 */
export async function startMeeting(meetingId: string): Promise<{
  meeting: Meeting
  sections: MeetingSection[]
  prep: MeetingPrep
}> {
  // Update meeting status
  const { rows: meetingRows } = await sql`
    UPDATE meetings
    SET status = 'in_progress', started_at = NOW()
    WHERE id = ${meetingId}
    RETURNING *
  `

  if (meetingRows.length === 0) {
    throw new Error("Meeting not found")
  }

  const meeting = parseMeeting(meetingRows[0])

  // Get sections
  const { rows: sectionRows } = await sql`
    SELECT * FROM meeting_sections
    WHERE meeting_id = ${meetingId}
    ORDER BY order_index ASC
  `

  // Start first section
  if (sectionRows.length > 0) {
    await sql`
      UPDATE meeting_sections
      SET started_at = NOW()
      WHERE id = ${sectionRows[0].id}
    `
  }

  // Get meeting prep
  const { rows: prepRows } = await sql`
    SELECT get_meeting_prep(${meeting.workspaceId}) as prep
  `

  const prep = prepRows[0]?.prep || {
    scorecardAlerts: [],
    rocksAtRisk: [],
    overdueTasks: [],
    openIssues: [],
  }

  return {
    meeting,
    sections: sectionRows.map(parseSection),
    prep,
  }
}

/**
 * Start a specific section
 */
export async function startSection(
  meetingId: string,
  sectionType: SectionType
): Promise<MeetingSection | null> {
  const { rows } = await sql`
    UPDATE meeting_sections
    SET started_at = NOW()
    WHERE meeting_id = ${meetingId} AND section_type = ${sectionType}
    RETURNING *
  `

  if (rows.length === 0) return null
  return parseSection(rows[0])
}

/**
 * Update section data without completing
 */
export async function updateSectionData(
  meetingId: string,
  sectionType: SectionType,
  data: Record<string, unknown>
): Promise<MeetingSection | null> {
  const { rows } = await sql`
    UPDATE meeting_sections
    SET data = ${JSON.stringify(data)}::jsonb
    WHERE meeting_id = ${meetingId} AND section_type = ${sectionType}
    RETURNING *
  `

  if (rows.length === 0) return null
  return parseSection(rows[0])
}

/**
 * Complete a meeting section and move to next
 */
export async function completeMeetingSection(
  meetingId: string,
  sectionType: SectionType,
  data?: Record<string, unknown>
): Promise<{
  completedSection: MeetingSection
  nextSection?: MeetingSection
}> {
  // Complete current section
  const { rows: completedRows } = await sql`
    UPDATE meeting_sections
    SET completed = TRUE, ended_at = NOW(), data = ${JSON.stringify(data || {})}::jsonb
    WHERE meeting_id = ${meetingId} AND section_type = ${sectionType}
    RETURNING *
  `

  if (completedRows.length === 0) {
    throw new Error("Section not found")
  }

  const completedSection = parseSection(completedRows[0])

  // Find and start next section
  const { rows: nextRows } = await sql`
    UPDATE meeting_sections
    SET started_at = NOW()
    WHERE meeting_id = ${meetingId}
      AND order_index = ${completedSection.orderIndex + 1}
      AND started_at IS NULL
    RETURNING *
  `

  return {
    completedSection,
    nextSection: nextRows.length > 0 ? parseSection(nextRows[0]) : undefined,
  }
}

/**
 * End a meeting
 */
export async function endMeeting(
  meetingId: string,
  rating?: number,
  notes?: string
): Promise<Meeting> {
  const sanitizedNotes = notes ? sanitizeText(notes) : null
  const { rows } = await sql`
    UPDATE meetings
    SET
      status = 'completed',
      ended_at = NOW(),
      duration_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60,
      rating = ${rating || null},
      notes = ${sanitizedNotes}
    WHERE id = ${meetingId}
    RETURNING *
  `

  if (rows.length === 0) {
    throw new Error("Meeting not found")
  }

  return parseMeeting(rows[0])
}

/**
 * Cancel a meeting
 */
export async function cancelMeeting(meetingId: string): Promise<Meeting> {
  const { rows } = await sql`
    UPDATE meetings
    SET status = 'cancelled'
    WHERE id = ${meetingId}
    RETURNING *
  `

  if (rows.length === 0) {
    throw new Error("Meeting not found")
  }

  return parseMeeting(rows[0])
}

/**
 * Update meeting attendees
 */
export async function updateMeetingAttendees(
  meetingId: string,
  attendees: string[]
): Promise<Meeting> {
  const { rows } = await sql`
    UPDATE meetings
    SET attendees = ${JSON.stringify(attendees)}::jsonb
    WHERE id = ${meetingId}
    RETURNING *
  `

  if (rows.length === 0) {
    throw new Error("Meeting not found")
  }

  return parseMeeting(rows[0])
}

/**
 * Get meeting stats
 */
export async function getMeetingStats(
  workspaceId: string,
  weeks: number = 13
): Promise<MeetingStats> {
  const { rows } = await sql`
    SELECT get_meeting_stats(${workspaceId}, ${weeks}) as stats
  `

  const stats = rows[0]?.stats || {}
  return {
    totalMeetings: Number(stats.totalMeetings) || 0,
    completedMeetings: Number(stats.completedMeetings) || 0,
    averageRating: stats.averageRating ? Number(stats.averageRating) : undefined,
    averageDuration: stats.averageDuration ? Number(stats.averageDuration) : undefined,
    totalIssuesResolved: Number(stats.totalIssuesResolved) || 0,
    totalTodosCreated: Number(stats.totalTodosCreated) || 0,
  }
}

/**
 * Get meeting prep data
 */
export async function getMeetingPrep(workspaceId: string): Promise<MeetingPrep> {
  const { rows } = await sql`
    SELECT get_meeting_prep(${workspaceId}) as prep
  `

  return rows[0]?.prep || {
    scorecardAlerts: [],
    rocksAtRisk: [],
    overdueTasks: [],
    openIssues: [],
  }
}

// ============================================
// ISSUE OPERATIONS
// ============================================

export interface CreateIssueParams {
  workspaceId: string
  title: string
  description?: string
  priority?: number
  sourceType?: string
  sourceId?: string
  ownerId?: string
  createdBy?: string
}

/**
 * Create a new issue
 */
export async function createIssue(params: CreateIssueParams): Promise<Issue> {
  const id = "iss_" + generateId()
  const {
    workspaceId,
    title,
    description,
    priority = 0,
    sourceType,
    sourceId,
    ownerId,
    createdBy,
  } = params

  const sanitizedTitle = sanitizeText(title)
  const sanitizedDescription = description ? sanitizeText(description) : null

  const { rows } = await sql`
    INSERT INTO issues (id, workspace_id, title, description, priority, source_type, source_id, owner_id, created_by)
    VALUES (${id}, ${workspaceId}, ${sanitizedTitle}, ${sanitizedDescription}, ${priority}, ${sourceType || null}, ${sourceId || null}, ${ownerId || null}, ${createdBy || null})
    RETURNING *
  `

  return parseIssue(rows[0])
}

/**
 * Get issue by ID (optionally workspace-scoped)
 */
export async function getIssueById(issueId: string, workspaceId?: string): Promise<Issue | null> {
  const { rows } = workspaceId
    ? await sql`
        SELECT i.*, u.name as owner_name
        FROM issues i
        LEFT JOIN users u ON u.id = i.owner_id
        WHERE i.id = ${issueId} AND i.workspace_id = ${workspaceId}
      `
    : await sql`
        SELECT i.*, u.name as owner_name
        FROM issues i
        LEFT JOIN users u ON u.id = i.owner_id
        WHERE i.id = ${issueId}
      `

  if (rows.length === 0) return null
  return parseIssue(rows[0])
}

/**
 * Get open issues for a workspace
 */
export async function getOpenIssues(workspaceId: string, limit: number = 50): Promise<Issue[]> {
  const { rows } = await sql`
    SELECT i.*, u.name as owner_name
    FROM issues i
    LEFT JOIN users u ON u.id = i.owner_id
    WHERE i.workspace_id = ${workspaceId}
      AND i.status = 'open'
    ORDER BY i.priority DESC, i.created_at ASC
    LIMIT ${limit}
  `
  return rows.map(parseIssue)
}

/**
 * Get all issues for a workspace
 */
export async function getIssuesByWorkspace(
  workspaceId: string,
  status?: IssueStatus
): Promise<Issue[]> {
  let query
  if (status) {
    query = await sql`
      SELECT i.*, u.name as owner_name
      FROM issues i
      LEFT JOIN users u ON u.id = i.owner_id
      WHERE i.workspace_id = ${workspaceId}
        AND i.status = ${status}
      ORDER BY i.priority DESC, i.created_at DESC
    `
  } else {
    query = await sql`
      SELECT i.*, u.name as owner_name
      FROM issues i
      LEFT JOIN users u ON u.id = i.owner_id
      WHERE i.workspace_id = ${workspaceId}
      ORDER BY
        CASE i.status WHEN 'open' THEN 0 WHEN 'discussing' THEN 1 ELSE 2 END,
        i.priority DESC,
        i.created_at DESC
    `
  }
  return query.rows.map(parseIssue)
}

/**
 * List issues with filtering options
 */
export async function listIssues(
  workspaceId: string,
  options: { status?: IssueStatus | null; limit?: number } = {}
): Promise<Issue[]> {
  const { status, limit = 50 } = options

  if (status) {
    const { rows } = await sql`
      SELECT i.*, u.name as owner_name
      FROM issues i
      LEFT JOIN users u ON u.id = i.owner_id
      WHERE i.workspace_id = ${workspaceId}
        AND i.status = ${status}
      ORDER BY i.priority DESC, i.created_at DESC
      LIMIT ${limit}
    `
    return rows.map(parseIssue)
  }

  const { rows } = await sql`
    SELECT i.*, u.name as owner_name
    FROM issues i
    LEFT JOIN users u ON u.id = i.owner_id
    WHERE i.workspace_id = ${workspaceId}
    ORDER BY
      CASE i.status WHEN 'open' THEN 0 WHEN 'discussing' THEN 1 ELSE 2 END,
      i.priority DESC,
      i.created_at DESC
    LIMIT ${limit}
  `
  return rows.map(parseIssue)
}

/**
 * Update issue
 */
export async function updateIssue(
  issueId: string,
  updates: Partial<{
    title: string
    description: string
    priority: number
    status: IssueStatus
    ownerId: string
  }>
): Promise<Issue | null> {
  const issue = await getIssueById(issueId)
  if (!issue) return null

  const sanitizedTitle = updates.title ? sanitizeText(updates.title) : issue.title
  const sanitizedDescription = updates.description !== undefined
    ? (updates.description ? sanitizeText(updates.description) : null)
    : (issue.description ?? null)
  const { rows } = await sql`
    UPDATE issues
    SET
      title = ${sanitizedTitle},
      description = ${sanitizedDescription},
      priority = ${updates.priority ?? issue.priority},
      status = ${updates.status ?? issue.status},
      owner_id = ${updates.ownerId ?? issue.ownerId ?? null}
    WHERE id = ${issueId}
    RETURNING *
  `

  if (rows.length === 0) return null
  return parseIssue(rows[0])
}

/**
 * Resolve an issue
 */
export async function resolveIssue(
  issueId: string,
  resolution?: string
): Promise<Issue | null> {
  const sanitizedResolution = resolution ? sanitizeText(resolution) : null
  const { rows } = await sql`
    UPDATE issues
    SET status = 'resolved', resolved_at = NOW(), resolution = ${sanitizedResolution}
    WHERE id = ${issueId}
    RETURNING *
  `

  if (rows.length === 0) return null
  return parseIssue(rows[0])
}

/**
 * Drop an issue
 */
export async function dropIssue(issueId: string): Promise<Issue | null> {
  const { rows } = await sql`
    UPDATE issues
    SET status = 'dropped'
    WHERE id = ${issueId}
    RETURNING *
  `

  if (rows.length === 0) return null
  return parseIssue(rows[0])
}

/**
 * Reopen an issue
 */
export async function reopenIssue(issueId: string): Promise<Issue | null> {
  const { rows } = await sql`
    UPDATE issues
    SET status = 'open', resolved_at = NULL, resolution = NULL
    WHERE id = ${issueId}
    RETURNING *
  `

  if (rows.length === 0) return null
  return parseIssue(rows[0])
}

/**
 * Link issue to meeting
 */
export async function linkIssueToMeeting(
  meetingId: string,
  issueId: string,
  orderIndex?: number
): Promise<void> {
  await sql`
    INSERT INTO meeting_issues (meeting_id, issue_id, order_index)
    VALUES (${meetingId}, ${issueId}, ${orderIndex || 0})
    ON CONFLICT (meeting_id, issue_id) DO NOTHING
  `
}

/**
 * Mark issue as discussed in meeting
 */
export async function markIssueDiscussed(
  meetingId: string,
  issueId: string,
  resolved: boolean = false
): Promise<void> {
  await sql`
    UPDATE meeting_issues
    SET discussed = TRUE, resolved_in_meeting = ${resolved}
    WHERE meeting_id = ${meetingId} AND issue_id = ${issueId}
  `
}

/**
 * Mark issue as resolved in meeting
 */
export async function markIssueResolvedInMeeting(
  meetingId: string,
  issueId: string
): Promise<void> {
  await sql`
    UPDATE meeting_issues
    SET discussed = TRUE, resolved_in_meeting = TRUE
    WHERE meeting_id = ${meetingId} AND issue_id = ${issueId}
  `
}

/**
 * Get issues for a meeting
 */
export async function getMeetingIssues(meetingId: string): Promise<Issue[]> {
  const { rows } = await sql`
    SELECT i.*, u.name as owner_name, mi.discussed, mi.resolved_in_meeting, mi.order_index
    FROM issues i
    JOIN meeting_issues mi ON mi.issue_id = i.id
    LEFT JOIN users u ON u.id = i.owner_id
    WHERE mi.meeting_id = ${meetingId}
    ORDER BY mi.order_index ASC, i.priority DESC
  `
  return rows.map(parseIssue)
}

// ============================================
// TODO OPERATIONS
// ============================================

export interface CreateTodoParams {
  meetingId: string
  issueId?: string
  title: string
  assigneeId?: string
  dueDate?: string
}

/**
 * Create a meeting todo
 */
export async function createMeetingTodo(params: CreateTodoParams): Promise<MeetingTodo> {
  const id = "todo_" + generateId()
  const { meetingId, issueId, title, assigneeId, dueDate } = params

  const { rows } = await sql`
    INSERT INTO meeting_todos (id, meeting_id, issue_id, title, assignee_id, due_date)
    VALUES (${id}, ${meetingId}, ${issueId || null}, ${sanitizeText(title)}, ${assigneeId || null}, ${dueDate || null}::date)
    RETURNING *
  `

  return parseTodo(rows[0])
}

/**
 * Get todos for a meeting
 */
export async function getMeetingTodos(meetingId: string): Promise<MeetingTodo[]> {
  const { rows } = await sql`
    SELECT mt.*, u.name as assignee_name
    FROM meeting_todos mt
    LEFT JOIN users u ON u.id = mt.assignee_id
    WHERE mt.meeting_id = ${meetingId}
    ORDER BY mt.created_at ASC
  `
  return rows.map(parseTodo)
}

/**
 * Complete a todo
 */
export async function completeMeetingTodo(todoId: string, meetingId: string): Promise<MeetingTodo | null> {
  const { rows } = await sql`
    UPDATE meeting_todos
    SET completed = TRUE, completed_at = NOW()
    WHERE id = ${todoId} AND meeting_id = ${meetingId}
    RETURNING *
  `

  if (rows.length === 0) return null
  return parseTodo(rows[0])
}

/**
 * Convert todo to task
 */
export async function convertTodoToTask(
  todoId: string,
  taskId: string
): Promise<MeetingTodo | null> {
  const { rows } = await sql`
    UPDATE meeting_todos
    SET task_id = ${taskId}
    WHERE id = ${todoId}
    RETURNING *
  `

  if (rows.length === 0) return null
  return parseTodo(rows[0])
}

/**
 * Delete a todo
 */
export async function deleteMeetingTodo(todoId: string): Promise<boolean> {
  const { rowCount } = await sql`
    DELETE FROM meeting_todos WHERE id = ${todoId}
  `
  return (rowCount ?? 0) > 0
}

// ============================================
// PAGINATED QUERIES
// ============================================

import type { PaginationParams } from "../utils/pagination"

/**
 * List meetings with cursor-based pagination (ordered by scheduled_at desc)
 */
export async function listMeetingsPaginated(
  workspaceId: string,
  pagination: PaginationParams,
  filters?: { status?: MeetingStatus | null }
): Promise<{ meetings: Meeting[]; totalCount: number }> {
  const { cursor, limit } = pagination
  const fetchLimit = limit + 1
  const status = filters?.status || null

  let cursorTimestamp: string | null = null
  let cursorId: string | null = null
  if (cursor) {
    const { decodeCursor } = await import("../utils/pagination")
    const decoded = decodeCursor(cursor)
    if (decoded) {
      cursorTimestamp = decoded.timestamp
      cursorId = decoded.id
    }
  }

  // Count
  let countPromise
  if (status) {
    countPromise = sql`SELECT COUNT(*) as count FROM meetings WHERE workspace_id = ${workspaceId} AND status = ${status}`
  } else {
    countPromise = sql`SELECT COUNT(*) as count FROM meetings WHERE workspace_id = ${workspaceId}`
  }

  // Data - cursor uses scheduled_at for meetings
  let dataPromise
  if (cursorTimestamp && cursorId) {
    if (status) {
      dataPromise = sql`SELECT * FROM meetings WHERE workspace_id = ${workspaceId} AND status = ${status} AND (scheduled_at < ${cursorTimestamp}::timestamptz OR (scheduled_at = ${cursorTimestamp}::timestamptz AND id < ${cursorId})) ORDER BY scheduled_at DESC, id DESC LIMIT ${fetchLimit}`
    } else {
      dataPromise = sql`SELECT * FROM meetings WHERE workspace_id = ${workspaceId} AND (scheduled_at < ${cursorTimestamp}::timestamptz OR (scheduled_at = ${cursorTimestamp}::timestamptz AND id < ${cursorId})) ORDER BY scheduled_at DESC, id DESC LIMIT ${fetchLimit}`
    }
  } else {
    if (status) {
      dataPromise = sql`SELECT * FROM meetings WHERE workspace_id = ${workspaceId} AND status = ${status} ORDER BY scheduled_at DESC, id DESC LIMIT ${fetchLimit}`
    } else {
      dataPromise = sql`SELECT * FROM meetings WHERE workspace_id = ${workspaceId} ORDER BY scheduled_at DESC, id DESC LIMIT ${fetchLimit}`
    }
  }

  const [countResult, dataResult] = await Promise.all([countPromise, dataPromise])
  const totalCount = parseInt(countResult.rows[0]?.count || "0", 10)
  const meetingsList = dataResult.rows.map(parseMeeting)

  return { meetings: meetingsList, totalCount }
}

/**
 * List issues with cursor-based pagination
 */
export async function listIssuesPaginated(
  workspaceId: string,
  pagination: PaginationParams,
  filters?: { status?: IssueStatus | null }
): Promise<{ issues: Issue[]; totalCount: number }> {
  const { cursor, limit } = pagination
  const fetchLimit = limit + 1
  const status = filters?.status || null

  let cursorTimestamp: string | null = null
  let cursorId: string | null = null
  if (cursor) {
    const { decodeCursor } = await import("../utils/pagination")
    const decoded = decodeCursor(cursor)
    if (decoded) {
      cursorTimestamp = decoded.timestamp
      cursorId = decoded.id
    }
  }

  // Count
  let countPromise
  if (status) {
    countPromise = sql`SELECT COUNT(*) as count FROM issues WHERE workspace_id = ${workspaceId} AND status = ${status}`
  } else {
    countPromise = sql`SELECT COUNT(*) as count FROM issues WHERE workspace_id = ${workspaceId}`
  }

  // Data
  let dataPromise
  if (cursorTimestamp && cursorId) {
    if (status) {
      dataPromise = sql`SELECT i.*, u.name as owner_name FROM issues i LEFT JOIN users u ON u.id = i.owner_id WHERE i.workspace_id = ${workspaceId} AND i.status = ${status} AND (i.created_at < ${cursorTimestamp}::timestamptz OR (i.created_at = ${cursorTimestamp}::timestamptz AND i.id < ${cursorId})) ORDER BY i.created_at DESC, i.id DESC LIMIT ${fetchLimit}`
    } else {
      dataPromise = sql`SELECT i.*, u.name as owner_name FROM issues i LEFT JOIN users u ON u.id = i.owner_id WHERE i.workspace_id = ${workspaceId} AND (i.created_at < ${cursorTimestamp}::timestamptz OR (i.created_at = ${cursorTimestamp}::timestamptz AND i.id < ${cursorId})) ORDER BY i.created_at DESC, i.id DESC LIMIT ${fetchLimit}`
    }
  } else {
    if (status) {
      dataPromise = sql`SELECT i.*, u.name as owner_name FROM issues i LEFT JOIN users u ON u.id = i.owner_id WHERE i.workspace_id = ${workspaceId} AND i.status = ${status} ORDER BY i.created_at DESC, i.id DESC LIMIT ${fetchLimit}`
    } else {
      dataPromise = sql`SELECT i.*, u.name as owner_name FROM issues i LEFT JOIN users u ON u.id = i.owner_id WHERE i.workspace_id = ${workspaceId} ORDER BY i.created_at DESC, i.id DESC LIMIT ${fetchLimit}`
    }
  }

  const [countResult, dataResult] = await Promise.all([countPromise, dataPromise])
  const totalCount = parseInt(countResult.rows[0]?.count || "0", 10)
  const issues = dataResult.rows.map(parseIssue)

  return { issues, totalCount }
}

// ============================================
// EXPORT
// ============================================

export const meetings = {
  // Meeting operations
  create: createMeeting,
  getById: getMeetingById,
  getByWorkspace: getMeetingsByWorkspace,
  list: listMeetings,
  listPaginated: listMeetingsPaginated,
  update: updateMeeting,
  getUpcoming: getUpcomingMeetings,
  start: startMeeting,
  startSection,
  updateSectionData,
  completeSection: completeMeetingSection,
  end: endMeeting,
  cancel: cancelMeeting,
  updateAttendees: updateMeetingAttendees,
  getStats: getMeetingStats,
  getPrep: getMeetingPrep,

  // Issue operations
  createIssue,
  getIssue: getIssueById,
  getOpenIssues,
  getIssuesByWorkspace,
  listIssues,
  listIssuesPaginated,
  updateIssue,
  resolveIssue,
  dropIssue,
  reopenIssue,
  linkIssue: linkIssueToMeeting,
  markIssueDiscussed,
  markIssueResolvedInMeeting,
  getMeetingIssues,

  // Todo operations
  createTodo: createMeetingTodo,
  getTodos: getMeetingTodos,
  completeTodo: completeMeetingTodo,
  convertTodoToTask,
  deleteTodo: deleteMeetingTodo,
}

export default meetings
