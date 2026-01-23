import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { checkAICredits, getAIUsageStats } from "@/lib/billing/stripe"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

interface AIUsageResponse {
  credits: {
    used: number
    limit: number
    remaining: number
    hasCredits: boolean
  }
  stats: {
    totalCredits: number
    totalTokens: number
    queryCount: number
    byAction: Record<string, number>
    byModel: Record<string, number>
  }
  period: {
    start: string
    end: string
  }
}

/**
 * GET /api/billing/usage
 * Get AI usage statistics for the organization
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

    const orgId = auth.organization.id

    // Get current period (start of month to now)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Get credits info
    const creditsInfo = await checkAICredits(orgId)

    // Get usage stats for current month
    const stats = await getAIUsageStats(orgId, startOfMonth, now)

    return NextResponse.json<ApiResponse<AIUsageResponse>>({
      success: true,
      data: {
        credits: {
          used: creditsInfo.creditsUsed,
          limit: creditsInfo.creditsLimit,
          remaining: creditsInfo.remainingCredits,
          hasCredits: creditsInfo.hasCredits,
        },
        stats,
        period: {
          start: startOfMonth.toISOString(),
          end: endOfMonth.toISOString(),
        },
      },
    })
  } catch (error) {
    logError(logger, "Get usage error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get usage statistics" },
      { status: 500 }
    )
  }
}
