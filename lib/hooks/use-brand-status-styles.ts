"use client"

import { useMemo } from "react"
import { useBrandTheme } from "@/lib/contexts/brand-theme-context"
import { lighten, darken } from "@/lib/utils/color-helpers"

type StyleSet = { backgroundColor: string; color: string; borderColor: string }

/**
 * Returns brand-aware inline styles for statuses and priorities.
 * Uses workspace brand colors for positive/active states,
 * keeps semantic colors for warning/danger states.
 */
export function useBrandStatusStyles() {
  const { colors } = useBrandTheme()

  return useMemo(() => {
    const p = colors.primary
    const s = colors.secondary

    const statusStyles: Record<string, StyleSet> = {
      // Brand-colored (positive/active states)
      active: { backgroundColor: lighten(p, 45), color: darken(p, 20), borderColor: lighten(p, 30) },
      "on-track": { backgroundColor: lighten(p, 45), color: darken(p, 20), borderColor: lighten(p, 30) },
      completed: { backgroundColor: lighten(p, 42), color: darken(p, 15), borderColor: lighten(p, 28) },
      "in-progress": { backgroundColor: lighten(p, 47), color: darken(p, 10), borderColor: lighten(p, 35) },

      // Secondary brand (neutral states)
      planning: { backgroundColor: lighten(s, 50), color: darken(s, 5), borderColor: lighten(s, 38) },

      // Secondary brand (client/misc statuses)
      prospect: { backgroundColor: lighten(s, 50), color: darken(s, 5), borderColor: lighten(s, 38) },
      inactive: { backgroundColor: "#f1f5f9", color: "#475569", borderColor: "#e2e8f0" },
      archived: { backgroundColor: "#f1f5f9", color: "#475569", borderColor: "#e2e8f0" },

      // Semantic (always these colors regardless of brand)
      pending: { backgroundColor: "#f8fafc", color: "#475569", borderColor: "#e2e8f0" },
      "at-risk": { backgroundColor: "#fffbeb", color: "#b45309", borderColor: "#fde68a" },
      "on-hold": { backgroundColor: "#fffbeb", color: "#b45309", borderColor: "#fde68a" },
      blocked: { backgroundColor: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" },
      cancelled: { backgroundColor: "#f1f5f9", color: "#475569", borderColor: "#e2e8f0" },
    }

    const priorityStyles: Record<string, StyleSet> = {
      critical: { backgroundColor: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" },
      high: { backgroundColor: lighten(p, 45), color: darken(p, 20), borderColor: lighten(p, 30) },
      medium: { backgroundColor: lighten(s, 50), color: darken(s, 5), borderColor: lighten(s, 38) },
      normal: { backgroundColor: "#f8fafc", color: "#475569", borderColor: "#e2e8f0" },
      low: { backgroundColor: "#f8fafc", color: "#64748b", borderColor: "#e2e8f0" },
    }

    const fallback: StyleSet = { backgroundColor: "#f8fafc", color: "#475569", borderColor: "#e2e8f0" }

    return {
      getStatusStyle: (status: string): StyleSet => statusStyles[status] || fallback,
      getPriorityStyle: (priority: string): StyleSet => priorityStyles[priority] || fallback,
      brandPrimary: p,
      brandSecondary: s,
      brandAccent: colors.accent,
    }
  }, [colors])
}
