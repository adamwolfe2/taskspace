import { NextResponse } from "next/server"
import { withAuth, type RouteContext } from "@/lib/api/middleware"
import { verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { idsBoard } from "@/lib/db/ids-board"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { moveIdsBoardItemSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse, IdsBoardItem } from "@/lib/types"

// POST /api/ids-board/[id]/move - Move item between columns
export const POST = withAuth(async (request, auth, context) => {
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

    const { columnName, orderIndex } = await validateBody(request, moveIdsBoardItemSchema)
    const moved = await idsBoard.moveItem(itemId, columnName, orderIndex)

    return NextResponse.json<ApiResponse<IdsBoardItem>>({
      success: true,
      data: moved!,
      message: "Item moved successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Move IDS board item error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to move item" },
      { status: 500 }
    )
  }
})
