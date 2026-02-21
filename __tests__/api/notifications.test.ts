/**
 * Notifications API Tests
 *
 * Tests GET, POST, PATCH, DELETE /api/notifications
 */

import { NextRequest } from "next/server"

const mockGetUnreadCount = jest.fn()
const mockFindByUserId = jest.fn()
const mockFindUnreadByUserId = jest.fn()
const mockMarkAllAsRead = jest.fn()
const mockMarkAsRead = jest.fn()
const mockDeleteNotification = jest.fn()
const mockSendNotification = jest.fn()
const mockValidateBody = jest.fn()

jest.mock("@/lib/db", () => ({
  db: {
    notifications: {
      getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
      findByUserId: (...args: unknown[]) => mockFindByUserId(...args),
      findUnreadByUserId: (...args: unknown[]) => mockFindUnreadByUserId(...args),
      markAllAsRead: (...args: unknown[]) => mockMarkAllAsRead(...args),
      markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
      delete: (...args: unknown[]) => mockDeleteNotification(...args),
    },
  },
}))

jest.mock("@/lib/db/notifications", () => ({
  sendNotification: (...args: unknown[]) => mockSendNotification(...args),
}))

jest.mock("@/lib/utils/pagination", () => ({
  parsePaginationParams: jest.fn().mockReturnValue({ limit: 20, cursor: null }),
  buildPaginatedResponse: jest.fn().mockReturnValue({ items: [], hasMore: false, total: 0 }),
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
const mockWithAdmin = jest.fn((handler: unknown) => handler)
jest.mock("@/lib/api/middleware", () => ({
  withAuth: (handler: unknown) => mockWithAuth(handler),
  withAdmin: (handler: unknown) => mockWithAdmin(handler),
}))

import { GET, POST, PATCH, DELETE } from "@/app/api/notifications/route"
import { ValidationError } from "@/lib/validation/middleware"

const mockAuth = {
  user: { id: "user-1", email: "user@example.com", name: "Test User" },
  organization: { id: "org-1", name: "Test Org" },
  sessionId: "session-1",
  role: "member" as const,
}

describe("GET /api/notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAuth.mockImplementation((h) => h)
    mockWithAdmin.mockImplementation((h) => h)
  })

  it("should return all notifications for user", async () => {
    const notifications = [
      { id: "n-1", title: "Task assigned", read: false, createdAt: new Date().toISOString() },
      { id: "n-2", title: "Rock updated", read: true, createdAt: new Date().toISOString() },
    ]
    mockFindByUserId.mockResolvedValue(notifications)

    const req = new NextRequest("http://localhost:3000/api/notifications")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(notifications)
    expect(mockFindByUserId).toHaveBeenCalledWith("user-1", "org-1")
  })

  it("should return only unread notifications when unread=true", async () => {
    const unread = [{ id: "n-1", title: "Unread one", read: false }]
    mockFindUnreadByUserId.mockResolvedValue(unread)

    const req = new NextRequest("http://localhost:3000/api/notifications?unread=true")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data).toEqual(unread)
    expect(mockFindUnreadByUserId).toHaveBeenCalledWith("user-1", "org-1")
    expect(mockFindByUserId).not.toHaveBeenCalled()
  })

  it("should return unread count when count=true", async () => {
    mockGetUnreadCount.mockResolvedValue(7)

    const req = new NextRequest("http://localhost:3000/api/notifications?count=true")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.count).toBe(7)
    expect(mockGetUnreadCount).toHaveBeenCalledWith("user-1", "org-1")
  })

  it("should return 500 when DB throws", async () => {
    mockFindByUserId.mockRejectedValue(new Error("Database connection failed"))

    const req = new NextRequest("http://localhost:3000/api/notifications")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Failed to get notifications")
  })
})

