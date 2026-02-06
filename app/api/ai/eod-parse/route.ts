import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/api/middleware"
import { parseEODTextDump, isClaudeConfigured, ParsedEODReport } from "@/lib/ai/claude-client"
import { canUseAI, buildFeatureGateContext } from "@/lib/billing/feature-gates"
import { AI_OPERATION_COSTS } from "@/lib/billing/plans"
import { getUserWorkspaces } from "@/lib/db/workspaces"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// Get current quarter string
function getCurrentQuarter(): string {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const quarter = Math.floor(month / 3) + 1
  return `Q${quarter} ${year}`
}

// POST /api/ai/eod-parse - Parse text dump into EOD report structure
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    // AI EOD parsing is available to all members
    if (!isClaudeConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "AI features are not configured. Please add ANTHROPIC_API_KEY to environment." },
        { status: 503 }
      )
    }

    // Check feature gate: Can use AI?
    const members = await db.members.findByOrganizationId(auth.organization.id)
    const workspaces = await getUserWorkspaces(auth.user.id)
    const aiUsage = auth.organization.subscription?.aiCreditsUsed || 0

    const featureContext = await buildFeatureGateContext(
      auth.organization.id,
      auth.organization.subscription,
      {
        activeUsers: members.filter(m => m.status === "active").length,
        workspaces: workspaces.length,
        aiCreditsUsed: aiUsage,
      }
    )

    const aiCheck = canUseAI(featureContext, "eodParsing")
    if (!aiCheck.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: aiCheck.reason || "AI credits depleted",
          meta: {
            creditsNeeded: aiCheck.creditsNeeded,
            creditsAvailable: aiCheck.creditsAvailable,
            upgradeRequired: aiCheck.upgradeRequired,
          },
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { content, quarter } = body

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Text dump content is required" },
        { status: 400 }
      )
    }

    // Use provided quarter or default to current
    const targetQuarter = quarter || getCurrentQuarter()

    // Get user's rocks for context
    const allRocks = await db.rocks.findByUserId(auth.user.id, auth.organization.id)

    // Parse the text dump
    const parsedReport = await parseEODTextDump(
      content.trim(),
      allRocks,
      targetQuarter
    )

    // Track AI usage and deduct credits
    await db.aiUsage.track({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "eod_parsing",
      model: "claude-3-5-sonnet",
      inputTokens: Math.ceil(content.length / 4), // rough estimate
      outputTokens: Math.ceil(JSON.stringify(parsedReport).length / 4),
      creditsUsed: AI_OPERATION_COSTS.eodParsing,
      metadata: {
        taskCount: parsedReport.tasks.length,
        quarter: targetQuarter,
      },
    })

    // Return the parsed structure for review before submission
    return NextResponse.json<ApiResponse<{
      parsed: ParsedEODReport
      quarter: string
      rockCount: number
    }>>({
      success: true,
      data: {
        parsed: parsedReport,
        quarter: targetQuarter,
        rockCount: allRocks.filter(r => r.quarter === targetQuarter).length,
      },
      message: `Parsed ${parsedReport.tasks.length} tasks from your text dump`,
    })
  } catch (error) {
    logError(logger, "EOD text parse error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Failed to parse EOD text" },
      { status: 500 }
    )
  }
})
