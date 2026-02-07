/**
 * Next.js Middleware for Rate Limiting and Security Headers
 *
 * Features:
 * 1. Rate Limiting: Edge-compatible rate limiting for API endpoints
 *    - Uses in-memory storage (resets on cold start, which is OK for basic protection)
 *    - Primary rate limiting is database-backed in lib/auth/rate-limit.ts
 *    - This middleware provides additional edge protection
 *
 * 2. Security Headers: Applied to all routes (API and frontend)
 *    - Content-Security-Policy (CSP)
 *    - X-Frame-Options
 *    - X-Content-Type-Options
 *    - Referrer-Policy
 *    - X-XSS-Protection
 *    - Permissions-Policy
 *    - Strict-Transport-Security (production only)
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
  const keysToDelete: string[] = []
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetAt < now) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach((key) => rateLimitStore.delete(key))
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

  // Only apply rate limiting to API routes
  if (pathname.startsWith("/api/")) {
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

    // Continue with request, adding rate limit headers and security headers
    const response = NextResponse.next()
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    // Add security headers
    addSecurityHeaders(response)

    return response
  }

  // For non-API routes, just add security headers
  const response = NextResponse.next()
  addSecurityHeaders(response)
  return response
}

/**
 * Add security headers to the response
 */
function addSecurityHeaders(response: NextResponse) {
  // Content Security Policy
  // Allow self, inline styles (for Tailwind), and specific external domains
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for Tailwind
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.anthropic.com https://app.asana.com https://vercel.live https://va.vercel-scripts.com https://*.ingest.sentry.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")

  response.headers.set("Content-Security-Policy", csp)

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY")

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff")

  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // Disable legacy XSS protection (CSP replaces it)
  response.headers.set("X-XSS-Protection", "0")

  // Permissions policy - restrict sensitive features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  )

  // Strict Transport Security (HSTS)
  // Only set in production with HTTPS
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    )
  }
}

/**
 * Configure which paths the middleware runs on
 */
export const config = {
  matcher: [
    // Match all routes to apply security headers
    // Exclude Next.js internal routes and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
}
