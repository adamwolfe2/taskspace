import type { Rock, AssignedTask, EODReport } from "../types"

// Check if a date is a weekday (Monday-Friday)
function isWeekday(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6 // Not Sunday (0) or Saturday (6)
}

// Format date to YYYY-MM-DD string using local timezone
function formatDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Calculate consecutive weekday streak (working backwards from today)
function calculateEODStreak(reports: EODReport[]): number {
  if (reports.length === 0) return 0

  // Get all report dates as a Set for quick lookup
  const reportDates = new Set(reports.map(r => r.date))

  // Start from today and work backwards
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let streak = 0
  const currentDate = new Date(today)

  // Check if today is a weekday and has a report (or if it's still work hours, don't break streak)
  const isTodayWeekday = isWeekday(today)
  const todayStr = formatDateLocal(today)
  const hasReportToday = reportDates.has(todayStr)

  // If today is a weekday and no report yet, we'll start checking from yesterday
  // (don't break streak just because they haven't submitted today's report yet)
  if (isTodayWeekday && !hasReportToday) {
    currentDate.setDate(currentDate.getDate() - 1)
  }

  // Count consecutive weekdays with reports
  while (true) {
    // Skip weekends
    while (!isWeekday(currentDate)) {
      currentDate.setDate(currentDate.getDate() - 1)
    }

    const dateStr = formatDateLocal(currentDate)

    if (reportDates.has(dateStr)) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      // Streak broken - no report on this weekday
      break
    }

    // Safety check - don't go back more than 365 days
    const daysDiff = Math.floor((today.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 365) break
  }

  return streak
}

// Get streak milestone info for display
export function getStreakMilestone(streak: number): { label: string; color: string } | null {
  if (streak >= 100) return { label: "100 Day Club!", color: "text-purple-600" }
  if (streak >= 50) return { label: "50 Day Streak!", color: "text-amber-600" }
  if (streak >= 30) return { label: "30 Day Streak!", color: "text-orange-600" }
  if (streak >= 14) return { label: "2 Week Streak!", color: "text-blue-600" }
  if (streak >= 7) return { label: "1 Week Streak!", color: "text-emerald-600" }
  if (streak >= 5) return { label: "5 Day Streak!", color: "text-teal-600" }
  return null
}

export function calculateUserStats(userId: string, rocks: Rock[], tasks: AssignedTask[], eodReports: EODReport[]) {
  const userRocks = rocks.filter((r) => r.userId === userId)
  const userTasks = tasks.filter((t) => t.assigneeId === userId)
  const userEODReports = eodReports.filter((e) => e.userId === userId)

  const completedTasks = userTasks.filter((t) => t.status === "completed").length
  const totalTasks = userTasks.length
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const averageRockProgress =
    userRocks.length > 0 ? Math.round(userRocks.reduce((sum, rock) => sum + rock.progress, 0) / userRocks.length) : 0

  const rocksOnTrack = userRocks.filter((r) => r.status === "on-track").length
  const rocksAtRisk = userRocks.filter((r) => r.status === "at-risk").length
  const rocksBlocked = userRocks.filter((r) => r.status === "blocked").length

  // Calculate actual consecutive streak
  const eodStreak = calculateEODStreak(userEODReports)

  return {
    completedTasks,
    totalTasks,
    taskCompletionRate,
    activeRocks: userRocks.length,
    averageRockProgress,
    rocksOnTrack,
    rocksAtRisk,
    rocksBlocked,
    eodStreak,
  }
}
