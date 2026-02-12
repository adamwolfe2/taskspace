/**
 * Pagination utility tests
 *
 * Tests for cursor-based pagination helpers:
 * - parsePaginationParams
 * - encodeCursor / decodeCursor
 * - buildCursorFilter
 * - buildPaginatedResponse
 */

import {
  parsePaginationParams,
  encodeCursor,
  decodeCursor,
  buildCursorFilter,
  buildPaginatedResponse,
} from "@/lib/utils/pagination"

describe("parsePaginationParams", () => {
  it("should return defaults when no params provided", () => {
    const params = new URLSearchParams()
    const result = parsePaginationParams(params)
    expect(result).toEqual({ cursor: undefined, limit: 50, direction: "desc" })
  })

  it("should parse custom limit and direction", () => {
    const params = new URLSearchParams({ limit: "25", direction: "asc" })
    const result = parsePaginationParams(params)
    expect(result).toEqual({ cursor: undefined, limit: 25, direction: "asc" })
  })

  it("should parse cursor parameter", () => {
    const params = new URLSearchParams({ cursor: "2024-01-01T00:00:00.000Z_abc123" })
    const result = parsePaginationParams(params)
    expect(result.cursor).toBe("2024-01-01T00:00:00.000Z_abc123")
  })

  it("should clamp limit to minimum of 1", () => {
    const params = new URLSearchParams({ limit: "0" })
    const result = parsePaginationParams(params)
    expect(result.limit).toBe(1)
  })

  it("should clamp limit to maximum of 200", () => {
    const params = new URLSearchParams({ limit: "999" })
    const result = parsePaginationParams(params)
    expect(result.limit).toBe(200)
  })

  it("should default limit to 50 for NaN values", () => {
    const params = new URLSearchParams({ limit: "abc" })
    const result = parsePaginationParams(params)
    expect(result.limit).toBe(50)
  })

  it("should default direction to desc for invalid values", () => {
    const params = new URLSearchParams({ direction: "invalid" })
    const result = parsePaginationParams(params)
    expect(result.direction).toBe("desc")
  })
})

describe("encodeCursor", () => {
  it("should encode timestamp and id as timestamp_id", () => {
    const cursor = encodeCursor("2024-01-15T10:30:00.000Z", "abc123")
    expect(cursor).toBe("2024-01-15T10:30:00.000Z_abc123")
  })
})

describe("decodeCursor", () => {
  it("should decode a valid cursor", () => {
    const result = decodeCursor("2024-01-15T10:30:00.000Z_abc123")
    expect(result).toEqual({
      timestamp: "2024-01-15T10:30:00.000Z",
      id: "abc123",
    })
  })

  it("should return null for cursor without underscore", () => {
    expect(decodeCursor("nounderscore")).toBeNull()
  })

  it("should return null for cursor with invalid timestamp", () => {
    expect(decodeCursor("not-a-date_abc123")).toBeNull()
  })

  it("should return null when id part is empty", () => {
    expect(decodeCursor("2024-01-15T10:30:00.000Z_")).toBeNull()
  })

  it("should return null when timestamp part is empty", () => {
    expect(decodeCursor("_abc123")).toBeNull()
  })

  it("should return null for cursor where timestamp portion is invalid after last-underscore split", () => {
    // "2024-01-15T10:30:00.000Z_some_complex" is not a valid ISO date
    expect(decodeCursor("2024-01-15T10:30:00.000Z_some_complex_id")).toBeNull()
  })
})

describe("buildCursorFilter", () => {
  it("should return null when no cursor provided", () => {
    expect(buildCursorFilter(undefined)).toBeNull()
  })

  it("should return null for invalid cursor", () => {
    expect(buildCursorFilter("invalid")).toBeNull()
  })

  it("should return decoded cursor for valid cursor", () => {
    const result = buildCursorFilter("2024-01-15T10:30:00.000Z_abc123")
    expect(result).toEqual({
      timestamp: "2024-01-15T10:30:00.000Z",
      id: "abc123",
    })
  })

  it("should accept direction parameter", () => {
    const result = buildCursorFilter("2024-01-15T10:30:00.000Z_abc123", "asc")
    expect(result).toEqual({
      timestamp: "2024-01-15T10:30:00.000Z",
      id: "abc123",
    })
  })
})

describe("buildPaginatedResponse", () => {
  const makeItems = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: `id-${i}`,
      createdAt: `2024-01-${String(15 - i).padStart(2, "0")}T00:00:00.000Z`,
      name: `Item ${i}`,
    }))

  type Item = { id: string; createdAt: string; name: string }
  const getTimestamp = (item: Item) => item.createdAt
  const getId = (item: Item) => item.id

  it("should return hasMore=false when data.length <= limit", () => {
    const data = makeItems(3)
    const result = buildPaginatedResponse(data, 5, 3, getTimestamp, getId)
    expect(result.hasMore).toBe(false)
    expect(result.cursor).toBeNull()
    expect(result.data).toHaveLength(3)
    expect(result.totalCount).toBe(3)
  })

  it("should return hasMore=true and trim data when data.length > limit", () => {
    const data = makeItems(6) // 6 items, limit 5
    const result = buildPaginatedResponse(data, 5, 10, getTimestamp, getId)
    expect(result.hasMore).toBe(true)
    expect(result.data).toHaveLength(5)
    expect(result.cursor).toBe(encodeCursor(data[4].createdAt, data[4].id))
  })

  it("should handle empty data array", () => {
    const result = buildPaginatedResponse([], 10, 0, getTimestamp, getId)
    expect(result.hasMore).toBe(false)
    expect(result.cursor).toBeNull()
    expect(result.data).toHaveLength(0)
    expect(result.totalCount).toBe(0)
  })

  it("should generate cursor from last item of trimmed data", () => {
    const data = makeItems(3) // 3 items, limit 2
    const result = buildPaginatedResponse(data, 2, 5, getTimestamp, getId)
    expect(result.cursor).toBe(encodeCursor(data[1].createdAt, data[1].id))
    expect(result.data).toHaveLength(2)
  })
})
