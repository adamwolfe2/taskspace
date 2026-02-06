import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { getBudgetSettings, updateBudgetSettings } from "@/lib/ai/suggestions"
import { checkApiRateLimit, getRateLimitHeaders } from "@/lib/auth/rate-limit"
import type { ApiResponse, AIBudgetSettings } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// Rate limit: 10 budget settings requests per user per hour
const MAX_BUDGET_SETTINGS_PER_HOUR = 10
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

/**
 * GET /api/ai/budget-settings
 * Get AI budget settings for organization
 */
export const GET = withAdmin(async (request: NextRequest, auth) => {
  try {
    const settings = await getBudgetSettings(auth.organization.id)

    return NextResponse.json<ApiResponse<AIBudgetSettings>>({
      success: true,
      data: settings,
    })
  } catch (error) {
    logError(logger, "Get budget settings error", error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get settings",
      },
      { status: 500 }
    )
  }
})

/**
 * PUT /api/ai/budget-settings
 * Update AI budget settings
 */
export const PUT = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Rate limit: 10 budget settings updates per user per hour
    const rateLimitKey = `ai-budget-settings:${auth.user.id}`
    const rateLimitResult = await checkApiRateLimit(
      request,
      rateLimitKey,
      MAX_BUDGET_SETTINGS_PER_HOUR,
      RATE_LIMIT_WINDOW_MS
    )

    if (!rateLimitResult.success) {
      const response = NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "You have reached the maximum number of budget settings updates. Please try again later.",
        },
        { status: 429 }
      )
      const headers = getRateLimitHeaders(rateLimitResult, MAX_BUDGET_SETTINGS_PER_HOUR)
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value)
      }
      return response
    }

    const body = await request.json()

    // Validate settings
    const {
      monthlyBudgetCredits,
      warningThresholdPercent,
      autoApproveEnabled,
      autoApproveMinConfidence,
      autoApproveTypes,
      pauseOnBudgetExceeded,
    } = body as Partial<AIBudgetSettings>

    // Validate ranges
    if (warningThresholdPercent !== undefined) {
      if (warningThresholdPercent < 50 || warningThresholdPercent > 95) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Warning threshold must be between 50 and 95" },
          { status: 400 }
        )
      }
    }

    if (autoApproveMinConfidence !== undefined) {
      if (autoApproveMinConfidence < 0.5 || autoApproveMinConfidence > 1) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Auto-approve confidence must be between 0.5 and 1" },
          { status: 400 }
        )
      }
    }

    const updatedSettings = await updateBudgetSettings(auth.organization.id, {
      monthlyBudgetCredits,
      warningThresholdPercent,
      autoApproveEnabled,
      autoApproveMinConfidence,
      autoApproveTypes,
      pauseOnBudgetExceeded,
    })

    return NextResponse.json<ApiResponse<AIBudgetSettings>>({
      success: true,
      data: updatedSettings,
    })
  } catch (error) {
    logError(logger, "Update budget settings error", error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update settings",
      },
      { status: 500 }
    )
  }
})
