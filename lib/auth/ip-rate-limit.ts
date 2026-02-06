/**
 * In-Memory IP-Based Rate Limiter for Public Endpoints
 *
 * Lightweight rate limiter designed for unauthenticated public endpoints
 * (e.g., shared EOD report links). Uses a sliding window approach with
 * in-memory storage -- no database overhead per request.
 *
 * Trade-off: Rate limits are per-serverless-instance, so a determined
 * attacker hitting multiple instances could exceed the nominal limit.
 * This is acceptable for public endpoints with generous limits; the goal
 * is to prevent casual abuse and accidental scraping, not stop a
 * sophisticated DDoS (that belongs at the CDN/WAF layer).
 */

import { NextResponse } from "next/server"

interface IpEntry {
  /** Timestamps of requests within the current window */
  timestamps: number[]
}

/** Per-endpoint buckets keyed by "endpoint:ip" */
const ipBuckets = new Map<string, IpEntry>()

/** Cleanup stale entries every 5 minutes to prevent memory leaks */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of ipBuckets.entries()) {
      // Remove entries where all timestamps are older than 15 minutes
      if (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < now - 15 * 60 * 1000) {
        ipBuckets.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)
}

export interface IpRateLimitConfig {
  /** A unique name for this endpoint (used as bucket prefix) */
  endpoint: string
  /** Maximum requests allowed within the window */
  maxRequests: number
  /** Window duration in milliseconds (default: 15 minutes) */
  windowMs?: number
}

export interface IpRateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfterSeconds?: number
}

/**
 * Extract client IP from request headers.
 * Priority: x-forwarded-for (first IP) -> x-real-ip -> "unknown"
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp.trim()
  }

  return "unknown"
}

/**
 * Check whether a request from the given IP is within the rate limit.
 * Uses a sliding window: only timestamps within [now - windowMs, now] count.
 */
export function checkIpRateLimit(
  request: Request,
  config: IpRateLimitConfig
): IpRateLimitResult {
  const { endpoint, maxRequests, windowMs = 15 * 60 * 1000 } = config
  const ip = getClientIp(request)
  const key = `${endpoint}:${ip}`
  const now = Date.now()
  const windowStart = now - windowMs

  let entry = ipBuckets.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    ipBuckets.set(key, entry)
  }

  // Prune timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

  // Calculate reset time: when the oldest request in the window expires
  const resetAt = entry.timestamps.length > 0
    ? entry.timestamps[0] + windowMs
    : now + windowMs

  if (entry.timestamps.length >= maxRequests) {
    const retryAfterSeconds = Math.ceil((resetAt - now) / 1000)
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetAt,
      retryAfterSeconds: retryAfterSeconds > 0 ? retryAfterSeconds : 1,
    }
  }

  // Record this request
  entry.timestamps.push(now)

  return {
    allowed: true,
    limit: maxRequests,
    remaining: maxRequests - entry.timestamps.length,
    resetAt,
  }
}

/**
 * Build standard rate-limit response headers from a result.
 */
export function ipRateLimitHeaders(result: IpRateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
  }

  if (result.retryAfterSeconds !== undefined) {
    headers["Retry-After"] = result.retryAfterSeconds.toString()
  }

  return headers
}

/**
 * Convenience: check rate limit and return a 429 NextResponse if exceeded,
 * or null if the request is allowed. Callers should add the rate limit
 * headers to their successful responses too.
 */
export function enforceIpRateLimit(
  request: Request,
  config: IpRateLimitConfig
): { result: IpRateLimitResult; response: NextResponse | null } {
  const result = checkIpRateLimit(request, config)

  if (!result.allowed) {
    const headers = ipRateLimitHeaders(result)
    const response = NextResponse.json(
      {
        success: false,
        error: "Too many requests. Please try again later.",
      },
      {
        status: 429,
        headers,
      }
    )
    return { result, response }
  }

  return { result, response: null }
}
