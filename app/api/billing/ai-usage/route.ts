import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { checkAICredits } from "@/lib/billing/stripe"
import type { ApiResponse } from "@/lib/types"

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
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

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
    console.error("Get AI usage error:", error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get AI usage",
      },
      { status: 500 }
    )
  }
}
