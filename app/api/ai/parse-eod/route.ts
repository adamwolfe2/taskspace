import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/api/middleware"
import { parseEODReport, isClaudeConfigured } from "@/lib/ai/claude-client"
import { generateId } from "@/lib/auth/password"
import { checkApiRateLimit, getRateLimitHeaders } from "@/lib/auth/rate-limit"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import type { ApiResponse, EODInsight } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// Rate limit: 20 EOD report parses per user per hour
const MAX_PARSE_EOD_PER_HOUR = 20
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// POST /api/ai/parse-eod - Parse an EOD report and extract insights
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    // Rate limit: 20 parses per user per hour
    const rateLimitKey = `ai-parse-eod:${auth.user.id}`
    const rateLimitResult = await checkApiRateLimit(
      request,
      rateLimitKey,
      MAX_PARSE_EOD_PER_HOUR,
      RATE_LIMIT_WINDOW_MS
    )

    if (!rateLimitResult.success) {
      const response = NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "You have reached the maximum number of EOD report parses. Please try again later.",
        },
        { status: 429 }
      )
      const headers = getRateLimitHeaders(rateLimitResult, MAX_PARSE_EOD_PER_HOUR)
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value)
      }
      return response
    }

    if (!isClaudeConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "AI features are not configured. Please add ANTHROPIC_API_KEY to environment." },
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

    const body = await request.json()
    const { eodReportId } = body

    if (!eodReportId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "EOD Report ID is required" },
        { status: 400 }
      )
    }

    // Get the EOD report
    const eodReport = await db.eodReports.findById(eodReportId)
    if (!eodReport) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "EOD Report not found" },
        { status: 404 }
      )
    }

    // Check if insight already exists
    const existingInsight = await db.eodInsights.findByEODReportId(eodReportId)
    if (existingInsight) {
      return NextResponse.json<ApiResponse<EODInsight>>({
        success: true,
        data: existingInsight,
        message: "Insight already exists for this report",
      })
    }

    // Get member info
    const teamMembersData = await db.members.findWithUsersByOrganizationId(auth.organization.id)
    const member = teamMembersData.find(m => m.id === eodReport.userId)

    if (!member) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Team member not found" },
        { status: 404 }
      )
    }

    // Get user's rocks for context
    const rocks = await db.rocks.findByUserId(eodReport.userId, auth.organization.id)

    // Parse EOD report with Claude
    const { result, usage } = await parseEODReport(eodReport, member.name, member.department, rocks)

    // Record AI usage
    await recordUsage({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "parse-eod",
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    })

    // Create insight record
    const now = new Date().toISOString()
    const insight: EODInsight = {
      id: generateId(),
      organizationId: auth.organization.id,
      eodReportId: eodReportId,
      ...result.insight,
      processedAt: now,
    }

    await db.eodInsights.create(insight)

    return NextResponse.json<ApiResponse<{
      insight: EODInsight
      alertAdmin: boolean
      alertReason?: string
    }>>({
      success: true,
      data: {
        insight,
        alertAdmin: result.alertAdmin,
        alertReason: result.alertReason,
      },
      message: "EOD report parsed successfully",
    })
  } catch (error) {
    logError(logger, "Parse EOD error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Failed to parse EOD report" },
      { status: 500 }
    )
  }
})

// GET /api/ai/parse-eod - Get EOD insights
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const eodReportId = searchParams.get("eodReportId")
    const days = parseInt(searchParams.get("days") || "7", 10)

    if (eodReportId) {
      const insight = await db.eodInsights.findByEODReportId(eodReportId)
      if (!insight) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Insight not found" },
          { status: 404 }
        )
      }
      return NextResponse.json<ApiResponse<EODInsight>>({
        success: true,
        data: insight,
      })
    }

    const insights = await db.eodInsights.findRecentByOrganization(auth.organization.id, days)

    return NextResponse.json<ApiResponse<EODInsight[]>>({
      success: true,
      data: insights,
    })
  } catch (error) {
    logError(logger, "Get insights error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get EOD insights" },
      { status: 500 }
    )
  }
})

