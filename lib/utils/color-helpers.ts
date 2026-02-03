/**
 * Color Helper Utilities for Workspace Theming
 *
 * Provides functions for color manipulation, contrast checking,
 * and generating theme variants from workspace brand colors.
 */

/**
 * Convert hex color to RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`)
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  }
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * Lighten a hex color by a percentage (0-100)
 */
export function lighten(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex)
  const amt = Math.round(2.55 * percent)

  const newR = Math.min(255, Math.max(0, r + amt))
  const newG = Math.min(255, Math.max(0, g + amt))
  const newB = Math.min(255, Math.max(0, b + amt))

  return rgbToHex(newR, newG, newB)
}

/**
 * Darken a hex color by a percentage (0-100)
 */
export function darken(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex)
  const amt = Math.round(2.55 * percent)

  const newR = Math.min(255, Math.max(0, r - amt))
  const newG = Math.min(255, Math.max(0, g - amt))
  const newB = Math.min(255, Math.max(0, b - amt))

  return rgbToHex(newR, newG, newB)
}

/**
 * Adjust opacity of a hex color (returns rgba string)
 */
export function adjustOpacity(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Calculate relative luminance of a color (for WCAG contrast)
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
export function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)

  const rsRGB = r / 255
  const gsRGB = g / 255
  const bsRGB = b / 255

  const r2 = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4)
  const g2 = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4)
  const b2 = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4)

  return 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2
}

/**
 * Calculate contrast ratio between two colors
 * Returns value between 1 and 21
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Get appropriate text color (white or black) based on background
 * Ensures WCAG AA compliance (4.5:1 ratio for normal text)
 */
export function getContrastTextColor(bgColor: string): string {
  const whiteContrast = getContrastRatio(bgColor, "#ffffff")
  const blackContrast = getContrastRatio(bgColor, "#000000")

  // Return color with better contrast
  return whiteContrast > blackContrast ? "#ffffff" : "#000000"
}

/**
 * Check if color combination meets WCAG AA standard (4.5:1)
 */
export function meetsWCAG_AA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 4.5
}

/**
 * Check if color combination meets WCAG AAA standard (7:1)
 */
export function meetsWCAG_AAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 7.0
}

/**
 * Generate a linear gradient CSS string from two colors
 */
export function generateGradient(
  color1: string,
  color2: string,
  angle: number = 135
): string {
  return `linear-gradient(${angle}deg, ${color1}, ${color2})`
}

/**
 * Generate a 3-stop gradient from brand colors
 */
export function generateBrandGradient(
  primary: string,
  secondary: string,
  accent: string,
  angle: number = 135
): string {
  return `linear-gradient(${angle}deg, ${primary}, ${secondary}, ${accent})`
}

/**
 * Mix two colors together (simple average)
 */
export function mixColors(color1: string, color2: string, weight: number = 0.5): string {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)

  const r = Math.round(rgb1.r * weight + rgb2.r * (1 - weight))
  const g = Math.round(rgb1.g * weight + rgb2.g * (1 - weight))
  const b = Math.round(rgb1.b * weight + rgb2.b * (1 - weight))

  return rgbToHex(r, g, b)
}

/**
 * Generate color variants for a base color (for theming)
 */
export interface ColorVariants {
  base: string
  light: string
  lighter: string
  lightest: string
  dark: string
  darker: string
  darkest: string
  hover: string
  active: string
  disabled: string
  text: string // Contrasting text color
}

export function generateColorVariants(baseColor: string): ColorVariants {
  return {
    base: baseColor,
    light: lighten(baseColor, 10),
    lighter: lighten(baseColor, 20),
    lightest: lighten(baseColor, 40),
    dark: darken(baseColor, 10),
    darker: darken(baseColor, 20),
    darkest: darken(baseColor, 40),
    hover: lighten(baseColor, 8),
    active: darken(baseColor, 8),
    disabled: adjustOpacity(baseColor, 0.5),
    text: getContrastTextColor(baseColor),
  }
}

/**
 * Convert hex to HSL
 */
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex)

  const r2 = r / 255
  const g2 = g / 255
  const b2 = b / 255

  const max = Math.max(r2, g2, b2)
  const min = Math.min(r2, g2, b2)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r2:
        h = ((g2 - b2) / d + (g2 < b2 ? 6 : 0)) / 6
        break
      case g2:
        h = ((b2 - r2) / d + 2) / 6
        break
      case b2:
        h = ((r2 - g2) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * Convert HSL to hex
 */
export function hslToHex(h: number, s: number, l: number): string {
  const s2 = s / 100
  const l2 = l / 100

  const c = (1 - Math.abs(2 * l2 - 1)) * s2
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l2 - c / 2

  let r = 0
  let g = 0
  let b = 0

  if (h >= 0 && h < 60) {
    r = c
    g = x
    b = 0
  } else if (h >= 60 && h < 120) {
    r = x
    g = c
    b = 0
  } else if (h >= 120 && h < 180) {
    r = 0
    g = c
    b = x
  } else if (h >= 180 && h < 240) {
    r = 0
    g = x
    b = c
  } else if (h >= 240 && h < 300) {
    r = x
    g = 0
    b = c
  } else {
    r = c
    g = 0
    b = x
  }

  const r2 = Math.round((r + m) * 255)
  const g2 = Math.round((g + m) * 255)
  const b2 = Math.round((b + m) * 255)

  return rgbToHex(r2, g2, b2)
}

/**
 * Generate complementary color (opposite on color wheel)
 */
export function getComplementaryColor(hex: string): string {
  const { h, s, l } = hexToHSL(hex)
  const newH = (h + 180) % 360
  return hslToHex(newH, s, l)
}

/**
 * Generate analogous colors (adjacent on color wheel)
 */
export function getAnalogousColors(hex: string): [string, string] {
  const { h, s, l } = hexToHSL(hex)
  const color1 = hslToHex((h + 30) % 360, s, l)
  const color2 = hslToHex((h - 30 + 360) % 360, s, l)
  return [color1, color2]
}

/**
 * Generate triadic colors (120° apart on color wheel)
 */
export function getTriadicColors(hex: string): [string, string] {
  const { h, s, l } = hexToHSL(hex)
  const color1 = hslToHex((h + 120) % 360, s, l)
  const color2 = hslToHex((h + 240) % 360, s, l)
  return [color1, color2]
}
