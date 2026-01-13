/**
 * Structured Logger
 *
 * Provides consistent, structured logging across the application.
 * Uses Pino for high-performance JSON logging.
 *
 * Usage:
 * import { logger, createRequestLogger } from '@/lib/logger'
 *
 * // Basic logging
 * logger.info('User logged in', { userId: '123' })
 * logger.error('Database error', { error: err.message })
 *
 * // Request-scoped logging
 * const reqLogger = createRequestLogger({ userId: '123', orgId: 'org_456' })
 * reqLogger.info('Processing request')
 */

import pino from "pino"

// ============================================
// CONFIGURATION
// ============================================

const LOG_LEVEL = process.env.LOG_LEVEL || "info"
const IS_PRODUCTION = process.env.NODE_ENV === "production"
const IS_DEVELOPMENT = process.env.NODE_ENV === "development"

// ============================================
// SENSITIVE DATA PATTERNS TO REDACT
// ============================================

const REDACT_PATHS = [
  "password",
  "passwordHash",
  "token",
  "sessionToken",
  "apiKey",
  "secret",
  "authorization",
  "cookie",
  "accessToken",
  "refreshToken",
  "*.password",
  "*.passwordHash",
  "*.token",
  "*.secret",
  "*.apiKey",
  "headers.authorization",
  "headers.cookie",
]

// ============================================
// LOGGER INSTANCE
// ============================================

/**
 * Main logger instance
 *
 * In development: Pretty-printed, colored output
 * In production: JSON output for log aggregation
 */
export const logger = pino({
  level: LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },
  formatters: {
    level: (label) => {
      return { level: label }
    },
  },
  base: {
    env: process.env.NODE_ENV,
    service: "aimseod",
    version: process.env.npm_package_version || "unknown",
  },
  ...(IS_DEVELOPMENT && !IS_PRODUCTION
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname,env,service",
          },
        },
      }
    : {}),
})

// ============================================
// REQUEST CONTEXT LOGGER
// ============================================

export interface RequestContext {
  requestId?: string
  userId?: string
  orgId?: string
  path?: string
  method?: string
  ip?: string
  userAgent?: string
}

/**
 * Create a child logger with request context
 *
 * @param context - Request-specific context to include in all logs
 * @returns Child logger with context bound
 *
 * @example
 * const reqLogger = createRequestLogger({
 *   userId: session.userId,
 *   orgId: session.organizationId,
 *   requestId: crypto.randomUUID()
 * })
 * reqLogger.info('Processing EOD submission')
 */
export function createRequestLogger(context: RequestContext): pino.Logger {
  return logger.child({
    ...context,
    requestId: context.requestId || generateRequestId(),
  })
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15)
}

// ============================================
// LOG LEVEL HELPERS
// ============================================

/**
 * Log levels and when to use them:
 *
 * - trace: Very detailed debugging (disabled in production)
 * - debug: Debugging information (disabled in production by default)
 * - info: Normal operations (user actions, API calls)
 * - warn: Something unexpected but not necessarily wrong
 * - error: Something went wrong that needs attention
 * - fatal: Critical error, application may crash
 */

// ============================================
// API LOGGING HELPERS
// ============================================

/**
 * Log API request start
 */
export function logApiRequest(
  reqLogger: pino.Logger,
  method: string,
  path: string,
  params?: Record<string, unknown>
): void {
  reqLogger.info({ method, path, params }, "API request started")
}

/**
 * Log API response
 */
export function logApiResponse(
  reqLogger: pino.Logger,
  statusCode: number,
  durationMs: number
): void {
  const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info"
  reqLogger[level]({ statusCode, durationMs }, "API request completed")
}

/**
 * Log authentication events
 */
export function logAuthEvent(
  event: "login" | "logout" | "register" | "password_reset" | "session_expired",
  userId?: string,
  success?: boolean,
  details?: Record<string, unknown>
): void {
  const level = success === false ? "warn" : "info"
  logger[level]({ event, userId, success, ...details }, `Auth event: ${event}`)
}

/**
 * Log security events
 */
export function logSecurityEvent(
  event: string,
  severity: "info" | "warn" | "error",
  details: Record<string, unknown>
): void {
  logger[severity]({ event, security: true, ...details }, `Security: ${event}`)
}

// ============================================
// ERROR LOGGING
// ============================================

/**
 * Format error for logging
 */
export function formatError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: IS_DEVELOPMENT ? error.stack : undefined,
    }
  }
  return { message: String(error) }
}

/**
 * Log error with context
 */
export function logError(
  reqLogger: pino.Logger | typeof logger,
  message: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  reqLogger.error(
    {
      error: formatError(error),
      ...context,
    },
    message
  )
}

// ============================================
// DATABASE LOGGING
// ============================================

/**
 * Log database operation (for slow query monitoring)
 */
export function logDbOperation(
  operation: string,
  table: string,
  durationMs: number,
  rowCount?: number
): void {
  const level = durationMs > 1000 ? "warn" : "debug"
  logger[level](
    { operation, table, durationMs, rowCount },
    `DB: ${operation} on ${table}`
  )
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default logger
