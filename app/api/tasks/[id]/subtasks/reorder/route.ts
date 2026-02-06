/**
 * Task Subtasks Reorder API
 *
 * Endpoint for batch reordering subtasks.
 *
 * Endpoints:
 * - POST /api/tasks/[id]/subtasks/reorder - Reorder subtasks by providing ordered array of IDs
 *
 * Security:
 * - Workspace isolation enforced (user must have access to task's workspace)
 * - All endpoints require authentication
 */

import { NextRequest, NextResponse } from "next/server"
import { withAuth, type RouteContext } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { taskSubtasks } from "@/lib/db/task-subtasks"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { isAdmin } from "@/lib/auth/middleware"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { reorderSubtasksSchema } from "@/lib/validation/schemas"
import type { ApiResponse, TaskSubtask } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/tasks/[id]/subtasks/reorder
 * Reorder subtasks by providing ordered array of subtask IDs
 */
export const POST = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    const params = await context?.params
    const taskId = params?.id

    if (!taskId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      )
    }

    // Validate request body
    const { subtaskIds } = await validateBody(request, reorderSubtasksSchema)

    // Fetch task
    const task = await db.assignedTasks.findById(taskId)
    if (!task) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task not found" },
        { status: 404 }
      )
    }

    // Verify task belongs to this organization
    if (task.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task not found" },
        { status: 404 }
      )
    }

    // Verify workspace access (admins can access any workspace)
    if (!isAdmin(auth) && task.workspaceId) {
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, task.workspaceId)
      if (!hasAccess) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "You don't have access to this task's workspace" },
          { status: 403 }
        )
      }
    }

    // Verify all subtask IDs belong to this task
    const existingSubtasks = await taskSubtasks.getByTaskId(taskId)
    const existingIds = new Set(existingSubtasks.map((s) => s.id))

    for (const subtaskId of subtaskIds) {
      if (!existingIds.has(subtaskId)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `Subtask ${subtaskId} does not belong to this task` },
          { status: 400 }
        )
      }
    }

    // Reorder subtasks
    const reorderedSubtasks = await taskSubtasks.reorder(taskId, subtaskIds)

    logger.info(
      { taskId, subtaskCount: subtaskIds.length, userId: auth.user.id },
      "Subtasks reordered"
    )

    return NextResponse.json<ApiResponse<TaskSubtask[]>>({
      success: true,
      data: reorderedSubtasks,
      message: "Subtasks reordered successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Reorder task subtasks error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to reorder subtasks" },
      { status: 500 }
    )
  }
})
