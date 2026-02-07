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
import { aiRateLimit, RATE_LIMITS } from "@/lib/api/rate-limit"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { firecrawlScrapeSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import { validateSafeUrl } from "@/lib/validation/url"
import type { ApiResponse } from "@/lib/types"

// ============================================
// CONSTANTS
// ============================================

const SCRAPE_TIMEOUT_MS = 30_000

// ============================================
// URL VALIDATION
// ============================================

/**
 * Validate and normalize a URL string for Firecrawl scraping.
 * Returns the normalized URL or null if invalid.
 *
 * Uses the shared SSRF-safe URL validator. Allows HTTP since we are
 * scraping user-provided websites (not sending secrets).
 */
function validateUrl(input: string): string | null {
  return validateSafeUrl(input, { allowHttp: true })
}

// ============================================
// ROUTE HANDLER
// ============================================

export const POST = withAuth(async (request: NextRequest, auth) => {
  const userId = auth.user.id
  const orgId = auth.organization.id

  // Rate limit: 5 scrapes per user per hour
  const rateCheck = aiRateLimit(userId, 'firecrawl-scrape', RATE_LIMITS.scrape.maxRequests, RATE_LIMITS.scrape.windowMs)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
    )
  }

  // Parse and validate request body
  let parsedBody: { url: string }
  try {
    parsedBody = await validateBody(request, firecrawlScrapeSchema)
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Invalid JSON in request body" },
      { status: 400 }
    )
  }

  const validatedUrl = validateUrl(parsedBody.url)
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
