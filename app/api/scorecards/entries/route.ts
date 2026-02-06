/**
 * Scorecard Entries API
 *
 * POST /api/scorecards/entries - Submit/update weekly entry
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { getMetricById, upsertEntry, getWeekStart } from "@/lib/db/scorecard"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createScorecardEntrySchema } from "@/lib/validation/schemas"
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

    const { metricId, value, weekStart, notes } = await validateBody(request, createScorecardEntrySchema)

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
      value,
      weekStart: entryWeekStart,
      notes: notes?.trim() || undefined,
      enteredBy: auth.user.id,
    })

    logger.info({
      userId: auth.user.id,
      metricId,
      weekStart: entryWeekStart,
      value,
      status: entry.status,
    }, "Scorecard entry submitted")

    return NextResponse.json({
      success: true,
      data: entry,
      message: "Entry submitted successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
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
