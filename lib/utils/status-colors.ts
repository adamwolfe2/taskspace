/**
 * Centralized status color mapping utility
 *
 * Use this for consistent status colors across the application.
 * All status colors should be defined here to ensure consistency.
 *
 * NOTE: Workspace-aware versions are available that use brand colors.
 * Import from '@/lib/utils/dynamic-status-colors' for brand-themed colors.
 */

import {
  getDynamicStatusColors,
  getDynamicPriorityColors,
  getEnergyLevelColors as getDynamicEnergyColors,
  getFocusScoreColors as getDynamicFocusColors,
} from "./dynamic-status-colors"

export type RockStatus = "on-track" | "at-risk" | "blocked" | "completed"
export type TaskStatus = "pending" | "in-progress" | "completed" | "blocked"
export type PriorityLevel = "high" | "medium" | "normal" | "low"
export type EnergyLevel = "low" | "medium" | "high" | "peak"
export type FocusScoreLevel = "poor" | "fair" | "good" | "excellent"

interface StatusColors {
  text: string
  bg: string
  border: string
  dot: string
}

// Rock status colors
export const rockStatusColors: Record<RockStatus, StatusColors> = {
  "on-track": {
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  "at-risk": {
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  blocked: {
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  completed: {
    text: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
}

// Task status colors
export const taskStatusColors: Record<TaskStatus, StatusColors> = {
  pending: {
    text: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
  "in-progress": {
    text: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  completed: {
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  blocked: {
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
  },
}

// Priority colors
export const priorityColors: Record<PriorityLevel, StatusColors> = {
  high: {
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  medium: {
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  normal: {
    text: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  low: {
    text: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
}

// Energy level colors
export const energyLevelColors: Record<EnergyLevel, StatusColors> = {
  low: {
    text: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  medium: {
    text: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  high: {
    text: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  peak: {
    text: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    dot: "bg-violet-500",
  },
}

// Focus score level colors (0-100 score)
export const focusScoreLevelColors: Record<FocusScoreLevel, StatusColors> = {
  poor: {
    text: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  fair: {
    text: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  good: {
    text: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  excellent: {
    text: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
}

// Helper functions

/**
 * Get rock status colors
 */
export function getRockStatusColors(status: RockStatus): StatusColors {
  return rockStatusColors[status] || rockStatusColors["on-track"]
}

/**
 * Get task status colors
 */
export function getTaskStatusColors(status: TaskStatus): StatusColors {
  return taskStatusColors[status] || taskStatusColors.pending
}

/**
 * Get priority colors
 */
export function getPriorityColors(priority: PriorityLevel): StatusColors {
  return priorityColors[priority] || priorityColors.normal
}

/**
 * Get energy level colors
 */
export function getEnergyLevelColors(level: EnergyLevel): StatusColors {
  return energyLevelColors[level] || energyLevelColors.medium
}

/**
 * Get focus score level from numeric score
 */
export function getFocusScoreLevel(score: number): FocusScoreLevel {
  if (score >= 80) return "excellent"
  if (score >= 60) return "good"
  if (score >= 40) return "fair"
  return "poor"
}

/**
 * Get focus score colors from numeric score
 */
export function getFocusScoreColors(score: number): StatusColors {
  const level = getFocusScoreLevel(score)
  return focusScoreLevelColors[level]
}

/**
 * Get progress bar color based on percentage
 */
export function getProgressColor(progress: number): string {
  if (progress >= 80) return "bg-emerald-500"
  if (progress >= 60) return "bg-blue-500"
  if (progress >= 40) return "bg-amber-500"
  return "bg-red-500"
}

/**
 * Get a combined class string for a status badge
 */
export function getStatusBadgeClasses(colors: StatusColors): string {
  return `${colors.text} ${colors.bg} ${colors.border}`
}

/**
 * Get status label for display (capitalizes and replaces hyphens)
 */
export function getStatusLabel(status: string): string {
  return status
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// ============================================================================
// WORKSPACE-AWARE COLOR FUNCTIONS (USE THESE FOR BRAND THEMING)
// ============================================================================

/**
 * Get rock status colors with workspace branding
 * @param status - Rock status
 * @param brandColor - Workspace primary color (optional, uses default if not provided)
 */
export function getRockStatusColorsThemed(
  status: RockStatus,
  brandColor?: string | null
): StatusColors {
  if (!brandColor) {
    return rockStatusColors[status] || rockStatusColors["on-track"]
  }
  return getDynamicStatusColors(brandColor, status)
}

/**
 * Get task status colors with workspace branding
 * @param status - Task status
 * @param brandColor - Workspace primary color (optional, uses default if not provided)
 */
export function getTaskStatusColorsThemed(
  status: TaskStatus,
  brandColor?: string | null
): StatusColors {
  if (!brandColor) {
    return taskStatusColors[status] || taskStatusColors.pending
  }
  return getDynamicStatusColors(brandColor, status)
}

/**
 * Get priority colors with workspace branding
 * @param priority - Priority level
 * @param brandColor - Workspace primary color (optional, uses default if not provided)
 */
export function getPriorityColorsThemed(
  priority: PriorityLevel,
  brandColor?: string | null
): StatusColors {
  if (!brandColor) {
    return priorityColors[priority] || priorityColors.normal
  }
  return getDynamicPriorityColors(brandColor, priority)
}

/**
 * Get progress bar color based on percentage (themed)
 * @param progress - Progress percentage (0-100)
 * @param brandColor - Workspace primary color
 */
export function getProgressColorThemed(progress: number, brandColor?: string | null): string {
  if (!brandColor) {
    return getProgressColor(progress)
  }

  // Use brand color for all progress levels when workspace theme is active
  if (progress >= 80) return `bg-[${brandColor}]`
  if (progress >= 60) return `bg-[${brandColor}]`
  if (progress >= 40) return "bg-amber-500" // Warning
  return "bg-red-500" // Danger
}
