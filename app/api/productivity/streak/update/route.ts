import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/middleware"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

interface StreakUpdateResponse {
  currentStreak: number
  longestStreak: number
  isNewRecord: boolean
}

// POST /api/productivity/streak/update - Update streak on EOD submission
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

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
}
