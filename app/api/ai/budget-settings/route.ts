import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { getBudgetSettings, updateBudgetSettings } from "@/lib/ai/suggestions"
import type { ApiResponse, AIBudgetSettings } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

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
