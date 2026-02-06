import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendDailyEODLinkEmail, isEmailConfigured } from "@/lib/integrations/email"
import type { ApiResponse, TeamMember, Organization } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// This endpoint is designed to be called by Vercel Cron
// Runs every hour to check which organizations are at 7 PM in their timezone
// The email sends the public team EOD report link to all team members
// Configure in vercel.json:
// {
//   "crons": [
//     { "path": "/api/cron/daily-eod-email", "schedule": "0 * * * *" }
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
 * Check if the current time in the given timezone is 7 PM (19:00)
 * Default target time is 7 PM PST, but uses org timezone if configured
 */
function isDailyEmailTime(org: Organization): boolean {
  // Default to 7 PM (19:00) - the daily email time
  const targetHour = 19
  const timezone = org.settings?.timezone || "America/Los_Angeles" // Default to PST

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

    // Check if we're in the 7 PM hour window (19:00 - 19:59)
    return currentHour === targetHour
  } catch (error) {
    logError(logger, `Timezone error for org ${org.id}`, error)
    // Fall back to checking if it's 7 PM UTC
    const now = new Date()
    return now.getUTCHours() === targetHour
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

    // Get all organizations
    const organizations = await db.organizations.findAll()
    const results: { orgId: string; orgName: string; timezone: string; emailsSent: number; skipped: string; errors: string[] }[] = []

    for (const org of organizations) {
      const timezone = org.settings?.timezone || "America/Los_Angeles"

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
          if (error instanceof Error && error.message.includes("unique")) {
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

            // Rate limiting: add 100ms delay between emails to avoid hitting provider limits
            if (emailsSent < activeMembers.length) {
              await new Promise(resolve => setTimeout(resolve, 100))
            }
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
        results.push({
          orgId: org.id,
          orgName: org.name,
          timezone,
          emailsSent: 0,
          skipped: "",
          errors: [error instanceof Error ? error.message : "Unknown error"],
        })
      }
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
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Failed to send daily EOD emails" },
      { status: 500 }
    )
  }
}
