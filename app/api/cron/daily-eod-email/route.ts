import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendDailyEODLinkEmail, isEmailConfigured } from "@/lib/integrations/email"
import type { ApiResponse, TeamMember, Organization } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { verifyCronSecret } from "@/lib/api/cron-auth"
import * as Sentry from "@sentry/nextjs"

// This endpoint is designed to be called by Vercel Cron
// Runs every hour to check which organizations are at 7 PM in their timezone
// The email sends the public team EOD report link to all team members
// Configure in vercel.json:
// {
//   "crons": [
//     { "path": "/api/cron/daily-eod-email", "schedule": "0 * * * *" }
//   ]
// }

// Default sending days: Mon–Fri (1–5). Used when org has not configured eodEmailDays.
const DEFAULT_EMAIL_DAYS = [1, 2, 3, 4, 5]

/**
 * Get ISO week number for a date
 */
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * Check if org's frequency setting allows sending today.
 * - daily: always (day-of-week filter handled separately)
 * - weekly: only on the first allowed weekday
 * - bi-weekly: only on first allowed weekday of odd ISO weeks
 * - monthly: only on the first occurrence of the first allowed weekday in the month (day ≤ 7)
 */
function isFrequencyAllowed(org: Organization, timezone: string): boolean {
  const frequency = org.settings?.eodFrequency || "daily"
  if (frequency === "daily") return true

  const now = new Date()
  const allowedDays: number[] = org.settings?.eodEmailDays ?? DEFAULT_EMAIL_DAYS
  const dayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" })
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const currentDay = dayMap[dayFormatter.format(now)] ?? now.getDay()
  const firstAllowedDay = Math.min(...allowedDays)

  if (frequency === "weekly") {
    return currentDay === firstAllowedDay
  }

  if (frequency === "bi-weekly") {
    if (currentDay !== firstAllowedDay) return false
    return getISOWeekNumber(now) % 2 === 1
  }

  if (frequency === "monthly") {
    if (currentDay !== firstAllowedDay) return false
    const dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(now)
    const dayOfMonth = parseInt(dateStr.split("-")[2])
    return dayOfMonth <= 7
  }

  return true
}

/**
 * Check if the current time in the given timezone is 7 PM (19:00) AND
 * today is one of the org's configured sending days (default: Mon–Fri).
 */
