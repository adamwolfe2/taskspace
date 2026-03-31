import { sql } from "./sql"
import type { QuarterlyReport, QuarterlyReportData } from "@/lib/types"

function parseReport(row: Record<string, unknown>): QuarterlyReport {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    workspaceId: row.workspace_id as string,
    quarter: row.quarter as string,
    periodStart: row.period_start instanceof Date
      ? row.period_start.toISOString().split("T")[0]
      : String(row.period_start),
    periodEnd: row.period_end instanceof Date
      ? row.period_end.toISOString().split("T")[0]
      : String(row.period_end),
    title: (row.title as string) || "",
    status: row.status as QuarterlyReport["status"],
    publicToken: (row.public_token as string) || null,
    data: (row.data as QuarterlyReportData) || { summary: "", period: { quarter: "", start: "", end: "" }, teamStats: { totalMembers: 0, totalEodReports: 0, avgSubmissionRate: 0, totalTasksCompleted: 0, totalRocks: 0, completedRocks: 0, rockCompletionRate: 0, totalEscalations: 0 }, members: [], generatedAt: "" },
    createdBy: (row.created_by as string) || undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

export async function listQuarterlyReports(orgId: string, workspaceId: string): Promise<QuarterlyReport[]> {
  const { rows } = await sql`
    SELECT * FROM quarterly_reports
    WHERE org_id = ${orgId} AND workspace_id = ${workspaceId}
    ORDER BY created_at DESC
    LIMIT 20
  `
  return rows.map(r => parseReport(r as Record<string, unknown>))
}

export async function getQuarterlyReport(id: string, orgId: string): Promise<QuarterlyReport | null> {
  const { rows } = await sql`
    SELECT * FROM quarterly_reports
    WHERE id = ${id} AND org_id = ${orgId}
    LIMIT 1
  `
  return rows[0] ? parseReport(rows[0] as Record<string, unknown>) : null
}

export async function getQuarterlyReportByToken(token: string): Promise<QuarterlyReport | null> {
  const { rows } = await sql`
    SELECT * FROM quarterly_reports
    WHERE public_token = ${token} AND status = 'published'
    LIMIT 1
  `
  return rows[0] ? parseReport(rows[0] as Record<string, unknown>) : null
}

export async function createQuarterlyReport(params: {
  id: string
  orgId: string
  workspaceId: string
  quarter: string
  periodStart: string
  periodEnd: string
  title: string
  createdBy: string
}): Promise<QuarterlyReport> {
  const { rows } = await sql`
    INSERT INTO quarterly_reports
      (id, org_id, workspace_id, quarter, period_start, period_end, title, status, data, created_by, created_at, updated_at)
    VALUES
      (${params.id}, ${params.orgId}, ${params.workspaceId}, ${params.quarter},
       ${params.periodStart}::date, ${params.periodEnd}::date, ${params.title},
       'draft', '{}'::jsonb, ${params.createdBy}, NOW(), NOW())
    RETURNING *
  `
  return parseReport(rows[0] as Record<string, unknown>)
}

export async function updateQuarterlyReportData(
  id: string,
  orgId: string,
  updates: { data?: QuarterlyReportData; status?: QuarterlyReport["status"]; publicToken?: string | null; title?: string }
): Promise<QuarterlyReport | null> {
  // Build update using separate queries to avoid COALESCE/cast issues with postgres.js
  if (updates.data !== undefined) {
    await sql`
      UPDATE quarterly_reports
      SET data = ${JSON.stringify(updates.data)}::jsonb, updated_at = NOW()
      WHERE id = ${id} AND org_id = ${orgId}
    `
  }
  if (updates.status !== undefined) {
    await sql`
      UPDATE quarterly_reports
      SET status = ${updates.status}, updated_at = NOW()
      WHERE id = ${id} AND org_id = ${orgId}
    `
  }
  if (updates.publicToken !== undefined) {
    await sql`
      UPDATE quarterly_reports
      SET public_token = ${updates.publicToken}, updated_at = NOW()
      WHERE id = ${id} AND org_id = ${orgId}
    `
  }
  if (updates.title !== undefined) {
    await sql`
      UPDATE quarterly_reports
      SET title = ${updates.title}, updated_at = NOW()
      WHERE id = ${id} AND org_id = ${orgId}
    `
  }
  const { rows } = await sql`
    SELECT * FROM quarterly_reports WHERE id = ${id} AND org_id = ${orgId} LIMIT 1
  `
  return rows[0] ? parseReport(rows[0] as Record<string, unknown>) : null
}

export async function deleteQuarterlyReport(id: string, orgId: string): Promise<boolean> {
  const { rowCount } = await sql`
    DELETE FROM quarterly_reports WHERE id = ${id} AND org_id = ${orgId}
  `
  return (rowCount ?? 0) > 0
}

// ============================================
// Data aggregation queries for report generation
// ============================================

export interface MemberPeriodStats {
  userId: string
  memberId: string
  name: string
  role: string
  department: string
  jobTitle?: string
  eodCount: number
  totalTasks: number
  escalationCount: number
  workedDays: number
}

export async function getMemberPeriodStats(
  orgId: string,
  workspaceId: string,
  periodStart: string,
  periodEnd: string
): Promise<MemberPeriodStats[]> {
  const { rows } = await sql`
    SELECT
      om.id            AS member_id,
      om.user_id,
      om.name,
      om.role,
      om.department,
      om.job_title,
      COUNT(DISTINCT e.id)::int                           AS eod_count,
      COALESCE(SUM(eod_tasks.task_count), 0)::int         AS total_tasks,
      COUNT(DISTINCT e.id) FILTER (WHERE e.needs_escalation = true)::int AS escalation_count,
      COUNT(DISTINCT e.date)::int                         AS worked_days
    FROM organization_members om
    LEFT JOIN eod_reports e
      ON  e.user_id = om.user_id
      AND e.organization_id = ${orgId}
      AND e.workspace_id = ${workspaceId}
      AND e.date >= ${periodStart}::date
      AND e.date <= ${periodEnd}::date
    LEFT JOIN LATERAL (
      SELECT jsonb_array_length(e2.tasks) AS task_count
      FROM eod_reports e2
      WHERE e2.id = e.id
    ) eod_tasks ON true
    WHERE om.organization_id = ${orgId}
      AND om.status = 'active'
    GROUP BY om.id, om.user_id, om.name, om.role, om.department, om.job_title
    ORDER BY eod_count DESC, om.name
  `
  return rows.map(r => ({
    userId: (r.user_id as string) || "",
    memberId: r.member_id as string,
    name: r.name as string,
    role: r.role as string,
    department: (r.department as string) || "General",
    jobTitle: (r.job_title as string) || undefined,
    eodCount: Number(r.eod_count) || 0,
    totalTasks: Number(r.total_tasks) || 0,
    escalationCount: Number(r.escalation_count) || 0,
    workedDays: Number(r.worked_days) || 0,
  }))
}

export interface MemberRockSummary {
  id: string
  title: string
  status: string
  progress: number
  quarter?: string
  userId: string
}

export async function getMemberRocks(
  orgId: string,
  workspaceId: string,
  periodStart: string,
  periodEnd: string
): Promise<MemberRockSummary[]> {
  const { rows } = await sql`
    SELECT id, user_id, title, status, progress, quarter
    FROM rocks
    WHERE organization_id = ${orgId}
      AND workspace_id = ${workspaceId}
      AND (
        (due_date >= ${periodStart}::date AND due_date <= ${periodEnd}::date)
        OR (created_at::date >= ${periodStart}::date AND created_at::date <= ${periodEnd}::date)
      )
    ORDER BY user_id, created_at
  `
  return rows.map(r => ({
    id: r.id as string,
    title: r.title as string,
    status: r.status as string,
    progress: Number(r.progress) || 0,
    quarter: (r.quarter as string) || undefined,
    userId: (r.user_id as string) || "",
  }))
}

export interface MemberRecentTasks {
  userId: string
  tasks: string[]
}

export async function getMemberRecentTaskTitles(
  orgId: string,
  workspaceId: string,
  periodStart: string,
  periodEnd: string
): Promise<MemberRecentTasks[]> {
  const { rows } = await sql`
    SELECT
      assignee_id AS user_id,
      array_agg(title ORDER BY completed_at DESC) AS tasks
    FROM assigned_tasks
    WHERE organization_id = ${orgId}
      AND workspace_id = ${workspaceId}
      AND status = 'completed'
      AND completed_at::date >= ${periodStart}::date
      AND completed_at::date <= ${periodEnd}::date
    GROUP BY assignee_id
  `
  return rows.map(r => ({
    userId: r.user_id as string,
    tasks: ((r.tasks as string[]) || []).slice(0, 10),
  }))
}
