import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/api/middleware"
import type { RouteContext } from "@/lib/api/middleware"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateFocusBlockSchema } from "@/lib/validation/schemas"
import type { ApiResponse, FocusBlock } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// GET /api/productivity/focus-blocks/[id] - Get single focus block
export const GET = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params

    const focusBlock = await db.focusBlocks.findById(id)

    if (!focusBlock) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Focus block not found" },
        { status: 404 }
      )
    }

    // Verify access
    if (focusBlock.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      )
    }

    return NextResponse.json<ApiResponse<FocusBlock>>({
      success: true,
      data: focusBlock,
    })
  } catch (error) {
    logError(logger, "Get focus block error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get focus block" },
      { status: 500 }
    )
  }
})

// PUT /api/productivity/focus-blocks/[id] - Update focus block
export const PUT = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params
    const body = await validateBody(request, updateFocusBlockSchema)

    // Get existing block to verify ownership
    const existingBlock = await db.focusBlocks.findById(id)
    if (!existingBlock) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Focus block not found" },
        { status: 404 }
      )
    }

    if (existingBlock.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      )
    }

    const updates: Partial<FocusBlock> = {}
    if (body.startTime) updates.startTime = body.startTime
    if (body.endTime) updates.endTime = body.endTime
    if (body.category) updates.category = body.category
    if (body.quality !== undefined) updates.quality = body.quality as 1 | 2 | 3 | 4 | 5
    if (body.interruptions !== undefined) updates.interruptions = body.interruptions
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.taskId !== undefined) updates.taskId = body.taskId
    if (body.rockId !== undefined) updates.rockId = body.rockId

    const success = await db.focusBlocks.update(id, updates)

    if (!success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to update focus block" },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<{ updated: boolean }>>({
      success: true,
      data: { updated: true },
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Update focus block error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update focus block" },
      { status: 500 }
    )
  }
})

// DELETE /api/productivity/focus-blocks/[id] - Delete focus block
export const DELETE = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params

    // Get existing block to verify ownership
    const existingBlock = await db.focusBlocks.findById(id)
    if (!existingBlock) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Focus block not found" },
        { status: 404 }
      )
    }

    if (existingBlock.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      )
    }

    const success = await db.focusBlocks.delete(id)

    if (!success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to delete focus block" },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
    })
  } catch (error) {
    logError(logger, "Delete focus block error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete focus block" },
      { status: 500 }
    )
  }
})
