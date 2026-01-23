/**
 * Organization Current Date API
 *
 * Returns the current date and time in the organization's timezone.
 * Critical for EOD submissions to ensure all team members submit for the correct day
 * regardless of their local timezone.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { getTodayInTimezone, getCurrentTimeInTimezone, formatDateForDisplay } from "@/lib/utils/date-utils"
import { logger, logError } from "@/lib/logger"

interface CurrentDateResponse {
  date: string // YYYY-MM-DD format
  displayDate: string // "Tuesday, January 7, 2026"
  time: string // "5:30 PM"
  timezone: string // "America/Los_Angeles"
  timezoneDisplay: string // "Pacific Standard Time"
}

// GET /api/organizations/current-date - Get the current date in the org's timezone
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const timezone = auth.organization.settings?.timezone || "America/Los_Angeles"
    const currentDate = getTodayInTimezone(timezone)
    const currentTime = getCurrentTimeInTimezone(timezone)

    // Get a friendly timezone display name
    let timezoneDisplay = timezone
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        timeZoneName: "long",
      })
      const parts = formatter.formatToParts(new Date())
      const tzPart = parts.find(p => p.type === "timeZoneName")
      if (tzPart) {
        timezoneDisplay = tzPart.value
      }
    } catch {
      // Keep the timezone ID as fallback
    }

    const response: CurrentDateResponse = {
      date: currentDate,
      displayDate: formatDateForDisplay(currentDate),
      time: currentTime,
      timezone,
      timezoneDisplay,
    }

    return NextResponse.json({
      success: true,
      data: response,
    })
  } catch (error) {
    logError(logger, "Current date API error", error)
    return NextResponse.json(
      { success: false, error: "Failed to get current date" },
      { status: 500 }
    )
  }
}
