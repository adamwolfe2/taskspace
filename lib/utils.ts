import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
