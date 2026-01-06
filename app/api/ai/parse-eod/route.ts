import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/middleware"
import { parseEODReport, isClaudeConfigured } from "@/lib/ai/claude-client"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse, EODInsight } from "@/lib/types"

// POST /api/ai/parse-eod - Parse an EOD report and extract insights
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isClaudeConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "AI features are not configured. Please add ANTHROPIC_API_KEY to environment." },
        { status: 503 }
      )
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
    const result = await parseEODReport(eodReport, member.name, member.department, rocks)

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
    console.error("Parse EOD error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Failed to parse EOD report" },
      { status: 500 }
    )
  }
}

// GET /api/ai/parse-eod - Get EOD insights
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

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
    console.error("Get insights error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get EOD insights" },
      { status: 500 }
    )
  }
}

// POST /api/ai/parse-eod/batch - Parse multiple EOD reports
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
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

    // Get all EOD reports for the date
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
    const memberMap = new Map(teamMembersData.map(m => [m.id, m]))

    const insights: EODInsight[] = []
    const alerts: Array<{ memberId: string; memberName: string; reason: string }> = []

    for (const report of dateReports) {
      // Skip if already processed
      const existing = await db.eodInsights.findByEODReportId(report.id)
      if (existing) {
        insights.push(existing)
        continue
      }

      const member = memberMap.get(report.userId)
      if (!member) continue

      // Get user's rocks
      const rocks = await db.rocks.findByUserId(report.userId, auth.organization.id)

      // Parse with Claude
      const result = await parseEODReport(report, member.name, member.department, rocks)

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
    console.error("Batch parse error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Failed to batch parse EOD reports" },
      { status: 500 }
    )
  }
}
