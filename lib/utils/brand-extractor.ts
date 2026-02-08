/**
 * Brand Extractor
 *
 * Processes scraped HTML/metadata from Firecrawl to extract structured brand data.
 * Parses meta tags, CSS custom properties, font declarations, social links, and
 * logo references to build a brand profile for workspace setup.
 *
 * Uses regex-based HTML parsing since we are in a Node.js/Edge runtime (no DOM).
 */

import { logger } from "@/lib/logger"
import type { FirecrawlScrapeResult } from "@/lib/integrations/firecrawl"

// ============================================
// TYPES
// ============================================

export interface ScrapedBrandData {
  companyName: string | null
  description: string | null
  logoUrl: string | null
  faviconUrl: string | null
  colors: {
    primary: string | null
    secondary: string | null
    accent: string | null
  }
  fonts: {
    heading: string | null
    body: string | null
  }
  socialLinks: {
    twitter?: string
    linkedin?: string
    facebook?: string
    instagram?: string
  }
  industry: string | null
  tagline: string | null
}

export interface BrandExtractionResult {
  brand: ScrapedBrandData
  raw: {
    title: string | null
    url: string
    screenshotUrl?: string
  }
}

// ============================================
// HELPERS - HTML PARSING
// ============================================

/**
 * Extract the content of a meta tag by name or property attribute.
 * Handles both `name="..."` and `property="..."` forms, single and double quotes,
 * and any attribute ordering.
 */
function getMetaContent(html: string, nameOrProperty: string): string | null {
  // Pattern 1: <meta name="X" content="Y"> or <meta property="X" content="Y">
  const pattern1 = new RegExp(
    `<meta\\s+(?:[^>]*?(?:name|property)\\s*=\\s*["']${escapeRegex(nameOrProperty)}["'][^>]*?content\\s*=\\s*["']([^"']*?)["'][^>]*?)\\s*/?>`,
    "i"
  )
  const match1 = html.match(pattern1)
  if (match1?.[1]) return decodeHtmlEntities(match1[1].trim())

  // Pattern 2: content before name/property (reversed attribute order)
  const pattern2 = new RegExp(
    `<meta\\s+(?:[^>]*?content\\s*=\\s*["']([^"']*?)["'][^>]*?(?:name|property)\\s*=\\s*["']${escapeRegex(nameOrProperty)}["'][^>]*?)\\s*/?>`,
    "i"
  )
  const match2 = html.match(pattern2)
  if (match2?.[1]) return decodeHtmlEntities(match2[1].trim())

  return null
}

/**
 * Extract the text content of a specific HTML tag.
 */
function getTagContent(html: string, tag: string): string | null {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i")
  const match = html.match(pattern)
  if (match?.[1]) {
    return decodeHtmlEntities(match[1].replace(/<[^>]+>/g, "").trim())
  }
  return null
}

/**
 * Get the href attribute from a <link> tag matching a rel value.
 * Returns the first match.
 */
function getLinkHref(html: string, relValue: string): string | null {
  // Match link tags with the specified rel value
  const pattern = new RegExp(
    `<link\\s+[^>]*?rel\\s*=\\s*["'](?:[^"']*\\s)?${escapeRegex(relValue)}(?:\\s[^"']*)?["'][^>]*?href\\s*=\\s*["']([^"']*?)["'][^>]*?/?>`,
    "i"
  )
  const match = html.match(pattern)
  if (match?.[1]) return match[1].trim()

  // Reversed attribute order: href before rel
  const pattern2 = new RegExp(
    `<link\\s+[^>]*?href\\s*=\\s*["']([^"']*?)["'][^>]*?rel\\s*=\\s*["'](?:[^"']*\\s)?${escapeRegex(relValue)}(?:\\s[^"']*)?["'][^>]*?/?>`,
    "i"
  )
  const match2 = html.match(pattern2)
  if (match2?.[1]) return match2[1].trim()

  return null
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Decode common HTML entities.
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&apos;/g, "'")
}

/**
 * Resolve a potentially relative URL against a base URL.
 */
