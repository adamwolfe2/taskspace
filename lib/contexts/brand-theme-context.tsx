"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from "react"
import { useApp } from "./app-context"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import {
  ExtractedColors,
  defaultBrandColors,
  generateCSSVariables,
  hexToHsl,
  generateColorPalette,
  refineExtractedColors,
} from "@/lib/utils/color-extractor"

// Color calculation cache
const colorCalculationCache = new Map<string, ExtractedColors>()

// Debounce helper
function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

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
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Track previous workspace ID to detect changes
  const prevWorkspaceId = useRef<string | null>(null)

  // Memoized color calculation with caching
  const calculateColors = useMemo(() => {
    return (
      primaryColor: string | null,
      secondaryColor: string | null,
      accentColor: string | null
    ): ExtractedColors => {
      // Create cache key
      const cacheKey = `${primaryColor}-${secondaryColor}-${accentColor}`

      // Check cache first
      if (colorCalculationCache.has(cacheKey)) {
        return colorCalculationCache.get(cacheKey)!
      }

      let calculatedColors: ExtractedColors

      if (primaryColor) {
        // If we have all three colors from workspace, use them directly
        if (secondaryColor && accentColor) {
          calculatedColors = {
            primary: primaryColor,
            secondary: secondaryColor,
            accent: accentColor,
            text: "#ffffff",
            background: `${primaryColor}0D`,
          }
        } else {
          // Generate palette from primary color only
          try {
            const hsl = hexToHsl(primaryColor)
            calculatedColors = generateColorPalette(hsl)
          } catch {
            // Silently ignore invalid brand color
            calculatedColors = defaultBrandColors
          }
        }

        // Refine colors to ensure quality
        calculatedColors = refineExtractedColors(calculatedColors)
      } else {
        // No workspace or organization colors - use monochrome default
        calculatedColors = defaultBrandColors
      }

      // Cache the result
      colorCalculationCache.set(cacheKey, calculatedColors)

      // Limit cache size to prevent memory leaks
      if (colorCalculationCache.size > 50) {
        const firstKey = colorCalculationCache.keys().next().value
        if (firstKey) {
          colorCalculationCache.delete(firstKey)
        }
      }

      return calculatedColors
    }
  }, [])

  // Load brand colors from workspace (with fallback to organization)
  useEffect(() => {
    // Priority: Workspace colors > Organization colors > Default monochrome
    const primaryColor =
      currentWorkspace?.primaryColor ||
      currentOrganization?.primaryColor ||
      null

    const secondaryColor =
      currentWorkspace?.secondaryColor ||
      currentOrganization?.secondaryColor ||
      null

    const accentColor =
      currentWorkspace?.accentColor ||
      currentOrganization?.accentColor ||
      null

    // Detect workspace change for transition animation
    const workspaceChanged =
      prevWorkspaceId.current !== null &&
      prevWorkspaceId.current !== currentWorkspace?.id

    if (workspaceChanged) {
      setIsTransitioning(true)
      setTimeout(() => setIsTransitioning(false), 300) // Match CSS transition duration
    }

    prevWorkspaceId.current = currentWorkspace?.id || null

    const newColors = calculateColors(primaryColor, secondaryColor, accentColor)
    setColors(newColors)
    setIsLoading(false)
  }, [currentWorkspace, currentOrganization, calculateColors])

  // Debounced CSS variable application for performance
  // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce() returns a new function, deps are captured in closure
  const applyCSSVariables = useCallback(
    debounce((colorsToApply: ExtractedColors) => {
      const cssVars = generateCSSVariables(colorsToApply)
      const root = document.documentElement

      // Add transition class for smooth color changes
      if (isTransitioning) {
        root.classList.add('theme-transitioning')
      }

      // Set brand-specific CSS variables
      Object.entries(cssVars).forEach(([property, value]) => {
        root.style.setProperty(property, value)
      })

      // Remove transition class after animation completes
      if (isTransitioning) {
        setTimeout(() => {
          root.classList.remove('theme-transitioning')
        }, 300)
      }
    }, 50), // 50ms debounce
     
    [isTransitioning]
  )

  // Apply CSS variables to document
  useEffect(() => {
    applyCSSVariables(colors)

    const root = document.documentElement

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyCSSVariables is a debounced callback; adding it would cause infinite re-renders
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

// Default context value used when no BrandThemeProvider is present
// (e.g. public-facing pages that don't have the authenticated app layout).
const defaultBrandThemeContext: BrandThemeContextValue = {
  colors: defaultBrandColors,
  isLoading: false,
  updateBrandColors: () => {},
  resetToDefault: () => {},
}

export function useBrandTheme() {
  const context = useContext(BrandThemeContext)
  // Return safe defaults instead of crashing when used outside the provider
  // (public EOD pages, marketing pages, etc.)
  return context ?? defaultBrandThemeContext
}
