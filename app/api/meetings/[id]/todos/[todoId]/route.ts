import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import type { RouteContext } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { db } from "@/lib/db"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { convertTodoToTaskSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

// POST /api/meetings/[id]/todos/[todoId] - Convert todo to task
export const POST = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id: meetingId, todoId } = await context.params
    const { taskId } = await validateBody(request, convertTodoToTaskSchema)

    // Get meeting to validate workspace access
    const meeting = await meetings.getById(meetingId)
    if (!meeting) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Meeting not found" },
        { status: 404 }
      )
    }

    // Check workspace access
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, meeting.workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    // Validate task exists and user has access
    const task = await db.assignedTasks.findById(taskId)
    if (!task) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task not found" },
        { status: 404 }
      )
    }

    // Validate task belongs to same organization
    if (task.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task does not belong to your organization" },
        { status: 403 }
      )
    }

    // Validate task workspace matches meeting workspace if task has one
    if (task.workspaceId && task.workspaceId !== meeting.workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task workspace does not match meeting workspace" },
        { status: 400 }
      )
    }

    // Convert todo to task
    const updatedTodo = await meetings.convertTodoToTask(todoId, taskId)
    if (!updatedTodo) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to convert todo to task" },
        { status: 500 }
      )
    }

    logger.info(`Todo ${todoId} converted to task ${taskId} in meeting ${meetingId}`)

    return NextResponse.json<ApiResponse<typeof updatedTodo>>({
      success: true,
      data: updatedTodo,
      message: "Todo successfully converted to task",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Convert todo to task error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to convert todo to task" },
      { status: 500 }
    )
  }
})
