/**
 * Dynamic Status Colors - Workspace Theme Aware
 *
 * Generates status colors based on workspace brand colors.
 * Falls back to default semantic colors when no workspace theme is set.
 */

import { lighten, darken, adjustOpacity, generateColorVariants } from "./color-helpers"

export type StatusType =
  | "on-track"
  | "at-risk"
  | "blocked"
  | "completed"
  | "pending"
  | "in-progress"
  | "cancelled"

export type PriorityLevel = "critical" | "high" | "medium" | "normal" | "low"

export type EnergyLevel = "low" | "medium" | "high" | "peak"

export interface StatusColorSet {
  text: string // Text color class or hex
  bg: string // Background color class or hex
  border: string // Border color class or hex
  dot: string // Dot indicator color class or hex
  raw?: {
    // Raw hex values for inline styles
    text: string
    bg: string
    border: string
    dot: string
  }
}

/**
 * Default status colors (monochrome theme)
 */
const DEFAULT_STATUS_COLORS = {
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
  cancelled: {
    text: "text-gray-600",
    bg: "bg-gray-50",
    border: "border-gray-200",
    dot: "bg-gray-400",
  },
} as const

/**
 * Generate status colors based on workspace brand color
 * @param brandColor - Primary brand color (hex)
 * @param status - Status type
 * @returns StatusColorSet with Tailwind classes and raw hex values
 */
export function getDynamicStatusColors(
  brandColor: string | null | undefined,
  status: StatusType
): StatusColorSet {
  // If no brand color, use default
  if (!brandColor) {
    return DEFAULT_STATUS_COLORS[status]
  }

  // Generate variants based on status type
  switch (status) {
    case "on-track":
    case "completed":
      // Use brand color for positive statuses
      return {
        text: `text-[${darken(brandColor, 20)}]`,
        bg: `bg-[${adjustOpacity(brandColor, 0.1)}]`,
        border: `border-[${lighten(brandColor, 30)}]`,
        dot: `bg-[${brandColor}]`,
        raw: {
          text: darken(brandColor, 20),
          bg: lighten(brandColor, 45),
          border: lighten(brandColor, 30),
          dot: brandColor,
        },
      }

    case "in-progress":
      // Use lighter brand color
      return {
        text: `text-[${darken(brandColor, 10)}]`,
        bg: `bg-[${adjustOpacity(brandColor, 0.08)}]`,
        border: `border-[${lighten(brandColor, 35)}]`,
        dot: `bg-[${lighten(brandColor, 10)}]`,
        raw: {
          text: darken(brandColor, 10),
          bg: lighten(brandColor, 47),
          border: lighten(brandColor, 35),
          dot: lighten(brandColor, 10),
        },
      }

    case "at-risk":
      // Use amber/warning colors
      return DEFAULT_STATUS_COLORS["at-risk"]

    case "blocked":
      // Use red/danger colors
      return DEFAULT_STATUS_COLORS.blocked

    case "pending":
      // Use muted brand color
      return {
        text: `text-[${darken(brandColor, 30)}]`,
        bg: "bg-slate-50",
        border: "border-slate-200",
        dot: `bg-[${adjustOpacity(brandColor, 0.5)}]`,
        raw: {
          text: darken(brandColor, 30),
          bg: "#f8fafc",
          border: "#e2e8f0",
          dot: adjustOpacity(brandColor, 0.5),
        },
      }

    case "cancelled":
      // Use gray
      return DEFAULT_STATUS_COLORS.cancelled

    default:
      return DEFAULT_STATUS_COLORS.pending
  }
}

/**
 * Get priority colors based on workspace brand
 */
export function getDynamicPriorityColors(
  brandColor: string | null | undefined,
  priority: PriorityLevel
): StatusColorSet {
  // Critical and high always use red/amber
  if (priority === "critical") {
    return {
      text: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
      dot: "bg-red-500",
      raw: {
        text: "#b91c1c",
        bg: "#fef2f2",
        border: "#fecaca",
        dot: "#ef4444",
      },
    }
  }

  if (priority === "high") {
    return {
      text: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      dot: "bg-amber-500",
      raw: {
        text: "#b45309",
        bg: "#fffbeb",
        border: "#fde68a",
        dot: "#f59e0b",
      },
    }
  }

  // Medium, normal, and low use brand color or gray
  if (!brandColor) {
    return priority === "medium"
      ? {
          text: "text-blue-700",
          bg: "bg-blue-50",
          border: "border-blue-200",
          dot: "bg-blue-500",
        }
      : {
          text: "text-slate-600",
          bg: "bg-slate-50",
          border: "border-slate-200",
          dot: "bg-slate-400",
        }
  }

  // Use brand color for medium
  if (priority === "medium") {
    return {
      text: `text-[${darken(brandColor, 20)}]`,
      bg: `bg-[${adjustOpacity(brandColor, 0.1)}]`,
      border: `border-[${lighten(brandColor, 30)}]`,
      dot: `bg-[${brandColor}]`,
      raw: {
        text: darken(brandColor, 20),
        bg: lighten(brandColor, 45),
        border: lighten(brandColor, 30),
        dot: brandColor,
      },
    }
  }

  // Normal and low use muted gray
  return {
    text: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    dot: "bg-slate-400",
    raw: {
      text: "#475569",
      bg: "#f8fafc",
      border: "#e2e8f0",
      dot: "#94a3b8",
    },
  }
}

/**
 * Get energy level colors (always semantic, not brand-based)
 */
export function getEnergyLevelColors(level: EnergyLevel): StatusColorSet {
  const colors = {
    low: {
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
    high: {
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
    },
    peak: {
      text: "text-violet-700",
      bg: "bg-violet-50",
      border: "border-violet-200",
      dot: "bg-violet-500",
    },
  }

  return colors[level]
}

/**
 * Get focus score colors (semantic, represents quality)
 */
export function getFocusScoreColors(score: string): StatusColorSet {
  const scoreNum = parseFloat(score)

  if (scoreNum >= 90) {
    return {
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
    }
  } else if (scoreNum >= 75) {
    return {
      text: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      dot: "bg-blue-500",
    }
  } else if (scoreNum >= 60) {
    return {
      text: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      dot: "bg-amber-500",
    }
  } else {
    return {
      text: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
      dot: "bg-red-500",
    }
  }
}

/**
 * Helper to use in React components with workspace context
 */
export function useStatusColor(status: StatusType, brandColor?: string | null) {
  return getDynamicStatusColors(brandColor, status)
}
