"use client"

import { useBrandTheme } from "@/lib/contexts/brand-theme-context"

/**
 * Color manipulation utilities for theming
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 }
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16)
        return hex.length === 1 ? "0" + hex : hex
      })
      .join("")
  )
}

/**
 * Lighten a hex color by a percentage
 * @param hex - Hex color string (e.g., "#6366f1")
 * @param percent - Percentage to lighten (0-100)
 * @returns Lightened hex color
 */
export function lightenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex)
  const amt = Math.round(2.55 * percent)
  return rgbToHex(
    Math.min(255, r + amt),
    Math.min(255, g + amt),
    Math.min(255, b + amt)
  )
}

/**
 * Darken a hex color by a percentage
 * @param hex - Hex color string (e.g., "#6366f1")
 * @param percent - Percentage to darken (0-100)
 * @returns Darkened hex color
 */
export function darkenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex)
  const amt = Math.round(2.55 * percent)
  return rgbToHex(
    Math.max(0, r - amt),
    Math.max(0, g - amt),
    Math.max(0, b - amt)
  )
}

/**
 * Adjust alpha transparency of a hex color
 * @param hex - Hex color string (e.g., "#6366f1")
 * @param alpha - Alpha value (0-1)
 * @returns RGBA string
 */
export function adjustAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}

/**
 * Hook to access themed icon colors with computed variants
 * Provides consistent brand colors across the application
 */
export function useThemedIconColors() {
  // Try to get brand theme, fallback to default colors if provider not available
  let colors = { primary: "#000000", secondary: "#64748b", accent: "#000000" }

  try {
    const theme = useBrandTheme()
    colors = theme.colors
  } catch {
    // Use default colors when BrandThemeProvider is not available (e.g., marketing pages)
  }

  return {
    // Base brand colors
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,

    // Primary color variants
    primaryLight: lightenColor(colors.primary, 10),
    primaryDark: darkenColor(colors.primary, 10),
    primaryLighter: lightenColor(colors.primary, 20),
    primaryAlpha10: adjustAlpha(colors.primary, 0.1),
    primaryAlpha20: adjustAlpha(colors.primary, 0.2),
    primaryAlpha50: adjustAlpha(colors.primary, 0.5),

    // Secondary color variants
    secondaryLight: lightenColor(colors.secondary, 10),
    secondaryDark: darkenColor(colors.secondary, 10),
    secondaryLighter: lightenColor(colors.secondary, 20),
    secondaryAlpha10: adjustAlpha(colors.secondary, 0.1),
    secondaryAlpha20: adjustAlpha(colors.secondary, 0.2),
    secondaryAlpha50: adjustAlpha(colors.secondary, 0.5),

    // Accent color variants
    accentLight: lightenColor(colors.accent, 10),
    accentDark: darkenColor(colors.accent, 10),
    accentLighter: lightenColor(colors.accent, 20),
    accentAlpha10: adjustAlpha(colors.accent, 0.1),
    accentAlpha20: adjustAlpha(colors.accent, 0.2),
    accentAlpha50: adjustAlpha(colors.accent, 0.5),

    // Gradient combinations
    primaryGradient: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
    accentGradient: `linear-gradient(135deg, ${colors.secondary}, ${colors.accent})`,
    fullGradient: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary}, ${colors.accent})`,
  }
}
