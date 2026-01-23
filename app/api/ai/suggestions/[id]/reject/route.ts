import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { getSuggestionById, rejectSuggestion } from "@/lib/ai/suggestions"
import type { ApiResponse, AISuggestion } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/ai/suggestions/[id]/reject
 * Reject a suggestion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Admin access required" },
        { status: 403 }
      )
    }

    const { id } = await params
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
}
