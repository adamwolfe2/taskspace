/**
 * Standardized API Error Handling
 *
 * Provides consistent error types, status codes, and response formatting
 * across all API routes. Integrates with structured logging and Sentry.
 */

import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import type { ApiResponse } from "@/lib/types"
import { logger, formatError, type RequestContext } from "@/lib/logger"

// ============================================
// ERROR CODES
// ============================================

export const ErrorCodes = {
  // Authentication errors (401)
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // Authorization errors (403)
  FORBIDDEN: "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  ORGANIZATION_ACCESS_DENIED: "ORGANIZATION_ACCESS_DENIED",

  // Validation errors (400)
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT: "INVALID_FORMAT",

  // Not found errors (404)
  NOT_FOUND: "NOT_FOUND",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  ORGANIZATION_NOT_FOUND: "ORGANIZATION_NOT_FOUND",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",

  // Conflict errors (409)
  CONFLICT: "CONFLICT",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",

  // Rate limiting (429)
  RATE_LIMITED: "RATE_LIMITED",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

  // Server errors (500)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",

  // Service unavailable (503)
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  MAINTENANCE_MODE: "MAINTENANCE_MODE",
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

// ============================================
// API ERROR CLASS
// ============================================

export class ApiError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>
  public readonly isOperational: boolean

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.isOperational = true

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor)
  }

  public toResponse(): NextResponse<ApiResponse<null>> {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: this.message,
        code: this.code,
        ...(process.env.NODE_ENV === "development" && this.details
          ? { meta: this.details }
          : {}),
      },
      { status: this.statusCode }
    )
  }
}

// ============================================
// PREDEFINED ERRORS
// ============================================

export const Errors = {
  // Authentication
  unauthorized: (message = "Authentication required") =>
    new ApiError(ErrorCodes.UNAUTHORIZED, message, 401),

  invalidCredentials: () =>
    new ApiError(ErrorCodes.INVALID_CREDENTIALS, "Invalid email or password", 401),

  tokenExpired: () =>
    new ApiError(ErrorCodes.TOKEN_EXPIRED, "Your session has expired. Please log in again.", 401),

  // Authorization
  forbidden: (message = "You don't have permission to perform this action") =>
    new ApiError(ErrorCodes.FORBIDDEN, message, 403),

  insufficientPermissions: (action: string) =>
    new ApiError(
      ErrorCodes.INSUFFICIENT_PERMISSIONS,
      `You don't have permission to ${action}`,
      403
    ),

  organizationAccessDenied: () =>
    new ApiError(
      ErrorCodes.ORGANIZATION_ACCESS_DENIED,
      "You don't have access to this organization",
      403
    ),

  // Validation
  validationError: (message: string, details?: Record<string, unknown>) =>
    new ApiError(ErrorCodes.VALIDATION_ERROR, message, 400, details),

  invalidInput: (field: string, message?: string) =>
    new ApiError(
      ErrorCodes.INVALID_INPUT,
      message || `Invalid value for ${field}`,
      400,
      { field }
    ),

  missingField: (field: string) =>
    new ApiError(
      ErrorCodes.MISSING_REQUIRED_FIELD,
      `Missing required field: ${field}`,
      400,
      { field }
    ),

  // Not Found
  notFound: (resource: string) =>
    new ApiError(ErrorCodes.NOT_FOUND, `${resource} not found`, 404),

  userNotFound: () =>
    new ApiError(ErrorCodes.USER_NOT_FOUND, "User not found", 404),

  organizationNotFound: () =>
    new ApiError(ErrorCodes.ORGANIZATION_NOT_FOUND, "Organization not found", 404),

  // Conflict
  conflict: (message: string) =>
    new ApiError(ErrorCodes.CONFLICT, message, 409),

  alreadyExists: (resource: string) =>
    new ApiError(ErrorCodes.ALREADY_EXISTS, `${resource} already exists`, 409),

  duplicateEntry: (field: string) =>
    new ApiError(ErrorCodes.DUPLICATE_ENTRY, `A record with this ${field} already exists`, 409),

  // Rate Limiting
  rateLimited: (retryAfter?: number) =>
    new ApiError(
      ErrorCodes.RATE_LIMITED,
      "Too many requests. Please try again later.",
      429,
      retryAfter ? { retryAfter } : undefined
    ),

  // Server Errors
  internal: (message = "An unexpected error occurred") =>
    new ApiError(ErrorCodes.INTERNAL_ERROR, message, 500),

  database: (message = "A database error occurred") =>
    new ApiError(ErrorCodes.DATABASE_ERROR, message, 500),

  externalService: (service: string) =>
    new ApiError(
      ErrorCodes.EXTERNAL_SERVICE_ERROR,
      `Failed to communicate with ${service}`,
      500,
      { service }
    ),

  // Service Unavailable
  serviceUnavailable: (message = "Service temporarily unavailable") =>
    new ApiError(ErrorCodes.SERVICE_UNAVAILABLE, message, 503),

  maintenance: () =>
    new ApiError(
      ErrorCodes.MAINTENANCE_MODE,
      "The service is currently under maintenance. Please try again later.",
      503
    ),
}

