/**
 * Individual Task Subtask API
 *
 * Endpoints for managing individual subtasks.
 *
 * Endpoints:
 * - PATCH /api/tasks/[id]/subtasks/[subtaskId] - Update a subtask (title, completion status)
 * - DELETE /api/tasks/[id]/subtasks/[subtaskId] - Delete a subtask
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
import type { ApiResponse, TaskSubtask } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * PATCH /api/tasks/[id]/subtasks/[subtaskId]
 * Update a subtask (title, completion status, order)
 */
export const PATCH = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    const params = await context?.params
    const taskId = params?.id
    const subtaskId = params?.subtaskId

    if (!taskId || !subtaskId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task ID and Subtask ID are required" },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { title, completed, orderIndex } = body

    // Validate at least one field is being updated
    if (title === undefined && completed === undefined && orderIndex === undefined) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "At least one field must be provided for update" },
        { status: 400 }
      )
    }

    // Fetch subtask
    const subtask = await taskSubtasks.getById(subtaskId)
    if (!subtask) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Subtask not found" },
        { status: 404 }
      )
    }

    // Verify subtask belongs to the specified task
    if (subtask.taskId !== taskId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Subtask does not belong to this task" },
        { status: 400 }
      )
    }

    // Fetch task to verify permissions
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

    // Update subtask
    const updatedSubtask = await taskSubtasks.update(subtaskId, {
      title,
      completed,
      orderIndex,
    })

    if (!updatedSubtask) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to update subtask" },
        { status: 500 }
      )
    }

    logger.info(
      { taskId, subtaskId, userId: auth.user.id, updates: { title, completed, orderIndex } },
      "Subtask updated"
    )

    return NextResponse.json<ApiResponse<TaskSubtask>>({
      success: true,
      data: updatedSubtask,
      message: "Subtask updated successfully",
    })
  } catch (error) {
    // Handle validation errors
    if (error instanceof Error && error.message.includes("Subtask")) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    logError(logger, "Update task subtask error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update subtask" },
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/tasks/[id]/subtasks/[subtaskId]
 * Delete a subtask
 */
export const DELETE = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    const params = await context?.params
    const taskId = params?.id
    const subtaskId = params?.subtaskId

    if (!taskId || !subtaskId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task ID and Subtask ID are required" },
        { status: 400 }
      )
    }

    // Fetch subtask
    const subtask = await taskSubtasks.getById(subtaskId)
    if (!subtask) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Subtask not found" },
        { status: 404 }
      )
    }

    // Verify subtask belongs to the specified task
    if (subtask.taskId !== taskId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Subtask does not belong to this task" },
        { status: 400 }
      )
    }

    // Fetch task to verify permissions
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

    // Delete subtask
    const deleted = await taskSubtasks.delete(subtaskId)
    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to delete subtask" },
        { status: 500 }
      )
    }

    logger.info({ taskId, subtaskId, userId: auth.user.id }, "Subtask deleted")

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Subtask deleted successfully",
    })
  } catch (error) {
    logError(logger, "Delete task subtask error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete subtask" },
      { status: 500 }
    )
  }
})
