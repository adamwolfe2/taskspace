/**
 * API Error Handling Tests
 *
 * Tests for standardized API error responses
 */

import {
  ApiError,
  Errors,
  successResponse,
  paginatedResponse,
} from '@/lib/api/errors'

describe('ApiError', () => {
  describe('constructor', () => {
    it('should create an error with all properties', () => {
      const error = new ApiError('Test error', 'TEST_ERROR', 400, { field: 'test' })

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.status).toBe(400)
      expect(error.details).toEqual({ field: 'test' })
    })

    it('should use default values', () => {
      const error = new ApiError('Test error')

      expect(error.code).toBe('UNKNOWN_ERROR')
      expect(error.status).toBe(500)
      expect(error.details).toBeUndefined()
    })
  })

  describe('toJSON', () => {
    it('should return error object without details', () => {
      const error = new ApiError('Test error', 'TEST_ERROR', 400)

      expect(error.toJSON()).toEqual({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
        },
      })
    })

    it('should include details when present', () => {
      const error = new ApiError('Test error', 'TEST_ERROR', 400, {
        field: 'email',
        reason: 'invalid',
      })

      expect(error.toJSON()).toEqual({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          details: {
            field: 'email',
            reason: 'invalid',
          },
        },
      })
    })
  })

  describe('toResponse', () => {
    it('should return a NextResponse with correct status', () => {
      const error = new ApiError('Not found', 'NOT_FOUND', 404)
      const response = error.toResponse()

      expect(response.status).toBe(404)
    })

    it('should return JSON content type', async () => {
      const error = new ApiError('Test', 'TEST', 400)
      const response = error.toResponse()

      const json = await response.json()
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('TEST')
    })
  })
})

describe('Errors factory', () => {
  describe('unauthorized', () => {
    it('should create 401 error', () => {
      const error = Errors.unauthorized()

      expect(error.status).toBe(401)
      expect(error.code).toBe('UNAUTHORIZED')
    })

    it('should use custom message', () => {
      const error = Errors.unauthorized('Custom auth error')

      expect(error.message).toBe('Custom auth error')
    })
  })

  describe('notFound', () => {
    it('should create 404 error', () => {
      const error = Errors.notFound('User')

      expect(error.status).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
      expect(error.message).toBe('User not found')
    })
  })

  describe('validationError', () => {
    it('should create 400 error', () => {
      const error = Errors.validationError('Email is required')

      expect(error.status).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.message).toBe('Email is required')
    })

    it('should include field details', () => {
      const error = Errors.validationError('Invalid email', { field: 'email' })

      expect(error.details).toEqual({ field: 'email' })
    })
  })

  describe('insufficientPermissions', () => {
    it('should create 403 error', () => {
      const error = Errors.insufficientPermissions('delete users')

      expect(error.status).toBe(403)
      expect(error.code).toBe('INSUFFICIENT_PERMISSIONS')
      expect(error.message).toBe('You do not have permission to delete users')
    })
  })

  describe('conflict', () => {
    it('should create 409 error', () => {
      const error = Errors.conflict('Email already exists')

      expect(error.status).toBe(409)
      expect(error.code).toBe('CONFLICT')
    })
  })

  describe('tooManyRequests', () => {
    it('should create 429 error', () => {
      const error = Errors.tooManyRequests()

      expect(error.status).toBe(429)
      expect(error.code).toBe('TOO_MANY_REQUESTS')
    })

    it('should include retry-after in details', () => {
      const error = Errors.tooManyRequests(60)

      expect(error.details).toEqual({ retryAfter: 60 })
    })
  })

  describe('internal', () => {
    it('should create 500 error', () => {
      const error = Errors.internal()

      expect(error.status).toBe(500)
      expect(error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('serviceUnavailable', () => {
    it('should create 503 error', () => {
      const error = Errors.serviceUnavailable()

      expect(error.status).toBe(503)
      expect(error.code).toBe('SERVICE_UNAVAILABLE')
    })
  })
})

describe('successResponse', () => {
  it('should wrap data in success response', async () => {
    const data = { id: '123', name: 'Test' }
    const response = successResponse(data)

    expect(response.status).toBe(200)

    const json = await response.json()
    expect(json).toEqual({
      success: true,
      data: { id: '123', name: 'Test' },
    })
  })

  it('should use custom status code', async () => {
    const response = successResponse({ created: true }, 201)

    expect(response.status).toBe(201)
  })

  it('should handle null data', async () => {
    const response = successResponse(null)

    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.data).toBeNull()
  })

  it('should handle arrays', async () => {
    const response = successResponse([1, 2, 3])

    const json = await response.json()
    expect(json.data).toEqual([1, 2, 3])
  })
})

describe('paginatedResponse', () => {
  it('should include pagination metadata', async () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const response = paginatedResponse(items, {
      page: 1,
      pageSize: 10,
      total: 100,
    })

    expect(response.status).toBe(200)

    const json = await response.json()
    expect(json).toEqual({
      success: true,
      data: items,
      pagination: {
        page: 1,
        pageSize: 10,
        total: 100,
        totalPages: 10,
        hasMore: true,
      },
    })
  })

  it('should calculate totalPages correctly', async () => {
    const response = paginatedResponse([], {
      page: 1,
      pageSize: 25,
      total: 75,
    })

    const json = await response.json()
    expect(json.pagination.totalPages).toBe(3)
  })

  it('should set hasMore to false on last page', async () => {
    const response = paginatedResponse([], {
      page: 5,
      pageSize: 10,
      total: 50,
    })

    const json = await response.json()
    expect(json.pagination.hasMore).toBe(false)
  })

  it('should handle empty results', async () => {
    const response = paginatedResponse([], {
      page: 1,
      pageSize: 10,
      total: 0,
    })

    const json = await response.json()
    expect(json.pagination.totalPages).toBe(0)
    expect(json.pagination.hasMore).toBe(false)
  })
})
