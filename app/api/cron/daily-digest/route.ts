import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateDailyDigest, isClaudeConfigured } from "@/lib/ai/claude-client"
import { sendDailySummaryEmail, isEmailConfigured } from "@/lib/integrations/email"
import { sendSlackMessage, buildConsolidatedDigestMessage, isSlackConfigured } from "@/lib/integrations/slack"
import { generateConsolidatedDigest, formatConsolidatedDigestHTML } from "@/lib/digest/daily-digest-generator"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse, DailyDigest, TeamMember, EODInsight, Organization } from "@/lib/types"
import { Resend } from "resend"
import { logger, logError } from "@/lib/logger"

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
  const isProduction = process.env.NODE_ENV === "production"

  if (!cronSecret) {
    if (isProduction) {
      logger.error("CRON_SECRET not configured in production - denying request")
      return false
    }
    logger.info("CRON_SECRET not configured, allowing request in development")
    return true
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
    logError(logger, `Timezone error for org ${org.id}`, error)
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

    logger.info({ timestamp: new Date().toISOString() }, "Running daily digest check")

    // Clean up expired and inactive sessions
    try {
      const cleanup = await db.sessions.cleanupExpiredSessions()
      logger.info({ expired: cleanup.expired, inactive: cleanup.inactive }, "Session cleanup completed")
    } catch (cleanupError) {
      logError(logger, "Session cleanup failed", cleanupError)
    }

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

      logger.info({ orgName: org.name, timezone }, "Processing digest for org")
      const today = getTodayInTimezone(timezone)
      const currentHour = new Date().getUTCHours()

      // IDEMPOTENCY CHECK: Track execution to prevent duplicates on retry
      try {
        await db.cronExecutions.recordExecution("daily-digest", org.id, today, currentHour)
      } catch (error) {
        // If we get a unique constraint violation, it means this job already ran for this org/hour
        if (error instanceof Error && error.message.includes("unique")) {
          logger.info({ orgName: org.name, today, hour: currentHour }, "Digest already processed this hour (duplicate run)")
          results.push({ orgId: org.id, orgName: org.name, success: true, skipped: "Already processed this hour" })
          continue
        }
        // For other errors, log and continue to try processing
        logError(logger, `Failed to record cron execution for org ${org.name}`, error)
      }

      try {
        // Check if digest already exists
        const existingDigest = await db.dailyDigests.findByDate(org.id, today)
        if (existingDigest) {
          logger.info({ orgName: org.name }, "Digest already exists for org")
          results.push({ orgId: org.id, orgName: org.name, success: true, skipped: "Already exists" })
          continue
        }

        // OPTIMIZED: Fetch only today's reports instead of all reports
        const todayReports = await db.eodReports.findByOrganizationAndDate(org.id, today)

        if (todayReports.length === 0) {
          logger.info({ orgName: org.name }, "No reports for org")
          results.push({ orgId: org.id, orgName: org.name, success: true, skipped: "No reports" })
          continue
        }

        // OPTIMIZED: Fetch all independent data in parallel
        const reportIds = todayReports.map(r => r.id)
        const [teamMembersData, rocks, insights, previousDigest] = await Promise.all([
          db.members.findWithUsersByOrganizationId(org.id),
          db.rocks.findByOrganizationId(org.id),
          db.eodInsights.findByReportIds(reportIds),
          db.dailyDigests.getLatest(org.id),
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

        // Generate digest
        const { result: digestData, usage: digestUsage } = await generateDailyDigest(
          todayReports,
          insights,
          teamMembers,
          rocks,
          previousDigest || undefined
        )

        // Record AI usage for cron-generated digest (attribute to org, no specific user)
        try {
          const { recordUsage } = await import("@/lib/ai/credits")
          await recordUsage({
            organizationId: org.id,
            userId: "system-cron",
            action: "cron-daily-digest",
            model: digestUsage.model,
            inputTokens: digestUsage.inputTokens,
            outputTokens: digestUsage.outputTokens,
          })
        } catch (usageErr) {
          logError(logger, "Failed to record cron digest AI usage", usageErr)
        }

        const now = new Date().toISOString()
        const digest: DailyDigest = {
          id: generateId(),
          organizationId: org.id,
          digestDate: today,
          ...digestData,
          generatedAt: now,
        }

        await db.dailyDigests.create(digest)
        logger.info({ orgName: org.name }, "Digest created for org")

        // Find members who haven't submitted EOD
        const submittedUserIds = new Set(todayReports.map(r => r.userId))
        const activeMembers = teamMembers.filter(m => m.status === "active")
        const missingMembers = activeMembers.filter(m => !submittedUserIds.has(m.id))
        const admins = teamMembers.filter(m => m.role === "admin" || m.role === "owner")

        // Send email summary to admins
        if (isEmailConfigured()) {
          await sendDailySummaryEmail(digest, teamMembers, admins, missingMembers)
          logger.info({ orgName: org.name }, "Email sent for org")

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
              const adminEmails = admins
                .filter(a => a.notificationPreferences?.digest?.email !== false)
                .map(a => a.email)

              await resend.emails.send({
                from: process.env.EMAIL_FROM || "Taskspace <team@collectivecapital.com>",
                to: adminEmails,
                subject: `📊 Daily Rock Progress Summary - ${consolidatedDigest.formattedDate}`,
                html: formatConsolidatedDigestHTML(consolidatedDigest),
              })
              logger.info({ orgName: org.name }, "Rock-organized digest email sent for org")
            } catch (digestError) {
              logError(logger, `Rock digest email failed for org ${org.name}`, digestError)
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
            logger.info({ orgName: org.name }, "Slack digest sent for org")
          } catch (slackError) {
            logError(logger, `Slack digest failed for org ${org.name}`, slackError)
          }
        }

        results.push({ orgId: org.id, orgName: org.name, success: true })
      } catch (error) {
        logError(logger, `Failed for org ${org.name}`, error)
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
    logError(logger, "Daily digest error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Failed to generate digests" },
      { status: 500 }
    )
  }
}
