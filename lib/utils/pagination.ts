/**
 * Cursor-based Pagination Utilities
 *
 * Provides types and helpers for cursor-based pagination across all list endpoints.
 * The cursor is encoded as `${ISO timestamp}_${id}` using created_at + id as
 * a compound cursor for stable, deterministic pagination.
 */

// ============================================
// TYPES
// ============================================

export interface PaginatedResponse<T> {
  data: T[]
  cursor: string | null
  hasMore: boolean
  totalCount: number
}

export interface PaginationParams {
  cursor?: string
  limit: number
  direction: "asc" | "desc"
}

export interface DecodedCursor {
  timestamp: string
  id: string
}

// ============================================
// HELPERS
// ============================================

/**
 * Parse pagination params from URL search params.
 * Extracts cursor, limit (default 50, max 200), and direction (default 'desc').
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const cursor = searchParams.get("cursor") || undefined
  const rawLimit = parseInt(searchParams.get("limit") || "50", 10)
  const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), 200)
  const rawDirection = searchParams.get("direction")
  const direction: "asc" | "desc" =
    rawDirection === "asc" ? "asc" : "desc"

  return { cursor, limit, direction }
}

/**
 * Encode a cursor from a timestamp and id.
 * Format: `${ISO timestamp}_${id}`
 */
export function encodeCursor(timestamp: string, id: string): string {
  return `${timestamp}_${id}`
}

/**
 * Decode a cursor string into its timestamp and id components.
 * Returns null if the cursor is invalid.
 */
export function decodeCursor(cursor: string): DecodedCursor | null {
  // The cursor format is `${ISO timestamp}_${id}`
  // ISO timestamps contain colons and hyphens but the id follows the last underscore
  // We split on the last underscore that separates the timestamp from the id
  const lastUnderscoreIdx = cursor.lastIndexOf("_")
  if (lastUnderscoreIdx === -1) return null

  const timestamp = cursor.substring(0, lastUnderscoreIdx)
  const id = cursor.substring(lastUnderscoreIdx + 1)

  if (!timestamp || !id) return null

  // Validate the timestamp is a valid ISO string
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return null

  return { timestamp, id }
}

/**
 * Build a paginated SQL WHERE clause fragment for cursor-based pagination.
 *
 * For descending order (default): fetches rows BEFORE the cursor
 *   WHERE (created_at < cursor_date OR (created_at = cursor_date AND id < cursor_id))
 *
 * For ascending order: fetches rows AFTER the cursor
 *   WHERE (created_at > cursor_date OR (created_at = cursor_date AND id > cursor_id))
 *
 * Returns the clause parts and parameter values for use with tagged template literals.
 *
 * @param cursor - The encoded cursor string
 * @param direction - 'asc' or 'desc'
 * @param timestampColumn - The column name for the timestamp (default: 'created_at')
 * @returns Object with decoded cursor values, or null if no cursor provided
 */
export function buildCursorFilter(
  cursor: string | undefined,
  direction: "asc" | "desc" = "desc",
  _timestampColumn: string = "created_at"
): DecodedCursor | null {
  if (!cursor) return null

  const decoded = decodeCursor(cursor)
  if (!decoded) return null

  return decoded
}

/**
 * Create a PaginatedResponse from a data array and pagination params.
 * Handles cursor generation for the next page.
 *
 * @param data - The fetched data (should include limit+1 rows to detect hasMore)
 * @param limit - The requested page size
 * @param totalCount - The total count of matching rows
 * @param getTimestamp - Function to extract the timestamp from a data item
 * @param getId - Function to extract the id from a data item
 */
export function buildPaginatedResponse<T>(
  data: T[],
  limit: number,
  totalCount: number,
  getTimestamp: (item: T) => string,
  getId: (item: T) => string
): PaginatedResponse<T> {
  const hasMore = data.length > limit
  const trimmedData = hasMore ? data.slice(0, limit) : data

  let nextCursor: string | null = null
  if (hasMore && trimmedData.length > 0) {
    const lastItem = trimmedData[trimmedData.length - 1]
    nextCursor = encodeCursor(getTimestamp(lastItem), getId(lastItem))
  }

  return {
    data: trimmedData,
    cursor: nextCursor,
    hasMore,
    totalCount,
  }
}
