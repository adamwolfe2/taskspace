import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { taskPool } from "@/lib/db/task-pool"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createTaskPoolItemSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse, TaskPoolItem } from "@/lib/types"

// GET /api/task-pool?workspaceId=xxx - List all pool tasks
export const GET = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace ID is required" },
        { status: 400 }
      )
    }

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

    const items = await taskPool.findByWorkspace(auth.organization.id, workspaceId)

    return NextResponse.json<ApiResponse<TaskPoolItem[]>>({
      success: true,
      data: items,
    })
  } catch (error) {
    logger.error({ error }, "Get task pool items error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get task pool items" },
      { status: 500 }
    )
  }
})

// POST /api/task-pool - Create a new pool task
export const POST = withAuth(async (request, auth) => {
  try {
    const { workspaceId, title, description, priority } = await validateBody(
      request,
      createTaskPoolItemSchema
    )

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

    const item = await taskPool.create({
      organizationId: auth.organization.id,
      workspaceId,
      title,
      description,
      priority: priority ?? "normal",
      createdById: auth.member.id,
      createdByName: auth.member.name,
    })

    logger.info(`Task pool item created: ${item.id} in workspace ${workspaceId}`)

    return NextResponse.json<ApiResponse<TaskPoolItem>>(
      { success: true, data: item, message: "Task added to pool" },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    const errMsg = error instanceof Error ? error.message : String(error)
    logger.error({ error, message: errMsg }, "Create task pool item error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: `Failed to create task pool item: ${errMsg}` },
      { status: 500 }
    )
  }
})
