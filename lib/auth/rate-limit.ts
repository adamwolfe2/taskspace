/**
 * Production-Ready Rate Limiter
 *
 * Hybrid approach for serverless environments:
 * - Primary: Database-backed rate limiting (persistent across instances)
 * - Secondary: In-memory cache for performance optimization
 *
 * This ensures rate limits work correctly across Vercel serverless instances.
 */

import { sql } from "../db/sql"
import { logger } from "../logger"

interface RateLimitEntry {
  count: number
  resetAt: number
  lastChecked?: number
}

// Short-lived in-memory cache to reduce DB queries
// NOT the source of truth - just a performance optimization
const rateLimitCache = new Map<string, RateLimitEntry>()
const CACHE_TTL_MS = 5 * 1000 // Cache valid for 5 seconds only

// Configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS_LOGIN = 5
const MAX_ATTEMPTS_REGISTER = 3
const MAX_ATTEMPTS_PASSWORD_RESET = 3

// Cleanup stale cache entries every minute
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitCache.entries()) {
      if (entry.resetAt < now || (entry.lastChecked && now - entry.lastChecked > CACHE_TTL_MS)) {
        rateLimitCache.delete(key)
      }
    }
  }, 60 * 1000)
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

/**
 * Database-backed rate limit check with caching
 */
async function checkRateLimitDb(
  identifier: string,
  maxAttempts: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = new Date(now - RATE_LIMIT_WINDOW_MS)

  try {
    // Check database for attempt count in current window
    const result = await sql`
      SELECT COUNT(*) as attempt_count
      FROM rate_limit_attempts
      WHERE identifier = ${identifier}
        AND attempted_at > ${windowStart.toISOString()}
    `

    const currentCount = parseInt(result.rows[0]?.attempt_count || "0", 10)
    const resetAt = now + RATE_LIMIT_WINDOW_MS

    // Record this attempt
    await sql`
      INSERT INTO rate_limit_attempts (identifier, attempted_at)
      VALUES (${identifier}, NOW())
    `

    // Cleanup old entries (async, don't wait)
    sql`
      DELETE FROM rate_limit_attempts
      WHERE attempted_at < NOW() - INTERVAL '1 hour'
    `.catch(err => logger.debug({ error: err?.message }, "Rate limit cleanup error (non-critical)"))

    const newCount = currentCount + 1

    // Update cache
    rateLimitCache.set(identifier, {
      count: newCount,
      resetAt,
      lastChecked: now,
    })

    if (newCount > maxAttempts) {
      const retryAfter = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
      return {
        success: false,
        remaining: 0,
        resetAt,
        retryAfter,
      }
    }

    return {
      success: true,
      remaining: maxAttempts - newCount,
      resetAt,
    }
  } catch (error) {
    // Database error - fall back to in-memory
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, "Rate limit DB error, using fallback")
    return checkRateLimitMemory(identifier, maxAttempts)
  }
}

/**
 * Fallback in-memory rate limit (for when DB is unavailable)
 */
function checkRateLimitMemory(
  identifier: string,
  maxAttempts: number
): RateLimitResult {
  const now = Date.now()
  const cached = rateLimitCache.get(identifier)

  if (!cached || cached.resetAt < now) {
    rateLimitCache.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
      lastChecked: now,
    })
    return {
      success: true,
      remaining: maxAttempts - 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    }
  }

  cached.count++
  cached.lastChecked = now
  rateLimitCache.set(identifier, cached)

  if (cached.count > maxAttempts) {
    const retryAfter = Math.ceil((cached.resetAt - now) / 1000)
    return {
      success: false,
      remaining: 0,
      resetAt: cached.resetAt,
      retryAfter,
    }
  }

  return {
    success: true,
    remaining: maxAttempts - cached.count,
    resetAt: cached.resetAt,
  }
}

/**
 * Smart rate limit check - uses cache if fresh, otherwise hits DB
 */
