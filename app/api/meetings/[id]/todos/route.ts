import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"

import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createMeetingTodoSchema, updateMeetingTodoSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import { isTerminalState } from "@/lib/api/meetings"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"

// GET /api/meetings/[id]/todos - Get todos for a meeting
export const GET = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params
    const meeting = await meetings.getById(id)

    if (!meeting) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Meeting not found" },
        { status: 404 }
      )
    }

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(meeting.workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
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
})

// POST /api/meetings/[id]/todos - Create a new todo
export const POST = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params
    const { title, assigneeId, dueDate, issueId } = await validateBody(request, createMeetingTodoSchema)

    const meeting = await meetings.getById(id)
    if (!meeting) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Meeting not found" },
        { status: 404 }
      )
    }

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(meeting.workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
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

    // STATE MACHINE: Allow creating todos on completed meetings (for follow-up actions)
    // but log it for tracking
    if (isTerminalState(meeting.status)) {
      logger.info(`Todo created on ${meeting.status} meeting ${id} by user ${auth.user.id}`)
    }

    const todo = await meetings.createTodo({
      meetingId: id,
      title,
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
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Create meeting todo error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create todo" },
      { status: 500 }
    )
  }
})

// PATCH /api/meetings/[id]/todos - Update todo completion status
export const PATCH = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const todoId = searchParams.get("todoId")

    if (!todoId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Todo ID is required" },
        { status: 400 }
      )
    }

    const body = await validateBody(request, updateMeetingTodoSchema)

    const meeting = await meetings.getById(id)
    if (!meeting) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Meeting not found" },
        { status: 404 }
      )
    }

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(meeting.workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
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

    if (body.completed !== undefined) {
      if (body.completed) {
        const updatedTodo = await meetings.completeTodo(todoId, id)
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
          message: "Todo completed successfully",
        })
      } else {
        // Un-complete a todo (scoped to this meeting for workspace isolation)
        const { rows } = await sql`
          UPDATE meeting_todos
          SET completed = FALSE, completed_at = NULL
          WHERE id = ${todoId} AND meeting_id = ${id}
          RETURNING *
        `
        if (rows.length === 0) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "Todo not found" },
            { status: 404 }
          )
        }

        logger.info(`Todo ${todoId} uncompleted`)

        return NextResponse.json<ApiResponse<Record<string, unknown>>>({
          success: true,
          data: rows[0],
          message: "Todo uncompleted successfully",
        })
      }
    }

    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "No valid updates provided" },
      { status: 400 }
    )
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Update meeting todo error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update todo" },
      { status: 500 }
    )
  }
})
