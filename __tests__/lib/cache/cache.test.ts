/**
 * Cache Tests
 *
 * Tests for the in-memory caching layer
 */

import {
  Cache,
  CacheKeys,
  invalidateUserCache,
  invalidateOrgCache,
  invalidateTaskCache,
} from '@/lib/cache'

describe('Cache', () => {
  let cache: Cache<string>

  beforeEach(() => {
    cache = new Cache<string>({ defaultTTL: 1000, maxSize: 10 })
  })

  afterEach(() => {
    cache.clear()
  })

  describe('get and set', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined()
    })

    it('should overwrite existing values', () => {
      cache.set('key1', 'value1')
      cache.set('key1', 'value2')
      expect(cache.get('key1')).toBe('value2')
    })

    it('should handle complex objects', () => {
      const complexCache = new Cache<{ name: string; count: number }>()
      const obj = { name: 'test', count: 42 }
      complexCache.set('obj', obj)
      expect(complexCache.get('obj')).toEqual(obj)
    })
  })

  describe('TTL expiration', () => {
    it('should expire items after TTL', async () => {
      const shortCache = new Cache<string>({ defaultTTL: 50 })
      shortCache.set('expiring', 'value')

      expect(shortCache.get('expiring')).toBe('value')

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 60))

      expect(shortCache.get('expiring')).toBeUndefined()
    })

    it('should allow custom TTL per item', async () => {
      cache.set('long', 'value', 5000)
      cache.set('short', 'value', 50)

      await new Promise((resolve) => setTimeout(resolve, 60))

      expect(cache.get('long')).toBe('value')
      expect(cache.get('short')).toBeUndefined()
    })
  })

  describe('delete', () => {
    it('should delete existing keys', () => {
      cache.set('key1', 'value1')
      expect(cache.delete('key1')).toBe(true)
      expect(cache.get('key1')).toBeUndefined()
    })

    it('should return false for non-existent keys', () => {
      expect(cache.delete('nonexistent')).toBe(false)
    })
  })

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.set('key1', 'value1')
      expect(cache.has('key1')).toBe(true)
    })

    it('should return false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false)
    })

    it('should return false for expired keys', async () => {
      const shortCache = new Cache<string>({ defaultTTL: 50 })
      shortCache.set('expiring', 'value')

      await new Promise((resolve) => setTimeout(resolve, 60))

      expect(shortCache.has('expiring')).toBe(false)
    })
  })

  describe('clear', () => {
    it('should remove all items', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      cache.clear()

      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBeUndefined()
      expect(cache.get('key3')).toBeUndefined()
      expect(cache.size).toBe(0)
    })
  })

  describe('size limit (LRU eviction)', () => {
    it('should not exceed max size', () => {
      const smallCache = new Cache<string>({ maxSize: 3 })

      smallCache.set('key1', 'value1')
      smallCache.set('key2', 'value2')
      smallCache.set('key3', 'value3')
      smallCache.set('key4', 'value4')

      expect(smallCache.size).toBeLessThanOrEqual(3)
    })

    it('should evict least recently used items', () => {
      const smallCache = new Cache<string>({ maxSize: 3 })

      smallCache.set('key1', 'value1')
      smallCache.set('key2', 'value2')
      smallCache.set('key3', 'value3')

      // Access key1 to make it recently used
      smallCache.get('key1')

      // Add new item, should evict key2 (least recently used)
      smallCache.set('key4', 'value4')

      expect(smallCache.get('key1')).toBe('value1')
      expect(smallCache.get('key4')).toBe('value4')
    })
  })

  describe('getOrSet', () => {
    it('should return existing value without calling factory', async () => {
      cache.set('existing', 'cached')
      const factory = jest.fn().mockResolvedValue('new')

      const result = await cache.getOrSet('existing', factory)

      expect(result).toBe('cached')
      expect(factory).not.toHaveBeenCalled()
    })

    it('should call factory and cache result for new keys', async () => {
      const factory = jest.fn().mockResolvedValue('computed')

      const result = await cache.getOrSet('new', factory)

      expect(result).toBe('computed')
      expect(factory).toHaveBeenCalledTimes(1)
      expect(cache.get('new')).toBe('computed')
    })

    it('should use custom TTL', async () => {
      const factory = jest.fn().mockResolvedValue('value')

      await cache.getOrSet('key', factory, 5000)

      // Value should still be there after short wait
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(cache.get('key')).toBe('value')
    })
  })
})

describe('CacheKeys', () => {
  it('should generate user key', () => {
    expect(CacheKeys.user('user123')).toBe('user:user123')
  })

  it('should generate session key', () => {
    expect(CacheKeys.session('token123')).toBe('session:token123')
  })

  it('should generate org key', () => {
    expect(CacheKeys.org('org123')).toBe('org:org123')
  })

  it('should generate tasks key', () => {
    expect(CacheKeys.tasks('org123', 'user456')).toBe('tasks:org123:user456')
  })

  it('should generate rocks key', () => {
    expect(CacheKeys.rocks('org123', 'user456')).toBe('rocks:org123:user456')
  })

  it('should generate eod key', () => {
    expect(CacheKeys.eod('org123', 'user456', '2024-01-15')).toBe(
      'eod:org123:user456:2024-01-15'
    )
  })

  it('should generate orgSettings key', () => {
    expect(CacheKeys.orgSettings('org123')).toBe('settings:org123')
  })
})

describe('Cache Invalidation Helpers', () => {
  it('should invalidate user cache', () => {
    // These are async but we're just testing they don't throw
    expect(() => invalidateUserCache('user123')).not.toThrow()
  })

  it('should invalidate org cache', () => {
    expect(() => invalidateOrgCache('org123')).not.toThrow()
  })

  it('should invalidate task cache', () => {
    expect(() => invalidateTaskCache('org123', 'user456')).not.toThrow()
  })
})
