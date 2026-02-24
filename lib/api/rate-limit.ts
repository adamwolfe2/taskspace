/**
 * In-Memory Rate Limiter for API Endpoints
 *
 * Provides per-user, per-endpoint rate limiting using an in-memory Map.
 * Designed for AI and bulk/export operations where DB-backed rate limiting
 * (lib/auth/rate-limit.ts) is too heavyweight.
 *
 * The edge middleware (middleware.ts) still provides IP-based rate limiting
 * as a first line of defense. This module adds user-level granularity.
 */

interface RateLimitEntry {
  timestamps: number[]
}

// Store: key -> list of request timestamps within the window
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupStaleEntries(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries where the most recent timestamp is older than 2 hours
    if (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < now - 2 * 60 * 60 * 1000) {
      rateLimitStore.delete(key)
    }
  }
}

export interface AIRateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter?: number
}

/**
 * Rate limit configuration for different endpoint categories
 */
export const RATE_LIMITS = {
  /** Standard AI endpoints: 20 req/hour per user */
  ai: { maxRequests: 20, windowMs: 60 * 60 * 1000 },
  /** Bulk/export operations: 10 req/hour per user */
  bulk: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  /** Cross-workspace operations: 30 req/hour per user */
  crossWorkspace: { maxRequests: 30, windowMs: 60 * 60 * 1000 },
  /** Expensive scraping operations: 5 req/hour per user */
  scrape: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
} as const

/**
 * Org-level AI rate limits (requests/hour across all users in the org)
 * Prevents a large org from burning through API quota at scale.
 */
export const ORG_AI_RATE_LIMITS: Record<string, number> = {
  free: 100,
  team: 500,
  business: 2000,
}

/**
 * Check rate limit for an AI endpoint.
 *
 * Uses in-memory sliding window to track requests per user per endpoint,
 * plus an org-level cap to prevent large orgs from burning through quota.
 *
 * @param userId - The authenticated user's ID
 * @param endpoint - A short identifier for the endpoint (e.g. "brain-dump", "query")
 * @param maxRequests - Maximum requests allowed in the window (default: 20)
 * @param windowMs - Window size in milliseconds (default: 1 hour)
 * @param orgId - Optional org ID for org-level rate limiting
 * @param plan - Subscription plan for org-level cap ("free" | "team" | "business")
 * @returns Rate limit result with allowed status, remaining count, and retry-after
 */
export function aiRateLimit(
  userId: string,
  endpoint: string,
  maxRequests: number = RATE_LIMITS.ai.maxRequests,
  windowMs: number = RATE_LIMITS.ai.windowMs,
  orgId?: string,
  plan: string = "free",
): AIRateLimitResult {
  const now = Date.now()
  cleanupStaleEntries(now)

  // Check org-level cap first (prevents large orgs from overwhelming quota)
  if (orgId) {
    const orgMax = ORG_AI_RATE_LIMITS[plan] ?? ORG_AI_RATE_LIMITS.free
    const orgKey = `org:${orgId}:${endpoint}`
    const orgEntry = rateLimitStore.get(orgKey)
    const windowStart = now - windowMs

    if (orgEntry) {
      orgEntry.timestamps = orgEntry.timestamps.filter(t => t > windowStart)
      if (orgEntry.timestamps.length >= orgMax) {
        const retryAfter = Math.ceil((orgEntry.timestamps[0] + windowMs - now) / 1000)
        return { allowed: false, remaining: 0, retryAfter: Math.max(retryAfter, 1) }
      }
      orgEntry.timestamps.push(now)
    } else {
      rateLimitStore.set(orgKey, { timestamps: [now] })
    }
  }

  // Check user-level cap
  const key = `${userId}:${endpoint}`
  const entry = rateLimitStore.get(key)

  if (!entry) {
    // First request
    rateLimitStore.set(key, { timestamps: [now] })
    return {
      allowed: true,
      remaining: maxRequests - 1,
    }
  }

  // Filter out timestamps outside the current window
  const windowStart = now - windowMs
  entry.timestamps = entry.timestamps.filter(t => t > windowStart)

  if (entry.timestamps.length >= maxRequests) {
    // Rate limited - calculate when the oldest request in the window expires
    const oldestInWindow = entry.timestamps[0]
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(retryAfter, 1),
    }
  }

  // Allowed - record this request
  entry.timestamps.push(now)
  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
  }
}
