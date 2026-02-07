import { NextRequest, NextResponse } from "next/server"
import { checkAICredits } from "@/lib/billing/stripe"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { withAuth } from "@/lib/api/middleware"

interface CreditUsage {
  creditsUsed: number
  creditsLimit: number
  remainingCredits: number
  resetDate?: string
}

/**
 * GET /api/billing/ai-usage
 * Get AI credit usage for the current organization
 */
export const GET = withAuth(async (request, auth) => {
  try {
    // Get credit status from billing
    const creditStatus = await checkAICredits(auth.organization.id)

    // Calculate reset date (first of next month)
    const now = new Date()
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const usage: CreditUsage = {
      creditsUsed: creditStatus.creditsUsed,
      creditsLimit: creditStatus.creditsLimit,
      remainingCredits: creditStatus.remainingCredits,
      resetDate: resetDate.toISOString(),
    }

    return NextResponse.json<ApiResponse<CreditUsage>>({
      success: true,
      data: usage,
    })
  } catch (error) {
    logError(logger, "Get AI usage error", error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "Failed to get AI usage",
      },
      { status: 500 }
    )
  }
})
