/**
 * API Error Handling Tests
 *
 * Tests for standardized API error responses
 */

// Unmock so we test the actual implementation (jest.setup.js mocks it globally)
jest.unmock("@/lib/api/errors")

import {
  ApiError,
  ErrorCodes,
  Errors,
  successResponse,
  paginatedResponse,
} from '@/lib/api/errors'

describe('ApiError', () => {
  describe('constructor', () => {
    it('should create an error with all properties', () => {
      const error = new ApiError(ErrorCodes.VALIDATION_ERROR, 'Test error', 400, { field: 'test' })

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.statusCode).toBe(400)
      expect(error.details).toEqual({ field: 'test' })
    })

    it('should use default values', () => {
      const error = new ApiError(ErrorCodes.INTERNAL_ERROR, 'Test error')

      expect(error.code).toBe('INTERNAL_ERROR')
      expect(error.statusCode).toBe(500)
      expect(error.details).toBeUndefined()
    })
  })

  describe('toResponse', () => {
    it('should return a NextResponse with correct status', () => {
      const error = new ApiError(ErrorCodes.NOT_FOUND, 'Not found', 404)
      const response = error.toResponse()

      expect(response.status).toBe(404)
    })

    it('should return JSON content type', async () => {
      const error = new ApiError(ErrorCodes.VALIDATION_ERROR, 'Test', 400)
      const response = error.toResponse()

      const json = await response.json()
      expect(json.success).toBe(false)
      expect(json.code).toBe('VALIDATION_ERROR')
    })
  })
})

describe('Errors factory', () => {
  describe('unauthorized', () => {
    it('should create 401 error', () => {
      const error = Errors.unauthorized()

      expect(error.statusCode).toBe(401)
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

      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
      expect(error.message).toBe('User not found')
    })
  })

  describe('validationError', () => {
    it('should create 400 error', () => {
      const error = Errors.validationError('Email is required')

      expect(error.statusCode).toBe(400)
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

      expect(error.statusCode).toBe(403)
      expect(error.code).toBe('INSUFFICIENT_PERMISSIONS')
      expect(error.message).toBe("You don't have permission to delete users")
    })
  })

  describe('conflict', () => {
    it('should create 409 error', () => {
      const error = Errors.conflict('Email already exists')

      expect(error.statusCode).toBe(409)
      expect(error.code).toBe('CONFLICT')
    })
  })

  describe('rateLimited', () => {
    it('should create 429 error', () => {
      const error = Errors.rateLimited()

      expect(error.statusCode).toBe(429)
      expect(error.code).toBe('RATE_LIMITED')
    })

    it('should include retry-after in details', () => {
      const error = Errors.rateLimited(60)

      expect(error.details).toEqual({ retryAfter: 60 })
    })
  })

  describe('internal', () => {
    it('should create 500 error', () => {
      const error = Errors.internal()

      expect(error.statusCode).toBe(500)
      expect(error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('serviceUnavailable', () => {
    it('should create 503 error', () => {
      const error = Errors.serviceUnavailable()

      expect(error.statusCode).toBe(503)
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
    const response = paginatedResponse(items, 100, 1, 10)

    expect(response.status).toBe(200)

    const json = await response.json()
    expect(json).toEqual({
      success: true,
      data: {
        items,
        pagination: {
          total: 100,
          page: 1,
          pageSize: 10,
          hasMore: true,
        },
      },
    })
  })

  it('should calculate hasMore correctly', async () => {
    const response = paginatedResponse([], 75, 1, 25)

    const json = await response.json()
    expect(json.data.pagination.hasMore).toBe(true)
  })

  it('should set hasMore to false on last page', async () => {
    const response = paginatedResponse([], 50, 5, 10)

    const json = await response.json()
    expect(json.data.pagination.hasMore).toBe(false)
  })

  it('should handle empty results', async () => {
    const response = paginatedResponse([], 0, 1, 10)

    const json = await response.json()
    expect(json.data.pagination.hasMore).toBe(false)
  })
})
