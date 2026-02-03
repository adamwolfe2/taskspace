"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useApp } from "./app-context"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import {
  ExtractedColors,
  defaultBrandColors,
  generateCSSVariables,
  hexToHsl,
  generateColorPalette,
} from "@/lib/utils/color-extractor"

interface BrandThemeContextValue {
  colors: ExtractedColors
  isLoading: boolean
  updateBrandColors: (colors: Partial<ExtractedColors>) => void
  resetToDefault: () => void
}

const BrandThemeContext = createContext<BrandThemeContextValue | undefined>(undefined)

interface BrandThemeProviderProps {
  children: ReactNode
}

export function BrandThemeProvider({ children }: BrandThemeProviderProps) {
  const { currentOrganization } = useApp()
  const { currentWorkspace } = useWorkspaces()
  const [colors, setColors] = useState<ExtractedColors>(defaultBrandColors)
  const [isLoading, setIsLoading] = useState(true)

  // Load brand colors from workspace (with fallback to organization)
  useEffect(() => {
    // Priority: Workspace colors > Organization colors > Default monochrome
    const primaryColor =
      currentWorkspace?.primaryColor ||
      currentOrganization?.primaryColor ||
      null

    const secondaryColor = currentWorkspace?.secondaryColor || null
    const accentColor = currentWorkspace?.accentColor || null

    if (primaryColor) {
      // If we have all three colors from workspace, use them directly
      if (secondaryColor && accentColor) {
        setColors({
          primary: primaryColor,
          secondary: secondaryColor,
          accent: accentColor,
          text: "#ffffff", // Will be recalculated based on brightness
          background: `${primaryColor}0D`, // Primary with 5% opacity
        })
      } else {
        // Generate palette from primary color only
        try {
          const hsl = hexToHsl(primaryColor)
          const palette = generateColorPalette(hsl)
          setColors(palette)
        } catch (error) {
          console.error("Failed to parse brand color:", error)
          setColors(defaultBrandColors)
        }
      }
    } else {
      // No workspace or organization colors - use monochrome default
      setColors(defaultBrandColors)
    }

    setIsLoading(false)
  }, [currentWorkspace, currentOrganization])

  // Apply CSS variables to document
  useEffect(() => {
    const cssVars = generateCSSVariables(colors)
    const root = document.documentElement

    // Set brand-specific CSS variables
    Object.entries(cssVars).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })

    // Helper functions for color manipulation
    const hexToRgb = (hex: string): string => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return `${r} ${g} ${b}`
    }

    const lightenColor = (hex: string, percent: number): string => {
      const num = parseInt(hex.replace("#", ""), 16)
      const amt = Math.round(2.55 * percent)
      const R = (num >> 16) + amt
      const G = ((num >> 8) & 0x00ff) + amt
      const B = (num & 0x0000ff) + amt
      return `#${(
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)}`
    }

    const darkenColor = (hex: string, percent: number): string => {
      const num = parseInt(hex.replace("#", ""), 16)
      const amt = Math.round(2.55 * percent)
      const R = (num >> 16) - amt
      const G = ((num >> 8) & 0x00ff) - amt
      const B = (num & 0x0000ff) - amt
      return `#${(
        0x1000000 +
        (R > 0 ? R : 0) * 0x10000 +
        (G > 0 ? G : 0) * 0x100 +
        (B > 0 ? B : 0)
      )
        .toString(16)
        .slice(1)}`
    }

    // Map all three brand colors to CSS variables
    const primaryRgb = hexToRgb(colors.primary)
    const secondaryRgb = hexToRgb(colors.secondary)
    const accentRgb = hexToRgb(colors.accent)

    // Primary color variants
    root.style.setProperty("--brand-primary", colors.primary)
    root.style.setProperty("--brand-primary-rgb", primaryRgb)
    root.style.setProperty("--brand-primary-hover", lightenColor(colors.primary, 10))
    root.style.setProperty("--brand-primary-active", darkenColor(colors.primary, 10))

    // Secondary color variants
    root.style.setProperty("--brand-secondary", colors.secondary)
    root.style.setProperty("--brand-secondary-rgb", secondaryRgb)
    root.style.setProperty("--brand-secondary-hover", lightenColor(colors.secondary, 10))

    // Accent color variants
    root.style.setProperty("--brand-accent", colors.accent)
    root.style.setProperty("--brand-accent-rgb", accentRgb)
    root.style.setProperty("--brand-accent-hover", lightenColor(colors.accent, 10))

    // Gradient
    root.style.setProperty(
      "--brand-gradient",
      `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
    )

    // Update the theme CSS variables to use brand colors
    // This makes all tailwind primary-* classes use the brand color
    root.style.setProperty("--primary", primaryRgb)
    root.style.setProperty("--ring", primaryRgb)
    root.style.setProperty("--sidebar-primary", primaryRgb)
    root.style.setProperty("--sidebar-ring", primaryRgb)
    root.style.setProperty("--chart-1", primaryRgb)
    root.style.setProperty("--chart-2", secondaryRgb)
    root.style.setProperty("--chart-5", accentRgb)

    // Set accent colors from secondary
    root.style.setProperty("--accent", secondaryRgb)
    root.style.setProperty("--sidebar-accent", secondaryRgb)

    // Set foreground based on color brightness
    root.style.setProperty(
      "--brand-primary-foreground",
      colors.text === "#1e293b" ? "#ffffff" : "#1e293b"
    )
  }, [colors])

  const updateBrandColors = (newColors: Partial<ExtractedColors>) => {
    setColors((prev) => ({ ...prev, ...newColors }))
  }

  const resetToDefault = () => {
    setColors(defaultBrandColors)
  }

  return (
    <BrandThemeContext.Provider
      value={{
        colors,
        isLoading,
        updateBrandColors,
        resetToDefault,
      }}
    >
      {children}
    </BrandThemeContext.Provider>
  )
}

export function useBrandTheme() {
  const context = useContext(BrandThemeContext)
  if (!context) {
    throw new Error("useBrandTheme must be used within a BrandThemeProvider")
  }
  return context
}
