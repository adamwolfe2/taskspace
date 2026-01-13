"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useApp } from "./app-context"
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
  const [colors, setColors] = useState<ExtractedColors>(defaultBrandColors)
  const [isLoading, setIsLoading] = useState(true)

  // Load brand colors from organization settings
  useEffect(() => {
    if (currentOrganization) {
      const orgPrimaryColor = currentOrganization.primaryColor

      if (orgPrimaryColor) {
        // Generate palette from organization's primary color
        try {
          const hsl = hexToHsl(orgPrimaryColor)
          const palette = generateColorPalette(hsl)
          setColors(palette)
        } catch (error) {
          console.error("Failed to parse organization color:", error)
          setColors(defaultBrandColors)
        }
      } else {
        setColors(defaultBrandColors)
      }
    }
    setIsLoading(false)
  }, [currentOrganization])

  // Apply CSS variables to document
  useEffect(() => {
    const cssVars = generateCSSVariables(colors)
    const root = document.documentElement

    // Set brand-specific CSS variables
    Object.entries(cssVars).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })

    // Parse primary color to RGB for CSS color system
    const hexToRgb = (hex: string): string => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return `${r} ${g} ${b}`
    }

    // Update the theme CSS variables to use brand colors
    // This makes all tailwind primary-* classes use the brand color
    const primaryRgb = hexToRgb(colors.primary)
    const accentRgb = hexToRgb(colors.accent)

    root.style.setProperty("--primary", primaryRgb)
    root.style.setProperty("--ring", primaryRgb)
    root.style.setProperty("--sidebar-primary", primaryRgb)
    root.style.setProperty("--sidebar-ring", primaryRgb)
    root.style.setProperty("--chart-1", primaryRgb)

    // Set accent colors
    const primaryHsl = cssVars["--brand-primary-hsl"]
    if (primaryHsl) {
      // Create lighter accent from primary
      const [h] = primaryHsl.split(" ")
      root.style.setProperty("--accent", `${parseInt(h)} 50% 97%`)
      root.style.setProperty("--sidebar-accent", `${parseInt(h)} 50% 97%`)
    }

    // Set foreground based on color brightness
    root.style.setProperty("--brand-primary-foreground", colors.text === "#1e293b" ? "#ffffff" : "#1e293b")
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
