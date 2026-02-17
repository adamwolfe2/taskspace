/**
 * Base Importer Abstract Class
 * All provider-specific importers extend this class
 */

import type {
  ImportProvider,
  NormalizedData,
  ValidationResult,
  ImportError,
  ImportWarning,
  NormalizedUser,
} from '../types'

export abstract class BaseImporter {
  abstract readonly provider: ImportProvider
  abstract readonly supportedFormats: string[]

  /**
   * Detect if this importer can handle the given file
   * Quick check before full validation
   */
  abstract detect(file: File | Buffer, fileName: string): boolean

  /**
   * Validate file structure and content
   * Returns errors/warnings without normalizing data
   */
  abstract validate(raw: unknown): Promise<ValidationResult>

  /**
   * Convert provider-specific format to normalized TaskSpace format
   * This is the main ETL transformation logic
   */
  abstract normalize(raw: unknown): Promise<NormalizedData>

  // ========================================
  // Shared Utility Methods
  // ========================================

  /**
   * Fuzzy match a source user to existing TaskSpace users
   * 1. Try exact email match
   * 2. Try fuzzy name match (Levenshtein distance)
   * 3. Return best match with confidence score
   */
  protected fuzzyMatchUser(
    sourceUser: { email?: string | null; name: string },
    existingUsers: Array<{ id: string; email: string | null; name: string }>
  ): { id: string; confidence: number } | null {
    // 1. Exact email match (100% confidence)
    if (sourceUser.email) {
      const normalizedSourceEmail = sourceUser.email.toLowerCase().trim()
      const exactMatch = existingUsers.find(
        (u) => u.email?.toLowerCase().trim() === normalizedSourceEmail
      )
      if (exactMatch) {
        return { id: exactMatch.id, confidence: 100 }
      }
    }

    // 2. Fuzzy name match
    if (!sourceUser.name) return null

    const normalizedSourceName = this.normalizeName(sourceUser.name)
    let bestMatch: { id: string; confidence: number } | null = null

    for (const existingUser of existingUsers) {
      const normalizedExistingName = this.normalizeName(existingUser.name)
      const similarity = this.stringSimilarity(
        normalizedSourceName,
        normalizedExistingName
      )
      const confidence = Math.round(similarity * 100)

      // Only consider matches above 70% confidence
      if (confidence >= 70) {
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { id: existingUser.id, confidence }
        }
      }
    }

    return bestMatch
  }

  /**
   * Normalize tag name for matching
   * - Lowercase
   * - Trim whitespace
   * - Replace special characters with hyphens
   */
  protected normalizeTagName(tag: string): string {
    return tag
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  /**
   * Parse various date formats to ISO string
   * Returns null if date is invalid
   */
  protected parseDate(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null

    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return null
      return date.toISOString()
    } catch {
      return null
    }
  }

  /**
   * Normalize user name for fuzzy matching
   * - Lowercase
   * - Remove extra whitespace
   * - Remove punctuation
   */
  protected normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * Returns value between 0 (no match) and 1 (exact match)
   */
  protected stringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1
    if (str1.length === 0 || str2.length === 0) return 0

    const distance = this.levenshteinDistance(str1, str2)
    const maxLength = Math.max(str1.length, str2.length)
    return 1 - distance / maxLength
  }

  /**
   * Calculate Levenshtein distance between two strings
   * https://en.wikipedia.org/wiki/Levenshtein_distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    // Initialize first column
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    // Initialize first row
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Sanitize HTML content to plain text
   * Used for importing descriptions from tools that support rich text
   */
  protected sanitizeHtml(html: string | null | undefined): string {
    if (!html) return ''

    return (
      html
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Decode common HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim()
    )
  }

  /**
   * Truncate text to max length with ellipsis
   */
  protected truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + '...'
  }

  /**
   * Generate a unique hash for a CSV row
   * Used as external ID when provider doesn't have unique IDs
   */
  protected generateRowHash(row: Record<string, unknown>): string {
    const str = JSON.stringify(row)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return `csv_${Math.abs(hash).toString(36)}`
  }

  /**
   * Create validation error
   */
  protected createError(code: string, message: string, context?: Record<string, unknown>): ImportError {
    return { code, message, context, timestamp: new Date().toISOString() }
  }

  /**
   * Create validation warning
   */
  protected createWarning(code: string, message: string, context?: Record<string, unknown>): ImportWarning {
    return { code, message, context, timestamp: new Date().toISOString() }
  }

  /**
   * Validate required field
   */
  protected validateRequired(
    value: unknown,
    fieldName: string,
    errors: ImportError[]
  ): value is string {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push(
        this.createError(
          'MISSING_REQUIRED_FIELD',
          `Missing required field: ${fieldName}`
        )
      )
      return false
    }
    return true
  }

  /**
   * Extract domain from email
   */
  protected extractDomain(email: string | null): string | null {
    if (!email) return null
    const match = email.match(/@(.+)$/)
    return match ? match[1].toLowerCase() : null
  }

  /**
   * Check if two users are likely the same person based on email domain
   */
  protected isSameDomain(email1: string | null, email2: string | null): boolean {
    if (!email1 || !email2) return false
    return this.extractDomain(email1) === this.extractDomain(email2)
  }
}
