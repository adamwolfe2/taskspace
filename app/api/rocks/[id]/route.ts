/**
 * Individual Rock API
 *
 * GET /api/rocks/[id] - Get rock with tasks, milestones, and check-ins
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import {
  getRockById,
  getRockTasks,
  getRockMilestones,
  getRockCheckins,
} from "@/lib/db/rocks"
import { logger } from "@/lib/logger"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id } = await params
    const rock = await getRockById(id)

    if (!rock) {
      return NextResponse.json(
        { success: false, error: "Rock not found" },
        { status: 404 }
      )
    }

    // Verify organization access
    if (rock.organizationId !== auth.organization.id) {
      return NextResponse.json(
        { success: false, error: "Rock not found" },
        { status: 404 }
      )
    }

    // Check workspace access if workspace-scoped
    if (rock.workspaceId) {
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, rock.workspaceId)
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: "Access denied to this workspace" },
          { status: 403 }
        )
      }
    }

    // Fetch related data in parallel
    const [tasks, milestones, checkins] = await Promise.all([
      getRockTasks(id),
      getRockMilestones(id),
      getRockCheckins(id, 13), // Last 13 weeks
    ])

    logger.info({
      userId: auth.user.id,
      rockId: id,
      taskCount: tasks.length,
    }, "Rock details fetched")

    return NextResponse.json({
      success: true,
      data: {
        rock,
        tasks,
        milestones,
        checkins,
      },
    })
  } catch (error) {
    logger.error({ error }, "Error fetching rock details")
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch rock",
      },
      { status: 500 }
    )
  }
}
