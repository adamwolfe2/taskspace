import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { slackDb } from "@/lib/db/slack"
import { startConversation } from "@/lib/slack/conversation-manager"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { CONFIG } from "@/lib/config"
import { verifyCronSecret } from "@/lib/api/cron-auth"
import * as Sentry from "@sentry/nextjs"

// This endpoint is designed to be called by Vercel Cron
// Runs every hour to check which members need a Slack check-in
// Configure in vercel.json:
// {
//   "crons": [
//     { "path": "/api/cron/slack-checkin", "schedule": "0 * * * *" }
//   ]
// }

/**
 * Check if the current time in the given timezone matches the reminder hour.
 * Also checks day-of-week constraints from org settings.
 */
function isReminderTimeForMember(
  memberReminderTime: string | undefined,
  orgReminderTime: string | undefined,
  orgTimezone: string,
  orgEodEmailDays?: number[]
): boolean {
  const reminderTime = memberReminderTime || orgReminderTime || "17:00"
  const timezone = orgTimezone || CONFIG.organization.defaultTimezone

  try {
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

    // Check if we're in the reminder hour window
    const isCorrectHour = currentHour === reminderHour

    // Check day of week against org's configured sending days (default Mon-Fri)
    const allowedDays: number[] = orgEodEmailDays ?? [1, 2, 3, 4, 5]
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    })
    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    }
    const currentDay = dayMap[dayFormatter.format(now)] ?? now.getDay()
    const isAllowedDay = allowedDays.includes(currentDay)

    return isCorrectHour && isAllowedDay
  } catch (error) {
    logError(logger, `Timezone error for ${timezone}`, error)
    // Fallback: use UTC 17:00 on weekdays
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

    logger.info({ timestamp: new Date().toISOString() }, "Running Slack check-in cron")

    // Get all active Slack installations
    const installations = await slackDb.installations.findAllEnabled()

    if (!installations || installations.length === 0) {
      return NextResponse.json<ApiResponse<{ results: never[] }>>({
        success: true,
        data: { results: [] },
        message: "No active Slack installations found",
      })
    }

    const results: {
      orgId: string
      orgName: string
      conversationsStarted: number
      skipped: string
      errors: string[]
    }[] = []

    for (const installation of installations) {
      const orgId = installation.organizationId

      try {
        // Get the organization
        const org = await db.organizations.findById(orgId)
        if (!org) {
          results.push({
            orgId,
            orgName: "Unknown",
            conversationsStarted: 0,
            skipped: "Organization not found",
            errors: [],
          })
          continue
        }

        // Check if org has Slack bot integration enabled in settings
        const slackBotSettings = org.settings?.slackBotIntegration
        if (!slackBotSettings?.reminderEnabled) {
          results.push({
            orgId,
            orgName: org.name,
            conversationsStarted: 0,
            skipped: "Slack bot reminders not enabled in org settings",
            errors: [],
          })
          continue
        }

        const timezone = org.settings?.timezone || CONFIG.organization.defaultTimezone
        const today = getTodayInTimezone(timezone)
        const orgReminderTime = org.settings?.eodReminderTime
        const orgEodEmailDays = org.settings?.eodEmailDays

        // Get all active user mappings for this org
        const userMappings = await slackDb.userMappings.findEnabledByOrgId(orgId)
        if (!userMappings || userMappings.length === 0) {
          results.push({
            orgId,
            orgName: org.name,
            conversationsStarted: 0,
            skipped: "No enabled Slack user mappings",
            errors: [],
          })
          continue
        }

        // Get today's EOD reports for this org
        const todayReports = await db.eodReports.findByOrganizationAndDate(orgId, today)
        const submittedUserIds = new Set(todayReports.map((r) => r.userId))

        // Get active conversations for today
        const activeConversations = await slackDb.conversations.findActiveByOrgAndDate(orgId, today)
        const usersWithActiveConversation = new Set(
          activeConversations.map((c) => c.userId)
        )

        // Get org members for personal reminder time lookup
        const members = await db.members.findWithUsersByOrganizationId(orgId)

        // Bot token is already decrypted by the DB layer
        const botToken = installation.botToken
        if (!botToken) {
          logger.warn({ orgId }, "Slack bot token is empty, skipping org")
          continue
        }

        let conversationsStarted = 0
        const errors: string[] = []

        for (const mapping of userMappings) {
          try {
            // Find member to check personal reminder time
            const member = members.find((m) => m.id === mapping.userId)
            if (!member || member.status !== "active") continue

            // Check if it's reminder time for this member
            const memberReminderTime = member.eodReminderTime
            if (
              !isReminderTimeForMember(
                memberReminderTime,
                orgReminderTime,
                timezone,
                orgEodEmailDays
              )
            ) {
              continue
            }

            // Skip if already submitted EOD today
            if (submittedUserIds.has(mapping.userId)) continue

            // Skip if there's already an active conversation today
            if (usersWithActiveConversation.has(mapping.userId)) continue

            // Start a new conversation
            await startConversation(
              orgId,
              mapping.userId,
              mapping.slackUserId,
              botToken
            )
            conversationsStarted++
          } catch (memberError) {
            const errorMsg = `${mapping.userId}: ${memberError instanceof Error ? memberError.message : "Unknown error"}`
            logError(logger, `Failed to start Slack conversation for member ${mapping.userId}`, memberError)
            errors.push(errorMsg)
          }
        }

        logger.info(
          { orgId, orgName: org.name, conversationsStarted },
          "Slack check-in processed for org"
        )

        results.push({
          orgId,
          orgName: org.name,
          conversationsStarted,
          skipped: "",
          errors,
        })
      } catch (orgError) {
        logError(logger, `Slack check-in failed for org ${orgId}`, orgError)
        Sentry.captureMessage("Cron slack-checkin partially failed", {
          level: "warning",
          extra: { orgId, error: orgError instanceof Error ? orgError.message : "Unknown error" },
        })
        results.push({
          orgId,
          orgName: "Unknown",
          conversationsStarted: 0,
          skipped: "",
          errors: [orgError instanceof Error ? orgError.message : "Unknown error"],
        })
      }
    }

    // Expire old/stale conversations
    try {
      await slackDb.conversations.expireOld()
      logger.info("Expired stale Slack conversations")
    } catch (expireError) {
      logError(logger, "Failed to expire old Slack conversations", expireError)
    }

    // Alert if any orgs had errors
    const failedOrgs = results.filter((r) => r.errors.length > 0)
    if (failedOrgs.length > 0) {
      Sentry.captureMessage(
        `Cron slack-checkin: ${failedOrgs.length} org(s) had errors`,
        {
          level: "warning",
          extra: {
            failedOrgs: failedOrgs.map((o) => ({
              orgId: o.orgId,
              orgName: o.orgName,
              errors: o.errors,
            })),
          },
        }
      )
    }

    const totalConversations = results.reduce(
      (sum, r) => sum + r.conversationsStarted,
      0
    )
    const processedOrgs = results.filter(
      (r) => !r.skipped || r.conversationsStarted > 0
    ).length

    return NextResponse.json<ApiResponse<{ results: typeof results }>>({
      success: true,
      data: { results },
      message: `Started ${totalConversations} Slack conversations across ${processedOrgs} organizations (${installations.length} total installations)`,
    })
  } catch (error) {
    logError(logger, "Slack check-in cron error", error)
    Sentry.captureException(error, { extra: { job: "slack-checkin" } })
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to run Slack check-in" },
      { status: 500 }
    )
  }
}
