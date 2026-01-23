import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge class names with Tailwind CSS conflict resolution
 * Combines clsx for conditional classes with tailwind-merge for deduplication
 *
 * @param inputs - Class values (strings, objects, arrays, conditionals)
 * @returns Merged class string with conflicts resolved
 * @example cn("px-2 py-1", className, { "bg-blue-500": isActive })
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely parse a string to an integer with a default fallback.
 * Returns the default value if the input is null, undefined, empty, or NaN.
 */
export function safeParseInt(value: string | null | undefined, defaultValue: number = 0): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue
  }
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Safely parse a string to a float with a default fallback.
 * Returns the default value if the input is null, undefined, empty, or NaN.
 */
export function safeParseFloat(value: string | null | undefined, defaultValue: number = 0): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue
  }
  const parsed = parseFloat(value)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Clamp a number between a minimum and maximum value.
 *
 * @param value - The number to clamp
 * @param min - The minimum allowed value
 * @param max - The maximum allowed value
 * @returns The clamped value within [min, max]
 * @example clamp(150, 0, 100) // 100
 * @example clamp(-5, 0, 100) // 0
 * @example clamp(50, 0, 100) // 50
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number
  /** Initial delay between retries in ms (default: 1000) */
  initialDelayMs?: number
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number
  /** Maximum delay between retries in ms (default: 10000) */
  maxDelayMs?: number
  /** Function to determine if error is retryable (default: all errors are retryable) */
  isRetryable?: (error: unknown) => boolean
  /** Callback called before each retry attempt */
  onRetry?: (error: unknown, attempt: number) => void
}

/**
 * Execute an async function with automatic retry on failure
 * Uses exponential backoff between retries
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function if successful
 * @throws The last error if all retries fail
 *
 * @example
 * const data = await withRetry(
 *   () => fetch('https://api.example.com/data'),
 *   { maxAttempts: 3, initialDelayMs: 500 }
 * )
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    backoffMultiplier = 2,
    maxDelayMs = 10000,
    isRetryable = () => true,
    onRetry,
  } = options

  let lastError: unknown
  let delay = initialDelayMs

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry
      if (attempt >= maxAttempts || !isRetryable(error)) {
        throw error
      }

      // Call retry callback if provided
      onRetry?.(error, attempt)

      // Wait before next attempt
      await sleep(delay)

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelayMs)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError
}

/**
 * Sleep for a specified number of milliseconds
 * @param ms - Number of milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if an error is a network or transient error that should be retried
 * @param error - The error to check
 * @returns true if the error is likely transient and retryable
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    // Network errors
    if (message.includes('network') || message.includes('fetch')) return true
    if (message.includes('econnreset') || message.includes('econnrefused')) return true
    if (message.includes('timeout') || message.includes('timedout')) return true
    if (message.includes('socket hang up')) return true
    // Rate limiting
    if (message.includes('rate limit') || message.includes('429')) return true
    // Server errors
    if (message.includes('502') || message.includes('503') || message.includes('504')) return true
  }
  return false
}
