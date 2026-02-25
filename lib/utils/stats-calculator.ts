import type { Rock, AssignedTask, EODReport } from "../types"

export interface AccountabilityScore {
  score: number
  grade: "A" | "B" | "C" | "D" | "F"
  breakdown: {
    eodConsistency: number
    rockHealth: number
    taskCompletion: number
  }
}

// Check if a date is a weekday (Monday-Friday)
function isWeekday(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6 // Not Sunday (0) or Saturday (6)
}

// Format date to YYYY-MM-DD string using local timezone
// This matches how dates are stored in EOD reports (via getTodayString)
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

// Get last N weekdays as YYYY-MM-DD strings (going backwards from today)
function getLastNWeekdays(n: number): string[] {
  const dates: string[] = []
  const current = new Date()
  current.setHours(0, 0, 0, 0)
  let checked = 0
  while (dates.length < n && checked < 365) {
    if (isWeekday(current)) {
      dates.push(formatDateLocal(current))
    }
    current.setDate(current.getDate() - 1)
    checked++
  }
  return dates
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

/**
 * Calculate an accountability score (0–100) for a team member.
 * Weighted: EOD Consistency 40%, Rock Health 40%, Task Completion 20%.
 */
export function calculateAccountabilityScore(
  userId: string,
  rocks: Rock[],
  tasks: AssignedTask[],
  eodReports: EODReport[]
): AccountabilityScore {
  const activeRocks = rocks.filter((r) => r.userId === userId && r.status !== "completed")
  const userTasks = tasks.filter((t) => t.assigneeId === userId)
  const userEODs = eodReports.filter((e) => e.userId === userId)

  // EOD Consistency: % of last 20 weekdays with a report
  const last20 = getLastNWeekdays(20)
  const eodDates = new Set(userEODs.map((r) => r.date))
  const daysWithReport = last20.filter((d) => eodDates.has(d)).length
  const eodConsistency = Math.round((daysWithReport / 20) * 100)

  // Rock Health: weighted by status
  let rockHealth: number
  if (activeRocks.length === 0) {
    rockHealth = 70 // neutral — no active rocks
  } else {
    const onTrack = activeRocks.filter((r) => r.status === "on-track").length
    const atRisk = activeRocks.filter((r) => r.status === "at-risk").length
    const blocked = activeRocks.filter((r) => r.status === "blocked").length
    const points = onTrack * 100 + atRisk * 50 + blocked * 10
    rockHealth = Math.round((points / (activeRocks.length * 100)) * 100)
  }

  // Task Completion
  let taskCompletion: number
  if (userTasks.length === 0) {
    taskCompletion = 70 // neutral — no assigned tasks
  } else {
    const completed = userTasks.filter((t) => t.status === "completed").length
    taskCompletion = Math.round((completed / userTasks.length) * 100)
  }

  const score = Math.min(
    100,
    Math.round(eodConsistency * 0.4 + rockHealth * 0.4 + taskCompletion * 0.2)
  )
  const grade =
    score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F"

  return { score, grade, breakdown: { eodConsistency, rockHealth, taskCompletion } }
}

/**
 * Calculate expected rock progress based on elapsed time in the quarter.
 * Expects the rock's dueDate to be the last day of the quarter.
 */
export function calculateExpectedRockProgress(rock: Rock): number {
  if (!rock.dueDate) return 0

  const dueDate = new Date(rock.dueDate + "T12:00:00")
  // Infer quarter start: go back to the first month of this 3-month block
  const dueMonth = dueDate.getMonth() // 0-indexed
  const quarterStartMonth = Math.floor(dueMonth / 3) * 3
  const year = dueDate.getFullYear()

  const quarterStart = new Date(year, quarterStartMonth, 1)
  const quarterEnd = new Date(year, dueMonth + 1, 0) // last day of due month

  const now = new Date()
  if (now <= quarterStart) return 0
  if (now >= quarterEnd) return 100

  const total = quarterEnd.getTime() - quarterStart.getTime()
  const elapsed = now.getTime() - quarterStart.getTime()
  return Math.round((elapsed / total) * 100)
}

/**
 * Returns true if a rock is meaningfully behind its expected schedule.
 * "Behind" = actual progress is less than 70% of expected progress AND
 * expected progress is at least 20% (avoid flagging at the very start).
 */
export function isRockBehindSchedule(rock: Rock): boolean {
  if (rock.status === "completed" || rock.status === "blocked") return false
  const expected = calculateExpectedRockProgress(rock)
  return expected >= 20 && rock.progress < expected * 0.7
}
