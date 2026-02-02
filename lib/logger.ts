/**
 * Structured Logger
 *
 * Provides consistent, structured logging across the application.
 * Uses console-based logging compatible with Next.js Turbopack.
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

// ============================================
// CONFIGURATION
// ============================================

const LOG_LEVEL = process.env.LOG_LEVEL || "info"
const IS_PRODUCTION = process.env.NODE_ENV === "production"
const IS_DEVELOPMENT = process.env.NODE_ENV === "development"

// ============================================
// LOG LEVELS
// ============================================

const LOG_LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
} as const

type LogLevel = keyof typeof LOG_LEVELS

const currentLevelValue = LOG_LEVELS[LOG_LEVEL as LogLevel] || LOG_LEVELS.info

// ============================================
// SENSITIVE DATA REDACTION
// ============================================

const SENSITIVE_KEYS = new Set([
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
])

function redactSensitive(obj: unknown, seen = new WeakSet()): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== "object") return obj

  // Prevent circular reference issues
  if (seen.has(obj as object)) return "[Circular]"
  seen.add(obj as object)

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item, seen))
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = "[REDACTED]"
    } else if (typeof value === "object" && value !== null) {
      result[key] = redactSensitive(value, seen)
    } else {
      result[key] = value
    }
  }
  return result
}

// ============================================
// LOGGER IMPLEMENTATION
// ============================================

interface LoggerInterface {
  trace: (obj: Record<string, unknown> | string, msg?: string) => void
  debug: (obj: Record<string, unknown> | string, msg?: string) => void
  info: (obj: Record<string, unknown> | string, msg?: string) => void
  warn: (obj: Record<string, unknown> | string, msg?: string) => void
  error: (obj: Record<string, unknown> | string, msg?: string) => void
  fatal: (obj: Record<string, unknown> | string, msg?: string) => void
  child: (bindings: Record<string, unknown>) => LoggerInterface
}

function createLogger(bindings: Record<string, unknown> = {}): LoggerInterface {
  const baseContext = {
    env: process.env.NODE_ENV,
    service: "aimseod",
    ...bindings,
  }

  function log(
    level: LogLevel,
    obj: Record<string, unknown> | string,
    msg?: string
  ): void {
    if (LOG_LEVELS[level] < currentLevelValue) return

    const timestamp = new Date().toISOString()
    let message: string
    let data: Record<string, unknown> = {}

    if (typeof obj === "string") {
      message = obj
    } else {
      data = obj
      message = msg || ""
    }

    const redactedData = redactSensitive(data)
    const logEntry = {
      time: timestamp,
      level,
      ...baseContext,
      ...(typeof redactedData === 'object' && redactedData !== null ? redactedData : {}),
      msg: message,
    }

    // In development, use pretty format
    if (IS_DEVELOPMENT && !IS_PRODUCTION) {
      const levelColors: Record<LogLevel, string> = {
        trace: "\x1b[90m",
        debug: "\x1b[36m",
        info: "\x1b[32m",
        warn: "\x1b[33m",
        error: "\x1b[31m",
        fatal: "\x1b[35m",
      }
      const reset = "\x1b[0m"
      const color = levelColors[level]
      const prettyData = Object.keys(data).length > 0 ? ` ${JSON.stringify(redactSensitive(data))}` : ""
      console.log(`${color}[${level.toUpperCase()}]${reset} ${timestamp} ${message}${prettyData}`)
    } else {
      // In production, output JSON
      const consoleMethod =
        level === "error" || level === "fatal"
          ? console.error
          : level === "warn"
            ? console.warn
            : console.log
      consoleMethod(JSON.stringify(logEntry))
    }
  }

  return {
    trace: (obj, msg) => log("trace", obj, msg),
    debug: (obj, msg) => log("debug", obj, msg),
    info: (obj, msg) => log("info", obj, msg),
    warn: (obj, msg) => log("warn", obj, msg),
    error: (obj, msg) => log("error", obj, msg),
    fatal: (obj, msg) => log("fatal", obj, msg),
    child: (childBindings) => createLogger({ ...baseContext, ...childBindings }),
  }
}

export const logger = createLogger()

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
 */
export function createRequestLogger(context: RequestContext): LoggerInterface {
  return logger.child({
    ...context,
    requestId: context.requestId || generateRequestId(),
  })
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15)
}

// ============================================
// API LOGGING HELPERS
// ============================================

/**
 * Log the start of an API request
 * @param reqLogger - Request-scoped logger instance
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - Request path
 * @param params - Optional request parameters
 */
export function logApiRequest(
  reqLogger: LoggerInterface,
  method: string,
  path: string,
  params?: Record<string, unknown>
): void {
  reqLogger.info({ method, path, params }, "API request started")
}

/**
 * Log the completion of an API request
 * Automatically selects log level based on status code
 * @param reqLogger - Request-scoped logger instance
 * @param statusCode - HTTP response status code
 * @param durationMs - Request duration in milliseconds
 */
export function logApiResponse(
  reqLogger: LoggerInterface,
  statusCode: number,
  durationMs: number
): void {
  const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info"
  reqLogger[level]({ statusCode, durationMs }, "API request completed")
}

/**
 * Log authentication-related events
 * @param event - Type of auth event
 * @param userId - ID of user involved (if known)
 * @param success - Whether the auth action succeeded
 * @param details - Additional context
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
 * Log security-related events for monitoring
 * @param event - Description of security event
 * @param severity - Log severity level
 * @param details - Event details and context
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
 * Format an error object for structured logging
 * Extracts name, message, and stack (in development only)
 * @param error - Error to format (Error, object, or primitive)
 * @returns Structured error object safe for logging
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
 * Log an error with standardized formatting
 * @param reqLogger - Logger instance (global or request-scoped)
 * @param message - Human-readable error description
 * @param error - The error object to log
 * @param context - Additional context for debugging
 * @example logError(logger, "Failed to create user", err, { email })
 */
export function logError(
  reqLogger: LoggerInterface | typeof logger,
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
