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
}

/**
 * GET /api/super-admin/portfolio
 *
 * Returns all organizations the super admin belongs to with key metrics.
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
           AND er2.date >= CURRENT_DATE - INTERVAL '7 days') as open_escalations
      FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = ${userId}
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
      ORDER BY o.name ASC
    `

    const orgs: PortfolioOrg[] = rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      logoUrl: row.logo_url as string | null,
      primaryColor: row.primary_color as string | null,
      role: row.role as string,
      memberCount: row.member_count as number,
      eodsToday: row.eods_today as number,
      activeTasks: row.active_tasks as number,
      openEscalations: row.open_escalations as number,
      plan: ((row.subscription as Record<string, unknown>)?.plan as string) || "free",
    }))

    return NextResponse.json<ApiResponse<{ orgs: PortfolioOrg[] }>>({
      success: true,
      data: { orgs },
    })
  } catch (error) {
    logError(logger, "Portfolio fetch error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch portfolio" },
      { status: 500 }
    )
  }
})