// ============================================
// ERROR HANDLER
// ============================================

/**
 * Wraps an API handler with standardized error handling
 */
export function withErrorHandler<T>(
  handler: (request: Request, context?: Record<string, unknown>) => Promise<NextResponse<ApiResponse<T>>>
) {
  return async (
    request: Request,
    context?: Record<string, unknown>
  ): Promise<NextResponse<ApiResponse<T> | ApiResponse<null>>> => {
    try {
      return await handler(request, context)
    } catch (error) {
      return handleError(error)
    }
  }
}

/**
 * Converts any error to a standardized API response
 */
export function handleError(error: unknown): NextResponse<ApiResponse<null>> {
  // Known API errors
  if (error instanceof ApiError) {
    logError(error)
    return error.toResponse()
  }

  // Database errors
  if (isPostgresError(error)) {
    const apiError = handlePostgresError(error)
    logError(apiError)
    return apiError.toResponse()
  }

  // Unknown errors - never expose internal details or stack traces in responses
  // The original error is still logged server-side via logError for debugging
  const internalError = Errors.internal("An unexpected error occurred. Please try again later.")
  logError(internalError, error)
  return internalError.toResponse()
}

/**
 * Checks if an error is a Postgres error
 */
function isPostgresError(error: unknown): error is { code: string; message: string } {
  if (typeof error !== "object" || error === null) {
    return false
  }
  const errorObj = error as Record<string, unknown>
  return typeof errorObj.code === "string"
}

/**
 * Converts Postgres errors to API errors
 */
function handlePostgresError(error: { code: string; message: string }): ApiError {
  switch (error.code) {
    case "23505": // unique_violation
      return Errors.duplicateEntry("field")
    case "23503": // foreign_key_violation
      return Errors.validationError("Referenced record does not exist")
    case "23502": // not_null_violation
      return Errors.missingField("required field")
    case "22P02": // invalid_text_representation
      return Errors.invalidInput("field", "Invalid data format")
    case "42P01": // undefined_table
      return Errors.database("Database table not found")
    case "42601": // syntax_error
      return Errors.database("Database query error")
    case "40001": // serialization_failure
      return Errors.database("Transaction conflict, please retry")
    case "08006": // connection_failure
    case "08001": // sqlclient_unable_to_establish_sqlconnection
    case "08004": // sqlserver_rejected_establishment_of_sqlconnection
      return Errors.database("Database connection error")
    case "57014": // query_canceled (timeout)
      return Errors.database("Request timed out")
    default:
      return Errors.database()
  }
}

/**
 * Logs errors using structured logging and sends to Sentry
 */
function logError(apiError: ApiError, originalError?: unknown): void {
  const logData = {
    code: apiError.code,
    statusCode: apiError.statusCode,
    details: apiError.details,
    originalError: originalError ? formatError(originalError) : undefined,
  }

  if (apiError.statusCode >= 500) {
    // Log as error
    logger.error(logData, `API Error: ${apiError.message}`)

    // Send to Sentry for 500+ errors
    Sentry.captureException(originalError || apiError, {
      tags: {
        errorCode: apiError.code,
        statusCode: apiError.statusCode.toString(),
      },
      extra: logData,
    })
  } else if (apiError.statusCode >= 400) {
    // Log as warning for 4xx errors
    logger.warn(logData, `API Warning: ${apiError.message}`)
  }
}

/**
 * Handle API errors with full context
 * Use this in API route catch blocks
 *
 * @example
 * try {
 *   // ... API logic
 * } catch (error) {
 *   return handleAPIError(error, { userId, orgId, path: '/api/tasks' })
 * }
 */
export function handleAPIError(
  error: unknown,
  context?: RequestContext
): NextResponse<ApiResponse<null>> {
  // Set Sentry context
  if (context) {
    Sentry.setContext("request", context as { [key: string]: unknown })
    if (context.userId) {
      Sentry.setUser({ id: context.userId })
    }
  }

  return handleError(error)
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Creates a successful API response
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200,
  message?: string
): NextResponse<ApiResponse<T>> {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
      ...(message ? { message } : {}),
    },
    { status: statusCode }
  )
}

/**
 * Creates a paginated API response
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): NextResponse<ApiResponse<{ items: T[]; pagination: { total: number; page: number; pageSize: number; hasMore: boolean } }>> {
  return NextResponse.json({
    success: true,
    data: {
      items,
      pagination: {
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      },
    },
  })
}

/**
 * Creates a no-content response (204)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

/**
 * Creates a created response (201)
 */
export function createdResponse<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return successResponse(data, 201, message)
}
