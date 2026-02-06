/**
 * Task Comments API
 *
 * CRUD endpoints for task comments with workspace isolation.
 * Comments are stored as JSONB in the assigned_tasks.comments column.
 *
 * Endpoints:
 * - GET /api/tasks/[id]/comments - Get all comments for a task
 * - POST /api/tasks/[id]/comments - Add a new comment
 * - DELETE /api/tasks/[id]/comments?commentId={id} - Delete a comment (author only)
 *
 * Security:
 * - Workspace isolation enforced (user must have access to task's workspace)
 * - Only comment authors can delete their own comments (admins can delete any)
 * - All endpoints require authentication
 */

import { NextRequest, NextResponse } from "next/server"
import { withAuth, type RouteContext } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { taskComments } from "@/lib/db/task-comments"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { isAdmin } from "@/lib/auth/middleware"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createTaskCommentSchema } from "@/lib/validation/schemas"
import type { ApiResponse, TaskComment } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * GET /api/tasks/[id]/comments
 * Returns all comments for a task
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

    // Get comments
    const comments = await taskComments.get(taskId)

    return NextResponse.json<ApiResponse<TaskComment[]>>({
      success: true,
      data: comments,
    })
  } catch (error) {
    logError(logger, "Get task comments error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get comments" },
      { status: 500 }
    )
  }
})

/**
 * POST /api/tasks/[id]/comments
 * Add a new comment to a task
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
    const { text } = await validateBody(request, createTaskCommentSchema)

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

    // Add comment
    const newComment = await taskComments.add(taskId, {
      userId: auth.user.id,
      userName: auth.user.name,
      text,
    })

    logger.info({ taskId, commentId: newComment.id, userId: auth.user.id }, "Comment added to task")

    return NextResponse.json<ApiResponse<TaskComment>>({
      success: true,
      data: newComment,
      message: "Comment added successfully",
    })
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    logError(logger, "Add task comment error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to add comment" },
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/tasks/[id]/comments
 * Delete a comment from a task (author only)
 */
export const DELETE = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    const params = await context?.params
    const taskId = params?.id

    if (!taskId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      )
    }

    // Get commentId from query params
    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get("commentId")

    if (!commentId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Comment ID is required" },
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

    // Find the comment to verify ownership
    const comment = await taskComments.find(taskId, commentId)
    if (!comment) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Comment not found" },
        { status: 404 }
      )
    }

    // Only the comment author or admin can delete
    if (comment.userId !== auth.user.id && !isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You can only delete your own comments" },
        { status: 403 }
      )
    }

    // Delete comment
    const deleted = await taskComments.delete(taskId, commentId)
    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to delete comment" },
        { status: 500 }
      )
    }

    logger.info({ taskId, commentId, userId: auth.user.id }, "Comment deleted from task")

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Comment deleted successfully",
    })
  } catch (error) {
    logError(logger, "Delete task comment error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete comment" },
      { status: 500 }
    )
  }
})