function resolveUrl(href: string | null, baseUrl: string): string | null {
  if (!href) return null
  // Already absolute
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href
  }
  // Protocol-relative
  if (href.startsWith("//")) {
    try {
      const base = new URL(baseUrl)
      return `${base.protocol}${href}`
    } catch {
      return `https:${href}`
    }
  }
  // Data URIs / blob URIs - return as-is
  if (href.startsWith("data:") || href.startsWith("blob:")) {
    return null
  }
  // Relative URL
  try {
    return new URL(href, baseUrl).href
  } catch {
    return null
  }
}

// ============================================
// EXTRACTION: COMPANY NAME
// ============================================

function extractCompanyName(html: string, metadata?: Record<string, unknown>): string | null {
  // 1. og:site_name is the most reliable signal for brand name
  const ogSiteName = getMetaContent(html, "og:site_name")
  if (ogSiteName) return ogSiteName

  // 2. Check Firecrawl metadata
  if (metadata?.ogSiteName && typeof metadata.ogSiteName === "string") {
    return metadata.ogSiteName
  }

  // 3. application-name meta tag
  const appName = getMetaContent(html, "application-name")
  if (appName) return appName

  // 4. og:title (often includes company name)
  const ogTitle = getMetaContent(html, "og:title")

  // 5. <title> tag
  const title = getTagContent(html, "title")

  // Try to extract the company name from the title by removing common suffixes
  const rawTitle = ogTitle || title
  if (rawTitle) {
    // Common patterns: "Company Name | Tagline", "Company - Description", "Company: Something"
    const separators = [" | ", " - ", " — ", " – ", " : ", " :: "]
    for (const sep of separators) {
      if (rawTitle.includes(sep)) {
        const parts = rawTitle.split(sep)
        // Usually the company name is the first or last part
        // If first part is short, it's likely the company name
        const first = parts[0].trim()
        if (first.length > 0 && first.length <= 40) {
          return first
        }
      }
    }
    // If no separator found, return the raw title (truncated if needed)
    if (rawTitle.length <= 60) {
      return rawTitle
    }
  }

  // 6. First <h1> as a fallback
  const h1 = getTagContent(html, "h1")
  if (h1 && h1.length <= 60) return h1

  return rawTitle?.substring(0, 60) || null
}

// ============================================
// EXTRACTION: DESCRIPTION & TAGLINE
// ============================================

function extractDescription(html: string, metadata?: Record<string, unknown>): string | null {
  // 1. meta description
  const metaDesc = getMetaContent(html, "description")
  if (metaDesc) return metaDesc

  // 2. og:description
  const ogDesc = getMetaContent(html, "og:description")
  if (ogDesc) return ogDesc

  // 3. twitter:description
  const twitterDesc = getMetaContent(html, "twitter:description")
  if (twitterDesc) return twitterDesc

  // 4. Firecrawl metadata
  if (metadata?.description && typeof metadata.description === "string") {
    return metadata.description
  }

  return null
}

function extractTagline(html: string, companyName: string | null): string | null {
  // Try to get tagline from the title (the part after the separator)
  const title = getTagContent(html, "title")
  if (title && companyName) {
    const separators = [" | ", " - ", " — ", " – ", " : ", " :: "]
    for (const sep of separators) {
      if (title.includes(sep)) {
        const parts = title.split(sep)
        // The non-company-name part is likely the tagline
        for (const part of parts) {
          const trimmed = part.trim()
          if (trimmed && trimmed !== companyName && trimmed.length <= 120) {
            return trimmed
          }
        }
      }
    }
  }

  // Look for a subtitle or tagline in h2 or a prominent p tag
  const h2 = getTagContent(html, "h2")
  if (h2 && h2.length > 10 && h2.length <= 120) {
    return h2
  }

  return null
}

// ============================================
// EXTRACTION: LOGO & FAVICON
// ============================================

