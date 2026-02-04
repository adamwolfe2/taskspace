import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
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
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

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
          creditsNeeded: aiCheck.creditsNeeded,
          creditsAvailable: aiCheck.creditsAvailable,
          upgradeRequired: aiCheck.upgradeRequired,
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

    // Deduct AI credits after successful operation
    const newCreditsUsed = aiUsage + AI_OPERATION_COSTS.eodParsing
    // Note: You'll need to add a method to update AI credits in the subscription
    // await db.organizations.updateAICredits(auth.organization.id, newCreditsUsed)

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
}
