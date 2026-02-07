import { NextResponse } from "next/server"
import { withAuth, type RouteContext } from "@/lib/api/middleware"
import { peopleAssessments } from "@/lib/db/people-assessments"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"
import type { PeopleAssessment } from "@/lib/db/people-assessments"

// PUT /api/people-assessments/[id]
export const PUT = withAuth(async (request, auth, context) => {
  try {
    const params = await (context as RouteContext).params
    const id = params.id
    const body = await request.json()

    const existing = await peopleAssessments.get(id)
    if (!existing) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Assessment not found" },
        { status: 404 }
      )
    }

    const updated = await peopleAssessments.update(id, body)

    return NextResponse.json<ApiResponse<PeopleAssessment | null>>({
      success: true,
      data: updated,
    })
  } catch (error) {
    logger.error({ error }, "Update people assessment error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update assessment" },
      { status: 500 }
    )
  }
})

// DELETE /api/people-assessments/[id]
export const DELETE = withAuth(async (request, auth, context) => {
  try {
    const params = await (context as RouteContext).params
    const id = params.id
    const deleted = await peopleAssessments.delete(id)

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Assessment not found" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
    })
  } catch (error) {
    logger.error({ error }, "Delete people assessment error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete assessment" },
      { status: 500 }
    )
  }
})