function extractLogoUrl(html: string, baseUrl: string, metadata?: Record<string, unknown>): string | null {
  // 1. Look for <img> tags with "logo" in src, alt, class, or id
  const logoImgPatterns = [
    // img with "logo" in alt
    /<img\s+[^>]*?alt\s*=\s*["'][^"']*logo[^"']*["'][^>]*?src\s*=\s*["']([^"']+?)["'][^>]*?\/?>/gi,
    // img with src before alt
    /<img\s+[^>]*?src\s*=\s*["']([^"']+?)["'][^>]*?alt\s*=\s*["'][^"']*logo[^"']*["'][^>]*?\/?>/gi,
    // img with "logo" in class
    /<img\s+[^>]*?class\s*=\s*["'][^"']*logo[^"']*["'][^>]*?src\s*=\s*["']([^"']+?)["'][^>]*?\/?>/gi,
    // img with src before class
    /<img\s+[^>]*?src\s*=\s*["']([^"']+?)["'][^>]*?class\s*=\s*["'][^"']*logo[^"']*["'][^>]*?\/?>/gi,
    // img with "logo" in id
    /<img\s+[^>]*?id\s*=\s*["'][^"']*logo[^"']*["'][^>]*?src\s*=\s*["']([^"']+?)["'][^>]*?\/?>/gi,
    // img with src before id
    /<img\s+[^>]*?src\s*=\s*["']([^"']+?)["'][^>]*?id\s*=\s*["'][^"']*logo[^"']*["'][^>]*?\/?>/gi,
    // img with "logo" in src path
    /<img\s+[^>]*?src\s*=\s*["']([^"']*logo[^"']*?)["'][^>]*?\/?>/gi,
  ]

  for (const pattern of logoImgPatterns) {
    const match = pattern.exec(html)
    if (match?.[1]) {
      const resolved = resolveUrl(match[1], baseUrl)
      if (resolved) return resolved
    }
  }

  // 2. og:image as fallback (often a brand image/logo)
  const ogImage = getMetaContent(html, "og:image")
  if (ogImage) {
    return resolveUrl(ogImage, baseUrl)
  }

  // 3. Firecrawl metadata ogImage
  if (metadata?.ogImage && typeof metadata.ogImage === "string") {
    return resolveUrl(metadata.ogImage, baseUrl)
  }

  // 4. twitter:image
  const twitterImage = getMetaContent(html, "twitter:image")
  if (twitterImage) {
    return resolveUrl(twitterImage, baseUrl)
  }

  return null
}

function extractFaviconUrl(html: string, baseUrl: string): string | null {
  // Try various favicon link rel values in order of preference
  const faviconRels = [
    "icon",
    "shortcut icon",
    "apple-touch-icon",
    "apple-touch-icon-precomposed",
  ]

  for (const rel of faviconRels) {
    const href = getLinkHref(html, rel)
    if (href) {
      return resolveUrl(href, baseUrl)
    }
  }

  // Default favicon location
  try {
    const url = new URL(baseUrl)
    return `${url.origin}/favicon.ico`
  } catch {
    return null
  }
}

// ============================================
// EXTRACTION: COLORS
// ============================================

/** Normalize a CSS color value to a 6-digit hex string, or return null */
function normalizeColor(color: string): string | null {
  const trimmed = color.trim().toLowerCase()

  // Already hex
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    // Expand shorthand #abc -> #aabbcc
    const r = trimmed[1]
    const g = trimmed[2]
    const b = trimmed[3]
    return `#${r}${r}${g}${g}${b}${b}`
  }

  // rgb(r, g, b)
  const rgbMatch = trimmed.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10)
    const g = parseInt(rgbMatch[2], 10)
    const b = parseInt(rgbMatch[3], 10)
    if (r <= 255 && g <= 255 && b <= 255) {
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
    }
  }

  // rgba with full opacity
  const rgbaMatch = trimmed.match(/^rgba\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([\d.]+)\s*\)$/)
  if (rgbaMatch) {
    const alpha = parseFloat(rgbaMatch[4])
    if (alpha >= 0.9) {
      const r = parseInt(rgbaMatch[1], 10)
      const g = parseInt(rgbaMatch[2], 10)
      const b = parseInt(rgbaMatch[3], 10)
      if (r <= 255 && g <= 255 && b <= 255) {
        return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
      }
    }
  }

  // hsl(h, s%, l%) and hsla(h, s%, l%, a)
  const hslMatch = trimmed.match(/^hsla?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+))?\s*\)$/)
  if (hslMatch) {
    const alpha = hslMatch[4] ? parseFloat(hslMatch[4]) : 1
    if (alpha >= 0.9) {
      const h = parseFloat(hslMatch[1]) / 360
      const s = parseFloat(hslMatch[2]) / 100
      const l = parseFloat(hslMatch[3]) / 100
      const rgb = hslToRgb(h, s, l)
      return `#${rgb[0].toString(16).padStart(2, "0")}${rgb[1].toString(16).padStart(2, "0")}${rgb[2].toString(16).padStart(2, "0")}`
    }
  }

  // Modern CSS hsl without commas: hsl(240 100% 50%)
  const hslModernMatch = trimmed.match(/^hsla?\s*\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*(?:\/\s*([\d.]+%?))?\s*\)$/)
  if (hslModernMatch) {
    const alphaStr = hslModernMatch[4]
    const alpha = alphaStr ? (alphaStr.endsWith("%") ? parseFloat(alphaStr) / 100 : parseFloat(alphaStr)) : 1
    if (alpha >= 0.9) {
      const h = parseFloat(hslModernMatch[1]) / 360
      const s = parseFloat(hslModernMatch[2]) / 100
      const l = parseFloat(hslModernMatch[3]) / 100
      const rgb = hslToRgb(h, s, l)
      return `#${rgb[0].toString(16).padStart(2, "0")}${rgb[1].toString(16).padStart(2, "0")}${rgb[2].toString(16).padStart(2, "0")}`
    }
  }

  return null
}

