import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

interface ConvertToTaskRequest {
  taskId: string
}

// POST /api/meetings/[id]/todos/[todoId] - Convert todo to task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; todoId: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: meetingId, todoId } = await params
    const body: ConvertToTaskRequest = await request.json()
    const { taskId } = body

    if (!taskId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      )
    }

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
    logger.error({ error }, "Convert todo to task error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to convert todo to task" },
      { status: 500 }
    )
  }
}
