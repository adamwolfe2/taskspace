import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendWeeklyDigestEmail, isEmailConfigured } from "@/lib/integrations/email"
import type { ApiResponse, Organization } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { verifyCronSecret } from "@/lib/api/cron-auth"
import { DEFAULT_TIMEZONE } from "@/lib/utils/date-utils"
import * as Sentry from "@sentry/nextjs"

// This endpoint is designed to be called by Vercel Cron
// Runs Monday mornings (UTC 13-17) to cover US timezones at 9 AM
// Sends a weekly manager digest email to org admins/owners
// Configure in vercel.json:
// {
//   "crons": [
//     { "path": "/api/cron/weekly-digest", "schedule": "0 13-17 * * 1" }
//   ]
// }

/**
 * Check if it's 9 AM on Monday in the organization's timezone
 */
function isWeeklyDigestTime(org: Organization): boolean {
  const timezone = org.settings?.timezone || DEFAULT_TIMEZONE

  try {
    const now = new Date()
    const hourFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
    })
    const currentHour = parseInt(hourFormatter.format(now), 10)

    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    })
    const dayOfWeek = dayFormatter.format(now)

    return currentHour === 9 && dayOfWeek === "Mon"
  } catch (error) {
    logError(logger, `Timezone error for org ${org.id}`, error)
    const now = new Date()
    return now.getUTCHours() === 14 && now.getUTCDay() === 1
  }
}

/**
 * Get the Monday date string (YYYY-MM-DD) for the START of the previous work week
 * in the organization's timezone.
 */
function getPreviousWeekStart(timezone: string): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    const todayStr = formatter.format(now)
    const today = new Date(todayStr + "T12:00:00Z")

    // Go back to previous Monday (7 days before this Monday)
    const dayOfWeek = today.getUTCDay()
    const daysToLastMonday = dayOfWeek === 0 ? 13 : dayOfWeek + 6
    const lastMonday = new Date(today)
    lastMonday.setUTCDate(today.getUTCDate() - daysToLastMonday)

    const year = lastMonday.getUTCFullYear()
    const month = String(lastMonday.getUTCMonth() + 1).padStart(2, "0")
    const day = String(lastMonday.getUTCDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  } catch {
    const now = new Date()
    const lastMonday = new Date(now)
    lastMonday.setDate(now.getDate() - (now.getDay() === 0 ? 13 : now.getDay() + 6))
    return lastMonday.toISOString().split("T")[0]
  }
}

/**
 * Get the Friday date string (YYYY-MM-DD) for the END of the previous work week.
 */
function getPreviousWeekEnd(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00Z")
  const friday = new Date(start)
  friday.setUTCDate(start.getUTCDate() + 4)
  const year = friday.getUTCFullYear()
  const month = String(friday.getUTCMonth() + 1).padStart(2, "0")
  const day = String(friday.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Format a week label like "Mar 17 - Mar 21"
 */
function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart + "T12:00:00Z")
  const end = new Date(weekEnd + "T12:00:00Z")
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
  return `${fmt(start)} - ${fmt(end)}`
}

/**
 * Get all dates (YYYY-MM-DD) between weekStart and weekEnd inclusive
 */
