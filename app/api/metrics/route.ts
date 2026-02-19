/**
 * Team Member Metrics API
 *
 * GET /api/metrics - Get active metric for current user
 * GET /api/metrics?memberId=xxx - Get metric for specific member (admin only)
 * POST /api/metrics - Create/update metric for a team member (admin only)
 */

import { NextResponse } from "next/server"
import { withAuth, withAdmin } from "@/lib/api/middleware"
import { isAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import {
  getActiveMetricForUser,
  setTeamMemberMetric,
  getMetricHistory,
  type TeamMemberMetric,
} from "@/lib/metrics"
import { getTodayInTimezone } from "@/lib/utils/date-utils"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { metricsCreateSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"

export const GET = withAuth(async (request, auth) => {
  try {
    const url = new URL(request.url)
    const memberId = url.searchParams.get("memberId")
    const includeHistory = url.searchParams.get("history") === "true"

    // If requesting for a specific member, must be admin
    if (memberId && !isAdmin(auth)) {
      return NextResponse.json(
        { success: false, error: "Admin access required to view other members' metrics" },
        { status: 403 }
      )
    }

    // Get metric - either for current user or specified member
    let metric: TeamMemberMetric | null
    let history: TeamMemberMetric[] = []
    let weeklyTotal: number | null = null

    // Helper to calculate weekly total from EOD reports
    const getWeeklyMetricTotal = async (userId: string, orgId: string): Promise<number> => {
      const { sql } = await import("@vercel/postgres")
      // Get current week (Friday to Thursday) using org timezone
      const orgTimezone = auth.organization.settings?.timezone || "America/New_York"
      const todayStr = getTodayInTimezone(orgTimezone)
      const today = new Date(todayStr + "T12:00:00Z")
      const dayOfWeek = today.getDay()
      // Calculate start of current week (Friday)
      const fridayOffset = dayOfWeek >= 5 ? dayOfWeek - 5 : dayOfWeek + 2
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - fridayOffset)
      const weekStartStr = `${weekStart.getUTCFullYear()}-${String(weekStart.getUTCMonth() + 1).padStart(2, '0')}-${String(weekStart.getUTCDate()).padStart(2, '0')}`

      const { rows } = await sql`
        SELECT COALESCE(SUM(metric_value_today), 0) as total
        FROM eod_reports
        WHERE user_id = ${userId}
          AND organization_id = ${orgId}
          AND date >= ${weekStartStr}
          AND date <= ${todayStr}
          AND metric_value_today IS NOT NULL
      `
      return parseInt(rows[0]?.total || "0", 10)
    }

    if (memberId) {
      // Admin getting metric for specific member
      // Need to look up by member ID directly
      const { rows } = await import("@vercel/postgres").then(m => m.sql`
        SELECT tmm.id, tmm.team_member_id, tmm.metric_name, tmm.weekly_goal, tmm.is_active,
               tmm.created_at, tmm.updated_at
        FROM team_member_metrics tmm
        JOIN organization_members om ON tmm.team_member_id = om.id
        WHERE om.id = ${memberId}
        AND om.organization_id = ${auth.organization.id}
        AND tmm.is_active = true
        LIMIT 1
      `)

      if (rows.length > 0) {
        const row = rows[0]
        metric = {
          id: row.id,
          teamMemberId: row.team_member_id,
          metricName: row.metric_name,
          weeklyGoal: row.weekly_goal,
          isActive: row.is_active,
          createdAt: row.created_at?.toISOString() || '',
          updatedAt: row.updated_at?.toISOString() || '',
        }
      } else {
        metric = null
      }

      if (includeHistory) {
        history = await getMetricHistory(memberId)
      }
    } else {
      // Get metric for current user
      metric = await getActiveMetricForUser(auth.user.id, auth.organization.id)

      if (includeHistory && auth.member) {
        history = await getMetricHistory(auth.member.id)
      }

      // Calculate weekly total for current user (useful for Thursday confirmations)
      if (metric) {
        weeklyTotal = await getWeeklyMetricTotal(auth.user.id, auth.organization.id)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        metric,
        weeklyTotal,
        history: includeHistory ? history : undefined,
      },
    })
  } catch (error) {
    logError(logger, "Error fetching metric", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch metric",
      },
      { status: 500 }
    )
  }
})

export const POST = withAdmin(async (request, auth) => {
  try {
    const { memberId, metricName, weeklyGoal } = await validateBody(request, metricsCreateSchema)

    logger.info({ memberId, metricName, weeklyGoal }, "Metrics API: Setting metric for member")

    // Verify the member belongs to this organization
    const members = await db.members.findWithUsersByOrganizationId(auth.organization.id)
    const member = members.find(m => m.id === memberId)

    if (!member) {
      logger.info({ memberId, orgId: auth.organization.id }, "Metrics API: Member not found")
      return NextResponse.json(
        { success: false, error: "Team member not found" },
        { status: 404 }
      )
    }

    const metric = await setTeamMemberMetric(memberId, metricName, weeklyGoal)
    logger.info({ metricId: metric.id }, "Metrics API: Successfully saved metric")

    return NextResponse.json({
      success: true,
      data: metric,
    })
  } catch (error) {
    logError(logger, "Error setting metric", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to set metric",
      },
      { status: 500 }
    )
  }
})
