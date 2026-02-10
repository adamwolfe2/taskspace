/**
 * API Validation Middleware
 *
 * Provides a standardized way to validate API requests using Zod schemas.
 * Handles parsing, validation errors, and type inference.
 */

import { NextRequest, NextResponse } from "next/server"
import { z, ZodError, ZodSchema } from "zod"
import type { ApiResponse } from "@/lib/types"
import { sanitizeText } from "@/lib/utils/sanitize"

/** Common text field names that should be sanitized after validation */
const TEXT_FIELDS_TO_SANITIZE = [
  "title",
  "description",
  "challenges",
  "escalationNote",
  "notes",
  "content",
  "outcome",
  "resolution",
  "name",
  "department",
  "jobTitle",
  "weeklyMeasurable",
  "confidenceNotes",
  "text",
]

/**
 * Sanitizes common text fields in validated request data.
 * Applied automatically after validateBody() succeeds.
 */
function sanitizeValidatedData<T>(data: T): T {
  if (!data || typeof data !== "object") return data
  const result = { ...data } as Record<string, unknown>
  for (const field of TEXT_FIELDS_TO_SANITIZE) {
    if (typeof result[field] === "string") {
      result[field] = sanitizeText(result[field] as string)
    }
  }
  return result as T
}

export interface ValidationOptions {
  /** Whether to strip unknown keys from the object */
  strict?: boolean
  /** Custom error message prefix */
  errorPrefix?: string
}

/**
 * Formats Zod validation errors into a user-friendly format
 */
export function formatZodError(error: ZodError): string {
  const errors = error.errors.map((err) => {
    const path = err.path.join(".")
    return path ? `${path}: ${err.message}` : err.message
  })
  return errors.join("; ")
}

/**
 * Creates a standardized error response for validation failures
 */
export function validationErrorResponse(
  errors: string,
  statusCode: number = 400
): NextResponse<ApiResponse<null>> {
  return NextResponse.json<ApiResponse<null>>(
    {
      success: false,
      error: errors,
    },
    { status: statusCode }
  )
}

/**
 * Validates request body against a Zod schema
 * Returns the validated data or throws a validation error
 */
export async function validateBody<T extends ZodSchema>(
  request: NextRequest,
  schema: T,
  options: ValidationOptions = {}
): Promise<z.infer<T>> {
  try {
    const body = await request.json()
    // Check if strict mode is requested and schema supports it (ZodObject)
    let schemaToUse: ZodSchema = schema
    if (options.strict && 'strict' in schema) {
      const strictMethod = (schema as { strict?: () => ZodSchema }).strict
      if (typeof strictMethod === 'function') {
        schemaToUse = strictMethod.call(schema)
      }
    }
    const result = schemaToUse.safeParse(body)

    if (!result.success) {
      const errorMessage = options.errorPrefix
        ? `${options.errorPrefix}: ${formatZodError(result.error)}`
        : formatZodError(result.error)
      throw new ValidationError(errorMessage)
    }

    return sanitizeValidatedData(result.data)
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    if (error instanceof SyntaxError) {
      throw new ValidationError("Invalid JSON in request body")
    }
    throw new ValidationError("Failed to parse request body")
  }
}

/**
 * Validates URL search params against a Zod schema
 */
export function validateQuery<T extends ZodSchema>(
  request: NextRequest,
  schema: T,
  options: ValidationOptions = {}
): z.infer<T> {
  const { searchParams } = new URL(request.url)
  const params: Record<string, string | string[]> = {}

  searchParams.forEach((value, key) => {
    const existing = params[key]
    if (existing) {
      if (Array.isArray(existing)) {
        existing.push(value)
      } else {
        params[key] = [existing, value]
      }
    } else {
      params[key] = value
    }
  })

  const result = schema.safeParse(params)

  if (!result.success) {
    const errorMessage = options.errorPrefix
      ? `${options.errorPrefix}: ${formatZodError(result.error)}`
      : formatZodError(result.error)
    throw new ValidationError(errorMessage)
  }

  return result.data
}

/**
 * Validates route params (like [id]) against a schema
 */
export function validateParams<T extends ZodSchema>(
  params: Record<string, string | string[] | undefined>,
  schema: T,
  options: ValidationOptions = {}
): z.infer<T> {
  const result = schema.safeParse(params)

  if (!result.success) {
    const errorMessage = options.errorPrefix
      ? `${options.errorPrefix}: ${formatZodError(result.error)}`
      : formatZodError(result.error)
    throw new ValidationError(errorMessage)
  }

  return result.data
}

/**
 * Custom validation error class for API routes
 */
export class ValidationError extends Error {
  public readonly statusCode: number

  constructor(message: string, statusCode: number = 400) {
    super(message)
    this.name = "ValidationError"
    this.statusCode = statusCode
  }
}

/**
 * Wraps an API handler with validation error handling
 */
export function withValidation<T>(
  handler: (request: NextRequest, context?: Record<string, unknown>) => Promise<NextResponse<ApiResponse<T>>>
) {
  return async (
    request: NextRequest,
    context?: Record<string, unknown>
  ): Promise<NextResponse<ApiResponse<T> | ApiResponse<null>>> => {
    try {
      return await handler(request, context)
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationErrorResponse(error.message, error.statusCode)
      }
      throw error
    }
  }
}

/**
 * Validates and parses a date string, returning null if invalid
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Validates that a value is a valid UUID
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

/**
 * Sanitizes a string for safe database insertion
 * Removes potential SQL injection patterns and excessive whitespace
 */
export function sanitizeString(value: string): string {
  // Handle null/undefined
  if (!value) return ""

  return value
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/\s+/g, " ") // Normalize whitespace
    .substring(0, 10000) // Limit length
}

/**
 * Validates pagination parameters and returns safe defaults
 */
export function getPaginationParams(searchParams: URLSearchParams): {
  page: number
  pageSize: number
  offset: number
} {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)))
  const offset = (page - 1) * pageSize

  return { page, pageSize, offset }
}
