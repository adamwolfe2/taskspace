/**
 * Rock Completion API
 *
 * POST /api/rocks/[id]/complete - Mark rock as completed
 */

import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"

import { isAdmin } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess, getUserWorkspaceRole } from "@/lib/db/workspaces"
import { getRockById, completeRock, reopenRock } from "@/lib/db/rocks"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { completeRockSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import { checkAchievements } from "@/lib/achievements/check-achievements"
import type { ApiResponse } from "@/lib/types"

export const POST = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params
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

    // Check workspace access if workspace-scoped (admins bypass this check)
    if (!isAdmin(auth) && rock.workspaceId) {
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

    const { reopen } = await validateBody(request, completeRockSchema)

    let updatedRock
    let message

    if (reopen && rock.status === "completed") {
      // Reopen a completed rock
      updatedRock = await reopenRock(id)
      message = "Rock reopened successfully"

      logger.info({
        userId: auth.user.id,
        rockId: id,
        rockTitle: rock.title,
      }, "Rock reopened")
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

      logger.info({
        userId: auth.user.id,
        rockId: id,
        rockTitle: rock.title,
      }, "Rock completed")

      // Check achievements (fire-and-forget)
      checkAchievements(auth.user.id, auth.organization.id).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      data: updatedRock,
      message,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Error completing rock")
    return NextResponse.json(
      {
        success: false,
        error: "Failed to complete rock",
      },
      { status: 500 }
    )
  }
})
