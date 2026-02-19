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
  personality?: BrandPersonality // Optional personality analysis
}

export interface BrandPersonality {
  vibrancy: 'vibrant' | 'balanced' | 'muted'
  temperature: 'warm' | 'neutral' | 'cool'
  formality: 'professional' | 'casual' | 'creative'
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
 * Score a color for brand suitability
 * Higher score = better for use as primary brand color
 */
function scoreBrandColor(hsl: HSL): number {
  let score = 0

  // Prefer moderate to high saturation (40-80%)
  if (hsl.s >= 40 && hsl.s <= 80) {
    score += 30
  } else if (hsl.s >= 30 && hsl.s < 40) {
    score += 20
  } else if (hsl.s > 80) {
    score += 15 // Very saturated colors can be too intense
  }

  // Prefer moderate lightness (35-65%)
  if (hsl.l >= 35 && hsl.l <= 65) {
    score += 30
  } else if (hsl.l >= 25 && hsl.l < 35) {
    score += 20
  } else if (hsl.l > 65 && hsl.l < 75) {
    score += 20
  }

  // Slight preference for cooler colors (blues, greens) as they're more common in branding
  if (hsl.h >= 180 && hsl.h <= 260) {
    score += 10
  }

  // Bonus for colors in the "brand-friendly" zones
  // Blues (200-240), Greens (120-180), Purples (260-300)
  if (
    (hsl.h >= 200 && hsl.h <= 240) ||
    (hsl.h >= 120 && hsl.h <= 180) ||
    (hsl.h >= 260 && hsl.h <= 300)
  ) {
    score += 10
  }

  return score
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
          .slice(0, 15) // Top 15 colors for more options

        // Find the best brand color using scoring system
        let _primaryRgb: RGB = { r: 59, g: 130, b: 246 } // Default blue
        let primaryHsl: HSL = { h: 217, s: 91, l: 60 }
        let bestScore = 0

        for (const { rgb, count } of sortedColors) {
          const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
          if (isViableColor(hsl)) {
            // Calculate brand suitability score
            let score = scoreBrandColor(hsl)

            // Weight by frequency (more common colors get a bonus)
            const frequencyBonus = Math.min((count / sortedColors[0].count) * 20, 20)
            score += frequencyBonus

            if (score > bestScore) {
              bestScore = score
              _primaryRgb = rgb
              primaryHsl = hsl
            }
          }
        }

        // If no viable color was found (very rare), use the most frequent color anyway
        if (bestScore === 0 && sortedColors.length > 0) {
          const { rgb } = sortedColors[0]
          _primaryRgb = rgb
          primaryHsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
        }

        // Analyze brand personality
        const personality = analyzeBrandPersonality(primaryHsl)

        // Generate color palette based on primary with personality awareness
        let colors = generateColorPalette(primaryHsl, personality)

        // Refine colors to ensure quality standards
        colors = refineExtractedColors(colors)

        // Include personality in the result
        resolve({ ...colors, personality })
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
 * Analyze brand personality from color characteristics
 */
export function analyzeBrandPersonality(hsl: HSL): BrandPersonality {
  const { h, s, l } = hsl

  // Determine vibrancy based on saturation
  let vibrancy: BrandPersonality['vibrancy']
  if (s >= 70) {
    vibrancy = 'vibrant'
  } else if (s >= 40) {
    vibrancy = 'balanced'
  } else {
    vibrancy = 'muted'
  }

  // Determine temperature based on hue
  // Warm: red, orange, yellow (0-60°, 330-360°)
  // Cool: green, blue, purple (120-300°)
  // Neutral: yellow-green, purple-red (60-120°, 300-330°)
  let temperature: BrandPersonality['temperature']
  if ((h >= 0 && h < 60) || (h >= 330 && h <= 360)) {
    temperature = 'warm'
  } else if (h >= 120 && h < 300) {
    temperature = 'cool'
  } else {
    temperature = 'neutral'
  }

  // Determine formality based on saturation and lightness
  // Professional: moderate saturation, moderate lightness
  // Creative: high saturation or extreme lightness
  // Casual: low saturation, lighter colors
  let formality: BrandPersonality['formality']
  if (s >= 60 && (l < 35 || l > 65)) {
    formality = 'creative'
  } else if (s < 40 && l > 60) {
    formality = 'casual'
  } else {
    formality = 'professional'
  }

  return { vibrancy, temperature, formality }
}

/**
 * Generate complementary hue shift based on brand personality
 */
function getAccentHueShift(personality: BrandPersonality): number {
  // Creative brands get more dramatic shifts
  if (personality.formality === 'creative') {
    return personality.vibrancy === 'vibrant' ? 60 : 45
  }

  // Professional brands get subtle shifts
  if (personality.formality === 'professional') {
    return personality.vibrancy === 'muted' ? 20 : 30
  }

  // Casual brands get moderate shifts
  return 35
}

/**
 * Generate a full color palette from a base HSL color with personality awareness
 */
export function generateColorPalette(baseHsl: HSL, personality?: BrandPersonality): ExtractedColors {
  const { h, s, l } = baseHsl

  // Analyze personality if not provided
  const brandPersonality = personality || analyzeBrandPersonality(baseHsl)

  // Adjust primary color based on personality
  let adjustedS = s
  let adjustedL = l

  // Ensure good saturation and lightness for primary
  if (brandPersonality.vibrancy === 'vibrant') {
    adjustedS = Math.max(s, 60)
    adjustedL = Math.min(Math.max(l, 40), 55)
  } else if (brandPersonality.vibrancy === 'balanced') {
    adjustedS = Math.max(s, 45)
    adjustedL = Math.min(Math.max(l, 35), 60)
  } else {
    // Muted - preserve the muted nature
    adjustedS = Math.min(Math.max(s, 25), 50)
    adjustedL = Math.min(Math.max(l, 30), 65)
  }

  // Generate accent color with personality-aware hue shift
  const accentShift = getAccentHueShift(brandPersonality)
  const accentHue = (h + accentShift) % 360

  // Secondary color - lighter/softer version of primary
  const secondaryS = Math.max(adjustedS - 20, 25)
  const secondaryL = Math.min(adjustedL + 15, 70)

  // Background - very light tint
  const backgroundS = Math.max(adjustedS - 40, 8)
  const backgroundL = 97

  // Text color based on overall lightness
  const textColor = adjustedL > 50 ? "#1e293b" : "#f8fafc" // Slate-800 or Slate-50

  return {
    primary: hslToHex(h, adjustedS, adjustedL),
    secondary: hslToHex(h, secondaryS, secondaryL),
    accent: hslToHex(accentHue, adjustedS, adjustedL),
    text: textColor,
    background: hslToHex(h, backgroundS, backgroundL),
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
  personality: {
    vibrancy: 'vibrant',
    temperature: 'cool',
    formality: 'professional',
  },
}

/**
 * Generate professional gradient based on brand personality
 */
export function generateBrandGradient(
  colors: ExtractedColors,
  angle: number = 135
): string {
  const personality = colors.personality

  if (!personality) {
    // Default gradient
    return `linear-gradient(${angle}deg, ${colors.primary} 0%, ${colors.accent} 100%)`
  }

  // Creative brands get multi-stop gradients
  if (personality.formality === 'creative') {
    return `linear-gradient(${angle}deg, ${colors.primary} 0%, ${colors.accent} 50%, ${colors.secondary} 100%)`
  }

  // Professional brands get subtle two-tone gradients
  if (personality.formality === 'professional') {
    // Use primary and slightly lighter variant
    const primaryHsl = hexToHsl(colors.primary)
    const lighterPrimary = hslToHex(primaryHsl.h, primaryHsl.s, Math.min(primaryHsl.l + 10, 65))
    return `linear-gradient(${angle}deg, ${colors.primary} 0%, ${lighterPrimary} 100%)`
  }

  // Casual brands get primary to secondary gradient
  return `linear-gradient(${angle}deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
}

/**
 * Generate gradient presets for different use cases
 */
export function generateGradientPresets(colors: ExtractedColors): Record<string, string> {
  return {
    // Hero backgrounds - dramatic diagonal
    hero: generateBrandGradient(colors, 135),

    // Card highlights - subtle vertical
    card: generateBrandGradient(colors, 180),

    // Button hover - subtle horizontal
    button: generateBrandGradient(colors, 90),

    // Sidebar/navigation - top to bottom
    sidebar: generateBrandGradient(colors, 180),

    // Radial for spotlight effects
    radial: `radial-gradient(circle at top left, ${colors.primary} 0%, ${colors.accent} 100%)`,

    // Mesh gradient for modern backgrounds
    mesh: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 50%, ${colors.secondary} 100%)`,
  }
}

/**
 * Get recommended gradient angle based on personality
 */
export function getRecommendedGradientAngle(personality: BrandPersonality): number {
  // Creative brands - dramatic angles
  if (personality.formality === 'creative') {
    return personality.temperature === 'warm' ? 45 : 135
  }

  // Professional brands - classic angles
  if (personality.formality === 'professional') {
    return 180 // Top to bottom
  }

  // Casual brands - friendly diagonal
  return 120
}

/**
 * Generate alternative color schemes for preset options
 */
export function generateColorPresets(baseHsl: HSL): {
  original: ExtractedColors
  vibrant: ExtractedColors
  muted: ExtractedColors
  professional: ExtractedColors
} {
  const personality = analyzeBrandPersonality(baseHsl)

  // Original - as extracted
  const original = generateColorPalette(baseHsl, personality)

  // Vibrant - boost saturation
  const vibrantHsl: HSL = {
    h: baseHsl.h,
    s: Math.min(baseHsl.s + 20, 90),
    l: Math.min(Math.max(baseHsl.l, 45), 55),
  }
  const vibrant = generateColorPalette(vibrantHsl, {
    ...personality,
    vibrancy: 'vibrant',
  })

  // Muted - reduce saturation
  const mutedHsl: HSL = {
    h: baseHsl.h,
    s: Math.max(baseHsl.s - 20, 30),
    l: Math.min(Math.max(baseHsl.l, 35), 60),
  }
  const muted = generateColorPalette(mutedHsl, {
    ...personality,
    vibrancy: 'muted',
  })

  // Professional - balanced and moderate
  const professionalHsl: HSL = {
    h: baseHsl.h,
    s: Math.min(Math.max(baseHsl.s, 45), 65),
    l: Math.min(Math.max(baseHsl.l, 40), 55),
  }
  const professional = generateColorPalette(professionalHsl, {
    vibrancy: 'balanced',
    temperature: personality.temperature,
    formality: 'professional',
  })

  return { original, vibrant, muted, professional }
}

/**
 * Validate color accessibility for text/background combinations
 */
export function validateColorAccessibility(
  foreground: string,
  background: string
): {
  ratio: number
  meetsAA: boolean
  meetsAAA: boolean
  recommendation?: string
} {
  const _fgHsl = hexToHsl(foreground)
  const _bgHsl = hexToHsl(background)

  const fgLuminance = getLuminance(
    parseInt(foreground.slice(1, 3), 16),
    parseInt(foreground.slice(3, 5), 16),
    parseInt(foreground.slice(5, 7), 16)
  )

  const bgLuminance = getLuminance(
    parseInt(background.slice(1, 3), 16),
    parseInt(background.slice(3, 5), 16),
    parseInt(background.slice(5, 7), 16)
  )

  const ratio =
    fgLuminance > bgLuminance
      ? (fgLuminance + 0.05) / (bgLuminance + 0.05)
      : (bgLuminance + 0.05) / (fgLuminance + 0.05)

  const meetsAA = ratio >= 4.5
  const meetsAAA = ratio >= 7

  let recommendation: string | undefined

  if (!meetsAA) {
    // Suggest darkening or lightening
    if (fgLuminance > bgLuminance) {
      recommendation = 'Darken the foreground or lighten the background'
    } else {
      recommendation = 'Lighten the foreground or darken the background'
    }
  }

  return { ratio, meetsAA, meetsAAA, recommendation }
}

/**
 * Refine extracted colors to ensure they meet quality standards
 */
export function refineExtractedColors(colors: ExtractedColors): ExtractedColors {
  const primaryHsl = hexToHsl(colors.primary)

  // Ensure primary color has sufficient saturation
  if (primaryHsl.s < 25) {
    primaryHsl.s = 25
    colors.primary = hslToHex(primaryHsl.h, primaryHsl.s, primaryHsl.l)
  }

  // Ensure primary color has appropriate lightness
  if (primaryHsl.l < 25) {
    primaryHsl.l = 30
    colors.primary = hslToHex(primaryHsl.h, primaryHsl.s, primaryHsl.l)
  } else if (primaryHsl.l > 75) {
    primaryHsl.l = 70
    colors.primary = hslToHex(primaryHsl.h, primaryHsl.s, primaryHsl.l)
  }

  // Verify text color has sufficient contrast with background
  const textContrast = validateColorAccessibility(colors.text, colors.background)
  if (!textContrast.meetsAA) {
    // Force dark text on light background
    colors.text = '#1e293b'
    colors.background = hslToHex(primaryHsl.h, Math.max(primaryHsl.s - 40, 8), 97)
  }

  // Ensure secondary is distinguishable from primary
  const secondaryHsl = hexToHsl(colors.secondary)
  const lightnessDiff = Math.abs(secondaryHsl.l - primaryHsl.l)
  if (lightnessDiff < 10) {
    secondaryHsl.l = Math.min(primaryHsl.l + 15, 75)
    colors.secondary = hslToHex(secondaryHsl.h, secondaryHsl.s, secondaryHsl.l)
  }

  return colors
}

/**
 * Analyze extracted colors and provide improvement suggestions
 */
export function analyzeColorQuality(colors: ExtractedColors): {
  overall: 'excellent' | 'good' | 'fair' | 'needs-improvement'
  issues: string[]
  suggestions: string[]
} {
  const issues: string[] = []
  const suggestions: string[] = []

  const primaryHsl = hexToHsl(colors.primary)

  // Check saturation
  if (primaryHsl.s < 30) {
    issues.push('Low saturation may appear dull')
    suggestions.push('Consider boosting saturation to 40-60% for more vibrant branding')
  } else if (primaryHsl.s > 85) {
    issues.push('Very high saturation may be overwhelming')
    suggestions.push('Consider reducing saturation to 60-80% for better balance')
  }

  // Check lightness
  if (primaryHsl.l < 30) {
    issues.push('Very dark primary color may limit usage')
    suggestions.push('Lighten to 35-55% for more versatile applications')
  } else if (primaryHsl.l > 70) {
    issues.push('Very light primary color may lack impact')
    suggestions.push('Darken to 40-60% for stronger brand presence')
  }

  // Check text contrast
  const textContrast = validateColorAccessibility(colors.text, colors.background)
  if (!textContrast.meetsAA) {
    issues.push('Insufficient text contrast (WCAG AA)')
    suggestions.push('Adjust text or background colors for better accessibility')
  }

  // Check if colors are too similar
  const secondaryHsl = hexToHsl(colors.secondary)
  const accentHsl = hexToHsl(colors.accent)

  const primarySecondaryDiff = Math.abs(primaryHsl.h - secondaryHsl.h)
  if (primarySecondaryDiff < 10 && Math.abs(primaryHsl.l - secondaryHsl.l) < 15) {
    issues.push('Primary and secondary colors are too similar')
    suggestions.push('Increase lightness difference or choose distinct hues')
  }

  const primaryAccentDiff = Math.abs(primaryHsl.h - accentHsl.h)
  if (primaryAccentDiff < 20 && primaryAccentDiff > 0) {
    suggestions.push('Accent color could be more distinct (try 30-60° hue shift)')
  }

  // Determine overall quality
  let overall: 'excellent' | 'good' | 'fair' | 'needs-improvement'
  if (issues.length === 0) {
    overall = 'excellent'
  } else if (issues.length === 1) {
    overall = 'good'
  } else if (issues.length === 2) {
    overall = 'fair'
  } else {
    overall = 'needs-improvement'
  }

  return { overall, issues, suggestions }
}

/**
 * Extended color scale for complete theming
 */
export interface ExtendedColorScale {
  50: string   // Lightest
  100: string
  200: string
  300: string
  400: string
  500: string  // Base color
  600: string
  700: string
  800: string
  900: string  // Darkest
}

/**
 * Generate extended color scale from a base color (similar to Tailwind)
 */
export function generateExtendedColorScale(baseColor: string): ExtendedColorScale {
  const hsl = hexToHsl(baseColor)

  return {
    50: hslToHex(hsl.h, Math.max(hsl.s - 30, 15), 97),
    100: hslToHex(hsl.h, Math.max(hsl.s - 25, 20), 93),
    200: hslToHex(hsl.h, Math.max(hsl.s - 20, 25), 85),
    300: hslToHex(hsl.h, Math.max(hsl.s - 10, 35), 72),
    400: hslToHex(hsl.h, Math.max(hsl.s - 5, 40), 60),
    500: baseColor, // Base
    600: hslToHex(hsl.h, Math.min(hsl.s + 5, 90), Math.max(hsl.l - 10, 45)),
    700: hslToHex(hsl.h, Math.min(hsl.s + 8, 90), Math.max(hsl.l - 20, 35)),
    800: hslToHex(hsl.h, Math.min(hsl.s + 10, 90), Math.max(hsl.l - 30, 25)),
    900: hslToHex(hsl.h, Math.min(hsl.s + 12, 90), Math.max(hsl.l - 40, 15)),
  }
}

/**
 * Complete brand color system with extended scales
 */
export interface CompleteBrandColors {
  primary: ExtendedColorScale
  secondary: ExtendedColorScale
  accent: ExtendedColorScale
  base: ExtractedColors
  personality: BrandPersonality
}

/**
 * Generate complete brand color system with extended scales
 */
export function generateCompleteBrandColors(
  baseColors: ExtractedColors
): CompleteBrandColors {
  return {
    primary: generateExtendedColorScale(baseColors.primary),
    secondary: generateExtendedColorScale(baseColors.secondary),
    accent: generateExtendedColorScale(baseColors.accent),
    base: baseColors,
    personality: baseColors.personality || {
      vibrancy: 'balanced',
      temperature: 'neutral',
      formality: 'professional',
    },
  }
}