/** Convert HSL to RGB. h, s, l in [0,1]. Returns [r, g, b] in [0, 255]. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

/** Check if a color is essentially white, black, or a neutral gray */
function isNeutralColor(hex: string): boolean {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)

  // White-ish (all channels > 240)
  if (r > 240 && g > 240 && b > 240) return true
  // Black-ish (all channels < 15)
  if (r < 15 && g < 15 && b < 15) return true
  // Gray-ish (all channels within 15 of each other)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max - min < 15 && (r > 200 || r < 50)) return true

  return false
}

/** Calculate the "saturation" of a hex color (higher = more colorful) */
function colorSaturation(hex: string): number {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.substring(0, 2), 16) / 255
  const g = parseInt(clean.substring(2, 4), 16) / 255
  const b = parseInt(clean.substring(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === 0) return 0
  return (max - min) / max
}

interface ExtractedColors {
  primary: string | null
  secondary: string | null
  accent: string | null
}

function extractColors(html: string): ExtractedColors {
  const result: ExtractedColors = {
    primary: null,
    secondary: null,
    accent: null,
  }

  // 1. Theme color meta tag - strong signal for primary
  const themeColor = getMetaContent(html, "theme-color")
  if (themeColor) {
    const normalized = normalizeColor(themeColor)
    if (normalized && !isNeutralColor(normalized)) {
      result.primary = normalized
    }
  }

  // 2. msapplication-TileColor - another strong signal
  if (!result.primary) {
    const tileColor = getMetaContent(html, "msapplication-TileColor")
    if (tileColor) {
      const normalized = normalizeColor(tileColor)
      if (normalized && !isNeutralColor(normalized)) {
        result.primary = normalized
      }
    }
  }

  // 3. CSS custom properties (--primary, --brand, --accent, etc.)
  // Also check for Tailwind/framework-style color tokens
  const cssVarPatterns: Array<{ pattern: RegExp; role: keyof ExtractedColors }> = [
    { pattern: /--(?:primary|brand|main|color-primary|brand-primary)[-_]?(?:color)?:\s*([^;}\s]+)/gi, role: "primary" },
    { pattern: /--(?:secondary|second|color-secondary|brand-secondary)[-_]?(?:color)?:\s*([^;}\s]+)/gi, role: "secondary" },
    { pattern: /--(?:accent|highlight|cta|color-accent|brand-accent)[-_]?(?:color)?:\s*([^;}\s]+)/gi, role: "accent" },
  ]

  for (const { pattern, role } of cssVarPatterns) {
    if (result[role]) continue // Already found
    let match: RegExpExecArray | null
    while ((match = pattern.exec(html)) !== null) {
      const normalized = normalizeColor(match[1])
      if (normalized && !isNeutralColor(normalized)) {
        result[role] = normalized
        break
      }
    }
  }

  // 4. Look for colors in button/CTA inline styles (strong brand signal)
  if (!result.primary) {
    const buttonStylePattern = /<(?:button|a)\s+[^>]*?style\s*=\s*["'][^"']*?(?:background(?:-color)?)\s*:\s*([^;}"']+)/gi
    let btnMatch: RegExpExecArray | null
    while ((btnMatch = buttonStylePattern.exec(html)) !== null) {
      const normalized = normalizeColor(btnMatch[1].trim())
      if (normalized && !isNeutralColor(normalized)) {
        result.primary = normalized
        break
      }
    }
  }

  // 5. Look for colors in CSS background-color rules targeting buttons/CTAs
  if (!result.primary) {
    const btnCssPattern = /(?:\.btn|\.button|\.cta|a\.primary|\.hero)[^{]*?\{[^}]*?background(?:-color)?:\s*([^;}\s]+)/gi
    let btnCssMatch: RegExpExecArray | null
    while ((btnCssMatch = btnCssPattern.exec(html)) !== null) {
      const normalized = normalizeColor(btnCssMatch[1].trim())
      if (normalized && !isNeutralColor(normalized)) {
        result.primary = normalized
        break
      }
    }
  }

  // 6. Collect all color values from CSS to find the most prominent brand colors
  if (!result.primary || !result.secondary || !result.accent) {
    const colorFrequency = new Map<string, number>()

    // Match hex colors in CSS
    const hexPattern = /#(?:[0-9a-fA-F]{3}){1,2}\b/g
    let hexMatch: RegExpExecArray | null
    while ((hexMatch = hexPattern.exec(html)) !== null) {
      const normalized = normalizeColor(hexMatch[0])
      if (normalized && !isNeutralColor(normalized)) {
        colorFrequency.set(normalized, (colorFrequency.get(normalized) || 0) + 1)
      }
    }

    // Match rgb/rgba colors in CSS
    const rgbPattern = /rgba?\s*\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*[\d.]+)?\s*\)/g
    let rgbMatch: RegExpExecArray | null
    while ((rgbMatch = rgbPattern.exec(html)) !== null) {
      const normalized = normalizeColor(rgbMatch[0])
      if (normalized && !isNeutralColor(normalized)) {
        colorFrequency.set(normalized, (colorFrequency.get(normalized) || 0) + 1)
      }
    }

    // Match hsl/hsla colors in CSS
    const hslPattern = /hsla?\s*\(\s*[\d.]+\s*[,\s]\s*[\d.]+%\s*[,\s]\s*[\d.]+%\s*(?:[,/]\s*[\d.]+%?\s*)?\)/g
    let hslMatch: RegExpExecArray | null
    while ((hslMatch = hslPattern.exec(html)) !== null) {
      const normalized = normalizeColor(hslMatch[0])
      if (normalized && !isNeutralColor(normalized)) {
        colorFrequency.set(normalized, (colorFrequency.get(normalized) || 0) + 1)
      }
    }

    // Sort by frequency, then by saturation (more colorful = more likely brand color)
    const sortedColors = Array.from(colorFrequency.entries())
      .filter(([, count]) => count >= 1) // Include even single-occurrence colors
      .sort((a, b) => {
        const countDiff = b[1] - a[1]
        if (Math.abs(countDiff) > 2) return countDiff
        // If similar frequency, prefer more saturated colors
        return colorSaturation(b[0]) - colorSaturation(a[0])
      })
      .map(([color]) => color)

    // Assign colors to unfilled slots
    let colorIndex = 0
    const roles: (keyof ExtractedColors)[] = ["primary", "secondary", "accent"]
    for (const role of roles) {
      if (result[role]) continue
      // Skip colors already assigned
      while (colorIndex < sortedColors.length) {
        const candidate = sortedColors[colorIndex]
        colorIndex++
        if (candidate !== result.primary && candidate !== result.secondary && candidate !== result.accent) {
          result[role] = candidate
          break
        }
      }
    }
  }

  return result
}