describe("PATCH /api/notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAuth.mockImplementation((h) => h)
  })

  function createRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost:3000/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  it("should mark a single notification as read", async () => {
    const updatedNotification = { id: "n-1", title: "Test", read: true }
    mockValidateBody.mockResolvedValue({ id: "n-1", markAllRead: false })
    mockMarkAsRead.mockResolvedValue(updatedNotification)

    const req = createRequest({ id: "n-1" })
    const res = await PATCH(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(updatedNotification)
    expect(mockMarkAsRead).toHaveBeenCalledWith("n-1", "user-1", "org-1")
  })

  it("should mark all notifications as read when markAllRead=true", async () => {
    mockValidateBody.mockResolvedValue({ markAllRead: true })
    mockMarkAllAsRead.mockResolvedValue(5)

    const req = createRequest({ markAllRead: true })
    const res = await PATCH(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.markedCount).toBe(5)
    expect(mockMarkAllAsRead).toHaveBeenCalledWith("user-1", "org-1")
  })

  it("should return 400 when no id provided and not marking all", async () => {
    mockValidateBody.mockResolvedValue({ markAllRead: false })

    const req = createRequest({})
    const res = await PATCH(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Notification ID is required")
  })

  it("should return 404 when notification not found", async () => {
    mockValidateBody.mockResolvedValue({ id: "n-999", markAllRead: false })
    mockMarkAsRead.mockResolvedValue(null)

    const req = createRequest({ id: "n-999" })
    const res = await PATCH(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Notification not found")
  })

  it("should return 400 on validation error", async () => {
    mockValidateBody.mockRejectedValue(new ValidationError("Invalid body", 400))

    const req = createRequest({ invalid: true })
    const res = await PATCH(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Invalid body")
  })

  it("should return 500 on DB error", async () => {
    mockValidateBody.mockResolvedValue({ id: "n-1", markAllRead: false })
    mockMarkAsRead.mockRejectedValue(new Error("DB error"))

    const req = createRequest({ id: "n-1" })
    const res = await PATCH(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Failed to update notification")
  })
})

describe("POST /api/notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAdmin.mockImplementation((h) => h)
  })

  function createRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost:3000/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  const adminAuth = { ...mockAuth, role: "admin" as const }

  it("should create a notification successfully", async () => {
    mockValidateBody.mockResolvedValue({
      userId: "user-2",
      type: "task_assigned",
      title: "New task assigned",
      message: "You have a new task",
    })
    mockSendNotification.mockResolvedValue(undefined)

    const req = createRequest({
      userId: "user-2",
      type: "task_assigned",
      title: "New task assigned",
    })
    const res = await POST(req, adminAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe("Notification created")
  })

  it("should return 400 on validation error", async () => {
    mockValidateBody.mockRejectedValue(new ValidationError("type is required", 400))

    const req = createRequest({ userId: "user-2" })
    const res = await POST(req, adminAuth as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("type is required")
  })

  it("should return 500 when sendNotification fails", async () => {
    mockValidateBody.mockResolvedValue({
      userId: "user-2",
      type: "task_assigned",
      title: "Test",
    })
    mockSendNotification.mockRejectedValue(new Error("Send failed"))

    const req = createRequest({ userId: "user-2", type: "task_assigned", title: "Test" })
    const res = await POST(req, adminAuth as any)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Failed to create notification")
  })
})

describe("DELETE /api/notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAuth.mockImplementation((h) => h)
  })

  it("should delete a notification successfully", async () => {
    mockDeleteNotification.mockResolvedValue(true)

    const req = new NextRequest("http://localhost:3000/api/notifications?id=n-1", {
      method: "DELETE",
    })
    const res = await DELETE(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe("Notification deleted")
    expect(mockDeleteNotification).toHaveBeenCalledWith("n-1", "user-1", "org-1")
  })

  it("should return 400 when no id provided", async () => {
    const req = new NextRequest("http://localhost:3000/api/notifications", {
      method: "DELETE",
    })
    const res = await DELETE(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Notification ID is required")
  })

  it("should return 404 when notification not found", async () => {
    mockDeleteNotification.mockResolvedValue(false)

    const req = new NextRequest("http://localhost:3000/api/notifications?id=n-999", {
      method: "DELETE",
    })
    const res = await DELETE(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Notification not found")
  })

  it("should return 500 on DB error", async () => {
    mockDeleteNotification.mockRejectedValue(new Error("DB failure"))

    const req = new NextRequest("http://localhost:3000/api/notifications?id=n-1", {
      method: "DELETE",
    })
    const res = await DELETE(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Failed to delete notification")
  })
})
