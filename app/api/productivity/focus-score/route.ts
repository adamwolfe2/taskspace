import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/middleware"
import { calculateFocusScore, calculateTrend } from "@/lib/productivity/calculations"
import type { ApiResponse, FocusScore, FocusScoreInput } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// GET /api/productivity/focus-score - Calculate and return current focus score
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || auth.user.id

    // Get the last 30 days of data for calculations
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const startDate = thirtyDaysAgo.toISOString().split("T")[0]

    // Fetch user data
    const [reports, tasks, rocks] = await Promise.all([
      db.eodReports.findByUserId(userId, auth.organization.id),
      db.tasks.findByUserId(userId, auth.organization.id),
      db.rocks.findByUserId(userId, auth.organization.id),
    ])

    // Filter to last 30 days
    const recentReports = reports.filter((r) => r.date >= startDate)

    // Calculate task metrics
    const completedTasks = tasks.filter((t) => t.completed).length
    const totalTasks = tasks.length

    // Calculate rock progress
    const activeRocks = rocks.filter((r) => r.status !== "completed")
    const avgRockProgress =
      activeRocks.length > 0
        ? Math.round(
            activeRocks.reduce((sum, r) => sum + r.progress, 0) / activeRocks.length
          )
        : 0

    // Calculate streak (consecutive days with EOD submissions)
    const sortedReports = recentReports
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    let streak = 0
    const today = new Date()
    const checkDate = new Date(today)

    // Count consecutive weekdays with reports
    for (let i = 0; i < 100; i++) {
      const day = checkDate.getDay()
      // Skip weekends
      if (day === 0 || day === 6) {
        checkDate.setDate(checkDate.getDate() - 1)
        continue
      }

      const dateStr = checkDate.toISOString().split("T")[0]
      const hasReport = sortedReports.some((r) => r.date === dateStr)

      if (hasReport) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (dateStr === today.toISOString().split("T")[0]) {
        // If today and no report yet, don't break streak
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    // Calculate working days in period
    const workingDays = countWorkingDays(thirtyDaysAgo, new Date())

    // Calculate escalations/blockers
    const escalations = recentReports.filter((r) => r.needsEscalation)
    const resolvedEscalations = escalations.filter((_, i) => {
      // Simple heuristic: if there's a report after the escalation without escalation, it's resolved
      const nextReports = recentReports.slice(0, i)
      return nextReports.some((r) => !r.needsEscalation)
    })

    // Build input for focus score calculation
    const input: FocusScoreInput = {
      tasksCompleted: completedTasks,
      tasksPlanned: Math.max(totalTasks, completedTasks),
      rockProgressPercent: avgRockProgress,
      consecutiveSubmissions: streak,
      totalPossibleDays: workingDays,
      reportsSubmittedOnTime: recentReports.length,
      totalReportsDue: workingDays,
      blockersResolved: resolvedEscalations.length,
      totalBlockers: escalations.length,
    }

    // Calculate current score
    const scoreResult = calculateFocusScore(input)

    // Calculate previous week's score for trend
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const previousWeekReports = reports.filter(
      (r) =>
        r.date >= fourteenDaysAgo.toISOString().split("T")[0] &&
        r.date < sevenDaysAgo.toISOString().split("T")[0]
    )

    // Simple previous score estimate
    const prevSubmissionRate =
      previousWeekReports.length > 0
        ? Math.round((previousWeekReports.length / 5) * 100)
        : 50
    const previousScore = Math.round(
      (prevSubmissionRate + avgRockProgress) / 2
    )

    const trend = calculateTrend(scoreResult.score, previousScore)
    const weekOverWeek = scoreResult.score - previousScore

    const focusScore: FocusScore = {
      ...scoreResult,
      trend,
      weekOverWeek,
      calculatedAt: new Date().toISOString(),
    }

    return NextResponse.json<ApiResponse<FocusScore>>({
      success: true,
      data: focusScore,
    })
  } catch (error) {
    logError(logger, "Get focus score error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to calculate focus score" },
      { status: 500 }
    )
  }
}

// Helper to count working days between two dates
function countWorkingDays(start: Date, end: Date): number {
  let count = 0
  const current = new Date(start)
  while (current <= end) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  return count
}