async function checkRateLimit(
  identifier: string,
  maxAttempts: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const cached = rateLimitCache.get(identifier)

  // Use cache if fresh and already blocked (definitive answer)
  if (cached && cached.lastChecked && now - cached.lastChecked < CACHE_TTL_MS) {
    if (cached.count > maxAttempts) {
      const retryAfter = Math.ceil((cached.resetAt - now) / 1000)
      return {
        success: false,
        remaining: 0,
        resetAt: cached.resetAt,
        retryAfter: retryAfter > 0 ? retryAfter : undefined,
      }
    }
  }

  // Otherwise, check database
  return checkRateLimitDb(identifier, maxAttempts)
}

/**
 * Synchronous rate limit check (for backwards compatibility)
 * Uses cached data or allows the request (fail-open)
 */
function checkRateLimitSync(
  identifier: string,
  maxAttempts: number
): RateLimitResult {
  const now = Date.now()
  const cached = rateLimitCache.get(identifier)

  if (cached && cached.resetAt > now) {
    if (cached.count >= maxAttempts) {
      const retryAfter = Math.ceil((cached.resetAt - now) / 1000)
      return {
        success: false,
        remaining: 0,
        resetAt: cached.resetAt,
        retryAfter,
      }
    }
    return {
      success: true,
      remaining: maxAttempts - cached.count,
      resetAt: cached.resetAt,
    }
  }

  // No cache hit - allow request but trigger async DB check
  return {
    success: true,
    remaining: maxAttempts,
    resetAt: now + RATE_LIMIT_WINDOW_MS,
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Vercel-specific header (most reliable on Vercel)
  const vercelIP = request.headers.get("x-vercel-forwarded-for")
  if (vercelIP) {
    return vercelIP.split(",")[0].trim()
  }

  // Standard forwarded header
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }

  const realIP = request.headers.get("x-real-ip")
  if (realIP) {
    return realIP.trim()
  }

  const cfConnectingIP = request.headers.get("cf-connecting-ip")
  if (cfConnectingIP) {
    return cfConnectingIP.trim()
  }

  return "unknown"
}

/**
 * Check rate limit for login attempts
 */
export function checkLoginRateLimit(request: Request): RateLimitResult {
  const ip = getClientIP(request)
  // Use sync check for immediate response, async check happens in background
  const result = checkRateLimitSync(`login:${ip}`, MAX_ATTEMPTS_LOGIN)

  // Trigger async DB update (fire and forget)
  checkRateLimitDb(`login:${ip}`, MAX_ATTEMPTS_LOGIN).catch(err =>
    logger.debug({ error: err?.message, ip }, "Rate limit DB update failed (non-critical)")
  )

  return result
}

/**
 * Async version for when you can await
 */
export async function checkLoginRateLimitAsync(request: Request): Promise<RateLimitResult> {
  const ip = getClientIP(request)
  return checkRateLimit(`login:${ip}`, MAX_ATTEMPTS_LOGIN)
}

/**
 * Check rate limit for registration attempts
 */
export function checkRegisterRateLimit(request: Request): RateLimitResult {
  const ip = getClientIP(request)
  const result = checkRateLimitSync(`register:${ip}`, MAX_ATTEMPTS_REGISTER)
  checkRateLimitDb(`register:${ip}`, MAX_ATTEMPTS_REGISTER).catch(err =>
    logger.debug({ error: err?.message, ip }, "Rate limit DB update failed (non-critical)")
  )
  return result
}

/**
 * Check rate limit for password reset attempts
 */
export function checkPasswordResetRateLimit(request: Request): RateLimitResult {
  const ip = getClientIP(request)
  const result = checkRateLimitSync(`password-reset:${ip}`, MAX_ATTEMPTS_PASSWORD_RESET)
  checkRateLimitDb(`password-reset:${ip}`, MAX_ATTEMPTS_PASSWORD_RESET).catch(err =>
    logger.debug({ error: err?.message, ip }, "Rate limit DB update failed (non-critical)")
  )
  return result
}

