import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/api/middleware"
import type { ApiResponse } from "@/lib/types"
import { validateBody } from "@/lib/validation/middleware"
import { streakUpdateSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"
import { getTodayInTimezone } from "@/lib/utils/date-utils"
import { CONFIG } from "@/lib/config"

interface StreakUpdateResponse {
  currentStreak: number
  longestStreak: number
  isNewRecord: boolean
}

// POST /api/productivity/streak/update - Update streak on EOD submission
export const POST = withAuth(async (request, auth) => {
  try {
    const { date: inputDate } = await validateBody(request, streakUpdateSchema)
    const orgTimezone = auth.organization.settings.timezone || CONFIG.organization.defaultTimezone
    const date = inputDate || getTodayInTimezone(orgTimezone)

    // Update the streak using the database function
    const result = await db.userStreaks.updateStreak(
      auth.user.id,
      auth.organization.id,
      date
    )

    return NextResponse.json<ApiResponse<StreakUpdateResponse>>({
      success: true,
      data: result,
    })
  } catch (error) {
    logError(logger, "Update streak error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update streak" },
      { status: 500 }
    )
  }
})
