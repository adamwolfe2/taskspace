import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { getSuggestionById, rejectSuggestion } from "@/lib/ai/suggestions"
import { checkApiRateLimit, getRateLimitHeaders } from "@/lib/auth/rate-limit"
import type { ApiResponse, AISuggestion } from "@/lib/types"
import { validateBody } from "@/lib/validation/middleware"
import { aiSuggestionRejectSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"

// Rate limit: 30 suggestion rejections per user per hour
const MAX_REJECTIONS_PER_HOUR = 30
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

/**
 * POST /api/ai/suggestions/[id]/reject
 * Reject a suggestion
 */
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Rate limit: 30 suggestion rejections per user per hour
    const rateLimitKey = `ai-suggestion-reject:${auth.user.id}`
    const rateLimitResult = await checkApiRateLimit(
      request,
      rateLimitKey,
      MAX_REJECTIONS_PER_HOUR,
      RATE_LIMIT_WINDOW_MS
    )

    if (!rateLimitResult.success) {
      const response = NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "You have reached the maximum number of suggestion rejections. Please try again later.",
        },
        { status: 429 }
      )
      const headers = getRateLimitHeaders(rateLimitResult, MAX_REJECTIONS_PER_HOUR)
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value)
      }
      return response
    }

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

    // reviewerNotes is optional — allow rejection even with empty/missing body
    let reviewerNotes: string | undefined
    try {
      const body = await validateBody(request, aiSuggestionRejectSchema)
      reviewerNotes = body.reviewerNotes
    } catch {
      // Body is missing or malformed — proceed without notes
      reviewerNotes = undefined
    }

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
        error: "Failed to reject suggestion",
      },
      { status: 500 }
    )
  }
})
