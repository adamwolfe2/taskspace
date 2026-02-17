import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/api/middleware"
import type { ApiResponse, Achievement, UserAchievement } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

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
    const achievements = await db.achievements.findAll()
    const results: { achievementId: string; earned: boolean }[] = []

    for (const achievement of achievements) {
      const criteria = achievement.criteria
      let progress = 0

      switch (criteria.type) {
        case "eod_streak": {
          // Get current streak from streak API
          const streakData = await db.userStreaks.findByUser(auth.user.id, auth.organization.id)
          if (streakData) {
            progress = Math.min(100, Math.round((streakData.currentStreak / criteria.threshold) * 100))
          }
          break
        }
        case "tasks_completed": {
          const tasks = await db.assignedTasks.findByAssigneeId(auth.user.id, auth.organization.id)
          const completedCount = tasks.filter(t => t.status === "completed").length
          progress = Math.min(100, Math.round((completedCount / criteria.threshold) * 100))
          break
        }
        case "rocks_completed": {
          const rocks = await db.rocks.findByUserId(auth.user.id, auth.organization.id)
          const completedCount = rocks.filter(r => r.status === "completed").length
          progress = Math.min(100, Math.round((completedCount / criteria.threshold) * 100))
          break
        }
        case "first_eod": {
          const reports = await db.eodReports.findByUserId(auth.user.id, auth.organization.id)
          progress = reports.length > 0 ? 100 : 0
          break
        }
        default:
          continue
      }

      if (progress > 0) {
        const result = await db.userAchievements.upsertProgress(
          auth.organization.id,
          auth.user.id,
          achievement.id,
          progress
        )
        results.push({ achievementId: achievement.id, earned: result.earned })
      }
    }

    const newlyEarned = results.filter(r => r.earned)

    return NextResponse.json<ApiResponse<{ checked: number; newlyEarned: typeof newlyEarned }>>({
      success: true,
      data: {
        checked: results.length,
        newlyEarned,
      },
    })
  } catch (error) {
    logError(logger, "Check achievements error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to check achievements" },
      { status: 500 }
    )
  }
})
