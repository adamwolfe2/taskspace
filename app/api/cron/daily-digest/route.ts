import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateDailyDigest, isClaudeConfigured } from "@/lib/ai/claude-client"
import { sendDailySummaryEmail, isEmailConfigured } from "@/lib/integrations/email"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse, DailyDigest, TeamMember, EODInsight } from "@/lib/types"

// This endpoint is designed to be called by Vercel Cron
// Configure in vercel.json:
// {
//   "crons": [
//     { "path": "/api/cron/daily-digest", "schedule": "0 18 * * 1-5" }
//   ]
// }

// Verify cron secret to prevent unauthorized calls
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.log("[Cron] CRON_SECRET not configured, allowing request")
    return true // Allow in development
  }

  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isClaudeConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "AI features not configured" },
        { status: 503 }
      )
    }

    const today = new Date().toISOString().split("T")[0]
    console.log(`[Cron] Generating daily digests for ${today}`)

    // Get all organizations
    const organizations = await db.organizations.findAll()
    const results: { orgId: string; success: boolean; error?: string }[] = []

    for (const org of organizations) {
      try {
        // Check if digest already exists
        const existingDigest = await db.dailyDigests.findByDate(org.id, today)
        if (existingDigest) {
          console.log(`[Cron] Digest already exists for org ${org.id}`)
          results.push({ orgId: org.id, success: true })
          continue
        }

        // Get today's EOD reports
        const allReports = await db.eodReports.findByOrganizationId(org.id)
        const todayReports = allReports.filter(r => r.date === today)

        if (todayReports.length === 0) {
          console.log(`[Cron] No reports for org ${org.id}`)
          results.push({ orgId: org.id, success: true })
          continue
        }

        // Get team members
        const teamMembersData = await db.members.findWithUsersByOrganizationId(org.id)
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

        // Get rocks
        const rocks = await db.rocks.findByOrganizationId(org.id)

        // Get insights for reports
        const insights: EODInsight[] = []
        for (const report of todayReports) {
          const insight = await db.eodInsights.findByEODReportId(report.id)
          if (insight) {
            insights.push(insight)
          }
        }

        // Get previous digest
        const previousDigest = await db.dailyDigests.getLatest(org.id)

        // Generate digest
        const digestData = await generateDailyDigest(
          todayReports,
          insights,
          teamMembers,
          rocks,
          previousDigest || undefined
        )

        const now = new Date().toISOString()
        const digest: DailyDigest = {
          id: generateId(),
          organizationId: org.id,
          digestDate: today,
          ...digestData,
          generatedAt: now,
        }

        await db.dailyDigests.create(digest)
        console.log(`[Cron] Digest created for org ${org.id}`)

        // Send email summary to admins
        if (isEmailConfigured()) {
          const admins = teamMembers.filter(m => m.role === "admin" || m.role === "owner")

          // Find members who haven't submitted EOD
          const submittedUserIds = new Set(todayReports.map(r => r.userId))
          const activeMembers = teamMembers.filter(m => m.status === "active")
          const missingMembers = activeMembers.filter(m => !submittedUserIds.has(m.id))

          await sendDailySummaryEmail(digest, teamMembers, admins, missingMembers)
          console.log(`[Cron] Email sent for org ${org.id}`)
        }

        results.push({ orgId: org.id, success: true })
      } catch (error) {
        console.error(`[Cron] Failed for org ${org.id}:`, error)
        results.push({
          orgId: org.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json<ApiResponse<{ results: typeof results }>>({
      success: true,
      data: { results },
      message: `Processed ${organizations.length} orgs: ${successCount} success, ${failCount} failed`,
    })
  } catch (error) {
    console.error("[Cron] Daily digest error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Failed to generate digests" },
      { status: 500 }
    )
  }
}
