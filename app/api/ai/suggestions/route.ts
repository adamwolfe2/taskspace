import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import {
  getSuggestions,
  getSuggestionStats,
  type SuggestionFilters,
} from "@/lib/ai/suggestions"
import type { ApiResponse, AISuggestion, SuggestionStats } from "@/lib/types"

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
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only admins can view the AI inbox
    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Admin access required to view AI suggestions" },
        { status: 403 }
      )
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
        ? parseFloat(searchParams.get("minConfidence")!)
        : undefined,
      includeExpired: searchParams.get("includeExpired") === "true",
      limit: parseInt(searchParams.get("limit") || "50", 10),
      offset: parseInt(searchParams.get("offset") || "0", 10),
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
    console.error("Get suggestions error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch suggestions" },
      { status: 500 }
    )
  }
}

/**
 * Parse comma-separated array params
 */
function parseArrayParam(value: string | null): string | string[] | undefined {
  if (!value) return undefined
  const parts = value.split(",").map(s => s.trim()).filter(Boolean)
  return parts.length === 1 ? parts[0] : parts.length > 1 ? parts : undefined
}
