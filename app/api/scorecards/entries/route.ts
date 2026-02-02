/**
 * Scorecard Entries API
 *
 * POST /api/scorecards/entries - Submit/update weekly entry
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { getMetricById, upsertEntry, getWeekStart } from "@/lib/db/scorecard"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { metricId, value, weekStart, notes } = body

    if (!metricId) {
      return NextResponse.json(
        { success: false, error: "Metric ID is required" },
        { status: 400 }
      )
    }

    if (value === undefined || value === null || isNaN(Number(value))) {
      return NextResponse.json(
        { success: false, error: "Valid numeric value is required" },
        { status: 400 }
      )
    }

    // Get the metric to verify access
    const metric = await getMetricById(metricId)
    if (!metric) {
      return NextResponse.json(
        { success: false, error: "Metric not found" },
        { status: 404 }
      )
    }

    // Check workspace access
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, metric.workspaceId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      )
    }

    // Use current week if not specified
    const entryWeekStart = weekStart || getWeekStart()

    const entry = await upsertEntry({
      metricId,
      value: Number(value),
      weekStart: entryWeekStart,
      notes: notes?.trim() || undefined,
      enteredBy: auth.user.id,
    })

    logger.info({
      userId: auth.user.id,
      metricId,
      weekStart: entryWeekStart,
      value: Number(value),
      status: entry.status,
    }, "Scorecard entry submitted")

    return NextResponse.json({
      success: true,
      data: entry,
      message: "Entry submitted successfully",
    })
  } catch (error) {
    logger.error({ error }, "Error submitting scorecard entry")
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit entry",
      },
      { status: 500 }
    )
  }
}
