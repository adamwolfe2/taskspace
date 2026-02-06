/**
 * Task Subtasks API
 *
 * CRUD endpoints for task subtasks with workspace isolation.
 * Subtasks are stored in a dedicated table for better scalability.
 *
 * Endpoints:
 * - GET /api/tasks/[id]/subtasks - Get all subtasks for a task
 * - POST /api/tasks/[id]/subtasks - Create a new subtask
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
 * GET /api/tasks/[id]/subtasks
 * Returns all subtasks for a task
 */
export const GET = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    const params = await context?.params
    const taskId = params?.id

    if (!taskId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      )
    }

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

    // Get subtasks
    const subtasks = await taskSubtasks.getByTaskId(taskId)

    return NextResponse.json<ApiResponse<TaskSubtask[]>>({
      success: true,
      data: subtasks,
    })
  } catch (error) {
    logError(logger, "Get task subtasks error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get subtasks" },
      { status: 500 }
    )
  }
})

/**
 * POST /api/tasks/[id]/subtasks
 * Create a new subtask for a task
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

    // Parse request body
    const body = await request.json()
    const { title, completed, orderIndex } = body

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Subtask title is required" },
        { status: 400 }
      )
    }

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

    // Create subtask
    const newSubtask = await taskSubtasks.create(taskId, {
      title: title.trim(),
      completed: completed ?? false,
      orderIndex,
    })

    logger.info(
      { taskId, subtaskId: newSubtask.id, userId: auth.user.id },
      "Subtask created for task"
    )

    return NextResponse.json<ApiResponse<TaskSubtask>>({
      success: true,
      data: newSubtask,
      message: "Subtask created successfully",
    })
  } catch (error) {
    // Handle validation errors
    if (error instanceof Error && error.message.includes("Subtask")) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    logError(logger, "Create task subtask error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create subtask" },
      { status: 500 }
    )
  }
})