// POST /api/ai/parse-eod/batch - Parse multiple EOD reports
export const PUT = withAuth(async (request: NextRequest, auth) => {
  try {
    // Rate limit: batch parsing shares the same limit as single parse
    const rateLimitKey = `ai-parse-eod-batch:${auth.user.id}`
    const rateLimitResult = await checkApiRateLimit(
      request,
      rateLimitKey,
      MAX_PARSE_EOD_PER_HOUR,
      RATE_LIMIT_WINDOW_MS
    )

    if (!rateLimitResult.success) {
      const response = NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "You have reached the maximum number of batch EOD parses. Please try again later.",
        },
        { status: 429 }
      )
      const headers = getRateLimitHeaders(rateLimitResult, MAX_PARSE_EOD_PER_HOUR)
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value)
      }
      return response
    }

    if (!isClaudeConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "AI features are not configured" },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { date } = body

    // Default to today
    const targetDate = date || new Date().toISOString().split("T")[0]

    // OPTIMIZED: Fetch only reports for the target date instead of all reports
    const dateReports = await db.eodReports.findByOrganizationAndDate(auth.organization.id, targetDate)

    if (dateReports.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `No EOD reports found for ${targetDate}` },
        { status: 404 }
      )
    }

    // OPTIMIZED: Fetch all independent data in parallel instead of sequentially
    const reportIds = dateReports.map(r => r.id)
    const uniqueUserIds = [...new Set(dateReports.map(r => r.userId))]

    const [teamMembersData, existingInsights, allRocks] = await Promise.all([
      db.members.findWithUsersByOrganizationId(auth.organization.id),
      db.eodInsights.findByReportIds(reportIds),
      db.rocks.findByUserIds(uniqueUserIds, auth.organization.id),
    ])

    const memberMap = new Map(teamMembersData.map(m => [m.id, m]))
    const existingInsightMap = new Map(existingInsights.map(i => [i.eodReportId, i]))

    const insights: EODInsight[] = []
    const alerts: Array<{ memberId: string; memberName: string; reason: string }> = []
    const rocksByUser = new Map<string, typeof allRocks>()
    for (const rock of allRocks) {
      if (!rock.userId) continue
      const existing = rocksByUser.get(rock.userId) || []
      existing.push(rock)
      rocksByUser.set(rock.userId, existing)
    }

    for (const report of dateReports) {
      // Skip if already processed (using pre-fetched data)
      const existing = existingInsightMap.get(report.id)
      if (existing) {
        insights.push(existing)
        continue
      }

      const member = memberMap.get(report.userId)
      if (!member) continue

      // Use pre-fetched rocks for this user
      const rocks = rocksByUser.get(report.userId) || []

      // Parse with Claude
      const { result, usage: batchUsage } = await parseEODReport(report, member.name, member.department, rocks)

      // Record AI usage for each parse
      await recordUsage({
        organizationId: auth.organization.id,
        userId: auth.user.id,
        action: "parse-eod-batch",
        model: batchUsage.model,
        inputTokens: batchUsage.inputTokens,
        outputTokens: batchUsage.outputTokens,
      })

      // Create insight
      const now = new Date().toISOString()
      const insight: EODInsight = {
        id: generateId(),
        organizationId: auth.organization.id,
        eodReportId: report.id,
        ...result.insight,
        processedAt: now,
      }

      await db.eodInsights.create(insight)
      insights.push(insight)

      if (result.alertAdmin && result.alertReason) {
        alerts.push({
          memberId: report.userId,
          memberName: member.name,
          reason: result.alertReason,
        })
      }
    }

    return NextResponse.json<ApiResponse<{
      insights: EODInsight[]
      alerts: Array<{ memberId: string; memberName: string; reason: string }>
      processed: number
    }>>({
      success: true,
      data: {
        insights,
        alerts,
        processed: dateReports.length,
      },
      message: `Processed ${dateReports.length} EOD reports`,
    })
  } catch (error) {
    logError(logger, "Batch parse error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Failed to batch parse EOD reports" },
      { status: 500 }
    )
  }
})
