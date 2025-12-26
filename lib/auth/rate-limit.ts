/**
 * Simple in-memory rate limiter for authentication endpoints
 * Uses a sliding window algorithm to limit requests per IP
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store for rate limiting (will reset on server restart)
// For production, consider using Redis or a database
const rateLimitStore = new Map<string, RateLimitEntry>()

// Configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS_LOGIN = 5 // 5 login attempts per 15 minutes
const MAX_ATTEMPTS_REGISTER = 3 // 3 registration attempts per 15 minutes
const MAX_ATTEMPTS_PASSWORD_RESET = 3 // 3 password reset attempts per 15 minutes

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

/**
 * Check and update rate limit for an IP
 */
function checkRateLimit(
  identifier: string,
  maxAttempts: number
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // If no entry or expired, create new one
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    })
    return {
      success: true,
      remaining: maxAttempts - 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(identifier, entry)

  // Check if over limit
  if (entry.count > maxAttempts) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    }
  }

  return {
    success: true,
    remaining: maxAttempts - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Check various headers for the real IP (in order of preference)
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
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

  // Fallback to unknown (should rarely happen in production)
  return "unknown"
}

/**
 * Check rate limit for login attempts
 */
export function checkLoginRateLimit(request: Request): RateLimitResult {
  const ip = getClientIP(request)
  return checkRateLimit(`login:${ip}`, MAX_ATTEMPTS_LOGIN)
}

/**
 * Check rate limit for registration attempts
 */
export function checkRegisterRateLimit(request: Request): RateLimitResult {
  const ip = getClientIP(request)
  return checkRateLimit(`register:${ip}`, MAX_ATTEMPTS_REGISTER)
}

/**
 * Check rate limit for password reset attempts
 */
export function checkPasswordResetRateLimit(request: Request): RateLimitResult {
  const ip = getClientIP(request)
  return checkRateLimit(`password-reset:${ip}`, MAX_ATTEMPTS_PASSWORD_RESET)
}

/**
 * Check rate limit for password reset by email (to prevent email enumeration)
 */
export function checkPasswordResetEmailRateLimit(email: string): RateLimitResult {
  return checkRateLimit(`password-reset-email:${email.toLowerCase()}`, MAX_ATTEMPTS_PASSWORD_RESET)
}

/**
 * Reset rate limit for an IP (useful after successful login)
 */
export function resetLoginRateLimit(request: Request): void {
  const ip = getClientIP(request)
  rateLimitStore.delete(`login:${ip}`)
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
  }

  if (result.retryAfter) {
    headers["Retry-After"] = result.retryAfter.toString()
  }

  return headers
}
