/**
 * Rock Completion API
 *
 * POST /api/rocks/[id]/complete - Mark rock as completed
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess, getUserWorkspaceRole } from "@/lib/db/workspaces"
import { getRockById, completeRock, reopenRock } from "@/lib/db/rocks"
import { logger } from "@/lib/logger"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Check permissions - rock owner, org admin, or workspace admin can complete
    const isOwner = rock.userId === auth.user.id
    const isOrgAdmin = isAdmin(auth)
    let isWorkspaceAdmin = false

    if (rock.workspaceId) {
      const workspaceRole = await getUserWorkspaceRole(auth.user.id, rock.workspaceId)
      isWorkspaceAdmin = workspaceRole === "admin" || workspaceRole === "owner"
    }

    if (!isOwner && !isOrgAdmin && !isWorkspaceAdmin) {
      return NextResponse.json(
        { success: false, error: "Only the rock owner or admin can complete this rock" },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { reopen } = body

    let updatedRock
    let message

    if (reopen && rock.status === "completed") {
      // Reopen a completed rock
      updatedRock = await reopenRock(id)
      message = "Rock reopened successfully"

      logger.info("Rock reopened", {
        userId: auth.user.id,
        rockId: id,
        rockTitle: rock.title,
      })
    } else if (rock.status === "completed") {
      // Already completed
      return NextResponse.json({
        success: true,
        data: rock,
        message: "Rock is already completed",
      })
    } else {
      // Complete the rock
      updatedRock = await completeRock(id)
      message = "Rock completed successfully"

      logger.info("Rock completed", {
        userId: auth.user.id,
        rockId: id,
        rockTitle: rock.title,
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedRock,
      message,
    })
  } catch (error) {
    logger.error("Error completing rock", { error })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to complete rock",
      },
      { status: 500 }
    )
  }
}
