/**
 * Weekly Reviews API Tests
 *
 * Tests GET and POST /api/productivity/weekly-reviews
 */

import { NextRequest } from "next/server"

const mockFindByUserAndWeek = jest.fn()
const mockFindByUser = jest.fn()
const mockUpsert = jest.fn()
const mockValidateBody = jest.fn()

jest.mock("@/lib/db", () => ({
  db: {
    weeklyReviews: {
      findByUserAndWeek: (...args: unknown[]) => mockFindByUserAndWeek(...args),
      findByUser: (...args: unknown[]) => mockFindByUser(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}))

jest.mock("@/lib/validation/middleware", () => ({
  validateBody: (...args: unknown[]) => mockValidateBody(...args),
  ValidationError: class ValidationError extends Error {
    statusCode: number
    constructor(message: string, statusCode = 400) {
      super(message)
      this.statusCode = statusCode
    }
  },
}))

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logError: jest.fn(),
}))

const mockWithAuth = jest.fn((handler: unknown) => handler)
jest.mock("@/lib/api/middleware", () => ({
  withAuth: (handler: unknown) => mockWithAuth(handler),
}))

import { GET, POST } from "@/app/api/productivity/weekly-reviews/route"
import { ValidationError } from "@/lib/validation/middleware"

const mockAuth = {
  user: { id: "user-1", email: "user@example.com", name: "Test User" },
  organization: { id: "org-1", name: "Test Org" },
  sessionId: "session-1",
  role: "member" as const,
}

describe("GET /api/productivity/weekly-reviews", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAuth.mockImplementation((h) => h)
  })

  it("should return a list of user reviews", async () => {
    const reviews = [
      { id: "wr-1", weekStart: "2026-02-10", mood: "positive", productivityRating: 4 },
      { id: "wr-2", weekStart: "2026-02-03", mood: "neutral", productivityRating: 3 },
    ]
    mockFindByUser.mockResolvedValue(reviews)

    const req = new NextRequest("http://localhost:3000/api/productivity/weekly-reviews")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(reviews)
    expect(mockFindByUser).toHaveBeenCalledWith("user-1", "org-1")
  })

  it("should return a specific review when weekStart param is provided", async () => {
    const review = { id: "wr-1", weekStart: "2026-02-10", wentWell: "Great team collaboration" }
    mockFindByUserAndWeek.mockResolvedValue(review)

    const req = new NextRequest("http://localhost:3000/api/productivity/weekly-reviews?weekStart=2026-02-10")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(review)
    expect(mockFindByUserAndWeek).toHaveBeenCalledWith("user-1", "org-1", "2026-02-10")
    expect(mockFindByUser).not.toHaveBeenCalled()
  })

  it("should return null when review not found for specific week", async () => {
    mockFindByUserAndWeek.mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/productivity/weekly-reviews?weekStart=2025-01-01")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toBeNull()
  })

  it("should return 500 on DB error", async () => {
    mockFindByUser.mockRejectedValue(new Error("Database error"))

    const req = new NextRequest("http://localhost:3000/api/productivity/weekly-reviews")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Failed to get weekly reviews")
  })
})

describe("POST /api/productivity/weekly-reviews", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAuth.mockImplementation((h) => h)
  })

  function createRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost:3000/api/productivity/weekly-reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  it("should create a new weekly review", async () => {
    const reviewBody = {
      weekStart: "2026-02-10",
      weekEnd: "2026-02-16",
      accomplishments: [{ text: "Shipped feature X" }],
      wentWell: "Team collaboration was excellent",
      couldImprove: "Need better planning",
      nextWeekGoals: [{ text: "Complete project Y", priority: "high" }],
      mood: "positive",
      energyLevel: 4,
      productivityRating: 5,
    }
    mockValidateBody.mockResolvedValue(reviewBody)
    mockUpsert.mockResolvedValue({ id: "wr-new" })

    const req = createRequest(reviewBody)
    const res = await POST(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual({ id: "wr-new" })
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        userId: "user-1",
        weekStart: "2026-02-10",
        weekEnd: "2026-02-16",
        mood: "positive",
        productivityRating: 5,
      })
    )
  })

  it("should upsert an existing review (same week)", async () => {
    const reviewBody = {
      weekStart: "2026-02-10",
      weekEnd: "2026-02-16",
      accomplishments: [],
      nextWeekGoals: [],
      wentWell: "Updated note",
    }
    mockValidateBody.mockResolvedValue(reviewBody)
    mockUpsert.mockResolvedValue({ id: "wr-1" })

    const req = createRequest(reviewBody)
    const res = await POST(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.id).toBe("wr-1")
    expect(mockUpsert).toHaveBeenCalledTimes(1)
  })

  it("should return 400 on validation error", async () => {
    mockValidateBody.mockRejectedValue(new ValidationError("weekStart is required", 400))

    const req = createRequest({ wentWell: "Missing required fields" })
    const res = await POST(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("weekStart is required")
  })

  it("should return 500 on DB error", async () => {
    mockValidateBody.mockResolvedValue({
      weekStart: "2026-02-10",
      weekEnd: "2026-02-16",
      accomplishments: [],
      nextWeekGoals: [],
    })
    mockUpsert.mockRejectedValue(new Error("DB write failed"))

    const req = createRequest({ weekStart: "2026-02-10", weekEnd: "2026-02-16" })
    const res = await POST(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Failed to save weekly review")
  })
})
