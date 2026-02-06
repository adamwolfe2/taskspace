import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/api/middleware"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

interface StreakUpdateResponse {
  currentStreak: number
  longestStreak: number
  isNewRecord: boolean
}

// POST /api/productivity/streak/update - Update streak on EOD submission
export const POST = withAuth(async (request, auth) => {
  try {
    const body = await request.json()
    const date = body.date || new Date().toISOString().split("T")[0]

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