function isDailyEmailTime(org: Organization): boolean {
  const targetHour = 19
  const timezone = org.settings?.timezone || "America/Los_Angeles"
  const allowedDays: number[] = org.settings?.eodEmailDays ?? DEFAULT_EMAIL_DAYS

  try {
    const now = new Date()

    // Check hour
    const hourFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
    })
    const [currentHour] = hourFormatter.format(now).split(":").map(Number)

    // Check day of week (0=Sun … 6=Sat) in org's timezone
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    })
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    const currentDay = dayMap[dayFormatter.format(now)] ?? now.getDay()

    if (currentHour !== targetHour || !allowedDays.includes(currentDay)) return false

    return isFrequencyAllowed(org, timezone)
  } catch (error) {
    logError(logger, `Timezone error for org ${org.id}`, error)
    const now = new Date()
    return now.getUTCHours() === targetHour && DEFAULT_EMAIL_DAYS.includes(now.getUTCDay())
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

    logger.info({ timestamp: new Date().toISOString() }, "Running daily EOD email check")

    // Fast-exit if no US/common timezone could be at 7 PM right now.
    // US timezones span UTC-4 (EDT) to UTC-10 (HST): 7 PM window is 23:00–05:00 UTC.
    const utcHour = new Date().getUTCHours()
    const inWindow = utcHour >= 23 || utcHour <= 5
    if (!inWindow) {
      return NextResponse.json<ApiResponse<{ results: [] }>>({
        success: true,
        data: { results: [] },
        message: "No organizations in 7 PM window at this UTC hour — skipped",
      })
    }

    // Get all organizations
    const organizations = await db.organizations.findAll()
    const results: { orgId: string; orgName: string; timezone: string; emailsSent: number; skipped: string; errors: string[] }[] = []

    for (const org of organizations) {
      const timezone = org.settings?.timezone || "America/Los_Angeles"

      // Skip internal orgs (e.g. AIMS) — they don't need automated emails
      if (org.isInternal) {
        results.push({
          orgId: org.id,
          orgName: org.name,
          timezone,
          emailsSent: 0,
          skipped: "Internal org",
          errors: [],
        })
        continue
      }

      // Check if it's 7 PM for this organization
      if (!isDailyEmailTime(org)) {
        results.push({
          orgId: org.id,
          orgName: org.name,
          timezone,
          emailsSent: 0,
          skipped: "Not 7 PM yet",
          errors: [],
        })
        continue
      }

      logger.info({ orgName: org.name, timezone }, "Processing daily EOD email for org")

      try {
        const today = getTodayInTimezone(timezone)
        const currentHour = new Date().getUTCHours()

        // IDEMPOTENCY CHECK: Track execution to prevent duplicate emails
        try {
          await db.cronExecutions.recordExecution("daily-eod-email", org.id, today, currentHour)
        } catch (error) {
          // If we get a unique constraint violation, it means emails already sent this hour
          if ((error as { code?: string }).code === "23505") {
            logger.info({ orgName: org.name, today, hour: currentHour }, "Emails already sent this hour (duplicate run)")
            results.push({
              orgId: org.id,
              orgName: org.name,
              timezone,
              emailsSent: 0,
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
            emailsSent: 0,
            skipped: "No active members",
            errors: [],
          })
          continue
        }
        const submittedUserIds = new Set(todayReports.map(r => r.userId))

        // Send email to each active member
        const errors: string[] = []
        let emailsSent = 0

        // Get list of members who already received email today (for deduplication)
        const alreadySentToday = await db.emailDeliveryLog.getDeliveredToday("daily-eod-email", org.id, today)
        const alreadySentMemberIds = new Set(alreadySentToday.map(log => log.memberId))

        for (const member of activeMembers) {
          // Skip if already sent email to this member today
          if (alreadySentMemberIds.has(member.id)) {
            logger.info({ memberName: member.name, orgName: org.name }, "Skipping member - email already sent today")
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

          const hasSubmittedToday = submittedUserIds.has(member.id)

          const result = await sendDailyEODLinkEmail(
            memberInfo,
            org.name,
            org.slug,
            today,
            hasSubmittedToday
          )

          if (result.success) {
            emailsSent++
            // Track email delivery to prevent duplicates
            await db.emailDeliveryLog.recordDelivery("daily-eod-email", org.id, member.id, member.email, today)
          } else {
            errors.push(`${member.name}: ${result.error}`)
          }
        }

        logger.info({ emailsSent, orgName: org.name }, "Sent daily EOD emails for org")

        results.push({
          orgId: org.id,
          orgName: org.name,
          timezone,
          emailsSent,
          skipped: "",
          errors,
        })
      } catch (error) {
        logError(logger, `Failed for org ${org.id}`, error)
        Sentry.captureMessage("Cron daily-eod-email partially failed", {
          level: "warning",
          extra: { orgId: org.id, orgName: org.name, error: "Unknown error" },
        })
        results.push({
          orgId: org.id,
          orgName: org.name,
          timezone,
          emailsSent: 0,
          skipped: "",
          errors: ["Unknown error"],
        })
      }
    }

    // Alert if any orgs failed
    const failedOrgs = results.filter(r => r.errors.length > 0)
    if (failedOrgs.length > 0) {
      Sentry.captureMessage(`Cron daily-eod-email: ${failedOrgs.length} org(s) had errors`, {
        level: "warning",
        extra: { failedOrgs: failedOrgs.map(o => ({ orgId: o.orgId, orgName: o.orgName, errors: o.errors })) },
      })
    }

    const totalEmails = results.reduce((sum, r) => sum + r.emailsSent, 0)
    const processedOrgs = results.filter(r => !r.skipped).length

    return NextResponse.json<ApiResponse<{ results: typeof results }>>({
      success: true,
      data: { results },
      message: `Sent ${totalEmails} daily EOD emails across ${processedOrgs} organizations (${organizations.length} total)`,
    })
  } catch (error) {
    logError(logger, "Daily EOD email error", error)
    Sentry.captureException(error, { extra: { job: "daily-eod-email" } })
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to send daily EOD emails" },
      { status: 500 }
    )
  }
}
