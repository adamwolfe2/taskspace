/**
 * Individual Scorecard Metric API
 *
 * GET /api/scorecards/metrics/[id] - Get a single metric
 * PATCH /api/scorecards/metrics/[id] - Update a metric
 * DELETE /api/scorecards/metrics/[id] - Delete a metric (soft delete)
 */

import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth/middleware"
import { withAuth } from "@/lib/api/middleware"
import type { RouteContext } from "@/lib/api/middleware"
import { userHasWorkspaceAccess, getUserWorkspaceRole } from "@/lib/db/workspaces"
import { getMetricById, updateMetric, deleteMetric } from "@/lib/db/scorecard"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateScorecardMetricSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"

export const GET = withAuth(async (request, auth, context?) => {
  try {
    const { id } = await context!.params
    const metric = await getMetricById(id)

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

    return NextResponse.json({
      success: true,
      data: metric,
    })
  } catch (error) {
    logger.error({ error }, "Error fetching scorecard metric")
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch metric",
      },
      { status: 500 }
    )
  }
})

export const PATCH = withAuth(async (request, auth, context?) => {
  try {
    const { id } = await context!.params
    const metric = await getMetricById(id)

    if (!metric) {
      return NextResponse.json(
        { success: false, error: "Metric not found" },
        { status: 404 }
      )
    }

    // Check workspace access and role
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, metric.workspaceId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      )
    }

    const workspaceRole = await getUserWorkspaceRole(auth.user.id, metric.workspaceId)
    const canManage = isAdmin(auth) || workspaceRole === "admin" || workspaceRole === "owner"

    if (!canManage) {
      return NextResponse.json(
        { success: false, error: "Admin or manager access required to update metrics" },
        { status: 403 }
      )
    }

    const { name, description, ownerId, targetValue, targetDirection, unit, frequency, displayOrder, isActive } =
      await validateBody(request, updateScorecardMetricSchema)

    const updatedMetric = await updateMetric(id, {
      name: name || undefined,
      description: description !== undefined ? description?.trim() || undefined : undefined,
      ownerId: ownerId !== undefined ? ownerId || undefined : undefined,
      targetValue: targetValue !== undefined ? (targetValue !== null ? Number(targetValue) : undefined) : undefined,
      targetDirection: targetDirection || undefined,
      unit: unit !== undefined ? unit : undefined,
      frequency: frequency || undefined,
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    })

    if (!updatedMetric) {
      return NextResponse.json(
        { success: false, error: "Failed to update metric" },
        { status: 500 }
      )
    }

    logger.info({
      userId: auth.user.id,
      metricId: id,
      updates: { name, description, ownerId, targetValue, targetDirection, unit, frequency, displayOrder, isActive },
    }, "Scorecard metric updated")

    return NextResponse.json({
      success: true,
      data: updatedMetric,
      message: "Metric updated successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Error updating scorecard metric")
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update metric",
      },
      { status: 500 }
    )
  }
})

export const DELETE = withAuth(async (request, auth, context?) => {
  try {
    const { id } = await context!.params
    const metric = await getMetricById(id)

    if (!metric) {
      return NextResponse.json(
        { success: false, error: "Metric not found" },
        { status: 404 }
      )
    }

    // Check workspace access and role
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, metric.workspaceId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      )
    }

    const workspaceRole = await getUserWorkspaceRole(auth.user.id, metric.workspaceId)
    const canManage = isAdmin(auth) || workspaceRole === "admin" || workspaceRole === "owner"

    if (!canManage) {
      return NextResponse.json(
        { success: false, error: "Admin or manager access required to delete metrics" },
        { status: 403 }
      )
    }

    const deleted = await deleteMetric(id)

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Failed to delete metric" },
        { status: 500 }
      )
    }

    logger.info({
      userId: auth.user.id,
      metricId: id,
      metricName: metric.name,
    }, "Scorecard metric deleted")

    return NextResponse.json({
      success: true,
      message: "Metric deleted successfully",
    })
  } catch (error) {
    logger.error({ error }, "Error deleting scorecard metric")
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete metric",
      },
      { status: 500 }
    )
  }
})
