import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendMissingEODReminder, isEmailConfigured } from "@/lib/integrations/email"
import type { ApiResponse, TeamMember, Organization } from "@/lib/types"

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
  if (!cronSecret) {
    console.log("[Cron] CRON_SECRET not configured, allowing request")
    return true // Allow in development
  }

  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${cronSecret}`
}

/**
 * Check if the current time in the given timezone is 5 PM (17:00)
 * Uses the organization's eodReminderTime setting if available
 */
function isReminderTime(org: Organization): boolean {
  const timezone = org.settings?.timezone || "America/New_York"
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
    const [currentHour, currentMinute] = timeStr.split(":").map(Number)

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
    console.error(`[Cron] Timezone error for ${org.id}:`, error)
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

    console.log(`[Cron] Running EOD reminder check at ${new Date().toISOString()}`)

    // Get all organizations
    const organizations = await db.organizations.findAll()
    const results: { orgId: string; orgName: string; timezone: string; reminders: number; skipped: string; errors: string[] }[] = []

    for (const org of organizations) {
      const timezone = org.settings?.timezone || "America/New_York"

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

      console.log(`[Cron] Processing org ${org.name} (timezone: ${timezone})`)

      try {
        const today = getTodayInTimezone(timezone)

        // Get all active team members
        const teamMembersData = await db.members.findWithUsersByOrganizationId(org.id)
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

        // Get today's EOD reports
        const allReports = await db.eodReports.findByOrganizationId(org.id)
        const todayReports = allReports.filter(r => r.date === today)
        const submittedUserIds = new Set(todayReports.map(r => r.userId))

        // Find members who haven't submitted
        const missingMembers = activeMembers.filter(m => !submittedUserIds.has(m.id))

        if (missingMembers.length === 0) {
          console.log(`[Cron] All members submitted for org ${org.name}`)
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

        for (const member of missingMembers) {
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
          } else {
            errors.push(`${member.name}: ${result.error}`)
          }
        }

        console.log(`[Cron] Sent ${remindersSent} reminders for org ${org.name}`)
        results.push({
          orgId: org.id,
          orgName: org.name,
          timezone,
          reminders: remindersSent,
          skipped: "",
          errors,
        })
      } catch (error) {
        console.error(`[Cron] Failed for org ${org.id}:`, error)
        results.push({
          orgId: org.id,
          orgName: org.name,
          timezone,
          reminders: 0,
          skipped: "",
          errors: [error instanceof Error ? error.message : "Unknown error"],
        })
      }
    }

    const totalReminders = results.reduce((sum, r) => sum + r.reminders, 0)
    const processedOrgs = results.filter(r => !r.skipped || r.skipped === "All submitted").length

    return NextResponse.json<ApiResponse<{ results: typeof results }>>({
      success: true,
      data: { results },
      message: `Sent ${totalReminders} EOD reminders across ${processedOrgs} organizations (${organizations.length} total)`,
    })
  } catch (error) {
    console.error("[Cron] EOD reminder error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Failed to send reminders" },
      { status: 500 }
    )
  }
}
