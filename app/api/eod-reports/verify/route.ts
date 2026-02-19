import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getTodayInTimezone } from "@/lib/utils/date-utils"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { withAdmin } from "@/lib/api/middleware"

interface UserEODStatus {
  userId: string
  userName: string
  totalReports: number
  reportDates: string[]
  thisWeekReports: string[]
  streak: number
  hasSubmittedToday: boolean
}

interface VerifyResponse {
  organizationId: string
  orgTimezone: string
  todayInOrgTz: string
  localToday: string
  totalReports: number
  userStatuses: UserEODStatus[]
}

// Calculate streak for a user
function calculateStreak(reportDates: string[], todayStr: string): number {
  if (reportDates.length === 0) return 0

  const dateSet = new Set(reportDates)

  // Check if today is a weekday
  const today = new Date()
  const dayOfWeek = today.getDay()
  const isTodayWeekday = dayOfWeek !== 0 && dayOfWeek !== 6

  let streak = 0
  const currentDate = new Date(today)

  // If today is a weekday and no report yet, start from yesterday
  if (isTodayWeekday && !dateSet.has(todayStr)) {
    currentDate.setDate(currentDate.getDate() - 1)
  }

  // Count consecutive weekdays
  while (true) {
    // Skip weekends
    while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() - 1)
    }

    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`

    if (dateSet.has(dateStr)) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }

    // Safety limit
    if (streak > 365) break
  }

  return streak
}

// Get current week's Monday-Friday dates
function getThisWeekDates(): string[] {
  const today = new Date()
  const dayOfWeek = today.getDay()

  // Calculate Monday
  const monday = new Date(today)
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  monday.setDate(today.getDate() + diff)
  monday.setHours(0, 0, 0, 0)

  const dates: string[] = []
  for (let i = 0; i < 5; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    dates.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`)
  }
  return dates
}

// GET /api/eod-reports/verify - Verify EOD data sync for all users
export const GET = withAdmin(async (request, auth) => {
  try {
    const orgTimezone = auth.organization.settings?.timezone || "America/Los_Angeles"
    const todayInOrgTz = getTodayInTimezone(orgTimezone)

    // Get local today for comparison
    const now = new Date()
    const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    // Get all reports for the organization
    const allReports = await db.eodReports.findByOrganizationId(auth.organization.id)

    // Get all team members
    const teamMembers = await db.members.findWithUsersByOrganizationId(auth.organization.id)

    // Get this week's dates
    const thisWeekDates = getThisWeekDates()

    // Calculate status for each user
    const userStatuses: UserEODStatus[] = teamMembers.map(member => {
      const userReports = allReports.filter(r => r.userId === member.id)
      const reportDates = userReports.map(r => r.date).sort()
      const thisWeekReports = reportDates.filter(d => thisWeekDates.includes(d))
      const hasSubmittedToday = reportDates.includes(todayInOrgTz) || reportDates.includes(localToday)
      const streak = calculateStreak(reportDates, localToday)

      return {
        userId: member.id,
        userName: member.name,
        totalReports: userReports.length,
        reportDates,
        thisWeekReports,
        streak,
        hasSubmittedToday,
      }
    })

    const response: VerifyResponse = {
      organizationId: auth.organization.id,
      orgTimezone,
      todayInOrgTz,
      localToday,
      totalReports: allReports.length,
      userStatuses,
    }

    return NextResponse.json<ApiResponse<VerifyResponse>>({
      success: true,
      data: response,
    })
  } catch (error) {
    logError(logger, "Verify EOD reports error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to verify EOD reports" },
      { status: 500 }
    )
  }
})
