import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/api/middleware"
import type { ApiResponse, Achievement, UserAchievement } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { checkAchievements } from "@/lib/achievements/check-achievements"

interface AchievementsResponse {
  achievements: Achievement[]
  userAchievements: (UserAchievement & { achievement: Achievement })[]
  totalPoints: number
}

// GET /api/productivity/achievements - Get all achievements and user's earned ones
export const GET = withAuth(async (request, auth) => {
  try {
    const [achievements, userAchievements] = await Promise.all([
      db.achievements.findAll(),
      db.userAchievements.findByUser(auth.user.id, auth.organization.id),
    ])

    const totalPoints = userAchievements
      .filter(ua => ua.earnedAt)
      .reduce((sum, ua) => sum + (ua.achievement?.points || 0), 0)

    return NextResponse.json<ApiResponse<AchievementsResponse>>({
      success: true,
      data: {
        achievements,
        userAchievements,
        totalPoints,
      },
    })
  } catch (error) {
    logError(logger, "Get achievements error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get achievements" },
      { status: 500 }
    )
  }
})

// POST /api/productivity/achievements/check - Check and update achievement progress
export const POST = withAuth(async (request, auth) => {
  try {
    const result = await checkAchievements(auth.user.id, auth.organization.id)

    return NextResponse.json<ApiResponse<typeof result>>({
      success: true,
      data: result,
    })
  } catch (error) {
    logError(logger, "Check achievements error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to check achievements" },
      { status: 500 }
    )
  }
})
