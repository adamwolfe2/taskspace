import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

interface CreateTodoRequest {
  title: string
  assigneeId?: string
  dueDate?: string
  issueId?: string
}

interface UpdateTodoRequest {
  completed?: boolean
}

// GET /api/meetings/[id]/todos - Get todos for a meeting
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const meeting = await meetings.getById(id)

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

    const todos = await meetings.getTodos(id)

    return NextResponse.json<ApiResponse<typeof todos>>({
      success: true,
      data: todos,
    })
  } catch (error) {
    logger.error({ error }, "Get meeting todos error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get meeting todos" },
      { status: 500 }
    )
  }
}

// POST /api/meetings/[id]/todos - Create a new todo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body: CreateTodoRequest = await request.json()
    const { title, assigneeId, dueDate, issueId } = body

    if (!title || title.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Title is required" },
        { status: 400 }
      )
    }

    const meeting = await meetings.getById(id)
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

    const todo = await meetings.createTodo({
      meetingId: id,
      title: title.trim(),
      assigneeId,
      dueDate,
      issueId,
    })

    logger.info(`Todo created in meeting ${id}`)

    return NextResponse.json<ApiResponse<typeof todo>>({
      success: true,
      data: todo,
      message: "Todo created successfully",
    })
  } catch (error) {
    logger.error({ error }, "Create meeting todo error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create todo" },
      { status: 500 }
    )
  }
}

// PATCH /api/meetings/[id]/todos - Update todo completion status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const todoId = searchParams.get("todoId")

    if (!todoId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Todo ID is required" },
        { status: 400 }
      )
    }

    const body: UpdateTodoRequest = await request.json()

    const meeting = await meetings.getById(id)
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

    // For now, only support completing todos
    if (body.completed !== undefined && body.completed) {
      const updatedTodo = await meetings.completeTodo(todoId)
      if (!updatedTodo) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Todo not found" },
          { status: 404 }
        )
      }

      logger.info(`Todo ${todoId} completed`)

      return NextResponse.json<ApiResponse<typeof updatedTodo>>({
        success: true,
        data: updatedTodo,
        message: "Todo updated successfully",
      })
    }

    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "No valid updates provided" },
      { status: 400 }
    )
  } catch (error) {
    logger.error({ error }, "Update meeting todo error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update todo" },
      { status: 500 }
    )
  }
}
