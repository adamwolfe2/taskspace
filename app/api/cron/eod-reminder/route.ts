import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendMissingEODReminder, isEmailConfigured } from "@/lib/integrations/email"
import { sendSlackMessage, buildEODReminderMessage, isSlackConfigured } from "@/lib/integrations/slack"
import type { ApiResponse, TeamMember, Organization } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { CONFIG } from "@/lib/config"
import * as Sentry from "@sentry/nextjs"

// This endpoint is designed to be called by Vercel Cron
// Runs every hour to check which organizations are at 5 PM in their timezone
// Configure in vercel.json:
// {
//   "crons": [
//     { "path": "/api/cron/eod-reminder", "schedule": "0 * * * 1-5" }
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
 * Check if the current time in the given timezone is 5 PM (17:00)
 * Uses the organization's eodReminderTime setting if available
 */
function isReminderTime(org: Organization): boolean {
  const timezone = org.settings?.timezone || CONFIG.organization.defaultTimezone
  const reminderTime = org.settings?.eodReminderTime || "17:00"

  try {
    // Get current time in the organization's timezone
    const now = new Date()
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    const timeStr = formatter.format(now)
    const [currentHour] = timeStr.split(":").map(Number)

    // Parse the reminder time
    const [reminderHour] = reminderTime.split(":").map(Number)

    // Check if we're in the reminder hour window (e.g., 17:00 - 17:59)
    const isCorrectHour = currentHour === reminderHour

    // Also check if it's a weekday in the org's timezone
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    })
    const dayOfWeek = dayFormatter.format(now)
    const isWeekday = !["Sat", "Sun"].includes(dayOfWeek)

    return isCorrectHour && isWeekday
  } catch (error) {
    logError(logger, `Timezone error for org ${org.id}`, error)
    // Fall back to checking if it's 5 PM UTC on a weekday
    const now = new Date()
    return now.getUTCHours() === 17 && now.getUTCDay() >= 1 && now.getUTCDay() <= 5
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
    return formatter.format(now) // Returns YYYY-MM-DD format
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

    if (!isEmailConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Email not configured" },
        { status: 503 }
      )
    }

    logger.info({ timestamp: new Date().toISOString() }, "Running EOD reminder check")

    // Fast-exit if no US/common timezone could be at 5 PM right now.
    // US timezones span UTC-4 (EDT) to UTC-10 (HST): 5 PM window is 21:00–03:00 UTC.
    const utcHour = new Date().getUTCHours()
    const inWindow = utcHour >= 21 || utcHour <= 3
    if (!inWindow) {
      return NextResponse.json<ApiResponse<{ results: [] }>>({
        success: true,
        data: { results: [] },
        message: "No organizations in 5 PM window at this UTC hour — skipped",
      })
    }

    // Get all organizations
    const organizations = await db.organizations.findAll()
    const results: { orgId: string; orgName: string; timezone: string; reminders: number; skipped: string; errors: string[] }[] = []

    for (const org of organizations) {
      const timezone = org.settings?.timezone || CONFIG.organization.defaultTimezone

      // Check if it's reminder time for this organization
      if (!isReminderTime(org)) {
        results.push({
          orgId: org.id,
          orgName: org.name,
          timezone,
          reminders: 0,
          skipped: "Not reminder time",
          errors: [],
        })
        continue
      }

      logger.info({ orgName: org.name, timezone }, "Processing org")

      try {
        const today = getTodayInTimezone(timezone)
        const currentHour = new Date().getUTCHours()

        // IDEMPOTENCY CHECK: Track execution to prevent duplicate reminders
        try {
          await db.cronExecutions.recordExecution("eod-reminder", org.id, today, currentHour)
        } catch (error) {
          // If we get a unique constraint violation, it means reminders already sent this hour
          if ((error as { code?: string }).code === "23505") {
            logger.info({ orgName: org.name, today, hour: currentHour }, "Reminders already sent this hour (duplicate run)")
            results.push({
              orgId: org.id,
              orgName: org.name,
              timezone,
              reminders: 0,
              skipped: "Already sent this hour",
              errors: [],
            })
            continue
          }
          // For other errors, log and continue to try processing
          logError(logger, `Failed to record cron execution for org ${org.name}`, error)
        }

        // OPTIMIZED: Fetch members and today's reports in parallel
        const [teamMembersData, todayReports] = await Promise.all([
          db.members.findWithUsersByOrganizationId(org.id),
          db.eodReports.findByOrganizationAndDate(org.id, today),
        ])
        const activeMembers = teamMembersData.filter(m => m.status === "active")

        if (activeMembers.length === 0) {
          results.push({
            orgId: org.id,
            orgName: org.name,
            timezone,
            reminders: 0,
            skipped: "No active members",
            errors: [],
          })
          continue
        }
        const submittedUserIds = new Set(todayReports.map(r => r.userId))

        // Find members who haven't submitted
        const missingMembers = activeMembers.filter(m => !submittedUserIds.has(m.id))

        if (missingMembers.length === 0) {
          logger.info({ orgName: org.name }, "All members submitted for org")
          results.push({
            orgId: org.id,
            orgName: org.name,
            timezone,
            reminders: 0,
            skipped: "All submitted",
            errors: [],
          })
          continue
        }

        // Get admins to CC
        const admins = teamMembersData.filter(m => m.role === "admin" || m.role === "owner")
        const adminMembers: TeamMember[] = admins.map(a => ({
          id: a.id,
          name: a.name,
          email: a.email,
          role: a.role,
          department: a.department,
          joinDate: a.joinDate,
        }))

        // Send reminder to each missing member
        const errors: string[] = []
        let remindersSent = 0

        // Get list of members who already received reminder today (for deduplication)
        const alreadySentToday = await db.emailDeliveryLog.getDeliveredToday("eod-reminder", org.id, today)
        const alreadySentMemberIds = new Set(alreadySentToday.map(log => log.memberId))

        for (const member of missingMembers) {
          // Skip if already sent reminder to this member today
          if (alreadySentMemberIds.has(member.id)) {
            logger.info({ memberName: member.name, orgName: org.name }, "Skipping member - reminder already sent today")
            continue
          }

          // Respect notification preferences — skip if email disabled for eod_reminder
          if (member.notificationPreferences?.eod_reminder?.email === false) {
            logger.info({ memberName: member.name, orgName: org.name }, "Skipping member - email notifications disabled")
            continue
          }

          const memberInfo: TeamMember = {
            id: member.id,
            name: member.name,
            email: member.email,
            role: member.role,
            department: member.department,
            joinDate: member.joinDate,
          }

          const result = await sendMissingEODReminder(memberInfo, org.name, adminMembers)
          if (result.success) {
            remindersSent++
            // Track email delivery to prevent duplicates
            await db.emailDeliveryLog.recordDelivery("eod-reminder", org.id, member.id, member.email, today)
          } else {
            errors.push(`${member.name}: ${result.error}`)
          }
        }

        logger.info({ remindersSent, orgName: org.name }, "Sent email reminders for org")

        // Also send Slack reminder if configured
        const slackWebhookUrl = org.settings?.slackWebhookUrl
        if (isSlackConfigured(slackWebhookUrl) && org.settings?.enableSlackIntegration && missingMembers.length > 0) {
          try {
            const slackMessage = buildEODReminderMessage(
              missingMembers.map(m => m.name),
              org.name
            )
            await sendSlackMessage(slackWebhookUrl!, slackMessage)
            logger.info({ orgName: org.name }, "Slack reminder sent for org")
          } catch (slackError) {
            logError(logger, `Slack reminder failed for org ${org.name}`, slackError)
            errors.push(`Slack: ${slackError instanceof Error ? slackError.message : "Unknown error"}`)
          }
        }

        results.push({
          orgId: org.id,
          orgName: org.name,
          timezone,
          reminders: remindersSent,
          skipped: "",
          errors,
        })
      } catch (error) {
        logError(logger, `Failed for org ${org.id}`, error)
        Sentry.captureMessage("Cron eod-reminder partially failed", {
          level: "warning",
          extra: { orgId: org.id, orgName: org.name, error: "Unknown error" },
        })
        results.push({
          orgId: org.id,
          orgName: org.name,
          timezone,
          reminders: 0,
          skipped: "",
          errors: ["Unknown error"],
        })
      }
    }

    // Alert if any orgs failed
    const failedOrgs = results.filter(r => r.errors.length > 0)
    if (failedOrgs.length > 0) {
      Sentry.captureMessage(`Cron eod-reminder: ${failedOrgs.length} org(s) had errors`, {
        level: "warning",
        extra: { failedOrgs: failedOrgs.map(o => ({ orgId: o.orgId, orgName: o.orgName, errors: o.errors })) },
      })
    }

    const totalReminders = results.reduce((sum, r) => sum + r.reminders, 0)
    const processedOrgs = results.filter(r => !r.skipped || r.skipped === "All submitted").length

    return NextResponse.json<ApiResponse<{ results: typeof results }>>({
      success: true,
      data: { results },
      message: `Sent ${totalReminders} EOD reminders across ${processedOrgs} organizations (${organizations.length} total)`,
    })
  } catch (error) {
    logError(logger, "EOD reminder error", error)
    Sentry.captureException(error, { extra: { job: "eod-reminder" } })
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to send reminders" },
      { status: 500 }
    )
  }
}
