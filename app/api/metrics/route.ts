/**
 * Team Member Metrics API
 *
 * GET /api/metrics - Get active metric for current user
 * GET /api/metrics?memberId=xxx - Get metric for specific member (admin only)
 * POST /api/metrics - Create/update metric for a team member (admin only)
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import {
  getActiveMetricForUser,
  setTeamMemberMetric,
  getMetricHistory,
  type TeamMemberMetric,
} from "@/lib/metrics"

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

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
    }

    return NextResponse.json({
      success: true,
      data: {
        metric,
        history: includeHistory ? history : undefined,
      },
    })
  } catch (error) {
    console.error("Error fetching metric:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch metric",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // Only admins can set metrics
    if (!isAdmin(auth)) {
      console.log("Metrics API: Access denied, user role:", auth.member.role)
      return NextResponse.json(
        { success: false, error: "Admin access required to set metrics" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { memberId, metricName, weeklyGoal } = body

    console.log("Metrics API: Setting metric for member:", memberId, "name:", metricName, "goal:", weeklyGoal)

    if (!memberId || !metricName || weeklyGoal === undefined) {
      return NextResponse.json(
        { success: false, error: "memberId, metricName, and weeklyGoal are required" },
        { status: 400 }
      )
    }

    if (typeof weeklyGoal !== "number" || weeklyGoal < 0) {
      return NextResponse.json(
        { success: false, error: "weeklyGoal must be a non-negative number" },
        { status: 400 }
      )
    }

    // Verify the member belongs to this organization
    const members = await db.members.findWithUsersByOrganizationId(auth.organization.id)
    const member = members.find(m => m.id === memberId)

    if (!member) {
      console.log("Metrics API: Member not found:", memberId, "in org:", auth.organization.id)
      return NextResponse.json(
        { success: false, error: "Team member not found" },
        { status: 404 }
      )
    }

    const metric = await setTeamMemberMetric(memberId, metricName, weeklyGoal)
    console.log("Metrics API: Successfully saved metric:", metric.id)

    return NextResponse.json({
      success: true,
      data: metric,
    })
  } catch (error) {
    console.error("Error setting metric:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to set metric",
      },
      { status: 500 }
    )
  }
}
