import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { getSuggestionById, rejectSuggestion } from "@/lib/ai/suggestions"
import type { ApiResponse, AISuggestion } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/ai/suggestions/[id]/reject
 * Reject a suggestion
 */
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Extract id from URL path since middleware wrapper doesn't pass params directly
    const url = new URL(request.url)
    const pathParts = url.pathname.split("/")
    // Path: /api/ai/suggestions/[id]/reject
    const idIndex = pathParts.indexOf("suggestions") + 1
    const id = pathParts[idIndex]

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Suggestion ID is required" },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { reviewerNotes } = body as { reviewerNotes?: string }

    // Verify suggestion exists and belongs to this org
    const suggestion = await getSuggestionById(id)
    if (!suggestion) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Suggestion not found" },
        { status: 404 }
      )
    }

    if (suggestion.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Suggestion not found" },
        { status: 404 }
      )
    }

    if (suggestion.status !== "pending") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Suggestion is already ${suggestion.status}` },
        { status: 400 }
      )
    }

    const result = await rejectSuggestion(id, auth.user.id, reviewerNotes)

    return NextResponse.json<ApiResponse<AISuggestion>>({
      success: true,
      data: result,
    })
  } catch (error) {
    logError(logger, "Reject suggestion error", error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to reject suggestion",
      },
      { status: 500 }
    )
  }
})
