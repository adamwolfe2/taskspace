/**
 * Color extraction utility for extracting dominant colors from images
 * Used to automatically generate brand colors from uploaded logos
 */

export interface ExtractedColors {
  primary: string      // Main dominant color
  secondary: string    // Secondary color (lighter/complementary)
  accent: string       // Accent color for highlights
  text: string         // Recommended text color for contrast
  background: string   // Recommended background tint
}

interface RGB {
  r: number
  g: number
  b: number
}

interface HSL {
  h: number
  s: number
  l: number
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
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
 * Convert HSL to hex color string
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0,
    g = 0,
    b = 0

  if (0 <= h && h < 60) {
    r = c
    g = x
    b = 0
  } else if (60 <= h && h < 120) {
    r = x
    g = c
    b = 0
  } else if (120 <= h && h < 180) {
    r = 0
    g = c
    b = x
  } else if (180 <= h && h < 240) {
    r = 0
    g = x
    b = c
  } else if (240 <= h && h < 300) {
    r = x
    g = 0
    b = c
  } else if (300 <= h && h < 360) {
    r = c
    g = 0
    b = x
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16)
    return hex.length === 1 ? "0" + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Calculate relative luminance for contrast calculations
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Check if a color is too light or too dark for use as primary
 */
function isViableColor(hsl: HSL): boolean {
  // Avoid colors that are too light (nearly white) or too dark (nearly black)
  return hsl.l > 15 && hsl.l < 85 && hsl.s > 10
}

/**
 * Extract dominant colors from an image using canvas
 * This uses a simplified k-means-like approach
 */
export async function extractColorsFromImage(
  imageUrl: string
): Promise<ExtractedColors> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      try {
        // Create canvas and draw image
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          throw new Error("Could not get canvas context")
        }

        // Scale down for performance (max 100x100)
        const scale = Math.min(100 / img.width, 100 / img.height, 1)
        canvas.width = Math.floor(img.width * scale)
        canvas.height = Math.floor(img.height * scale)

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const pixels = imageData.data

        // Collect colors, skipping transparent and near-white/black pixels
        const colorCounts = new Map<string, { count: number; rgb: RGB }>()

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i]
          const g = pixels[i + 1]
          const b = pixels[i + 2]
          const a = pixels[i + 3]

          // Skip transparent pixels
          if (a < 128) continue

          // Skip very light or very dark pixels
          const luminance = getLuminance(r, g, b)
          if (luminance < 0.05 || luminance > 0.95) continue

          // Quantize to reduce color space (group similar colors)
          const qr = Math.round(r / 32) * 32
          const qg = Math.round(g / 32) * 32
          const qb = Math.round(b / 32) * 32
          const key = `${qr},${qg},${qb}`

          const existing = colorCounts.get(key)
          if (existing) {
            existing.count++
          } else {
            colorCounts.set(key, { count: 1, rgb: { r: qr, g: qg, b: qb } })
          }
        }

        // Sort by frequency and find best primary color
        const sortedColors = Array.from(colorCounts.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10) // Top 10 colors

        // Find the most vibrant/saturated color that's viable
        let primaryRgb: RGB = { r: 59, g: 130, b: 246 } // Default blue
        let primaryHsl: HSL = { h: 217, s: 91, l: 60 }

        for (const { rgb } of sortedColors) {
          const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
          if (isViableColor(hsl)) {
            // Prefer more saturated colors
            if (hsl.s > primaryHsl.s || !isViableColor(primaryHsl)) {
              primaryRgb = rgb
              primaryHsl = hsl
            }
          }
        }

        // Generate color palette based on primary
        const colors = generateColorPalette(primaryHsl)
        resolve(colors)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error("Failed to load image"))
    }

    img.src = imageUrl
  })
}

/**
 * Generate a full color palette from a base HSL color
 */
export function generateColorPalette(baseHsl: HSL): ExtractedColors {
  const { h, s } = baseHsl

  // Ensure good saturation and lightness for primary
  const adjustedS = Math.max(s, 50)
  const adjustedL = Math.min(Math.max(baseHsl.l, 35), 55)

  return {
    primary: hslToHex(h, adjustedS, adjustedL),
    secondary: hslToHex(h, Math.max(adjustedS - 20, 30), Math.min(adjustedL + 20, 70)),
    accent: hslToHex((h + 30) % 360, adjustedS, adjustedL),
    text: adjustedL > 50 ? "#1e293b" : "#f8fafc", // Slate-800 or Slate-50
    background: hslToHex(h, Math.max(adjustedS - 40, 10), 97),
  }
}

/**
 * Generate CSS custom properties object for theming
 */
export function generateCSSVariables(colors: ExtractedColors): Record<string, string> {
  // Parse hex to get HSL values for CSS variables
  const hexToHslString = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const { h, s, l } = rgbToHsl(r, g, b)
    return `${h} ${s}% ${l}%`
  }

  return {
    "--brand-primary": colors.primary,
    "--brand-primary-hsl": hexToHslString(colors.primary),
    "--brand-secondary": colors.secondary,
    "--brand-secondary-hsl": hexToHslString(colors.secondary),
    "--brand-accent": colors.accent,
    "--brand-accent-hsl": hexToHslString(colors.accent),
    "--brand-text": colors.text,
    "--brand-background": colors.background,
    "--brand-background-hsl": hexToHslString(colors.background),
  }
}

/**
 * Generate color from hex string
 */
export function hexToHsl(hex: string): HSL {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return rgbToHsl(r, g, b)
}

/**
 * Default brand colors (blue theme)
 */
export const defaultBrandColors: ExtractedColors = {
  primary: "#3b82f6",    // Blue-500
  secondary: "#60a5fa",  // Blue-400
  accent: "#8b5cf6",     // Violet-500
  text: "#1e293b",       // Slate-800
  background: "#f8fafc", // Slate-50
}
