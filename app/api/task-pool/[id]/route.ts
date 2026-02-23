import { NextResponse } from "next/server"
import { withAuth, type RouteContext } from "@/lib/api/middleware"
import { verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { taskPool } from "@/lib/db/task-pool"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { claimTaskPoolItemSchema } from "@/lib/validation/schemas"
import { isAdmin } from "@/lib/auth/middleware"
import { logger } from "@/lib/logger"
import type { ApiResponse, TaskPoolItem } from "@/lib/types"

// PATCH /api/task-pool/[id] - Claim or unclaim a task
export const PATCH = withAuth(async (request, auth, context) => {
  try {
    const params = await (context as RouteContext).params
    const itemId = params.id

    const { action, workspaceId } = await validateBody(request, claimTaskPoolItemSchema)

    // Verify workspaceId belongs to the org and user has access
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      )
    }

    // Fetch task and verify it belongs to this specific workspace (prevents cross-workspace access)
    const existing = await taskPool.findById(itemId, auth.organization.id)
    if (!existing) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task not found" },
        { status: 404 }
      )
    }
    if (existing.workspaceId !== workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task not found" },
        { status: 404 }
      )
    }

    if (action === "claim") {
      const updated = await taskPool.claim(
        itemId,
        auth.organization.id,
        auth.member.id,
        auth.member.name
      )

      if (!updated) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Task is already claimed today" },
          { status: 409 }
        )
      }

      return NextResponse.json<ApiResponse<TaskPoolItem>>({
        success: true,
        data: updated,
        message: "Task claimed",
      })
    }

    // unclaim
    const canUnclaim = existing.claimedById === auth.member.id || isAdmin(auth)
    if (!canUnclaim) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You can only unclaim your own tasks" },
        { status: 403 }
      )
    }

    const updated = await taskPool.unclaim(itemId, auth.organization.id)
    if (!updated) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task not found" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<TaskPoolItem>>({
      success: true,
      data: updated,
      message: "Task unclaimed",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Patch task pool item error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update task pool item" },
      { status: 500 }
    )
  }
})

// DELETE /api/task-pool/[id]?workspaceId=xxx - Admin-only hard delete
export const DELETE = withAuth(async (request, auth, context) => {
  try {
    const params = await (context as RouteContext).params
    const itemId = params.id

    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Admin access required" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // Verify workspace belongs to the org
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Verify task belongs to this specific workspace (prevents cross-workspace delete)
    const existing = await taskPool.findById(itemId, auth.organization.id)
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task not found" },
        { status: 404 }
      )
    }

    await taskPool.delete(itemId, auth.organization.id)

    logger.info(`Task pool item deleted: ${itemId} from workspace ${workspaceId}`)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
      message: "Task deleted",
    })
  } catch (error) {
    logger.error({ error }, "Delete task pool item error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete task pool item" },
      { status: 500 }
    )
  }
})
