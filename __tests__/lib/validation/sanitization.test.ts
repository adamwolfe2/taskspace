/**
 * Validation & Sanitization Tests
 *
 * Tests for validation utilities, sanitization, and pagination helpers
 */

import { NextRequest } from "next/server"
import { z } from "zod"
import {
  validateBody,
  validateQuery,
  formatZodError,
  ValidationError,
  isValidUUID,
  parseDate,
  sanitizeString,
  getPaginationParams,
} from "@/lib/validation/middleware"

// Mock sanitizeText
jest.mock("@/lib/utils/sanitize", () => ({
  sanitizeText: jest.fn((text: string) => text.replace(/<[^>]*>/g, "")),
}))

describe("formatZodError", () => {
  it("should format single error", () => {
    const schema = z.object({ email: z.string().email() })
    const result = schema.safeParse({ email: "not-an-email" })
    if (!result.success) {
      const formatted = formatZodError(result.error)
      expect(formatted).toContain("email")
    }
  })

  it("should format multiple errors", () => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2),
    })
    const result = schema.safeParse({ email: "bad", name: "" })
    if (!result.success) {
      const formatted = formatZodError(result.error)
      expect(formatted).toContain(";")
    }
  })
})

describe("validateBody", () => {
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
  })

  function createJsonRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  }

  it("should validate valid body", async () => {
    const req = createJsonRequest({ title: "Test Task" })
    const result = await validateBody(req, schema)
    expect(result.title).toBe("Test Task")
  })

  it("should throw ValidationError for invalid body", async () => {
    const req = createJsonRequest({ title: "" })
    await expect(validateBody(req, schema)).rejects.toThrow(ValidationError)
  })

  it("should throw ValidationError for invalid JSON", async () => {
    const req = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      body: "not json{{{",
      headers: { "Content-Type": "application/json" },
    })
    await expect(validateBody(req, schema)).rejects.toThrow(ValidationError)
  })

  it("should sanitize text fields", async () => {
    const req = createJsonRequest({
      title: "<script>alert('xss')</script>My Task",
      description: "Normal description",
    })
    const result = await validateBody(req, schema)
    expect(result.title).not.toContain("<script>")
  })

  it("should add error prefix when provided", async () => {
    const req = createJsonRequest({ title: "" })
    try {
      await validateBody(req, schema, { errorPrefix: "Task creation" })
      fail("Should have thrown")
    } catch (error) {
      expect((error as ValidationError).message).toContain("Task creation")
    }
  })
})

describe("validateQuery", () => {
  const schema = z.object({
    page: z.string().optional(),
    status: z.string().optional(),
  })

  it("should parse query parameters", () => {
    const req = new NextRequest("http://localhost:3000/api/test?page=2&status=active")
    const result = validateQuery(req, schema)
    expect(result.page).toBe("2")
    expect(result.status).toBe("active")
  })

  it("should throw for invalid query params", () => {
    const schema = z.object({ page: z.string().regex(/^\d+$/) })
    const req = new NextRequest("http://localhost:3000/api/test?page=abc")
    expect(() => validateQuery(req, schema)).toThrow(ValidationError)
  })
})

describe("isValidUUID", () => {
  it("should accept valid UUIDs", () => {
    expect(isValidUUID("123e4567-e89b-12d3-a456-426614174000")).toBe(true)
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true)
  })

  it("should reject invalid UUIDs", () => {
    expect(isValidUUID("not-a-uuid")).toBe(false)
    expect(isValidUUID("")).toBe(false)
    expect(isValidUUID("123")).toBe(false)
    expect(isValidUUID("123e4567-e89b-62d3-a456-426614174000")).toBe(false) // version 6 invalid
  })
})

describe("parseDate", () => {
  it("should parse valid date strings", () => {
    const date = parseDate("2025-01-15")
    expect(date).toBeInstanceOf(Date)
    expect(date?.getFullYear()).toBe(2025)
  })

  it("should return null for invalid dates", () => {
    expect(parseDate("not-a-date")).toBeNull()
    expect(parseDate(null)).toBeNull()
    expect(parseDate(undefined)).toBeNull()
    expect(parseDate("")).toBeNull()
  })
})

describe("sanitizeString", () => {
  it("should trim whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello")
  })

  it("should normalize whitespace", () => {
    expect(sanitizeString("hello   world")).toBe("hello world")
  })

  it("should truncate long strings", () => {
    const longString = "a".repeat(20000)
    expect(sanitizeString(longString).length).toBe(10000)
  })
})

describe("getPaginationParams", () => {
  it("should return defaults for no params", () => {
    const params = new URLSearchParams()
    const result = getPaginationParams(params)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(20)
    expect(result.offset).toBe(0)
  })

  it("should parse custom page and size", () => {
    const params = new URLSearchParams({ page: "3", pageSize: "50" })
    const result = getPaginationParams(params)
    expect(result.page).toBe(3)
    expect(result.pageSize).toBe(50)
    expect(result.offset).toBe(100)
  })

  it("should clamp page to minimum 1", () => {
    const params = new URLSearchParams({ page: "-5" })
    const result = getPaginationParams(params)
    expect(result.page).toBe(1)
  })

  it("should clamp pageSize to max 100", () => {
    const params = new URLSearchParams({ pageSize: "500" })
    const result = getPaginationParams(params)
    expect(result.pageSize).toBe(100)
  })

  it("should clamp pageSize to min 1", () => {
    const params = new URLSearchParams({ pageSize: "0" })
    const result = getPaginationParams(params)
    expect(result.pageSize).toBe(1)
  })
})

describe("ValidationError", () => {
  it("should create error with default status code", () => {
    const error = new ValidationError("Bad input")
    expect(error.message).toBe("Bad input")
    expect(error.statusCode).toBe(400)
    expect(error.name).toBe("ValidationError")
  })

  it("should create error with custom status code", () => {
    const error = new ValidationError("Not found", 404)
    expect(error.statusCode).toBe(404)
  })
})
