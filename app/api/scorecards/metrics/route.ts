/**
 * Scorecard Metrics API
 *
 * GET /api/scorecards/metrics - List metrics for a workspace
 * POST /api/scorecards/metrics - Create a new metric (admin/manager only)
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess, getUserWorkspaceRole } from "@/lib/db/workspaces"
import { getMetricsByWorkspace, createMetric } from "@/lib/db/scorecard"
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

    const body = await request.json()
    const { workspaceId, name, description, ownerId, targetValue, targetDirection, unit, frequency, displayOrder } = body

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "Workspace ID is required" },
        { status: 400 }
      )
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Metric name is required" },
        { status: 400 }
      )
    }

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
      name: name.trim(),
      description: description?.trim() || undefined,
      ownerId: ownerId || undefined,
      targetValue: targetValue !== undefined && targetValue !== null ? Number(targetValue) : undefined,
      targetDirection: targetDirection || "above",
      unit: unit || "",
      frequency: frequency || "weekly",
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
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
    logger.error({ error }, "Error creating scorecard metric")
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create metric",
      },
      { status: 500 }
    )
  }
}