function getWeekDates(weekStart: string, weekEnd: string): string[] {
  const dates: string[] = []
  const current = new Date(weekStart + "T12:00:00Z")
  const end = new Date(weekEnd + "T12:00:00Z")

  while (current <= end) {
    const year = current.getUTCFullYear()
    const month = String(current.getUTCMonth() + 1).padStart(2, "0")
    const day = String(current.getUTCDate()).padStart(2, "0")
    dates.push(`${year}-${month}-${day}`)
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return dates
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

    logger.info({ timestamp: new Date().toISOString() }, "Running weekly digest check")

    // Fast-exit if no US/common timezone could be at 9 AM on Monday right now.
    // US timezones span UTC-4 (EDT) to UTC-10 (HST): 9 AM window is 13:00–19:00 UTC.
    const utcHour = new Date().getUTCHours()
    const inWindow = utcHour >= 13 && utcHour <= 19
    if (!inWindow) {
      return NextResponse.json<ApiResponse<{ results: [] }>>({
        success: true,
        data: { results: [] },
        message: "No organizations in 9 AM Monday window at this UTC hour — skipped",
      })
    }

    const organizations = await db.organizations.findAll()
    const results: { orgId: string; orgName: string; success: boolean; skipped?: string; error?: string }[] = []

    for (const org of organizations) {
      const timezone = org.settings?.timezone || DEFAULT_TIMEZONE

      // Skip internal orgs (e.g. AIMS) — they don't need automated emails
      if (org.isInternal) {
        results.push({ orgId: org.id, orgName: org.name, success: true, skipped: "Internal org" })
        continue
      }

      // Check if it's 9 AM Monday for this organization
      if (!isWeeklyDigestTime(org)) {
        results.push({ orgId: org.id, orgName: org.name, success: true, skipped: "Not digest time" })
        continue
      }

      logger.info({ orgName: org.name, timezone }, "Processing weekly digest for org")

      const weekStart = getPreviousWeekStart(timezone)
      const weekEnd = getPreviousWeekEnd(weekStart)
      const currentHour = new Date().getUTCHours()

      // IDEMPOTENCY CHECK: Atomic insert prevents duplicate runs even with concurrent invocations
      try {
        const isNew = await db.cronExecutions.recordExecution("weekly-digest", org.id, weekStart, currentHour)
        if (!isNew) {
          logger.info({ orgName: org.name, weekStart, hour: currentHour }, "Weekly digest already processed this hour (duplicate run)")
          results.push({ orgId: org.id, orgName: org.name, success: true, skipped: "Already processed this hour" })
          continue
        }
      } catch (error) {
        logError(logger, `Failed to record cron execution for org ${org.name}`, error)
      }

      try {
        await Sentry.withScope(async (scope) => {
          scope.setTag("org.id", org.id)
          scope.setTag("org.name", org.name)
          scope.setTag("job", "weekly-digest")

          // Fetch members and rocks in parallel
          const [teamMembersData, rocks] = await Promise.all([
            db.members.findWithUsersByOrganizationId(org.id),
            db.rocks.findByOrganizationId(org.id),
          ])

          const activeMembers = teamMembersData.filter(m => m.status === "active")
          if (activeMembers.length === 0) {
            results.push({ orgId: org.id, orgName: org.name, success: true, skipped: "No active members" })
            return
          }

          // Fetch all EOD reports for the previous week (Mon-Fri)
          const weekDates = getWeekDates(weekStart, weekEnd)
          const weekReports = await Promise.all(
            weekDates.map(date => db.eodReports.findByOrganizationAndDate(org.id, date))
          )
          const allWeekReports = weekReports.flat()

          // Fetch assigned tasks completed during the week
          const allTasks = await db.assignedTasks.findByOrganizationId(org.id)
          const tasksCompletedThisWeek = allTasks.filter(t => {
            if (t.status !== "completed" || !t.completedAt) return false
            const completedDate = t.completedAt.split("T")[0]
            return completedDate >= weekStart && completedDate <= weekEnd
          })

          // Count rocks that had status changes during the week (updated this week)
          const rocksUpdatedThisWeek = rocks.filter(r => {
            const updatedDate = r.updatedAt.split("T")[0]
            return updatedDate >= weekStart && updatedDate <= weekEnd
          })

          // Calculate EOD submission rate
          // Expected = active members * number of weekdays
          const expectedReports = activeMembers.length * weekDates.length
          const actualReports = allWeekReports.length
          const eodSubmissionRate = expectedReports > 0
            ? Math.round((actualReports / expectedReports) * 100)
            : 0

          // Track active members (submitted at least 1 EOD)
          const reportingUserIds = new Set(allWeekReports.map(r => r.userId))
          const activeMemberCount = activeMembers.filter(m =>
            m.userId && reportingUserIds.has(m.userId)
          ).length

          // Calculate top 3 performers by weighted score (tasks + rocks)
          const memberScores = activeMembers.map(member => {
            const memberTasks = tasksCompletedThisWeek.filter(t =>
              t.assigneeId === member.userId || t.assigneeId === member.id
            )
            const memberEods = allWeekReports.filter(r => r.userId === member.userId)
            // Weighted score: tasks completed * 1 + EOD reports * 2
            const score = memberTasks.length + (memberEods.length * 2)
            return {
              name: member.name,
              tasksCompleted: memberTasks.length,
              eodCount: memberEods.length,
              score,
            }
          })

          const topPerformers = [...memberScores]
            .sort((a, b) => b.score - a.score)
            .filter(m => m.score > 0)
            .slice(0, 3)

          // Find at-risk or blocked rocks
          const atRiskRocks = rocks
            .filter(r => r.status === "at-risk" || r.status === "blocked")
            .map(r => {
              const owner = activeMembers.find(m => m.userId === r.userId)
              return {
                title: r.title,
                ownerName: owner?.name || "Unassigned",
                status: r.status,
              }
            })

          // Build stats
          const stats = {
            tasksCompleted: tasksCompletedThisWeek.length,
            rocksUpdated: rocksUpdatedThisWeek.length,
            eodSubmissionRate,
            totalMembers: activeMembers.length,
            activeMembers: activeMemberCount,
          }

          // Send email to admins/owners only
          const admins = teamMembersData.filter(m =>
            (m.role === "admin" || m.role === "owner") && m.status === "active"
          )
          const adminEmails = admins
            .filter(a => a.notificationPreferences?.digest?.email !== false)
            .map(a => a.email)

          if (adminEmails.length === 0) {
            results.push({ orgId: org.id, orgName: org.name, success: true, skipped: "No admin emails" })
            return
          }

          const weekLabel = formatWeekLabel(weekStart, weekEnd)

          const emailResult = await sendWeeklyDigestEmail({
            to: adminEmails,
            orgName: org.name,
            weekLabel,
            stats,
            topPerformers,
            atRiskRocks,
          })

          if (!emailResult.success) {
            logger.error({ orgName: org.name, error: emailResult.error }, "Weekly digest email failed")
            results.push({ orgId: org.id, orgName: org.name, success: false, error: emailResult.error })
            return
          }

          logger.info({ orgName: org.name, weekLabel, adminCount: adminEmails.length }, "Weekly digest sent")
          results.push({ orgId: org.id, orgName: org.name, success: true })
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logError(logger, `Weekly digest failed for org ${org.name}`, error)
        Sentry.captureMessage("Cron weekly-digest partially failed", {
          level: "warning",
          extra: { orgId: org.id, orgName: org.name, error: errorMessage },
        })
        results.push({
          orgId: org.id,
          orgName: org.name,
          success: false,
          error: errorMessage,
        })
      }
    }

    const processedCount = results.filter(r => r.success && !r.skipped).length
    const failCount = results.filter(r => !r.success).length

    // Alert if any orgs failed
    if (failCount > 0) {
      const failedOrgs = results.filter(r => !r.success)
      Sentry.captureMessage(`Cron weekly-digest: ${failCount} org(s) failed`, {
        level: "warning",
        extra: { failedOrgs: failedOrgs.map(o => ({ orgId: o.orgId, orgName: o.orgName, error: o.error })) },
      })
    }

    return NextResponse.json<ApiResponse<{ results: typeof results }>>({
      success: true,
      data: { results },
      message: `Processed ${processedCount} orgs (${failCount} failed) out of ${organizations.length} total`,
    })
  } catch (error) {
    logError(logger, "Weekly digest error", error)
    Sentry.captureException(error, { extra: { job: "weekly-digest" } })
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to generate weekly digests" },
      { status: 500 }
    )
  }
}
