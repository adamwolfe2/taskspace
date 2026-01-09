import type { FocusScore, FocusScoreInput, StreakMilestone, StreakMilestoneInfo } from "../types"

// Weights for focus score calculation
const FOCUS_SCORE_WEIGHTS = {
  taskCompletion: 0.30,
  rockProgress: 0.25,
  consistencyStreak: 0.20,
  reportSubmission: 0.15,
  blockerResolution: 0.10,
}

/**
 * Calculate the focus score based on various productivity metrics
 * Score ranges from 0-100
 */
export function calculateFocusScore(input: FocusScoreInput): Omit<FocusScore, "trend" | "weekOverWeek" | "calculatedAt"> {
  // Task completion rate (0-100)
  const taskScore = input.tasksPlanned > 0
    ? Math.min((input.tasksCompleted / input.tasksPlanned) * 100, 100)
    : 50 // Default if no tasks planned

  // Rock progress (0-100)
  const rockScore = Math.min(input.rockProgressPercent, 100)

  // Consistency streak bonus (0-100)
  // Scale: 0 days = 0, 7 days = 50, 14 days = 70, 30 days = 85, 60+ days = 100
  let consistencyScore: number
  if (input.consecutiveSubmissions >= 60) {
    consistencyScore = 100
  } else if (input.consecutiveSubmissions >= 30) {
    consistencyScore = 85 + ((input.consecutiveSubmissions - 30) / 30) * 15
  } else if (input.consecutiveSubmissions >= 14) {
    consistencyScore = 70 + ((input.consecutiveSubmissions - 14) / 16) * 15
  } else if (input.consecutiveSubmissions >= 7) {
    consistencyScore = 50 + ((input.consecutiveSubmissions - 7) / 7) * 20
  } else {
    consistencyScore = (input.consecutiveSubmissions / 7) * 50
  }

  // Report submission rate (0-100)
  const reportScore = input.totalReportsDue > 0
    ? (input.reportsSubmittedOnTime / input.totalReportsDue) * 100
    : 100 // Perfect if nothing due

  // Blocker resolution rate (0-100)
  const blockerScore = input.totalBlockers > 0
    ? (input.blockersResolved / input.totalBlockers) * 100
    : 100 // Perfect if no blockers

  // Calculate weighted average
  const score = Math.round(
    taskScore * FOCUS_SCORE_WEIGHTS.taskCompletion +
    rockScore * FOCUS_SCORE_WEIGHTS.rockProgress +
    consistencyScore * FOCUS_SCORE_WEIGHTS.consistencyStreak +
    reportScore * FOCUS_SCORE_WEIGHTS.reportSubmission +
    blockerScore * FOCUS_SCORE_WEIGHTS.blockerResolution
  )

  return {
    score: Math.min(Math.max(score, 0), 100),
    breakdown: {
      taskCompletion: Math.round(taskScore),
      rockProgress: Math.round(rockScore),
      consistencyStreak: Math.round(consistencyScore),
      reportSubmission: Math.round(reportScore),
      blockerResolution: Math.round(blockerScore),
    },
  }
}

/**
 * Get the color for a focus score
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return "#10B981" // Green - excellent
  if (score >= 60) return "#F59E0B" // Amber - good
  if (score >= 40) return "#F97316" // Orange - needs improvement
  return "#EF4444" // Red - critical
}

/**
 * Get the label for a focus score
 */
export function getScoreLabel(score: number): string {
  if (score >= 90) return "Outstanding"
  if (score >= 80) return "Excellent"
  if (score >= 70) return "Great"
  if (score >= 60) return "Good"
  if (score >= 50) return "Fair"
  if (score >= 40) return "Needs Work"
  return "Critical"
}

/**
 * Calculate trend from two scores
 */
export function calculateTrend(currentScore: number, previousScore: number): "up" | "down" | "stable" {
  const diff = currentScore - previousScore
  if (diff >= 3) return "up"
  if (diff <= -3) return "stable" // Using stable for small decreases to avoid alarming users
  return "stable"
}

/**
 * Get streak milestone info
 */
export function getStreakMilestoneInfo(streak: number): StreakMilestoneInfo | null {
  const milestones: { threshold: StreakMilestone; info: StreakMilestoneInfo }[] = [
    { threshold: 100, info: { milestone: 100, label: "Century Club!", icon: "👑", color: "text-purple-600" } },
    { threshold: 90, info: { milestone: 90, label: "90 Day Legend!", icon: "💎", color: "text-indigo-600" } },
    { threshold: 60, info: { milestone: 60, label: "60 Day Champion!", icon: "🏆", color: "text-amber-600" } },
    { threshold: 30, info: { milestone: 30, label: "30 Day Warrior!", icon: "⚔️", color: "text-orange-600" } },
    { threshold: 14, info: { milestone: 14, label: "2 Week Streak!", icon: "🌟", color: "text-red-600" } },
    { threshold: 7, info: { milestone: 7, label: "1 Week Streak!", icon: "🔥", color: "text-emerald-600" } },
  ]

  for (const { threshold, info } of milestones) {
    if (streak >= threshold) return info
  }
  return null
}

/**
 * Get progress to next milestone
 */
export function getProgressToNextMilestone(currentStreak: number): { next: StreakMilestone; progress: number } | null {
  const milestones: StreakMilestone[] = [7, 14, 30, 60, 90, 100]

  for (const milestone of milestones) {
    if (currentStreak < milestone) {
      const previousMilestone = milestones[milestones.indexOf(milestone) - 1] || 0
      const progress = ((currentStreak - previousMilestone) / (milestone - previousMilestone)) * 100
      return { next: milestone, progress: Math.min(progress, 100) }
    }
  }

  // Already at max milestone
  return null
}

/**
 * Format duration in minutes to human readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/**
 * Get energy level numeric value (for calculations)
 */
export function getEnergyLevelValue(level: "low" | "medium" | "high" | "peak"): number {
  const values = { low: 1, medium: 2, high: 3, peak: 4 }
  return values[level]
}

/**
 * Get energy level from numeric value
 */
export function getEnergyLevelFromValue(value: number): "low" | "medium" | "high" | "peak" {
  if (value >= 3.5) return "peak"
  if (value >= 2.5) return "high"
  if (value >= 1.5) return "medium"
  return "low"
}

/**
 * Get energy level color
 */
export function getEnergyLevelColor(level: "low" | "medium" | "high" | "peak"): string {
  const colors = {
    low: "#EF4444",     // Red
    medium: "#F59E0B",  // Amber
    high: "#10B981",    // Emerald
    peak: "#8B5CF6",    // Violet
  }
  return colors[level]
}

/**
 * Get category display info
 */
export function getCategoryInfo(category: string): { label: string; color: string; icon: string } {
  const categories: Record<string, { label: string; color: string; icon: string }> = {
    deep_work: { label: "Deep Work", color: "bg-indigo-100 text-indigo-700", icon: "🎯" },
    meetings: { label: "Meetings", color: "bg-blue-100 text-blue-700", icon: "👥" },
    admin: { label: "Admin", color: "bg-gray-100 text-gray-700", icon: "📋" },
    collaboration: { label: "Collaboration", color: "bg-emerald-100 text-emerald-700", icon: "🤝" },
    learning: { label: "Learning", color: "bg-amber-100 text-amber-700", icon: "📚" },
    planning: { label: "Planning", color: "bg-purple-100 text-purple-700", icon: "📊" },
  }
  return categories[category] || { label: category, color: "bg-gray-100 text-gray-700", icon: "⏱️" }
}
