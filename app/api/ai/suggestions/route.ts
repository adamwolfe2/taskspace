import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import {
  getSuggestions,
  getSuggestionStats,
  type SuggestionFilters,
} from "@/lib/ai/suggestions"
import { checkApiRateLimit, getRateLimitHeaders } from "@/lib/auth/rate-limit"
import type { ApiResponse, AISuggestion, SuggestionStats } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { safeParseFloat, safeParseInt, clamp } from "@/lib/utils"

// Rate limit: 30 suggestion list requests per user per hour
const MAX_SUGGESTIONS_PER_HOUR = 30
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

interface SuggestionsResponse {
  suggestions: AISuggestion[]
  stats: SuggestionStats
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

/**
 * GET /api/ai/suggestions
 * List AI suggestions for the organization's inbox
 */
export const GET = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Rate limit: 30 suggestion list requests per user per hour
    const rateLimitKey = `ai-suggestions:${auth.user.id}`
    const rateLimitResult = await checkApiRateLimit(
      request,
      rateLimitKey,
      MAX_SUGGESTIONS_PER_HOUR,
      RATE_LIMIT_WINDOW_MS
    )

    if (!rateLimitResult.success) {
      const response = NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "You have reached the maximum number of suggestion requests. Please try again later.",
        },
        { status: 429 }
      )
      const headers = getRateLimitHeaders(rateLimitResult, MAX_SUGGESTIONS_PER_HOUR)
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value)
      }
      return response
    }

    const { searchParams } = new URL(request.url)

    // Parse filters from query params
    const filters: SuggestionFilters = {
      status: parseArrayParam(searchParams.get("status")) as SuggestionFilters["status"] || "pending",
      sourceType: searchParams.get("sourceType") as SuggestionFilters["sourceType"] || undefined,
      suggestionType: parseArrayParam(searchParams.get("type")) as SuggestionFilters["suggestionType"] || undefined,
      targetUserId: searchParams.get("targetUserId") || undefined,
      priority: parseArrayParam(searchParams.get("priority")) as SuggestionFilters["priority"] || undefined,
      minConfidence: searchParams.get("minConfidence")
        ? clamp(safeParseFloat(searchParams.get("minConfidence"), 0), 0, 1)
        : undefined,
      includeExpired: searchParams.get("includeExpired") === "true",
      limit: clamp(safeParseInt(searchParams.get("limit"), 50), 1, 100),
      offset: Math.max(0, safeParseInt(searchParams.get("offset"), 0)),
    }

    // Fetch suggestions and stats in parallel
    const [suggestions, stats] = await Promise.all([
      getSuggestions(auth.organization.id, filters),
      getSuggestionStats(auth.organization.id),
    ])

    return NextResponse.json<ApiResponse<SuggestionsResponse>>({
      success: true,
      data: {
        suggestions,
        stats,
        pagination: {
          limit: filters.limit || 50,
          offset: filters.offset || 0,
          hasMore: suggestions.length === (filters.limit || 50),
        },
      },
    })
  } catch (error) {
    logError(logger, "Get suggestions error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch suggestions" },
      { status: 500 }
    )
  }
})

/**
 * Parse comma-separated array params
 */
function parseArrayParam(value: string | null): string | string[] | undefined {
  if (!value) return undefined
  const parts = value.split(",").map(s => s.trim()).filter(Boolean)
  return parts.length === 1 ? parts[0] : parts.length > 1 ? parts : undefined
}
