import { NextRequest, NextResponse } from "next/server"
import { withSuperAdmin, type RouteContext } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logError, logger } from "@/lib/logger"

interface OrgMemberActivity {
  userId: string
  name: string
  email: string
  role: string
  eodSubmittedToday: boolean
  eodCount7Days: number
  activeTasks: number
  rockProgress: number
}

interface RecentEod {
  id: string
  userId: string
  userName: string
  date: string
  taskCount: number
  needsEscalation: boolean
  escalationNote: string | null
  submittedAt: string
}

interface OrgRock {
  id: string
  title: string
  ownerName: string
  progress: number
  status: string
  dueDate: string
}

interface OrgDetailData {
  id: string
  name: string
  slug: string
  memberCount: number
  members: OrgMemberActivity[]
  recentEods: RecentEod[]
  rocks: OrgRock[]
  stats: {
    eodRateToday: number
    activeTaskCount: number
    openEscalationCount: number
    avgRockProgress: number
  }
}

/**
 * GET /api/super-admin/orgs/[orgId]
 *
 * Returns detailed drill-down for a specific organization.
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

    // Get org info
    const { rows: orgRows } = await sql`
      SELECT id, name, slug FROM organizations WHERE id = ${orgId}
    `
    if (orgRows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
    }
    const org = orgRows[0]

    // Get members with activity data
    const { rows: memberRows } = await sql`
      SELECT
        om.user_id,
        COALESCE(u.name, om.name) as name,
        COALESCE(u.email, om.email) as email,
        om.role,
        (SELECT COUNT(*)::int FROM eod_reports er
         WHERE er.user_id = om.user_id AND er.organization_id = ${orgId}
           AND er.date = CURRENT_DATE) > 0 as eod_submitted_today,
        (SELECT COUNT(*)::int FROM eod_reports er
         WHERE er.user_id = om.user_id AND er.organization_id = ${orgId}
           AND er.date >= CURRENT_DATE - INTERVAL '7 days') as eod_count_7days,
        (SELECT COUNT(*)::int FROM assigned_tasks at2
         WHERE at2.assignee_id = om.user_id AND at2.organization_id = ${orgId}
           AND at2.status IN ('pending', 'in-progress')) as active_tasks,
        COALESCE((SELECT AVG(r.progress)::int FROM rocks r
         WHERE r.user_id = om.user_id AND r.organization_id = ${orgId}
           AND r.status != 'completed'), 0) as rock_progress
      FROM organization_members om
      LEFT JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = ${orgId}
        AND om.status = 'active'
        AND om.user_id IS NOT NULL
      ORDER BY om.role ASC, u.name ASC
    `

    const members: OrgMemberActivity[] = memberRows.map((row) => ({
      userId: row.user_id as string,
      name: row.name as string,
      email: row.email as string,
      role: row.role as string,
      eodSubmittedToday: row.eod_submitted_today as boolean,
      eodCount7Days: row.eod_count_7days as number,
      activeTasks: row.active_tasks as number,
      rockProgress: row.rock_progress as number,
    }))

    // Recent EODs (last 7 days)
    const { rows: eodRows } = await sql`
      SELECT
        er.id,
        er.user_id,
        COALESCE(u.name, 'Unknown') as user_name,
        er.date,
        jsonb_array_length(COALESCE(er.tasks, '[]'::jsonb)) as task_count,
        er.needs_escalation,
        er.escalation_note,
        er.submitted_at
      FROM eod_reports er
      LEFT JOIN users u ON er.user_id = u.id
      WHERE er.organization_id = ${orgId}
        AND er.date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY er.submitted_at DESC
      LIMIT 50
    `

    const recentEods: RecentEod[] = eodRows.map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      userName: row.user_name as string,
      date: (row.date as Date)?.toISOString?.()?.split("T")[0] || String(row.date),
      taskCount: row.task_count as number,
      needsEscalation: row.needs_escalation as boolean,
      escalationNote: row.escalation_note as string | null,
      submittedAt: (row.submitted_at as Date)?.toISOString() || "",
    }))

    // Active rocks
    const { rows: rockRows } = await sql`
      SELECT
        r.id,
        r.title,
        COALESCE(u.name, 'Unassigned') as owner_name,
        r.progress,
        r.status,
        r.due_date
      FROM rocks r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.organization_id = ${orgId}
        AND r.status != 'completed'
      ORDER BY r.status ASC, r.progress DESC
    `

    const rocks: OrgRock[] = rockRows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      ownerName: row.owner_name as string,
      progress: row.progress as number,
      status: row.status as string,
      dueDate: (row.due_date as Date)?.toISOString?.()?.split("T")[0] || String(row.due_date || ""),
    }))

    // Compute stats
    const activeMemberCount = members.length
    const eodsSubmittedToday = members.filter((m) => m.eodSubmittedToday).length
    const eodRateToday = activeMemberCount > 0
      ? Math.round((eodsSubmittedToday / activeMemberCount) * 100)
      : 0

    const { rows: taskCountRow } = await sql`
      SELECT COUNT(*)::int as count FROM assigned_tasks
      WHERE organization_id = ${orgId} AND status IN ('pending', 'in-progress')
    `

    const { rows: escalationCountRow } = await sql`
      SELECT COUNT(*)::int as count FROM eod_reports
      WHERE organization_id = ${orgId} AND needs_escalation = true
        AND date >= CURRENT_DATE - INTERVAL '7 days'
    `

    const avgRockProgress = rocks.length > 0
      ? Math.round(rocks.reduce((sum, r) => sum + r.progress, 0) / rocks.length)
      : 0

    const data: OrgDetailData = {
      id: org.id as string,
      name: org.name as string,
      slug: org.slug as string,
      memberCount: activeMemberCount,
      members,
      recentEods,
      rocks,
      stats: {
        eodRateToday,
        activeTaskCount: taskCountRow[0]?.count as number || 0,
        openEscalationCount: escalationCountRow[0]?.count as number || 0,
        avgRockProgress,
      },
    }

    return NextResponse.json<ApiResponse<OrgDetailData>>({
      success: true,
      data,
    })
  } catch (error) {
    logError(logger, "Org detail fetch error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch organization details" },
      { status: 500 }
    )
  }
})
