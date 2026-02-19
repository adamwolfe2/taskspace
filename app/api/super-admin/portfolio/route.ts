import { NextRequest, NextResponse } from "next/server"
import { withSuperAdmin } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logError, logger } from "@/lib/logger"

export interface PortfolioOrg {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  primaryColor: string | null
  role: string
  memberCount: number
  eodsToday: number
  activeTasks: number
  openEscalations: number
  plan: string
  eodRate7Day: number
  eodRateTrend: "up" | "down" | "stable"
  completedTasksThisWeek: number
  riskLevel: "healthy" | "warning" | "critical"
  avgRockProgress: number
  rockHealth: { onTrack: number; atRisk: number; blocked: number; completed: number }
}

export interface PortfolioTrendPoint {
  date: string
  eodSubmissionRate: number
  completedTaskCount: number
  openEscalationCount: number
}

/**
 * GET /api/super-admin/portfolio
 *
 * Returns all organizations the super admin belongs to with key metrics,
 * risk levels, trend data, and 14-day sparkline aggregates.
 */
export const GET = withSuperAdmin(async (request: NextRequest, auth) => {
  try {
    const userId = auth.user.id

    const { rows } = await sql`
      SELECT
        o.id,
        o.name,
        o.slug,
        o.logo_url,
        o.primary_color,
        om.role,
        o.subscription,
        (SELECT COUNT(*)::int FROM organization_members om2
         WHERE om2.organization_id = o.id AND om2.status = 'active') as member_count,
        (SELECT COUNT(*)::int FROM eod_reports er
         WHERE er.organization_id = o.id AND er.date = CURRENT_DATE) as eods_today,
        (SELECT COUNT(*)::int FROM assigned_tasks at2
         WHERE at2.organization_id = o.id AND at2.status IN ('pending', 'in-progress')) as active_tasks,
        (SELECT COUNT(*)::int FROM eod_reports er2
         WHERE er2.organization_id = o.id AND er2.needs_escalation = true
           AND er2.date >= CURRENT_DATE - INTERVAL '7 days') as open_escalations,
        -- 7-day EOD rate: distinct user submissions / member count
        COALESCE((
          SELECT ROUND(
            COUNT(DISTINCT er3.user_id)::numeric * 100.0 /
            NULLIF((SELECT COUNT(*)::numeric FROM organization_members om3
                    WHERE om3.organization_id = o.id AND om3.status = 'active'), 0)
          , 0)
          FROM eod_reports er3
          WHERE er3.organization_id = o.id
            AND er3.date >= CURRENT_DATE - INTERVAL '7 days'
        ), 0) as eod_rate_7day,
        -- Prior 7-day EOD rate (days 8-14 ago) for trend comparison
        COALESCE((
          SELECT ROUND(
            COUNT(DISTINCT er4.user_id)::numeric * 100.0 /
            NULLIF((SELECT COUNT(*)::numeric FROM organization_members om4
                    WHERE om4.organization_id = o.id AND om4.status = 'active'), 0)
          , 0)
          FROM eod_reports er4
          WHERE er4.organization_id = o.id
            AND er4.date >= CURRENT_DATE - INTERVAL '14 days'
            AND er4.date < CURRENT_DATE - INTERVAL '7 days'
        ), 0) as eod_rate_prior_7day,
        -- Completed tasks this week
        (SELECT COUNT(*)::int FROM assigned_tasks at3
         WHERE at3.organization_id = o.id AND at3.status = 'completed'
           AND at3.updated_at >= CURRENT_DATE - INTERVAL '7 days') as completed_tasks_this_week,
        -- Rock health counts
        COALESCE((SELECT AVG(r.progress)::int FROM rocks r
         WHERE r.organization_id = o.id AND r.status != 'completed'), 0) as avg_rock_progress,
        (SELECT COUNT(*)::int FROM rocks r WHERE r.organization_id = o.id AND r.status = 'on-track') as rocks_on_track,
        (SELECT COUNT(*)::int FROM rocks r WHERE r.organization_id = o.id AND r.status = 'at-risk') as rocks_at_risk,
        (SELECT COUNT(*)::int FROM rocks r WHERE r.organization_id = o.id AND r.status = 'blocked') as rocks_blocked,
        (SELECT COUNT(*)::int FROM rocks r WHERE r.organization_id = o.id AND r.status = 'completed') as rocks_completed
      FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = ${userId}
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
      ORDER BY o.name ASC
    `

    const orgs: PortfolioOrg[] = rows.map((row) => {
      const eodRate7Day = Number(row.eod_rate_7day) || 0
      const eodRatePrior = Number(row.eod_rate_prior_7day) || 0
      const openEscalations = row.open_escalations as number

      // Determine trend
      let eodRateTrend: "up" | "down" | "stable" = "stable"
      if (eodRate7Day > eodRatePrior + 5) eodRateTrend = "up"
      else if (eodRate7Day < eodRatePrior - 5) eodRateTrend = "down"

      // Determine risk level
      let riskLevel: "healthy" | "warning" | "critical" = "healthy"
      if (eodRate7Day < 30 || openEscalations > 5) riskLevel = "critical"
      else if (eodRate7Day < 50) riskLevel = "warning"

      return {
        id: row.id as string,
        name: row.name as string,
        slug: row.slug as string,
        logoUrl: row.logo_url as string | null,
        primaryColor: row.primary_color as string | null,
        role: row.role as string,
        memberCount: row.member_count as number,
        eodsToday: row.eods_today as number,
        activeTasks: row.active_tasks as number,
        openEscalations,
        plan: ((row.subscription as Record<string, unknown>)?.plan as string) || "free",
        eodRate7Day,
        eodRateTrend,
        completedTasksThisWeek: row.completed_tasks_this_week as number,
        riskLevel,
        avgRockProgress: row.avg_rock_progress as number,
        rockHealth: {
          onTrack: row.rocks_on_track as number,
          atRisk: row.rocks_at_risk as number,
          blocked: row.rocks_blocked as number,
          completed: row.rocks_completed as number,
        },
      }
    })

    // 14-day sparkline trend data from portfolio_snapshots
    const orgIdList = orgs.map((o) => o.id)
    const orgIds = orgIdList.length > 0 ? `{${orgIdList.join(",")}}` : "{}"
    let trends: PortfolioTrendPoint[] = []

    if (orgIdList.length > 0) {
      const { rows: trendRows } = await sql`
        SELECT
          snapshot_date,
          ROUND(AVG(eod_submission_rate)::numeric, 1) as avg_eod_rate,
          SUM(completed_task_count)::int as total_completed,
          SUM(open_escalation_count)::int as total_escalations
        FROM portfolio_snapshots
        WHERE organization_id = ANY(${orgIds}::text[])
          AND snapshot_date >= CURRENT_DATE - INTERVAL '14 days'
        GROUP BY snapshot_date
        ORDER BY snapshot_date ASC
      `

      trends = trendRows.map((r) => ({
        date: (r.snapshot_date as Date)?.toISOString?.()?.split("T")[0] || String(r.snapshot_date),
        eodSubmissionRate: Number(r.avg_eod_rate) || 0,
        completedTaskCount: (r.total_completed as number) || 0,
        openEscalationCount: (r.total_escalations as number) || 0,
      }))
    }

    return NextResponse.json<ApiResponse<{ orgs: PortfolioOrg[]; trends: PortfolioTrendPoint[] }>>({
      success: true,
      data: { orgs, trends },
    })
  } catch (error) {
    logError(logger, "Portfolio fetch error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch portfolio" },
      { status: 500 }
    )
  }
})
