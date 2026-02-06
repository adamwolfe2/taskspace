/**
 * Scorecard Metrics API
 *
 * GET /api/scorecards/metrics - List metrics for a workspace
 * POST /api/scorecards/metrics - Create a new metric (admin/manager only)
 */

import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth/middleware"
import { withAuth } from "@/lib/api/middleware"
import { userHasWorkspaceAccess, getUserWorkspaceRole } from "@/lib/db/workspaces"
import { getMetricsByWorkspace, createMetric } from "@/lib/db/scorecard"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createScorecardMetricSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"

export const GET = withAuth(async (request, auth) => {
  try {
    const url = new URL(request.url)
    const workspaceId = url.searchParams.get("workspaceId")

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

    const metrics = await getMetricsByWorkspace(workspaceId)

    logger.info({
      userId: auth.user.id,
      workspaceId,
      metricCount: metrics.length,
    }, "Scorecard metrics fetched")

    return NextResponse.json({
      success: true,
      data: metrics,
    })
  } catch (error) {
    logger.error({ error }, "Error fetching scorecard metrics")
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch metrics",
      },
      { status: 500 }
    )
  }
})

export const POST = withAuth(async (request, auth) => {
  try {
    const { workspaceId, name, description, ownerId, targetValue, targetDirection, unit, frequency, displayOrder } =
      await validateBody(request, createScorecardMetricSchema)

    // Check workspace access and role (admin/owner or workspace admin/owner)
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      )
    }

    const workspaceRole = await getUserWorkspaceRole(auth.user.id, workspaceId)
    const canManage = isAdmin(auth) || workspaceRole === "admin" || workspaceRole === "owner"

    if (!canManage) {
      return NextResponse.json(
        { success: false, error: "Admin or manager access required to create metrics" },
        { status: 403 }
      )
    }

    const metric = await createMetric({
      workspaceId,
      name,
      description: description?.trim() || undefined,
      ownerId: ownerId || undefined,
      targetValue,
      targetDirection,
      unit,
      frequency,
      displayOrder,
      createdBy: auth.user.id,
    })

    logger.info({
      userId: auth.user.id,
      workspaceId,
      metricId: metric.id,
      metricName: metric.name,
    }, "Scorecard metric created")

    return NextResponse.json({
      success: true,
      data: metric,
      message: "Metric created successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Error creating scorecard metric")
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create metric",
      },
      { status: 500 }
    )
  }
})
