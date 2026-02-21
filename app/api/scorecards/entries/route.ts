/**
 * Scorecard Entries API
 *
 * POST /api/scorecards/entries - Submit/update weekly entry
 */

import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { getMetricById, upsertEntry, getWeekStart } from "@/lib/db/scorecard"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createScorecardEntrySchema } from "@/lib/validation/schemas"
import { getTodayInTimezone } from "@/lib/utils/date-utils"
import { logger } from "@/lib/logger"
import { CONFIG } from "@/lib/config"

export const POST = withAuth(async (request, auth) => {
  try {
    const { metricId, value, weekStart, notes } = await validateBody(request, createScorecardEntrySchema)

    // Get the metric to verify access
    const metric = await getMetricById(metricId, auth.organization.id)
    if (!metric) {
      return NextResponse.json(
        { success: false, error: "Metric not found" },
        { status: 404 }
      )
    }

    // Verify metric's workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(metric.workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
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

    // Use current week if not specified — use org timezone to avoid UTC date shift
    const orgTimezone = auth.organization.settings?.timezone || CONFIG.organization.defaultTimezone
    const todayStr = getTodayInTimezone(orgTimezone)
    const entryWeekStart = weekStart || getWeekStart(undefined, todayStr)

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
        error: "Failed to submit entry",
      },
      { status: 500 }
    )
  }
})
