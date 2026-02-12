/**
 * Billing Subscription API Tests
 *
 * Tests the GET and PATCH /api/billing/subscription endpoints
 */

import { NextRequest } from "next/server"

// Mock dependencies
const mockGetSubscription = jest.fn()
const mockUpdateSubscription = jest.fn()
const mockCancelSubscription = jest.fn()
const mockResumeSubscription = jest.fn()
const mockCreateCustomerPortalSession = jest.fn()
const mockGetStripeConfig = jest.fn()
const mockValidateBody = jest.fn()
const mockMembersFindWithUsers = jest.fn()

jest.mock("@/lib/integrations/stripe", () => ({
  getSubscription: mockGetSubscription,
  updateSubscription: mockUpdateSubscription,
  cancelSubscription: mockCancelSubscription,
  resumeSubscription: mockResumeSubscription,
  createCustomerPortalSession: mockCreateCustomerPortalSession,
}))

jest.mock("@/lib/integrations/stripe-config", () => ({
  getStripeConfig: mockGetStripeConfig,
  PLAN_FEATURES: {
    free: {
      maxSeats: 3,
      features: ["basic"],
    },
    team: {
      maxSeats: 10,
      features: ["basic", "advanced"],
    },
    business: {
      maxSeats: null,
      features: ["basic", "advanced", "premium"],
    },
  },
}))

jest.mock("@/lib/validation/middleware", () => ({
  validateBody: mockValidateBody,
  ValidationError: class ValidationError extends Error {
    statusCode: number
    constructor(message: string, statusCode: number = 400) {
      super(message)
      this.statusCode = statusCode
    }
  },
}))

jest.mock("@/lib/db", () => ({
  db: {
    members: {
      findWithUsersByOrganizationId: mockMembersFindWithUsers,
    },
  },
}))

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logError: jest.fn(),
}))

// Mock middleware
const mockWithAuth = jest.fn((handler) => handler)
const mockWithAdmin = jest.fn((handler) => handler)
jest.mock("@/lib/api/middleware", () => ({
  withAuth: (handler: any) => mockWithAuth(handler),
  withAdmin: (handler: any) => mockWithAdmin(handler),
}))

import { GET, PATCH } from "@/app/api/billing/subscription/route"
import { ValidationError } from "@/lib/validation/middleware"

describe("GET /api/billing/subscription", () => {
  const mockAuth = {
    user: {
      id: "user-1",
      email: "user@example.com",
      name: "Test User",
    },
    organization: {
      id: "org-1",
      name: "Test Organization",
      subscription: {
        plan: "team",
        status: "active",
        billingCycle: "monthly",
        currentPeriodEnd: "2026-03-12T00:00:00.000Z",
        cancelAtPeriodEnd: false,
        maxUsers: 10,
        features: ["basic", "advanced"],
      },
    },
    sessionId: "session-1",
    role: "member" as const,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAuth.mockImplementation((handler) => handler)
  })

  function createRequest(): NextRequest {
    return new NextRequest("http://localhost:3000/api/billing/subscription", {
      method: "GET",
    })
  }

  it("should return current subscription details", async () => {
    mockMembersFindWithUsers.mockResolvedValue([
      { id: "m1", status: "active" },
      { id: "m2", status: "active" },
      { id: "m3", status: "inactive" },
    ])
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })

    const request = createRequest()
    const response = await GET(request, mockAuth as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual({
      plan: "team",
      status: "active",
      billingCycle: "monthly",
      currentPeriodEnd: "2026-03-12T00:00:00.000Z",
      cancelAtPeriodEnd: false,
      maxSeats: 10,
      usedSeats: 2,
      features: ["basic", "advanced"],
      stripeConfigured: true,
    })
  })

  it("should return free plan when no subscription exists", async () => {
    const freeAuth = {
      ...mockAuth,
      organization: {
        ...mockAuth.organization,
        subscription: null,
      },
    }

    mockMembersFindWithUsers.mockResolvedValue([
      { id: "m1", status: "active" },
    ])
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })

    const request = createRequest()
    const response = await GET(request, freeAuth as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual({
      plan: "free",
      status: "active",
      billingCycle: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      maxSeats: 3,
      usedSeats: 1,
      features: ["basic"],
      stripeConfigured: true,
    })
  })

  it("should return 500 when members query fails", async () => {
    mockMembersFindWithUsers.mockRejectedValue(new Error("Database error"))
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })

    const request = createRequest()
    const response = await GET(request, mockAuth as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Failed to get subscription")
  })
})

