import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { idsBoard } from "@/lib/db/ids-board"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createIdsBoardItemSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse, IdsBoardItem } from "@/lib/types"
import { isFeatureEnabled, getFeatureGateError } from "@/lib/auth/feature-gate"

// GET /api/ids-board?workspaceId=xxx - List all IDS board items
export const GET = withAuth(async (request, auth) => {
  try {
    if (!isFeatureEnabled(auth.organization, "ids_board")) {
      return getFeatureGateError("ids_board")
    }

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

    const items = await idsBoard.getItems(workspaceId)

    return NextResponse.json<ApiResponse<IdsBoardItem[]>>({
      success: true,
      data: items,
    })
  } catch (error) {
    logger.error({ error }, "Get IDS board items error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get IDS board items" },
      { status: 500 }
    )
  }
})

// POST /api/ids-board - Create a new IDS board item
export const POST = withAuth(async (request, auth) => {
  try {
    if (!isFeatureEnabled(auth.organization, "ids_board")) {
      return getFeatureGateError("ids_board")
    }

    const { workspaceId, title, description, columnName, itemType, linkedId, assignedTo } =
      await validateBody(request, createIdsBoardItemSchema)

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

    const item = await idsBoard.createItem({
      workspaceId,
      title,
      description: description?.trim(),
      columnName,
      itemType,
      linkedId,
      createdBy: auth.user.id,
      assignedTo,
    })

    logger.info(`IDS board item created: ${item.id} in workspace ${workspaceId}`)

    return NextResponse.json<ApiResponse<IdsBoardItem>>({
      success: true,
      data: item,
      message: "Item created successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Create IDS board item error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create IDS board item" },
      { status: 500 }
    )
  }
})
