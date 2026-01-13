/**
 * Next.js Middleware for Rate Limiting and Security
 *
 * Implements edge-compatible rate limiting for auth endpoints.
 * Uses in-memory storage (resets on cold start, which is OK for basic protection).
 *
 * The primary rate limiting is database-backed in lib/auth/rate-limit.ts.
 * This middleware provides additional edge protection.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// ============================================
// IN-MEMORY RATE LIMIT STORE (Edge Runtime)
// ============================================

// Map of IP -> { count, resetAt }
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  // Auth endpoints: 100 requests per minute per IP
  auth: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
  // API endpoints: 1000 requests per minute per IP
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000,
  },
}

// Cleanup stale entries periodically (every 5 minutes in memory)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupStaleEntries() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string {
  // Vercel-specific header
  const vercelIP = request.headers.get("x-vercel-forwarded-for")
  if (vercelIP) return vercelIP.split(",")[0].trim()

  // Standard forwarded header
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0].trim()

  // Real IP
  const realIP = request.headers.get("x-real-ip")
  if (realIP) return realIP.trim()

  // Cloudflare
  const cfIP = request.headers.get("cf-connecting-ip")
  if (cfIP) return cfIP.trim()

  return "unknown"
}

/**
 * Check rate limit for a given key
 */
function checkRateLimit(
  key: string,
  config: { windowMs: number; maxRequests: number }
): { allowed: boolean; remaining: number; resetAt: number; retryAfter?: number } {
  cleanupStaleEntries()

  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt < now) {
    // New window
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    }
  }

  entry.count++

  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    }
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Main middleware function
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getClientIP(request)

  // Determine rate limit config based on path
  let config = RATE_LIMIT_CONFIG.api
  let key = `api:${ip}`

  if (pathname.startsWith("/api/auth/")) {
    config = RATE_LIMIT_CONFIG.auth
    key = `auth:${ip}`
  }

  // Check rate limit
  const result = checkRateLimit(key, config)

  // Add rate limit headers to all responses
  const headers = {
    "X-RateLimit-Limit": config.maxRequests.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
  }

  if (!result.allowed) {
    // Return 429 Too Many Requests
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...headers,
          "Retry-After": result.retryAfter?.toString() || "60",
        },
      }
    )
  }

  // Continue with request, adding rate limit headers
  const response = NextResponse.next()
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

/**
 * Configure which paths the middleware runs on
 */
export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
  ],
}
