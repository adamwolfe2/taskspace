import { NextResponse } from "next/server"
import { withAuth, type RouteContext } from "@/lib/api/middleware"
import { verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { taskPool } from "@/lib/db/task-pool"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { generateId } from "@/lib/auth/password"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { claimTaskPoolItemSchema } from "@/lib/validation/schemas"
import { isAdmin } from "@/lib/auth/middleware"
import { logger } from "@/lib/logger"
import type { ApiResponse, TaskPoolItem, AssignedTask } from "@/lib/types"

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
      // Atomically mark as claimed — prevents double-claim race condition
      const claimed = await taskPool.claim(
        itemId,
        auth.organization.id,
        auth.user.id,
        auth.member.name
      )

      if (!claimed) {
        // Task already claimed today — check if it's stuck from a previous failed transfer
        // by the same member (claim succeeded but assigned_task creation failed + unclaim failed).
        // Re-fetch to get the latest claimed_by_id.
        const current = await taskPool.findById(itemId, auth.organization.id)
        const isStuckOwnClaim = current?.isClaimedToday && current.claimedById === auth.user.id
        if (!isStuckOwnClaim) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "Task is already claimed today" },
            { status: 409 }
          )
        }
        // Fall through to retry the transfer for the stuck task
        logger.warn({ itemId, memberId: auth.member.id }, "Retrying stuck task pool transfer")
      }

      // Full transfer: create an assigned_task for the claimer
      const now = new Date().toISOString()
      const assignedTask: AssignedTask = {
        id: generateId(),
        organizationId: auth.organization.id,
        workspaceId: existing.workspaceId,
        title: existing.title,
        description: existing.description ?? undefined,
        assigneeId: auth.user.id,
        assigneeEmail: auth.user.email,
        assigneeName: auth.member.name,
        assignedById: auth.user.id,
        assignedByName: auth.member.name,
        type: "assigned",
        rockId: null,
        rockTitle: null,
        priority: existing.priority,
        dueDate: null,
        status: "pending",
        source: "task_pool",
        createdAt: now,
        updatedAt: now,
      }

      try {
        await db.assignedTasks.create(assignedTask)
      } catch (err) {
        // Compensate: try to revert the claim so the task stays claimable.
        // Guard this with its own try/catch — if unclaim also fails, the task will be
        // stuck until tomorrow (next daily reset). Log both errors for debugging.
        try {
          await taskPool.unclaim(itemId, auth.organization.id)
        } catch (unclaimErr) {
          logger.error({ unclaimErr, itemId }, "Unclaim compensation also failed — task stuck until tomorrow")
        }
        logger.error({ err, itemId }, "Failed to create assigned task for pool claim")
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Failed to transfer task" },
          { status: 500 }
        )
      }

      // Remove the pool item — it now lives in assigned_tasks
      await sql`DELETE FROM task_pool WHERE id = ${itemId} AND organization_id = ${auth.organization.id}`

      logger.info({ itemId, assignedTaskId: assignedTask.id, userId: auth.user.id }, "Task pool item transferred to assigned tasks")

      return NextResponse.json<ApiResponse<AssignedTask>>({
        success: true,
        data: assignedTask,
        message: "Task claimed and added to your tasks",
      })
    }

    // unclaim
    const canUnclaim = existing.claimedById === auth.user.id || isAdmin(auth)
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
