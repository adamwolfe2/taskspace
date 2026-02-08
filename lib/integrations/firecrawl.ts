/**
 * Firecrawl Integration
 *
 * Handles website scraping via the Firecrawl API (https://api.firecrawl.dev).
 * Used to extract brand DNA from a user's website during workspace setup.
 *
 * Uses raw fetch - no SDK dependency required.
 */

import { logger } from "@/lib/logger"

// ============================================
// TYPES
// ============================================

/** Firecrawl scrape request payload */
export interface FirecrawlScrapeRequest {
  url: string
  formats: ("html" | "markdown" | "rawHtml" | "links" | "screenshot")[]
  onlyMainContent?: boolean
  includeTags?: string[]
  excludeTags?: string[]
  waitFor?: number
  timeout?: number
}

/** Metadata returned by Firecrawl for a scraped page */
export interface FirecrawlMetadata {
  title?: string
  description?: string
  language?: string
  ogTitle?: string
  ogDescription?: string
  ogUrl?: string
  ogImage?: string
  ogLocaleAlternate?: string[]
  ogSiteName?: string
  sourceURL?: string
  statusCode?: number
  [key: string]: unknown
}

/** Successful scrape result from Firecrawl */
export interface FirecrawlScrapeResult {
  html?: string
  markdown?: string
  rawHtml?: string
  links?: string[]
  screenshot?: string
  metadata?: FirecrawlMetadata
}

/** Top-level Firecrawl API response */
export interface FirecrawlApiResponse {
  success: boolean
  data?: FirecrawlScrapeResult
  error?: string
}

/** Errors specific to the Firecrawl integration */
export class FirecrawlError extends Error {
  public readonly statusCode: number
  public readonly firecrawlError?: string

  constructor(message: string, statusCode: number = 500, firecrawlError?: string) {
    super(message)
    this.name = "FirecrawlError"
    this.statusCode = statusCode
    this.firecrawlError = firecrawlError
  }
}

// ============================================
// CLIENT
// ============================================

const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v1"
const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Scrape a website using the Firecrawl API.
 *
 * @param url - The website URL to scrape
 * @param timeoutMs - Request timeout in milliseconds (default 30s)
 * @returns The scraped page data including HTML, markdown, and metadata
 * @throws FirecrawlError on API key issues, network failures, or Firecrawl errors
 */
export async function scrapeWebsite(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<FirecrawlScrapeResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    throw new FirecrawlError(
      "FIRECRAWL_API_KEY environment variable is not configured",
      500
    )
  }

  const payload: FirecrawlScrapeRequest = {
    url,
    formats: ["html", "markdown", "rawHtml"],
    onlyMainContent: false, // We need full page for meta tags, styles, etc.
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    logger.info({ url }, "Firecrawl: Starting website scrape")

    const response = await fetch(`${FIRECRAWL_BASE_URL}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unable to read error body")
      logger.error(
        { url, status: response.status, errorBody },
        "Firecrawl: API returned error status"
      )

      if (response.status === 401 || response.status === 403) {
        throw new FirecrawlError(
          "Invalid Firecrawl API key",
          500,
          errorBody
        )
      }

      if (response.status === 429) {
        throw new FirecrawlError(
          "Firecrawl rate limit exceeded. Please try again later.",
          429,
          errorBody
        )
      }

      throw new FirecrawlError(
        `Firecrawl API error (HTTP ${response.status})`,
        502,
        errorBody
      )
    }

    const result: FirecrawlApiResponse = await response.json()

    if (!result.success || !result.data) {
      logger.error(
        { url, error: result.error },
        "Firecrawl: Scrape was not successful"
      )
      throw new FirecrawlError(
        result.error || "Firecrawl scrape returned no data",
        502,
        result.error
      )
    }

    logger.info(
      {
        url,
        hasHtml: !!result.data.html,
        hasMarkdown: !!result.data.markdown,
        hasScreenshot: !!result.data.screenshot,
        title: result.data.metadata?.title,
      },
      "Firecrawl: Scrape completed successfully"
    )

    return result.data
  } catch (error) {
    if (error instanceof FirecrawlError) {
      throw error
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      logger.error({ url, timeoutMs }, "Firecrawl: Request timed out")
      throw new FirecrawlError(
        `Website scrape timed out after ${Math.round(timeoutMs / 1000)} seconds`,
        504
      )
    }

    logger.error(
      { url, error: error instanceof Error ? error.message : String(error) },
      "Firecrawl: Unexpected error during scrape"
    )
    throw new FirecrawlError(
      "Failed to connect to Firecrawl service",
      502,
      error instanceof Error ? error.message : String(error)
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
