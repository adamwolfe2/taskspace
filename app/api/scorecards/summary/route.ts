/**
 * Scorecard Summary API
 *
 * GET /api/scorecards/summary - Get scorecard summary with stats
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess, getUserWorkspaceRole } from "@/lib/db/workspaces"
import {
  getScorecardSummary,
  getScorecardStats,
  getRedMetrics,
  getScorecardTrends,
  getWeekStart,
} from "@/lib/db/scorecard"
import { logger } from "@/lib/logger"

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
    const workspaceId = url.searchParams.get("workspaceId")
    const weekStart = url.searchParams.get("weekStart")
    const includeHistory = url.searchParams.get("history") === "true"
    const numWeeks = parseInt(url.searchParams.get("weeks") || "13", 10)

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "Workspace ID is required" },
        { status: 400 }
      )
    }

    // Check workspace access
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      )
    }

    // Get workspace role for determining edit permissions
    const workspaceRole = await getUserWorkspaceRole(auth.user.id, workspaceId)
    const canEdit = isAdmin(auth) || workspaceRole === "admin" || workspaceRole === "owner"

    const week = weekStart || getWeekStart()

    // Fetch summary and stats in parallel
    const [summary, stats, redMetrics] = await Promise.all([
      getScorecardSummary(workspaceId, week),
      getScorecardStats(workspaceId, week),
      getRedMetrics(workspaceId, week),
    ])

    // Optionally include historical data for trends
    let trends = null
    if (includeHistory) {
      trends = await getScorecardTrends(workspaceId, numWeeks)
    }

    logger.info("Scorecard summary fetched", {
      userId: auth.user.id,
      workspaceId,
      weekStart: week,
      metricCount: summary.length,
      stats,
    })

    return NextResponse.json({
      success: true,
      data: {
        summary,
        stats,
        redMetrics,
        trends,
        weekStart: week,
        canEdit,
      },
    })
  } catch (error) {
    logger.error("Error fetching scorecard summary", { error })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch summary",
      },
      { status: 500 }
    )
  }
}
