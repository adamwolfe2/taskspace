import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/middleware"
import type { ApiResponse, FocusBlock } from "@/lib/types"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/productivity/focus-blocks/[id] - Get single focus block
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
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
    console.error("Get focus block error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get focus block" },
      { status: 500 }
    )
  }
}

// PUT /api/productivity/focus-blocks/[id] - Update focus block
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

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

    // Validate category if provided
    if (body.category) {
      const validCategories = ["deep_work", "meetings", "admin", "collaboration", "learning", "planning"]
      if (!validCategories.includes(body.category)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
          { status: 400 }
        )
      }
    }

    // Validate quality if provided
    if (body.quality !== undefined && (body.quality < 1 || body.quality > 5)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Quality must be between 1 and 5" },
        { status: 400 }
      )
    }

    const updates: Partial<FocusBlock> = {}
    if (body.startTime) updates.startTime = body.startTime
    if (body.endTime) updates.endTime = body.endTime
    if (body.category) updates.category = body.category
    if (body.quality !== undefined) updates.quality = body.quality
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
    console.error("Update focus block error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update focus block" },
      { status: 500 }
    )
  }
}

// DELETE /api/productivity/focus-blocks/[id] - Delete focus block
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

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
    console.error("Delete focus block error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete focus block" },
      { status: 500 }
    )
  }
}
