import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateDailyDigest, isClaudeConfigured } from "@/lib/ai/claude-client"
import { sendDailySummaryEmail, isEmailConfigured } from "@/lib/integrations/email"
import { sendSlackMessage, buildConsolidatedDigestMessage, isSlackConfigured } from "@/lib/integrations/slack"
import { generateConsolidatedDigest, formatConsolidatedDigestHTML } from "@/lib/digest/daily-digest-generator"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse, DailyDigest, TeamMember, EODInsight, Organization } from "@/lib/types"
import { Resend } from "resend"

// This endpoint is designed to be called by Vercel Cron
// Runs every hour to check which organizations are at 6 PM in their timezone
// Configure in vercel.json:
// {
//   "crons": [
//     { "path": "/api/cron/daily-digest", "schedule": "0 * * * 1-5" }
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

/**
 * Check if it's 6 PM (18:00) in the organization's timezone
 * Digests run 1 hour after EOD reminders
 */
function isDigestTime(org: Organization): boolean {
  const timezone = org.settings?.timezone || "America/New_York"

  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
    })
    const currentHour = parseInt(formatter.format(now), 10)

    // Digest runs at 6 PM (18:00) - 1 hour after EOD reminders
    const isCorrectHour = currentHour === 18

    // Check if it's a weekday in the org's timezone
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    })
    const dayOfWeek = dayFormatter.format(now)
    const isWeekday = !["Sat", "Sun"].includes(dayOfWeek)

    return isCorrectHour && isWeekday
  } catch (error) {
    console.error(`[Cron] Timezone error for ${org.id}:`, error)
    const now = new Date()
    return now.getUTCHours() === 18 && now.getUTCDay() >= 1 && now.getUTCDay() <= 5
  }
}

/**
 * Get today's date in the organization's timezone
 */
function getTodayInTimezone(timezone: string): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    return formatter.format(now)
  } catch {
    return new Date().toISOString().split("T")[0]
  }
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

    console.log(`[Cron] Running daily digest check at ${new Date().toISOString()}`)

    // Get all organizations
    const organizations = await db.organizations.findAll()
    const results: { orgId: string; orgName: string; success: boolean; skipped?: string; error?: string }[] = []

    for (const org of organizations) {
      const timezone = org.settings?.timezone || "America/New_York"

      // Check if it's digest time for this organization
      if (!isDigestTime(org)) {
        results.push({ orgId: org.id, orgName: org.name, success: true, skipped: "Not digest time" })
        continue
      }

      console.log(`[Cron] Processing digest for org ${org.name} (timezone: ${timezone})`)
      const today = getTodayInTimezone(timezone)

      try {
        // Check if digest already exists
        const existingDigest = await db.dailyDigests.findByDate(org.id, today)
        if (existingDigest) {
          console.log(`[Cron] Digest already exists for org ${org.name}`)
          results.push({ orgId: org.id, orgName: org.name, success: true, skipped: "Already exists" })
          continue
        }

        // Get today's EOD reports
        const allReports = await db.eodReports.findByOrganizationId(org.id)
        const todayReports = allReports.filter(r => r.date === today)

        if (todayReports.length === 0) {
          console.log(`[Cron] No reports for org ${org.name}`)
          results.push({ orgId: org.id, orgName: org.name, success: true, skipped: "No reports" })
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
        console.log(`[Cron] Digest created for org ${org.name}`)

        // Find members who haven't submitted EOD
        const submittedUserIds = new Set(todayReports.map(r => r.userId))
        const activeMembers = teamMembers.filter(m => m.status === "active")
        const missingMembers = activeMembers.filter(m => !submittedUserIds.has(m.id))
        const admins = teamMembers.filter(m => m.role === "admin" || m.role === "owner")

        // Send email summary to admins
        if (isEmailConfigured()) {
          await sendDailySummaryEmail(digest, teamMembers, admins, missingMembers)
          console.log(`[Cron] Email sent for org ${org.name}`)

          // Also send Rock-organized digest email to admins
          const adminUser = admins[0]
          if (adminUser) {
            try {
              const consolidatedDigest = await generateConsolidatedDigest(
                org.id,
                adminUser.id,
                today
              )

              // Send Rock-organized HTML digest to all admins
              const resend = new Resend(process.env.RESEND_API_KEY)
              const adminEmails = admins.map(a => a.email)

              await resend.emails.send({
                from: process.env.EMAIL_FROM || "AIMS EOD <noreply@aims.app>",
                to: adminEmails,
                subject: `📊 Daily Rock Progress Summary - ${consolidatedDigest.formattedDate}`,
                html: formatConsolidatedDigestHTML(consolidatedDigest),
              })
              console.log(`[Cron] Rock-organized digest email sent for org ${org.name}`)
            } catch (digestError) {
              console.error(`[Cron] Rock digest email failed for org ${org.name}:`, digestError)
            }
          }
        }

        // Send Slack notification if configured
        const slackWebhookUrl = org.settings?.slackWebhookUrl
        if (isSlackConfigured(slackWebhookUrl) && org.settings?.enableSlackIntegration) {
          try {
            const adminUser = admins[0]
            const consolidatedDigest = await generateConsolidatedDigest(
              org.id,
              adminUser?.id || "",
              today
            )

            // Convert digest to Slack format
            const slackAdminDigest = consolidatedDigest.adminDigest ? {
              memberName: consolidatedDigest.adminDigest.member.name,
              rocks: consolidatedDigest.adminDigest.rocks.map(r => ({
                title: r.rock.title,
                progress: r.progress,
                taskCount: r.tasks.length,
              })),
              blockerCount: consolidatedDigest.adminDigest.blockers.length,
              hasReport: consolidatedDigest.adminDigest.hasReport,
            } : null

            const slackTeamDigests = consolidatedDigest.teamDigests.map(d => ({
              memberName: d.member.name,
              department: d.member.department,
              rocks: d.rocks.map(r => ({
                title: r.rock.title,
                progress: r.progress,
                taskCount: r.tasks.length,
              })),
              blockerCount: d.blockers.length,
              hasReport: d.hasReport,
            }))

            const slackMessage = buildConsolidatedDigestMessage(
              consolidatedDigest.date,
              consolidatedDigest.formattedDate,
              consolidatedDigest.totalReports,
              consolidatedDigest.totalMembers,
              slackAdminDigest,
              slackTeamDigests,
              consolidatedDigest.missingMembers.map(m => m.name)
            )

            await sendSlackMessage(slackWebhookUrl!, slackMessage)
            console.log(`[Cron] Slack digest sent for org ${org.name}`)
          } catch (slackError) {
            console.error(`[Cron] Slack digest failed for org ${org.name}:`, slackError)
          }
        }

        results.push({ orgId: org.id, orgName: org.name, success: true })
      } catch (error) {
        console.error(`[Cron] Failed for org ${org.name}:`, error)
        results.push({
          orgId: org.id,
          orgName: org.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    const processedCount = results.filter(r => !r.skipped || r.skipped === "Already exists").length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json<ApiResponse<{ results: typeof results }>>({
      success: true,
      data: { results },
      message: `Processed ${processedCount} orgs (${failCount} failed) out of ${organizations.length} total`,
    })
  } catch (error) {
    console.error("[Cron] Daily digest error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Failed to generate digests" },
      { status: 500 }
    )
  }
}
