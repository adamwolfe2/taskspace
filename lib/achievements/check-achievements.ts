/**
 * Achievement Checking Logic
 *
 * Server-side function that evaluates a user's progress against all active
 * achievements and grants newly earned ones. Called after key events
 * (EOD submission, task completion, rock completion, focus session).
 *
 * This is a fire-and-forget operation — failures are logged but never
 * block the caller.
 */

import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { logger, logError } from "@/lib/logger"
import type { Achievement } from "@/lib/types"

interface AchievementCheckResult {
  checked: number
  newlyEarned: string[] // achievement IDs
}

/**
 * Check and update achievement progress for a user.
 * Call this after EOD submission, task completion, rock completion, or focus session.
 *
 * This function is safe to call frequently — it uses upsertProgress which
 * is idempotent and only marks earned once.
 */
export async function checkAchievements(
  userId: string,
  organizationId: string
): Promise<AchievementCheckResult> {
  try {
    const achievements = await db.achievements.findAll()
    const newlyEarned: string[] = []
    let checked = 0

    for (const achievement of achievements) {
      if (!achievement.isActive) continue

      const progress = await calculateProgress(achievement, userId, organizationId)
      if (progress <= 0) continue

      const result = await db.userAchievements.upsertProgress(
        organizationId,
        userId,
        achievement.id,
        progress
      )

      checked++

      if (result.earned) {
        newlyEarned.push(achievement.id)
        logger.info(
          { userId, achievementId: achievement.id, achievementName: achievement.name },
          "Achievement earned"
        )
      }
    }

    return { checked, newlyEarned }
  } catch (error) {
    logError(logger, "Achievement check failed", error, { userId, organizationId })
    return { checked: 0, newlyEarned: [] }
  }
}

/**
 * Calculate progress (0-100) for a single achievement based on its criteria.
 */
async function calculateProgress(
  achievement: Achievement,
  userId: string,
  organizationId: string
): Promise<number> {
  const { type, threshold } = achievement.criteria

  switch (type) {
    case "eod_streak": {
      const streakData = await db.userStreaks.findByUser(userId, organizationId)
      if (!streakData) return 0
      return Math.min(100, Math.round((streakData.currentStreak / threshold) * 100))
    }

    case "tasks_completed": {
      const tasks = await db.assignedTasks.findByAssigneeId(userId, organizationId)
      const completedCount = tasks.filter(t => t.status === "completed").length
      return Math.min(100, Math.round((completedCount / threshold) * 100))
    }

    case "rocks_completed": {
      const rocks = await db.rocks.findByUserId(userId, organizationId)
      const completedCount = rocks.filter(r => r.status === "completed").length
      return Math.min(100, Math.round((completedCount / threshold) * 100))
    }

    case "first_eod": {
      const reports = await db.eodReports.findByUserId(userId, organizationId)
      return reports.length > 0 ? 100 : 0
    }

    case "perfect_week": {
      // Check if user submitted EOD reports for all 5 weekdays in any week
      const { rows } = await sql`
        SELECT COUNT(DISTINCT date) as count
        FROM eod_reports
        WHERE user_id = ${userId}
          AND organization_id = ${organizationId}
          AND EXTRACT(DOW FROM date::date) BETWEEN 1 AND 5
          AND date >= (CURRENT_DATE - INTERVAL '7 days')
      `
      const weekdayCount = Number(rows[0]?.count || 0)
      return weekdayCount >= 5 ? 100 : Math.min(99, Math.round((weekdayCount / 5) * 100))
    }

    case "early_eod": {
      // Count EOD reports submitted before 5 PM in org timezone
      const { rows } = await sql`
        SELECT COUNT(*) as count
        FROM eod_reports
        WHERE user_id = ${userId}
          AND organization_id = ${organizationId}
          AND EXTRACT(HOUR FROM submitted_at) < 17
      `
      const earlyCount = Number(rows[0]?.count || 0)
      return Math.min(100, Math.round((earlyCount / threshold) * 100))
    }

    case "focus_time": {
      // Sum total focus session minutes
      const { rows } = await sql`
        SELECT COALESCE(SUM(duration_minutes), 0) as total_minutes
        FROM focus_sessions
        WHERE user_id = ${userId}
          AND organization_id = ${organizationId}
          AND completed = true
      `
      const totalMinutes = Number(rows[0]?.total_minutes || 0)
      return Math.min(100, Math.round((totalMinutes / threshold) * 100))
    }

    default:
      return 0
  }
}
