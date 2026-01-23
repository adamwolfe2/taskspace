import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { generateDailyDigest, isClaudeConfigured } from "@/lib/ai/claude-client"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse, DailyDigest, TeamMember, EODInsight } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// POST /api/ai/digest - Generate a daily digest from EOD reports
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can generate daily digests" },
        { status: 403 }
      )
    }

    if (!isClaudeConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "AI features are not configured. Please add ANTHROPIC_API_KEY to environment." },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { date } = body

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

    // Get EOD reports for the date
    const allReports = await db.eodReports.findByOrganizationId(auth.organization.id)
    const dateReports = allReports.filter(r => r.date === targetDate)

    if (dateReports.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `No EOD reports found for ${targetDate}` },
        { status: 404 }
      )
    }

    // Get team members for context
    const teamMembersData = await db.members.findWithUsersByOrganizationId(auth.organization.id)
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

    // Get rocks for context
    const rocks = await db.rocks.findByOrganizationId(auth.organization.id)

    // Get insights for the reports
    const insights: EODInsight[] = []
    for (const report of dateReports) {
      const insight = await db.eodInsights.findByEODReportId(report.id)
      if (insight) {
        insights.push(insight)
      }
    }

    // Get previous digest for trend comparison
    const previousDigest = await db.dailyDigests.getLatest(auth.organization.id)

    // Generate digest with Claude
    const digestData = await generateDailyDigest(
      dateReports,
      insights,
      teamMembers,
      rocks,
      previousDigest || undefined
    )

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
      { success: false, error: error instanceof Error ? error.message : "Failed to generate daily digest" },
      { status: 500 }
    )
  }
}

// GET /api/ai/digest - Get daily digests
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can view daily digests" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const limit = parseInt(searchParams.get("limit") || "7", 10)

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
}