/**
 * Check rate limit for password reset by email
 */
export function checkPasswordResetEmailRateLimit(email: string): RateLimitResult {
  const key = `password-reset-email:${email.toLowerCase()}`
  const result = checkRateLimitSync(key, MAX_ATTEMPTS_PASSWORD_RESET)
  checkRateLimitDb(key, MAX_ATTEMPTS_PASSWORD_RESET).catch(err =>
    logger.debug({ error: err?.message }, "Rate limit DB update failed (non-critical)")
  )
  return result
}

/**
 * Check rate limit for 2FA verification attempts (5 attempts per 15 min per IP)
 */
const MAX_ATTEMPTS_2FA = 5

export function check2faRateLimit(request: Request): RateLimitResult {
  const ip = getClientIP(request)
  const result = checkRateLimitSync(`2fa:${ip}`, MAX_ATTEMPTS_2FA)
  checkRateLimitDb(`2fa:${ip}`, MAX_ATTEMPTS_2FA).catch(err =>
    logger.debug({ error: err?.message, ip }, "Rate limit DB update failed (non-critical)")
  )
  return result
}

/**
 * Reset rate limit for an IP after successful login
 */
export async function resetLoginRateLimit(request: Request): Promise<void> {
  const ip = getClientIP(request)
  const key = `login:${ip}`

  // Clear cache
  rateLimitCache.delete(key)

  // Clear from database
  try {
    await sql`
      DELETE FROM rate_limit_attempts
      WHERE identifier = ${key}
    `
  } catch (error) {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, "Failed to reset rate limit in DB")
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult, maxAttempts?: number): Record<string, string> {
  const limit = maxAttempts ?? (result.remaining + 1)
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
  }

  if (result.retryAfter) {
    headers["Retry-After"] = result.retryAfter.toString()
  }

  return headers
}

// ============================================
// ORGANIZATION-LEVEL RATE LIMITS
// ============================================

// Org rate limits by subscription tier (requests per hour)
const ORG_RATE_LIMITS: Record<string, number> = {
  free: 1000,
  team: 10000,
  business: 50000,
}
const _ORG_RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

/**
 * Check org-level API rate limit (sync, in-memory).
 * Returns a result immediately from cache; fires async DB update in background.
 * Fails open if no cache entry exists (first request always allowed).
 */
export function checkOrgRateLimit(
  organizationId: string,
  plan: string = "free"
): RateLimitResult {
  const maxRequests = ORG_RATE_LIMITS[plan] ?? ORG_RATE_LIMITS.free
  const key = `org:${organizationId}`
  const result = checkRateLimitSync(key, maxRequests)

  // Fire-and-forget DB update for persistence across instances
  checkRateLimitDb(key, maxRequests).catch(err =>
    logger.debug({ error: err?.message, organizationId }, "Org rate limit DB update failed (non-critical)")
  )

  return result
}

/**
 * General purpose rate limiter for any endpoint
 */
export async function checkApiRateLimit(
  request: Request,
  endpoint: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): Promise<RateLimitResult> {
  const ip = getClientIP(request)
  const key = `api:${endpoint}:${ip}`

  // For API rate limiting, use shorter window
  const now = Date.now()
  const windowStart = new Date(now - windowMs)

  try {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM rate_limit_attempts
      WHERE identifier = ${key}
        AND attempted_at > ${windowStart.toISOString()}
    `

    const count = parseInt(result.rows[0]?.count || "0", 10)

    await sql`
      INSERT INTO rate_limit_attempts (identifier, attempted_at)
      VALUES (${key}, NOW())
    `

    if (count >= maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetAt: now + windowMs,
        retryAfter: Math.ceil(windowMs / 1000),
      }
    }

    return {
      success: true,
      remaining: maxRequests - count - 1,
      resetAt: now + windowMs,
    }
  } catch {
    // Fail open on DB error
    return {
      success: true,
      remaining: maxRequests,
      resetAt: now + windowMs,
    }
  }
}
