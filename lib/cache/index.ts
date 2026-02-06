/**
 * In-Memory Cache with TTL Support
 *
 * Provides a simple but effective caching layer for frequently accessed data.
 * Supports TTL (time-to-live), automatic cleanup, and cache invalidation.
 *
 * For production with multiple instances, consider Redis or similar.
 */

// ============================================
// CACHE TYPES
// ============================================

export interface CacheEntry<T> {
  value: T
  expiresAt: number
  createdAt: number
  hitCount: number
}

export interface CacheOptions {
  ttlSeconds?: number
  maxSize?: number
  cleanupIntervalMs?: number
}

export interface CacheStats {
  size: number
  hits: number
  misses: number
  hitRate: number
}

// ============================================
// CACHE IMPLEMENTATION
// ============================================

class Cache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private hits = 0
  private misses = 0
  private readonly ttlMs: number
  private readonly maxSize: number
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(options: CacheOptions = {}) {
    this.ttlMs = (options.ttlSeconds || 300) * 1000 // Default 5 minutes
    this.maxSize = options.maxSize || 1000
    const cleanupInterval = options.cleanupIntervalMs || 60000 // Default 1 minute

    // Start cleanup interval
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), cleanupInterval)
    }
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      this.misses++
      return undefined
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.misses++
      return undefined
    }

    entry.hitCount++
    this.hits++
    return entry.value
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttlSeconds?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU()
    }

    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.ttlMs
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
      hitCount: 0,
    })
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }
    return true
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern
    let deleted = 0

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        deleted++
      }
    }

    return deleted
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get or set a value with a factory function
   */
  async getOrSet(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = this.get(key)
    if (cached !== undefined) {
      return cached
    }

    const value = await factory()
    this.set(key, value, ttlSeconds)
    return value
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      const lastAccess = entry.createdAt + entry.hitCount // Simple LRU approximation
      if (lastAccess < oldestTime) {
        oldestTime = lastAccess
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Stop the cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// ============================================
// CACHE INSTANCES
// ============================================

// General purpose cache (5 min TTL)
export const generalCache = new Cache({ ttlSeconds: 300, maxSize: 500 })

// Session cache (1 hour TTL)
export const sessionCache = new Cache({ ttlSeconds: 3600, maxSize: 1000 })

// Query results cache (1 min TTL for frequently changing data)
export const queryCache = new Cache({ ttlSeconds: 60, maxSize: 200 })

// Organization settings cache (10 min TTL)
export const orgSettingsCache = new Cache({ ttlSeconds: 600, maxSize: 100 })

// User profile cache (5 min TTL)
export const userCache = new Cache({ ttlSeconds: 300, maxSize: 500 })

// ============================================
// CACHE KEY GENERATORS
// ============================================

export const CacheKeys = {
  // Organization
  organization: (id: string) => `org:${id}`,
  organizationSettings: (id: string) => `org:${id}:settings`,
  organizationMembers: (id: string) => `org:${id}:members`,

  // User
  user: (id: string) => `user:${id}`,
  userSession: (token: string) => `session:${token}`,
  userNotifications: (userId: string) => `user:${userId}:notifications`,

  // Team
  teamMembers: (orgId: string) => `team:${orgId}:members`,
  teamStats: (orgId: string) => `team:${orgId}:stats`,

  // Tasks
  userTasks: (userId: string) => `user:${userId}:tasks`,
  orgTasks: (orgId: string) => `org:${orgId}:tasks`,

  // Rocks
  userRocks: (userId: string) => `user:${userId}:rocks`,
  orgRocks: (orgId: string) => `org:${orgId}:rocks`,

  // EOD Reports
  userEodReports: (userId: string, date?: string) =>
    date ? `user:${userId}:eod:${date}` : `user:${userId}:eod`,
  orgEodReports: (orgId: string, date?: string) =>
    date ? `org:${orgId}:eod:${date}` : `org:${orgId}:eod`,

  // AI/Insights
  dailyDigest: (orgId: string, date: string) => `org:${orgId}:digest:${date}`,
  eodInsight: (reportId: string) => `eod:${reportId}:insight`,

  // API
  apiKey: (key: string) => `apikey:${key}`,
  rateLimit: (key: string) => `ratelimit:${key}`,
}

// ============================================
// CACHE INVALIDATION HELPERS
// ============================================

/**
 * Invalidate all caches related to a user
 */
export function invalidateUserCache(userId: string): void {
  userCache.deletePattern(`user:${userId}`)
  queryCache.deletePattern(`user:${userId}`)
}

/**
 * Invalidate all caches related to an organization
 */
export function invalidateOrgCache(orgId: string): void {
  orgSettingsCache.delete(CacheKeys.organizationSettings(orgId))
  queryCache.deletePattern(`org:${orgId}`)
  queryCache.deletePattern(`team:${orgId}`)
}

/**
 * Invalidate caches when a task is modified
 */
export function invalidateTaskCache(orgId: string, userId: string): void {
  queryCache.delete(CacheKeys.userTasks(userId))
  queryCache.delete(CacheKeys.orgTasks(orgId))
}

/**
 * Invalidate caches when a rock is modified
 */
export function invalidateRockCache(orgId: string, userId: string): void {
  queryCache.delete(CacheKeys.userRocks(userId))
  queryCache.delete(CacheKeys.orgRocks(orgId))
}

/**
 * Invalidate caches when an EOD report is submitted
 */
export function invalidateEodCache(orgId: string, userId: string, date: string): void {
  queryCache.delete(CacheKeys.userEodReports(userId))
  queryCache.delete(CacheKeys.userEodReports(userId, date))
  queryCache.delete(CacheKeys.orgEodReports(orgId))
  queryCache.delete(CacheKeys.orgEodReports(orgId, date))
  queryCache.delete(CacheKeys.teamStats(orgId))
}

// ============================================
// CACHE DECORATOR
// ============================================

/**
 * Decorator to cache function results
 */
export function cached<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttlSeconds?: number
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args)
    return queryCache.getOrSet(key, () => fn(...args), ttlSeconds)
  }) as T
}
