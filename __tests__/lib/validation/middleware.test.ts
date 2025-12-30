/**
 * Validation Middleware Tests
 *
 * Tests for request validation utilities
 */

import { z } from 'zod'

// Mock NextRequest
class MockNextRequest {
  private _json: unknown
  private _url: string

  constructor(url: string, options: { body?: unknown } = {}) {
    this._url = url
    this._json = options.body
  }

  get url() {
    return this._url
  }

  async json() {
    return this._json
  }

  clone() {
    return new MockNextRequest(this._url, { body: this._json })
  }
}

// Import after setting up mocks
import {
  validateBody,
  validateQuery,
  ValidationError,
  sanitizeString,
  parsePaginationParams,
} from '@/lib/validation/middleware'

describe('Validation Middleware', () => {
  describe('validateBody', () => {
    const testSchema = z.object({
      name: z.string().min(1).max(100),
      email: z.string().email(),
      age: z.number().int().positive().optional(),
    })

    it('should validate a correct body', async () => {
      const request = new MockNextRequest('http://localhost/api/test', {
        body: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 25,
        },
      })

      const result = await validateBody(request as unknown as Request, testSchema)

      expect(result).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      })
    })

    it('should validate body without optional fields', async () => {
      const request = new MockNextRequest('http://localhost/api/test', {
        body: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })

      const result = await validateBody(request as unknown as Request, testSchema)

      expect(result).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
      })
    })

    it('should throw ValidationError for invalid email', async () => {
      const request = new MockNextRequest('http://localhost/api/test', {
        body: {
          name: 'John Doe',
          email: 'not-an-email',
        },
      })

      await expect(validateBody(request as unknown as Request, testSchema)).rejects.toThrow(
        ValidationError
      )
    })

    it('should throw ValidationError for missing required fields', async () => {
      const request = new MockNextRequest('http://localhost/api/test', {
        body: {
          name: 'John Doe',
        },
      })

      await expect(validateBody(request as unknown as Request, testSchema)).rejects.toThrow(
        ValidationError
      )
    })

    it('should throw ValidationError for empty name', async () => {
      const request = new MockNextRequest('http://localhost/api/test', {
        body: {
          name: '',
          email: 'john@example.com',
        },
      })

      await expect(validateBody(request as unknown as Request, testSchema)).rejects.toThrow(
        ValidationError
      )
    })
  })

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello')
    })

    it('should remove script tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>hello')).toBe('hello')
    })

    it('should remove javascript: protocol', () => {
      expect(sanitizeString('javascript:alert(1)')).toBe('alert(1)')
    })

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('')
    })

    it('should handle null/undefined', () => {
      expect(sanitizeString(null as unknown as string)).toBe('')
      expect(sanitizeString(undefined as unknown as string)).toBe('')
    })
  })

  describe('parsePaginationParams', () => {
    it('should parse valid pagination params', () => {
      const searchParams = new URLSearchParams('page=2&limit=20')
      const result = parsePaginationParams(searchParams)

      expect(result).toEqual({
        page: 2,
        limit: 20,
        offset: 20,
      })
    })

    it('should use defaults for missing params', () => {
      const searchParams = new URLSearchParams('')
      const result = parsePaginationParams(searchParams)

      expect(result).toEqual({
        page: 1,
        limit: 50,
        offset: 0,
      })
    })

    it('should clamp limit to max value', () => {
      const searchParams = new URLSearchParams('limit=500')
      const result = parsePaginationParams(searchParams, { maxLimit: 100 })

      expect(result.limit).toBe(100)
    })

    it('should handle invalid page numbers', () => {
      const searchParams = new URLSearchParams('page=-5')
      const result = parsePaginationParams(searchParams)

      expect(result.page).toBe(1)
    })

    it('should calculate correct offset', () => {
      const searchParams = new URLSearchParams('page=3&limit=25')
      const result = parsePaginationParams(searchParams)

      expect(result.offset).toBe(50) // (3-1) * 25
    })
  })

  describe('ValidationError', () => {
    it('should be an instance of Error', () => {
      const error = new ValidationError('Test error')
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ValidationError)
    })

    it('should store the message', () => {
      const error = new ValidationError('Invalid input')
      expect(error.message).toBe('Invalid input')
    })

    it('should have correct name', () => {
      const error = new ValidationError('Test')
      expect(error.name).toBe('ValidationError')
    })
  })
})
