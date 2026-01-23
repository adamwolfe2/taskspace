import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/middleware"
import type { ApiResponse, FocusBlock } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createFocusBlockSchema } from "@/lib/validation/schemas"

// GET /api/productivity/focus-blocks - List focus blocks for user
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get("userId")
    const startDate = searchParams.get("startDate") || undefined
    const endDate = searchParams.get("endDate") || undefined

    // Users can only view their own data unless they're admin/owner
    const isAdmin = auth.member.role === "admin" || auth.member.role === "owner"
    const userId = requestedUserId && isAdmin ? requestedUserId : auth.user.id

    const focusBlocks = await db.focusBlocks.findByUserId(
      userId,
      auth.organization.id,
      startDate,
      endDate
    )

    return NextResponse.json<ApiResponse<FocusBlock[]>>({
      success: true,
      data: focusBlocks,
    })
  } catch (error) {
    logError(logger, "Get focus blocks error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get focus blocks" },
      { status: 500 }
    )
  }
}

// POST /api/productivity/focus-blocks - Create new focus block
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Validate request body using Zod schema
    const body = await validateBody(request, createFocusBlockSchema, {
      errorPrefix: "Invalid focus block",
    })

    const focusBlock: Omit<FocusBlock, "id" | "createdAt" | "updatedAt"> = {
      organizationId: auth.organization.id,
      userId: auth.user.id,
      startTime: body.startTime,
      endTime: body.endTime,
      category: body.category,
      quality: body.quality,
      interruptions: body.interruptions,
      notes: body.notes,
      taskId: body.taskId,
      rockId: body.rockId,
    }

    const result = await db.focusBlocks.create(focusBlock)

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: result,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Create focus block error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create focus block" },
      { status: 500 }
    )
  }
}
