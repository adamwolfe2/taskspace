import { NextResponse } from "next/server"
import { withAuth, type RouteContext } from "@/lib/api/middleware"
import { verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { idsBoard } from "@/lib/db/ids-board"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateIdsBoardItemSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse, IdsBoardItem } from "@/lib/types"

// GET /api/ids-board/[id] - Get a single item
export const GET = withAuth(async (request, auth, context) => {
  try {
    const params = await (context as RouteContext).params
    const itemId = params.id

    const item = await idsBoard.getItemById(itemId)
    if (!item) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Item not found" },
        { status: 404 }
      )
    }

    const isValidWorkspace = await verifyWorkspaceOrgBoundary(item.workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Item not found" },
        { status: 404 }
      )
    }

    const hasAccess = await userHasWorkspaceAccess(auth.user.id, item.workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    return NextResponse.json<ApiResponse<IdsBoardItem>>({
      success: true,
      data: item,
    })
  } catch (error) {
    logger.error({ error }, "Get IDS board item error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get item" },
      { status: 500 }
    )
  }
})

// PATCH /api/ids-board/[id] - Update an item
export const PATCH = withAuth(async (request, auth, context) => {
  try {
    const params = await (context as RouteContext).params
    const itemId = params.id

    const item = await idsBoard.getItemById(itemId)
    if (!item) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Item not found" },
        { status: 404 }
      )
    }

    const isValidWorkspace = await verifyWorkspaceOrgBoundary(item.workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Item not found" },
        { status: 404 }
      )
    }

    const hasAccess = await userHasWorkspaceAccess(auth.user.id, item.workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    const updates = await validateBody(request, updateIdsBoardItemSchema)
    const updated = await idsBoard.updateItem(itemId, updates)

    return NextResponse.json<ApiResponse<IdsBoardItem>>({
      success: true,
      data: updated!,
      message: "Item updated successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Update IDS board item error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update item" },
      { status: 500 }
    )
  }
})

// DELETE /api/ids-board/[id] - Delete an item
export const DELETE = withAuth(async (request, auth, context) => {
  try {
    const params = await (context as RouteContext).params
    const itemId = params.id

    const item = await idsBoard.getItemById(itemId)
    if (!item) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Item not found" },
        { status: 404 }
      )
    }

    const isValidWorkspace = await verifyWorkspaceOrgBoundary(item.workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Item not found" },
        { status: 404 }
      )
    }

    const hasAccess = await userHasWorkspaceAccess(auth.user.id, item.workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    await idsBoard.deleteItem(itemId)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
      message: "Item deleted successfully",
    })
  } catch (error) {
    logger.error({ error }, "Delete IDS board item error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete item" },
      { status: 500 }
    )
  }
})
