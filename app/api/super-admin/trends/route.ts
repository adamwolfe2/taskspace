import { NextRequest, NextResponse } from "next/server"
import { withSuperAdmin } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logError, logger } from "@/lib/logger"

interface OrgTrendPoint {
  orgId: string
  orgName: string
  date: string
  eodCount: number
  memberCount: number
  eodRate: number
}

interface TaskTrendPoint {
  orgId: string
  orgName: string
  weekStart: string
  tasksCompleted: number
}

interface RockTrendPoint {
  orgId: string
  orgName: string
  avgProgress: number
  onTrack: number
  atRisk: number
  blocked: number
  completed: number
}

interface TrendsData {
  eodTrends: OrgTrendPoint[]
  taskTrends: TaskTrendPoint[]
  rockSummary: RockTrendPoint[]
}

/**
 * GET /api/super-admin/trends
 *
 * Returns EOD submission rates, task completion velocity, and rock progress
 * across all organizations the super admin manages. Last 30 days.
 */
export const GET = withSuperAdmin(async (request: NextRequest, auth) => {
  try {
    const userId = auth.user.id

    // Get user's orgs (owner/admin only)
    const { rows: orgRows } = await sql`
      SELECT o.id, o.name
      FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = ${userId}
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
      ORDER BY o.name
    `

    if (orgRows.length === 0) {
      return NextResponse.json<ApiResponse<TrendsData>>({
        success: true,
        data: { eodTrends: [], taskTrends: [], rockSummary: [] },
      })
    }

    const orgIdList = orgRows.map((r) => r.id as string)
    const orgIds = orgIdList.length > 0 ? `{${orgIdList.join(",")}}` : "{}"
    const orgNameMap = new Map(orgRows.map((r) => [r.id as string, r.name as string]))

    // EOD trends: daily submission counts per org over last 30 days
    const { rows: eodRows } = await sql`
      SELECT
        er.organization_id as org_id,
        er.date,
        COUNT(DISTINCT er.user_id)::int as eod_count,
        (SELECT COUNT(*)::int FROM organization_members om
         WHERE om.organization_id = er.organization_id AND om.status = 'active' AND om.user_id IS NOT NULL) as member_count
      FROM eod_reports er
      WHERE er.organization_id = ANY(${orgIds}::text[])
        AND er.date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY er.organization_id, er.date
      ORDER BY er.date ASC
    `

    const eodTrends: OrgTrendPoint[] = eodRows.map((row) => {
      const eodCount = row.eod_count as number
      const memberCount = row.member_count as number
      return {
        orgId: row.org_id as string,
        orgName: orgNameMap.get(row.org_id as string) || "Unknown",
        date: (row.date as Date)?.toISOString?.()?.split("T")[0] || String(row.date),
        eodCount,
        memberCount,
        eodRate: memberCount > 0 ? Math.round((eodCount / memberCount) * 100) : 0,
      }
    })

    // Task trends: weekly completed tasks per org over last 30 days
    const { rows: taskRows } = await sql`
      SELECT
        at2.organization_id as org_id,
        date_trunc('week', at2.completed_at)::date as week_start,
        COUNT(*)::int as tasks_completed
      FROM assigned_tasks at2
      WHERE at2.organization_id = ANY(${orgIds}::text[])
        AND at2.status = 'completed'
        AND at2.completed_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY at2.organization_id, date_trunc('week', at2.completed_at)
      ORDER BY week_start ASC
    `

    const taskTrends: TaskTrendPoint[] = taskRows.map((row) => ({
      orgId: row.org_id as string,
      orgName: orgNameMap.get(row.org_id as string) || "Unknown",
      weekStart: (row.week_start as Date)?.toISOString?.()?.split("T")[0] || String(row.week_start),
      tasksCompleted: row.tasks_completed as number,
    }))

    // Rock summary: current status per org
    const { rows: rockRows } = await sql`
      SELECT
        r.organization_id as org_id,
        COALESCE(AVG(r.progress)::int, 0) as avg_progress,
        COUNT(*) FILTER (WHERE r.status = 'on-track')::int as on_track,
        COUNT(*) FILTER (WHERE r.status = 'at-risk')::int as at_risk,
        COUNT(*) FILTER (WHERE r.status = 'blocked')::int as blocked,
        COUNT(*) FILTER (WHERE r.status = 'completed')::int as completed
      FROM rocks r
      WHERE r.organization_id = ANY(${orgIds}::text[])
      GROUP BY r.organization_id
    `

    const rockSummary: RockTrendPoint[] = rockRows.map((row) => ({
      orgId: row.org_id as string,
      orgName: orgNameMap.get(row.org_id as string) || "Unknown",
      avgProgress: row.avg_progress as number,
      onTrack: row.on_track as number,
      atRisk: row.at_risk as number,
      blocked: row.blocked as number,
      completed: row.completed as number,
    }))

    return NextResponse.json<ApiResponse<TrendsData>>({
      success: true,
      data: { eodTrends, taskTrends, rockSummary },
    })
  } catch (error) {
    logError(logger, "Trends fetch error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch trends" },
      { status: 500 }
    )
  }
})
