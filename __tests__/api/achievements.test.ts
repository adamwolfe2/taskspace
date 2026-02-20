/**
 * Achievements API Tests
 *
 * Tests GET and POST /api/productivity/achievements
 */

import { NextRequest } from "next/server"

const mockFindAllAchievements = jest.fn()
const mockFindUserAchievements = jest.fn()
const mockCheckAchievements = jest.fn()

jest.mock("@/lib/db", () => ({
  db: {
    achievements: {
      findAll: (...args: unknown[]) => mockFindAllAchievements(...args),
    },
    userAchievements: {
      findByUser: (...args: unknown[]) => mockFindUserAchievements(...args),
    },
  },
}))

jest.mock("@/lib/achievements/check-achievements", () => ({
  checkAchievements: (...args: unknown[]) => mockCheckAchievements(...args),
}))

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logError: jest.fn(),
}))

const mockWithAuth = jest.fn((handler: unknown) => handler)
jest.mock("@/lib/api/middleware", () => ({
  withAuth: (handler: unknown) => mockWithAuth(handler),
}))

import { GET, POST } from "@/app/api/productivity/achievements/route"

const mockAuth = {
  user: { id: "user-1", email: "user@example.com", name: "Test User" },
  organization: { id: "org-1", name: "Test Org" },
  sessionId: "session-1",
  role: "member" as const,
}

describe("GET /api/productivity/achievements", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAuth.mockImplementation((h) => h)
  })

  it("should return all achievements and user's earned ones", async () => {
    const achievements = [
      { id: "a-1", name: "First Rock", description: "Complete your first rock", points: 100 },
      { id: "a-2", name: "Task Master", description: "Complete 5 tasks in a week", points: 50 },
    ]
    const userAchievements = [
      {
        id: "ua-1",
        userId: "user-1",
        achievementId: "a-1",
        earnedAt: "2026-01-15T00:00:00Z",
        achievement: achievements[0],
      },
    ]
    mockFindAllAchievements.mockResolvedValue(achievements)
    mockFindUserAchievements.mockResolvedValue(userAchievements)

    const req = new NextRequest("http://localhost:3000/api/productivity/achievements")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.achievements).toEqual(achievements)
    expect(data.data.userAchievements).toEqual(userAchievements)
    expect(data.data.totalPoints).toBe(100) // only earned one with 100 points
    expect(mockFindAllAchievements).toHaveBeenCalled()
    expect(mockFindUserAchievements).toHaveBeenCalledWith("user-1", "org-1")
  })

  it("should return 0 total points when no achievements earned", async () => {
    mockFindAllAchievements.mockResolvedValue([
      { id: "a-1", name: "First Rock", points: 100 },
    ])
    mockFindUserAchievements.mockResolvedValue([]) // nothing earned

    const req = new NextRequest("http://localhost:3000/api/productivity/achievements")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.totalPoints).toBe(0)
    expect(data.data.userAchievements).toHaveLength(0)
  })

  it("should sum points from all earned achievements", async () => {
    mockFindAllAchievements.mockResolvedValue([])
    mockFindUserAchievements.mockResolvedValue([
      { id: "ua-1", earnedAt: "2026-01-01T00:00:00Z", achievement: { points: 100 } },
      { id: "ua-2", earnedAt: "2026-01-02T00:00:00Z", achievement: { points: 50 } },
      { id: "ua-3", earnedAt: null, achievement: { points: 200 } }, // not earned yet
    ])

    const req = new NextRequest("http://localhost:3000/api/productivity/achievements")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.totalPoints).toBe(150) // only count earnedAt != null
  })

  it("should return 500 on DB error", async () => {
    mockFindAllAchievements.mockRejectedValue(new Error("DB failure"))

    const req = new NextRequest("http://localhost:3000/api/productivity/achievements")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Failed to get achievements")
  })
})

describe("POST /api/productivity/achievements (check)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAuth.mockImplementation((h) => h)
  })

  it("should check and return newly unlocked achievements", async () => {
    const checkResult = {
      newlyUnlocked: [{ id: "a-1", name: "First Rock", points: 100 }],
      updatedProgress: [{ achievementId: "a-2", progress: 3, target: 5 }],
    }
    mockCheckAchievements.mockResolvedValue(checkResult)

    const req = new NextRequest("http://localhost:3000/api/productivity/achievements", {
      method: "POST",
    })
    const res = await POST(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(checkResult)
    expect(mockCheckAchievements).toHaveBeenCalledWith("user-1", "org-1")
  })

  it("should return empty result when no new achievements unlocked", async () => {
    mockCheckAchievements.mockResolvedValue({ newlyUnlocked: [], updatedProgress: [] })

    const req = new NextRequest("http://localhost:3000/api/productivity/achievements", {
      method: "POST",
    })
    const res = await POST(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.newlyUnlocked).toHaveLength(0)
  })

  it("should return 500 on check error", async () => {
    mockCheckAchievements.mockRejectedValue(new Error("Check failed"))

    const req = new NextRequest("http://localhost:3000/api/productivity/achievements", {
      method: "POST",
    })
    const res = await POST(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Failed to check achievements")
  })
})
