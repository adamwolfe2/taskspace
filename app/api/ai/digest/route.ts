import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAdmin } from "@/lib/api/middleware"
import { generateDailyDigest, isClaudeConfigured } from "@/lib/ai/claude-client"
import { generateId } from "@/lib/auth/password"
import { aiRateLimit } from "@/lib/api/rate-limit"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import type { ApiResponse, DailyDigest, TeamMember } from "@/lib/types"
import { validateBody } from "@/lib/validation/middleware"
import { aiDigestSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"

// POST /api/ai/digest - Generate a daily digest from EOD reports
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Rate limit: 20 digest generations per user per hour
    const rateCheck = aiRateLimit(auth.user.id, 'digest')
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
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

    const { date } = await validateBody(request, aiDigestSchema)

    // Default to today
    const targetDate = date || new Date().toISOString().split("T")[0]

    // Check if digest already exists for this date
    const existingDigest = await db.dailyDigests.findByDate(auth.organization.id, targetDate)
    if (existingDigest) {
      return NextResponse.json<ApiResponse<DailyDigest>>({
        success: true,
        data: existingDigest,
        message: "Digest already exists for this date",
      })
    }

    // OPTIMIZED: Fetch only reports for the target date instead of all reports
    const dateReports = await db.eodReports.findByOrganizationAndDate(auth.organization.id, targetDate)

    if (dateReports.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `No EOD reports found for ${targetDate}` },
        { status: 404 }
      )
    }

    // OPTIMIZED: Fetch all independent data in parallel
    const reportIds = dateReports.map(r => r.id)
    const [teamMembersData, rocks, insights, previousDigest] = await Promise.all([
      db.members.findWithUsersByOrganizationId(auth.organization.id),
      db.rocks.findByOrganizationId(auth.organization.id),
      db.eodInsights.findByReportIds(reportIds),
      db.dailyDigests.getLatest(auth.organization.id),
    ])

    const teamMembers: TeamMember[] = teamMembersData.map(m => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      department: m.department,
      avatar: m.avatar,
      joinDate: m.joinDate,
      weeklyMeasurable: m.weeklyMeasurable,
      status: m.status,
    }))

    // Generate digest with Claude
    const { result: digestData, usage } = await generateDailyDigest(
      dateReports,
      insights,
      teamMembers,
      rocks,
      previousDigest || undefined
    )

    // Record AI usage
    await recordUsage({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "digest",
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    })

    // Create digest record
    const now = new Date().toISOString()
    const digest: DailyDigest = {
      id: generateId(),
      organizationId: auth.organization.id,
      digestDate: targetDate,
      ...digestData,
      generatedAt: now,
    }

    await db.dailyDigests.create(digest)

    return NextResponse.json<ApiResponse<DailyDigest>>({
      success: true,
      data: digest,
      message: `Daily digest generated from ${dateReports.length} EOD reports`,
    })
  } catch (error) {
    logError(logger, "Generate digest error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to generate daily digest" },
      { status: 500 }
    )
  }
})

// GET /api/ai/digest - Get daily digests
export const GET = withAdmin(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const limit = Math.min(parseInt(searchParams.get("limit") || "7", 10), 30)

    if (date) {
      const digest = await db.dailyDigests.findByDate(auth.organization.id, date)
      if (!digest) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `No digest found for ${date}` },
          { status: 404 }
        )
      }
      return NextResponse.json<ApiResponse<DailyDigest>>({
        success: true,
        data: digest,
      })
    }

    const digests = await db.dailyDigests.findByOrganizationId(auth.organization.id, limit)

    return NextResponse.json<ApiResponse<DailyDigest[]>>({
      success: true,
      data: digests,
    })
  } catch (error) {
    logError(logger, "Get digests error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get daily digests" },
      { status: 500 }
    )
  }
})
