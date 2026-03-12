import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/api/middleware"
import { generateSmartRocks, isClaudeConfigured } from "@/lib/ai/claude-client"
import { aiRateLimit } from "@/lib/api/rate-limit"
import { checkCreditsOrRespond, recordUsage, AI_CREDIT_COSTS } from "@/lib/ai/credits"
import type { ApiResponse, SmartRockSuggestion, TeamMember } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// POST /api/ai/rocks/generate - Generate SMART rock suggestions from a high-level goal
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    // Rate limit: 20 requests per user per hour
    const rateCheck = aiRateLimit(auth.user.id, "smart-rocks")
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } }
      )
    }

    if (!isClaudeConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "AI features are not configured. Please add ANTHROPIC_API_KEY to environment.",
        },
        { status: 503 }
      )
    }

    // Check AI credits before processing
    const creditCheck = await checkCreditsOrRespond({
      organizationId: auth.organization.id,
      userId: auth.user.id,
    })
    if (creditCheck instanceof NextResponse) {
      return creditCheck as NextResponse<ApiResponse<null>>
    }

    // Parse and validate request body
    let body: { goal?: unknown; quarter?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      )
    }

    const { goal, quarter } = body

    if (!goal || typeof goal !== "string" || !goal.trim()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "goal is required" },
        { status: 400 }
      )
    }

    if (!quarter || typeof quarter !== "string" || !quarter.trim()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "quarter is required" },
        { status: 400 }
      )
    }

    // Fetch team members and existing rocks for context (in parallel)
    const [teamMembersData, existingRocks] = await Promise.all([
      db.members.findWithUsersByOrganizationId(auth.organization.id),
      db.rocks.findByOrganizationId(auth.organization.id),
    ])

    const teamMembers: Pick<TeamMember, "name" | "email" | "role">[] = teamMembersData.map((m) => ({
      name: m.name,
      email: m.email,
      role: m.role,
    }))

    const quarterRocks = existingRocks
      .filter((r) => r.quarter === quarter.trim())
      .map((r) => ({ title: r.title, status: r.status }))

    // Call Claude to generate SMART rock suggestions
    const { result: suggestions, usage } = await generateSmartRocks(goal.trim(), {
      teamMembers,
      existingRocks: quarterRocks,
      quarter: quarter.trim(),
    })

    // Record AI usage
    await recordUsage({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "smart-rocks",
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      credits: AI_CREDIT_COSTS.smartRocks,
      reservationId: creditCheck.reservationId,
    })

    logger.info(
      {
        orgId: auth.organization.id,
        userId: auth.user.id,
        goal: goal.trim().slice(0, 100),
        quarter: quarter.trim(),
        suggestionsCount: suggestions.length,
      },
      "Smart rocks generated"
    )

    return NextResponse.json<ApiResponse<SmartRockSuggestion[]>>({
      success: true,
      data: suggestions,
      message: `Generated ${suggestions.length} rock suggestion${suggestions.length !== 1 ? "s" : ""}`,
    })
  } catch (error) {
    logError(logger, "Smart rocks generation error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to generate rock suggestions" },
      { status: 500 }
    )
  }
})
