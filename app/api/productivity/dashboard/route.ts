import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/middleware"
import { calculateFocusScore, calculateTrend } from "@/lib/productivity/calculations"
import type {
  ApiResponse,
  FocusScore,
  UserStreak,
  FocusScoreInput,
  FocusBlockCategory,
} from "@/lib/types"

interface ProductivityDashboardResponse {
  focusScore: FocusScore
  streak: UserStreak
  weeklyHours: {
    date: string
    dayLabel: string
    totalMinutes: number
    byCategory: Partial<Record<FocusBlockCategory, number>>
  }[]
  tasksThisWeek: {
    completed: number
    total: number
    rate: number
  }
  rocksProgress: {
    average: number
    onTrack: number
    atRisk: number
    blocked: number
  }
}

// GET /api/productivity/dashboard - Get all productivity data for dashboard
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

    // Get date ranges
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week (Sunday)

    // Fetch all data in parallel
    const [reports, tasks, rocks] = await Promise.all([
      db.eodReports.findByUserId(userId, auth.organization.id),
      db.tasks.findByUserId(userId, auth.organization.id),
      db.rocks.findByUserId(userId, auth.organization.id),
    ])

    // === FOCUS SCORE CALCULATION ===
    const startDate = thirtyDaysAgo.toISOString().split("T")[0]
    const recentReports = reports.filter((r) => r.date >= startDate)
    const sortedReports = [...reports].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    // Calculate streak
    let currentStreak = 0
    const checkDate = new Date(today)

    for (let i = 0; i < 365; i++) {
      const day = checkDate.getDay()
      if (day === 0 || day === 6) {
        checkDate.setDate(checkDate.getDate() - 1)
        continue
      }

      const dateStr = checkDate.toISOString().split("T")[0]
      const hasReport = sortedReports.some((r) => r.date === dateStr)

      if (hasReport) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (dateStr === today.toISOString().split("T")[0]) {
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    // Longest streak calculation
    let longestStreak = 0
    let tempStreak = 0
    const reportDates = new Set(sortedReports.map((r) => r.date))
    const allDates = sortedReports
      .map((r) => new Date(r.date))
      .sort((a, b) => a.getTime() - b.getTime())

    if (allDates.length > 0) {
      const scanDate = new Date(allDates[0])
      const lastDate = allDates[allDates.length - 1]

      while (scanDate <= lastDate) {
        const day = scanDate.getDay()
        if (day === 0 || day === 6) {
          scanDate.setDate(scanDate.getDate() + 1)
          continue
        }

        const dateStr = scanDate.toISOString().split("T")[0]
        if (reportDates.has(dateStr)) {
          tempStreak++
          longestStreak = Math.max(longestStreak, tempStreak)
        } else {
          tempStreak = 0
        }
        scanDate.setDate(scanDate.getDate() + 1)
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak)

    // Task metrics
    const completedTasks = tasks.filter((t) => t.completed).length
    const totalTasks = tasks.length

    // Rock metrics
    const activeRocks = rocks.filter((r) => r.status !== "completed")
    const avgRockProgress =
      activeRocks.length > 0
        ? Math.round(activeRocks.reduce((sum, r) => sum + r.progress, 0) / activeRocks.length)
        : 0
    const onTrackRocks = rocks.filter((r) => r.status === "on-track").length
    const atRiskRocks = rocks.filter((r) => r.status === "at-risk").length
    const blockedRocks = rocks.filter((r) => r.status === "blocked").length

    // Working days calculation
    const workingDays = countWorkingDays(thirtyDaysAgo, today)

    // Escalations
    const escalations = recentReports.filter((r) => r.needsEscalation)
    const resolvedEscalations = escalations.filter((_, i) => {
      const nextReports = recentReports.slice(0, i)
      return nextReports.some((r) => !r.needsEscalation)
    })

    // Build focus score input
    const input: FocusScoreInput = {
      tasksCompleted: completedTasks,
      tasksPlanned: Math.max(totalTasks, completedTasks),
      rockProgressPercent: avgRockProgress,
      consecutiveSubmissions: currentStreak,
      totalPossibleDays: workingDays,
      reportsSubmittedOnTime: recentReports.length,
      totalReportsDue: workingDays,
      blockersResolved: resolvedEscalations.length,
      totalBlockers: escalations.length,
    }

    const scoreResult = calculateFocusScore(input)

    // Previous week score for trend
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const previousWeekReports = reports.filter(
      (r) =>
        r.date >= fourteenDaysAgo.toISOString().split("T")[0] &&
        r.date < sevenDaysAgo.toISOString().split("T")[0]
    )
    const prevSubmissionRate =
      previousWeekReports.length > 0
        ? Math.round((previousWeekReports.length / 5) * 100)
        : 50
    const previousScore = Math.round((prevSubmissionRate + avgRockProgress) / 2)

    const trend = calculateTrend(scoreResult.score, previousScore)
    const weekOverWeek = scoreResult.score - previousScore

    const focusScore: FocusScore = {
      ...scoreResult,
      trend,
      weekOverWeek,
      calculatedAt: new Date().toISOString(),
    }

    // === STREAK DATA ===
    const milestoneDates: UserStreak["milestoneDates"] = {}
    const milestones = [7, 14, 30, 60, 90, 100] as const

    for (const milestone of milestones) {
      if (longestStreak >= milestone) {
        const estimatedDate = new Date()
        estimatedDate.setDate(estimatedDate.getDate() - (longestStreak - milestone))
        milestoneDates[milestone.toString() as keyof UserStreak["milestoneDates"]] =
          estimatedDate.toISOString().split("T")[0]
      }
    }

    const streak: UserStreak = {
      id: `${auth.organization.id}-${userId}`,
      organizationId: auth.organization.id,
      userId,
      currentStreak,
      longestStreak,
      lastSubmissionDate: sortedReports.length > 0 ? sortedReports[0].date : null,
      milestoneDates,
      updatedAt: new Date().toISOString(),
    }

    // === WEEKLY HOURS DATA ===
    // Generate placeholder data for the week (in production, this would come from focus_blocks table)
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const weeklyHours = []

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart)
      dayDate.setDate(dayDate.getDate() + i)
      const dateStr = dayDate.toISOString().split("T")[0]

      // Calculate minutes from EOD reports (rough estimate based on tasks completed)
      const dayReport = reports.find((r) => r.date === dateStr)
      const taskCount = dayReport?.tasks?.length || 0

      // Estimate: each task takes ~30 minutes on average
      const estimatedMinutes = taskCount * 30

      weeklyHours.push({
        date: dateStr,
        dayLabel: dayLabels[dayDate.getDay()],
        totalMinutes: estimatedMinutes,
        byCategory: {
          deep_work: Math.round(estimatedMinutes * 0.6),
          meetings: Math.round(estimatedMinutes * 0.2),
          admin: Math.round(estimatedMinutes * 0.1),
          collaboration: Math.round(estimatedMinutes * 0.1),
        } as Partial<Record<FocusBlockCategory, number>>,
      })
    }

    // === TASKS THIS WEEK ===
    const weekStartStr = weekStart.toISOString().split("T")[0]
    // Use updatedAt as a proxy for completion date for completed tasks
    const thisWeekTasks = tasks.filter((t) => {
      if (!t.completed) return false
      // Use updatedAt as a proxy for when the task was completed
      return t.updatedAt >= weekStartStr
    })
    const thisWeekCompleted = thisWeekTasks.length
    const thisWeekTotal = tasks.filter((t) => t.dueDate && t.dueDate >= weekStartStr).length

    // Build response
    const response: ProductivityDashboardResponse = {
      focusScore,
      streak,
      weeklyHours,
      tasksThisWeek: {
        completed: thisWeekCompleted,
        total: thisWeekTotal || thisWeekCompleted,
        rate:
          thisWeekTotal > 0
            ? Math.round((thisWeekCompleted / thisWeekTotal) * 100)
            : 100,
      },
      rocksProgress: {
        average: avgRockProgress,
        onTrack: onTrackRocks,
        atRisk: atRiskRocks,
        blocked: blockedRocks,
      },
    }

    return NextResponse.json<ApiResponse<ProductivityDashboardResponse>>({
      success: true,
      data: response,
    })
  } catch (error) {
    console.error("Get productivity dashboard error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get productivity data" },
      { status: 500 }
    )
  }
}

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