describe("PATCH /api/billing/subscription", () => {
  const mockAuth = {
    user: {
      id: "user-1",
      email: "admin@example.com",
      name: "Admin User",
    },
    organization: {
      id: "org-1",
      name: "Test Organization",
      stripeCustomerId: "cus_123456",
      stripeSubscriptionId: "sub_123456",
      subscription: {
        plan: "team",
        status: "active",
      },
    },
    sessionId: "session-1",
    role: "admin" as const,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAdmin.mockImplementation((handler) => handler)
  })

  function createRequest(body: any = {}): NextRequest {
    return new NextRequest("http://localhost:3000/api/billing/subscription", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify(body),
    })
  }

  it("should change subscription plan", async () => {
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockResolvedValue({
      action: "change_plan",
      plan: "business",
      billingCycle: "yearly",
    })
    mockMembersFindWithUsers.mockResolvedValue([
      { id: "m1", status: "active" },
      { id: "m2", status: "active" },
    ])
    mockUpdateSubscription.mockResolvedValue({
      id: "sub_123456",
      plan: "business",
    })

    const request = createRequest({
      action: "change_plan",
      plan: "business",
      billingCycle: "yearly",
    })

    const response = await PATCH(request, mockAuth as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.message).toBe("Subscription updated successfully")
    expect(mockUpdateSubscription).toHaveBeenCalledWith(
      "sub_123456",
      "business",
      "yearly"
    )
  })

  it("should prevent downgrade when exceeding seat limit", async () => {
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockResolvedValue({
      action: "change_plan",
      plan: "team",
      billingCycle: "monthly",
    })
    mockMembersFindWithUsers.mockResolvedValue([
      { id: "m1", status: "active" },
      { id: "m2", status: "active" },
      { id: "m3", status: "active" },
      { id: "m4", status: "active" },
      { id: "m5", status: "active" },
      { id: "m6", status: "active" },
      { id: "m7", status: "active" },
      { id: "m8", status: "active" },
      { id: "m9", status: "active" },
      { id: "m10", status: "active" },
      { id: "m11", status: "active" },
    ])

    const request = createRequest({
      action: "change_plan",
      plan: "team",
      billingCycle: "monthly",
    })

    const response = await PATCH(request, mockAuth as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain("Cannot downgrade")
    expect(data.error).toContain("11 members")
    expect(data.error).toContain("only allows 10")
  })

  it("should cancel subscription at period end", async () => {
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockResolvedValue({
      action: "cancel",
    })
    mockCancelSubscription.mockResolvedValue(undefined)

    const request = createRequest({
      action: "cancel",
    })

    const response = await PATCH(request, mockAuth as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.message).toBe("Subscription will be canceled at end of billing period")
    expect(mockCancelSubscription).toHaveBeenCalledWith("sub_123456", false)
  })

  it("should resume canceled subscription", async () => {
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockResolvedValue({
      action: "resume",
    })
    mockResumeSubscription.mockResolvedValue(undefined)

    const request = createRequest({
      action: "resume",
    })

    const response = await PATCH(request, mockAuth as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.message).toBe("Subscription resumed")
    expect(mockResumeSubscription).toHaveBeenCalledWith("sub_123456")
  })

  it("should create customer portal session", async () => {
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockResolvedValue({
      action: "portal",
    })
    mockCreateCustomerPortalSession.mockResolvedValue({
      url: "https://billing.stripe.com/p/session_123",
    })

    const request = createRequest({
      action: "portal",
    })

    const response = await PATCH(request, mockAuth as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.portalUrl).toBe("https://billing.stripe.com/p/session_123")
    expect(mockCreateCustomerPortalSession).toHaveBeenCalledWith({
      customerId: "cus_123456",
      returnUrl: "http://localhost:3000/settings",
    })
  })

  it("should return 503 when Stripe is not configured", async () => {
    mockGetStripeConfig.mockReturnValue({ isConfigured: false })

    const request = createRequest({
      action: "cancel",
    })

    const response = await PATCH(request, mockAuth as any)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Stripe is not configured")
  })

  it("should return 400 when no subscription exists", async () => {
    const noSubAuth = {
      ...mockAuth,
      organization: {
        ...mockAuth.organization,
        stripeSubscriptionId: null,
      },
    }

    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockResolvedValue({
      action: "cancel",
    })

    const request = createRequest({
      action: "cancel",
    })

    const response = await PATCH(request, noSubAuth as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("No active subscription found")
  })

  it("should return 400 for portal action when no customer ID", async () => {
    const noCustomerAuth = {
      ...mockAuth,
      organization: {
        ...mockAuth.organization,
        stripeCustomerId: null,
      },
    }

    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockResolvedValue({
      action: "portal",
    })

    const request = createRequest({
      action: "portal",
    })

    const response = await PATCH(request, noCustomerAuth as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("No billing account found")
  })

  it("should return 400 for invalid action", async () => {
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockResolvedValue({
      action: "invalid",
    })

    const request = createRequest({
      action: "invalid",
    })

    const response = await PATCH(request, mockAuth as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Invalid action")
  })

  it("should return 400 when changing plan without required fields", async () => {
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockResolvedValue({
      action: "change_plan",
      plan: undefined,
      billingCycle: undefined,
    })

    const request = createRequest({
      action: "change_plan",
    })

    const response = await PATCH(request, mockAuth as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Plan and billing cycle required")
  })

  it("should return 400 for validation errors", async () => {
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockRejectedValue(
      new ValidationError("Invalid action", 400)
    )

    const request = createRequest({
      action: "unknown",
    })

    const response = await PATCH(request, mockAuth as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Invalid action")
  })

  it("should return 500 when subscription update fails", async () => {
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockResolvedValue({
      action: "cancel",
    })
    mockCancelSubscription.mockRejectedValue(new Error("Stripe API error"))

    const request = createRequest({
      action: "cancel",
    })

    const response = await PATCH(request, mockAuth as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Failed to update subscription")
  })
})