// ============================================
// EXTRACTION: FONTS
// ============================================

interface ExtractedFonts {
  heading: string | null
  body: string | null
}

/** Clean a font family string - remove quotes and fallback fonts */
function cleanFontFamily(raw: string): string | null {
  // Take the first font in the stack
  const first = raw.split(",")[0].trim()
  // Remove quotes
  const cleaned = first.replace(/^["']|["']$/g, "").trim()
  // Skip generic families
  const generics = ["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "-apple-system", "BlinkMacSystemFont"]
  if (generics.includes(cleaned.toLowerCase())) return null
  if (!cleaned || cleaned.length < 2) return null
  return cleaned
}

function extractFonts(html: string): ExtractedFonts {
  const result: ExtractedFonts = {
    heading: null,
    body: null,
  }

  // 1. Look for heading font declarations (h1-h6 selectors)
  const headingFontPattern = /(?:h[1-6])[^{]*\{[^}]*?font-family:\s*([^;}"]+)/gi
  let headingMatch: RegExpExecArray | null
  while ((headingMatch = headingFontPattern.exec(html)) !== null) {
    const font = cleanFontFamily(headingMatch[1])
    if (font) {
      result.heading = font
      break
    }
  }

  // 2. Look for body/general font declarations
  const bodyFontPattern = /(?:body|html|\*|:root)[^{]*\{[^}]*?font-family:\s*([^;}"]+)/gi
  let bodyMatch: RegExpExecArray | null
  while ((bodyMatch = bodyFontPattern.exec(html)) !== null) {
    const font = cleanFontFamily(bodyMatch[1])
    if (font) {
      result.body = font
      break
    }
  }

  // 3. CSS variables for fonts
  if (!result.heading) {
    const headingVarPattern = /--(?:heading|title|display)[-_]?(?:font|font-family)?:\s*["']?([^;}"]+?)["']?\s*[;}"]/gi
    const headingVarMatch = headingVarPattern.exec(html)
    if (headingVarMatch?.[1]) {
      const font = cleanFontFamily(headingVarMatch[1])
      if (font) result.heading = font
    }
  }

  if (!result.body) {
    const bodyVarPattern = /--(?:body|text|base|sans)[-_]?(?:font|font-family)?:\s*["']?([^;}"]+?)["']?\s*[;}"]/gi
    const bodyVarMatch = bodyVarPattern.exec(html)
    if (bodyVarMatch?.[1]) {
      const font = cleanFontFamily(bodyVarMatch[1])
      if (font) result.body = font
    }
  }

  // 4. Google Fonts link tags - extract font names
  const googleFontsPattern = /fonts\.googleapis\.com\/css2?\?[^"']*?family=([^"'&]+)/gi
  const fontNames: string[] = []
  let gfMatch: RegExpExecArray | null
  while ((gfMatch = googleFontsPattern.exec(html)) !== null) {
    const families = decodeURIComponent(gfMatch[1]).split("|")
    for (const family of families) {
      const name = family.split(":")[0].replace(/\+/g, " ").trim()
      if (name) fontNames.push(name)
    }
  }

  // Assign Google Fonts to unfilled slots
  if (fontNames.length > 0) {
    if (!result.heading) result.heading = fontNames[0]
    if (!result.body && fontNames.length > 1) result.body = fontNames[1]
    // If only one Google Font, it might be used for body too
    if (!result.body && fontNames.length === 1) result.body = fontNames[0]
  }

  // 5. Fallback: any font-family declaration
  if (!result.body) {
    const anyFontPattern = /font-family:\s*([^;}"]+)/gi
    const allFonts: string[] = []
    let anyMatch: RegExpExecArray | null
    while ((anyMatch = anyFontPattern.exec(html)) !== null) {
      const font = cleanFontFamily(anyMatch[1])
      if (font && !allFonts.includes(font)) {
        allFonts.push(font)
      }
    }
    if (allFonts.length > 0) {
      result.body = result.body || allFonts[0]
      if (!result.heading && allFonts.length > 1) {
        result.heading = allFonts[1]
      }
    }
  }

  return result
}

// ============================================
// EXTRACTION: SOCIAL LINKS
// ============================================

interface SocialLinks {
  twitter?: string
  linkedin?: string
  facebook?: string
  instagram?: string
}

const SOCIAL_PATTERNS: Array<{ key: keyof SocialLinks; pattern: RegExp }> = [
  { key: "twitter", pattern: /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/?/gi },
  { key: "linkedin", pattern: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+\/?/gi },
  { key: "facebook", pattern: /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9._-]+\/?/gi },
  { key: "instagram", pattern: /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._-]+\/?/gi },
]

function extractSocialLinks(html: string): SocialLinks {
  const links: SocialLinks = {}

  for (const { key, pattern } of SOCIAL_PATTERNS) {
    const match = pattern.exec(html)
    if (match?.[0]) {
      // Clean up - remove trailing slashes for consistency
      links[key] = match[0].replace(/\/$/, "")
    }
    // Reset regex lastIndex since we use /g flag
    pattern.lastIndex = 0
  }

  return links
}

// ============================================
// EXTRACTION: INDUSTRY
// ============================================

/** Attempt to guess industry from meta keywords, description, or structured data */
function extractIndustry(html: string): string | null {
  // 1. Check for schema.org structured data (JSON-LD)
  const jsonLdPattern = /<script\s+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let jsonLdMatch: RegExpExecArray | null
  while ((jsonLdMatch = jsonLdPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(jsonLdMatch[1])
      if (data?.["@type"]) {
        const type = data["@type"]
        if (typeof type === "string") {
          return mapSchemaTypeToIndustry(type)
        }
      }
      if (data?.industry && typeof data.industry === "string") {
        return data.industry
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  }

  // 2. Meta keywords
  const keywords = getMetaContent(html, "keywords")
  if (keywords) {
    const industry = inferIndustryFromKeywords(keywords)
    if (industry) return industry
  }

  return null
}

function mapSchemaTypeToIndustry(type: string): string | null {
  const mapping: Record<string, string | null> = {
    "SoftwareApplication": "Technology",
    "WebApplication": "Technology",
    "MobileApplication": "Technology",
    "Organization": null, // Too generic to infer industry
    "Corporation": null,  // Too generic to infer industry
    "Restaurant": "Food & Beverage",
    "MedicalOrganization": "Healthcare",
    "Hospital": "Healthcare",
    "EducationalOrganization": "Education",
    "School": "Education",
    "LegalService": "Legal",
    "FinancialService": "Finance",
    "RealEstateAgent": "Real Estate",
    "Store": "Retail",
    "AutoDealer": "Automotive",
    "FitnessCenter": "Health & Fitness",
  }
  return mapping[type] ?? null
}

const INDUSTRY_KEYWORDS: Array<{ keywords: string[]; industry: string }> = [
  { keywords: ["saas", "software", "tech", "api", "developer", "cloud", "platform"], industry: "Technology" },
  { keywords: ["healthcare", "medical", "health", "clinic", "hospital", "wellness"], industry: "Healthcare" },
  { keywords: ["finance", "banking", "fintech", "investment", "insurance"], industry: "Finance" },
  { keywords: ["education", "learning", "school", "university", "training", "edtech"], industry: "Education" },
  { keywords: ["ecommerce", "retail", "shop", "store", "marketplace"], industry: "Retail" },
  { keywords: ["real estate", "property", "realty", "housing"], industry: "Real Estate" },
  { keywords: ["restaurant", "food", "catering", "dining"], industry: "Food & Beverage" },
  { keywords: ["marketing", "advertising", "agency", "digital marketing", "seo"], industry: "Marketing" },
  { keywords: ["design", "creative", "studio", "branding"], industry: "Design" },
  { keywords: ["consulting", "advisory", "management consulting"], industry: "Consulting" },
  { keywords: ["legal", "law", "attorney", "lawyer"], industry: "Legal" },
  { keywords: ["manufacturing", "industrial", "factory", "production"], industry: "Manufacturing" },
  { keywords: ["travel", "tourism", "hospitality", "hotel"], industry: "Travel & Hospitality" },
  { keywords: ["media", "news", "publishing", "entertainment", "content"], industry: "Media & Entertainment" },
  { keywords: ["nonprofit", "ngo", "charity", "foundation"], industry: "Nonprofit" },
  { keywords: ["construction", "building", "architecture", "contractor"], industry: "Construction" },
  { keywords: ["logistics", "shipping", "supply chain", "freight"], industry: "Logistics" },
  { keywords: ["automotive", "car", "vehicle", "auto"], industry: "Automotive" },
]

function inferIndustryFromKeywords(text: string): string | null {
  const lower = text.toLowerCase()
  for (const { keywords, industry } of INDUSTRY_KEYWORDS) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return industry
      }
    }
  }
  return null
}

// ============================================
// MAIN EXTRACTION FUNCTION
// ============================================

/**
 * Extract structured brand data from a Firecrawl scrape result.
 *
 * @param scrapeResult - The raw data returned by Firecrawl
 * @param originalUrl - The URL that was scraped (for resolving relative URLs)
 * @returns Structured brand data and raw metadata
 */
export function extractBrandData(
  scrapeResult: FirecrawlScrapeResult,
  originalUrl: string
): BrandExtractionResult {
  // Prefer rawHtml for extraction - it includes <style> tags and inline CSS
  // that the cleaned "html" format may strip out
  const html = scrapeResult.rawHtml || scrapeResult.html || ""
  const metadata = scrapeResult.metadata as Record<string, unknown> | undefined

  // Determine the base URL for resolving relative URLs
  const sourceUrl = (metadata?.sourceURL as string) || originalUrl
  let baseUrl: string
  try {
    const parsed = new URL(sourceUrl)
    baseUrl = parsed.origin
  } catch {
    baseUrl = originalUrl
  }

  logger.info({ url: originalUrl, htmlLength: html.length }, "Brand extractor: Starting extraction")

  // Extract all brand signals
  const companyName = extractCompanyName(html, metadata)
  const description = extractDescription(html, metadata)
  const tagline = extractTagline(html, companyName)
  const logoUrl = extractLogoUrl(html, baseUrl, metadata)
  const faviconUrl = extractFaviconUrl(html, baseUrl)
  const colors = extractColors(html)
  const fonts = extractFonts(html)
  const socialLinks = extractSocialLinks(html)
  const industry = extractIndustry(html) || inferIndustryFromKeywords(description || "")

  const brand: ScrapedBrandData = {
    companyName,
    description,
    logoUrl,
    faviconUrl,
    colors,
    fonts,
    socialLinks,
    industry,
    tagline,
  }

  logger.info(
    {
      url: originalUrl,
      hasName: !!companyName,
      hasLogo: !!logoUrl,
      hasPrimaryColor: !!colors.primary,
      hasHeadingFont: !!fonts.heading,
      socialCount: Object.keys(socialLinks).length,
      industry,
    },
    "Brand extractor: Extraction complete"
  )

  return {
    brand,
    raw: {
      title: (metadata?.title as string) || getTagContent(html, "title"),
      url: sourceUrl,
      screenshotUrl: scrapeResult.screenshot || undefined,
    },
  }
}
