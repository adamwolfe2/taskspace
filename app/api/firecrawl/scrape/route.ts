/**
 * POST /api/firecrawl/scrape
 *
 * Scrapes a website using the Firecrawl API and extracts brand DNA.
 * Used during workspace setup to auto-populate brand colors, fonts, logo, etc.
 *
 * Request body: { url: string }
 * Response: { success: true, data: { brand: ScrapedBrandData, raw: { title, url, screenshotUrl? } } }
 *
 * Rate limited to 5 scrapes per user per hour.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { scrapeWebsite, FirecrawlError } from "@/lib/integrations/firecrawl"
import { extractBrandData, type BrandExtractionResult } from "@/lib/utils/brand-extractor"
import { checkApiRateLimit, getRateLimitHeaders } from "@/lib/auth/rate-limit"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

// ============================================
// CONSTANTS
// ============================================

const MAX_SCRAPES_PER_HOUR = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const SCRAPE_TIMEOUT_MS = 30_000

// ============================================
// URL VALIDATION
// ============================================

/**
 * Validate and normalize a URL string.
 * Returns the normalized URL or null if invalid.
 */
function validateUrl(input: string): string | null {
  if (!input || typeof input !== "string") return null

  let url = input.trim()

  // Reject obviously invalid inputs
  if (url.length < 4 || url.length > 2048) return null

  // Add protocol if missing
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`
  }

  try {
    const parsed = new URL(url)

    // Only allow http and https protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null
    }

    // Must have a valid hostname with at least one dot (no localhost, IPs, etc.)
    if (!parsed.hostname.includes(".")) {
      return null
    }

    // Block private/internal IPs and localhost
    const hostname = parsed.hostname.toLowerCase()
    if (
      hostname === "localhost" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("0.") ||
      hostname === "[::1]" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return null
    }

    return parsed.href
  } catch {
    return null
  }
}

// ============================================
// ROUTE HANDLER
// ============================================

export const POST = withAuth(async (request: NextRequest, auth) => {
  const userId = auth.user.id
  const orgId = auth.organization.id

  // Rate limit: 5 scrapes per user per hour
  const rateLimitKey = `firecrawl-scrape:${userId}`
  const rateLimitResult = await checkApiRateLimit(
    request,
    rateLimitKey,
    MAX_SCRAPES_PER_HOUR,
    RATE_LIMIT_WINDOW_MS
  )

  if (!rateLimitResult.success) {
    const response = NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "You have reached the maximum number of website scrapes. Please try again later.",
      },
      { status: 429 }
    )
    const headers = getRateLimitHeaders(rateLimitResult, MAX_SCRAPES_PER_HOUR)
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value)
    }
    return response
  }

  // Parse and validate request body
  let body: { url?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Invalid JSON in request body" },
      { status: 400 }
    )
  }

  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Missing required field: url" },
      { status: 400 }
    )
  }

  const validatedUrl = validateUrl(body.url)
  if (!validatedUrl) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "Invalid URL. Please provide a valid website URL (e.g., https://example.com).",
      },
      { status: 400 }
    )
  }

  // Check that Firecrawl API key is configured
  if (!process.env.FIRECRAWL_API_KEY) {
    logger.error("Firecrawl API key is not configured")
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "Website scraping is not configured. Please contact support.",
      },
      { status: 503 }
    )
  }

  // Scrape the website
  try {
    logger.info(
      { userId, orgId, url: validatedUrl },
      "Firecrawl scrape: Starting"
    )

    const scrapeResult = await scrapeWebsite(validatedUrl, SCRAPE_TIMEOUT_MS)

    // Extract brand data from the scraped content
    const brandResult: BrandExtractionResult = extractBrandData(scrapeResult, validatedUrl)

    logger.info(
      {
        userId,
        orgId,
        url: validatedUrl,
        companyName: brandResult.brand.companyName,
        hasPrimaryColor: !!brandResult.brand.colors.primary,
        hasLogo: !!brandResult.brand.logoUrl,
      },
      "Firecrawl scrape: Completed successfully"
    )

    return NextResponse.json<ApiResponse<BrandExtractionResult>>({
      success: true,
      data: brandResult,
      message: "Website scraped and brand data extracted successfully",
    })
  } catch (error) {
    // Handle known Firecrawl errors with appropriate status codes
    if (error instanceof FirecrawlError) {
      logger.warn(
        {
          userId,
          orgId,
          url: validatedUrl,
          firecrawlStatus: error.statusCode,
          firecrawlError: error.firecrawlError,
        },
        `Firecrawl scrape failed: ${error.message}`
      )

      // Map Firecrawl errors to user-friendly messages
      let userMessage: string
      let statusCode: number

      switch (error.statusCode) {
        case 429:
          userMessage = "Our scraping service is temporarily rate limited. Please try again in a few minutes."
          statusCode = 429
          break
        case 504:
          userMessage = "The website took too long to respond. Please check the URL and try again."
          statusCode = 504
          break
        case 502:
          userMessage = "We were unable to scrape this website. It may be blocking automated access or the URL may be incorrect."
          statusCode = 502
          break
        default:
          userMessage = "An error occurred while scraping the website. Please try again later."
          statusCode = 500
      }

      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: userMessage },
        { status: statusCode }
      )
    }

    // Unknown errors
    logger.error(
      {
        userId,
        orgId,
        url: validatedUrl,
        error: error instanceof Error ? error.message : String(error),
      },
      "Firecrawl scrape: Unexpected error"
    )

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "An unexpected error occurred while scraping the website. Please try again later.",
      },
      { status: 500 }
    )
  }
})
