/**
 * Billing Checkout API Tests
 *
 * Tests the POST /api/billing/checkout endpoint for creating checkout sessions
 */

import { NextRequest } from "next/server"

// Mock dependencies
const mockCreateCheckoutSession = jest.fn()
const mockGetOrCreateCustomer = jest.fn()
const mockGetStripeConfig = jest.fn()
const mockValidateBody = jest.fn()
const mockOrgUpdate = jest.fn()

jest.mock("@/lib/integrations/stripe", () => ({
  createCheckoutSession: mockCreateCheckoutSession,
  getOrCreateCustomer: mockGetOrCreateCustomer,
}))

jest.mock("@/lib/integrations/stripe-config", () => ({
  getStripeConfig: mockGetStripeConfig,
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
    organizations: {
      update: mockOrgUpdate,
    },
  },
}))

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logError: jest.fn(),
}))

// Mock middleware
const mockWithAdmin = jest.fn((handler) => handler)
jest.mock("@/lib/api/middleware", () => ({
  withAdmin: (handler: any) => mockWithAdmin(handler),
}))

import { POST } from "@/app/api/billing/checkout/route"
import { ValidationError } from "@/lib/validation/middleware"

describe("POST /api/billing/checkout", () => {
  const mockAuth = {
    user: {
      id: "user-1",
      email: "admin@example.com",
      name: "Admin User",
    },
    organization: {
      id: "org-1",
      name: "Test Organization",
      billingEmail: null,
      stripeCustomerId: null,
    },
    sessionId: "session-1",
    role: "admin" as const,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAdmin.mockImplementation((handler) => handler)
  })

  function createRequest(body: any = {}): NextRequest {
    return new NextRequest("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify(body),
    })
  }

  it("should create a checkout session for authenticated admin user", async () => {
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockResolvedValue({
      plan: "team",
      billingCycle: "monthly",
    })
    mockGetOrCreateCustomer.mockResolvedValue({
      id: "cus_123456",
    })
    mockOrgUpdate.mockResolvedValue(undefined)
    mockCreateCheckoutSession.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/pay/cs_test_123",
    })

    const request = createRequest({
      plan: "team",
      billingCycle: "monthly",
    })

    const response = await POST(request, mockAuth)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual({
      checkoutUrl: "https://checkout.stripe.com/pay/cs_test_123",
      sessionId: "cs_test_123",
    })
    expect(mockGetOrCreateCustomer).toHaveBeenCalledWith(
      "org-1",
      "admin@example.com",
      "Test Organization"
    )
    expect(mockOrgUpdate).toHaveBeenCalledWith("org-1", {
      stripeCustomerId: "cus_123456",
    })
  })

  it("should use organization billing email if available", async () => {
    const authWithBillingEmail = {
      ...mockAuth,
      organization: {
        ...mockAuth.organization,
        billingEmail: "billing@example.com",
      },
    }

    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockResolvedValue({
      plan: "business",
      billingCycle: "yearly",
    })
    mockGetOrCreateCustomer.mockResolvedValue({
      id: "cus_123456",
    })
    mockOrgUpdate.mockResolvedValue(undefined)
    mockCreateCheckoutSession.mockResolvedValue({
      id: "cs_test_456",
      url: "https://checkout.stripe.com/pay/cs_test_456",
    })

    const request = createRequest({
      plan: "business",
      billingCycle: "yearly",
    })

    await POST(request, authWithBillingEmail)

    expect(mockGetOrCreateCustomer).toHaveBeenCalledWith(
      "org-1",
      "billing@example.com",
      "Test Organization"
    )
  })

  it("should use existing Stripe customer ID if available", async () => {
    const authWithCustomerId = {
      ...mockAuth,
      organization: {
        ...mockAuth.organization,
        stripeCustomerId: "cus_existing",
      },
    }

    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockResolvedValue({
      plan: "team",
      billingCycle: "monthly",
    })
    mockCreateCheckoutSession.mockResolvedValue({
      id: "cs_test_789",
      url: "https://checkout.stripe.com/pay/cs_test_789",
    })

    const request = createRequest({
      plan: "team",
      billingCycle: "monthly",
    })

    await POST(request, authWithCustomerId)

    expect(mockGetOrCreateCustomer).not.toHaveBeenCalled()
    expect(mockOrgUpdate).not.toHaveBeenCalled()
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_existing",
      })
    )
  })

  it("should return 503 when Stripe is not configured", async () => {
    mockGetStripeConfig.mockReturnValue({ isConfigured: false })

    const request = createRequest({
      plan: "team",
      billingCycle: "monthly",
    })

    const response = await POST(request, mockAuth)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Stripe is not configured. Please contact support.")
  })

  it("should return 400 for invalid plan parameter", async () => {
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockRejectedValue(
      new ValidationError("Invalid plan", 400)
    )

    const request = createRequest({
      plan: "invalid",
      billingCycle: "monthly",
    })

    const response = await POST(request, mockAuth)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Invalid plan")
  })

  it("should return 400 for missing billing cycle", async () => {
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockRejectedValue(
      new ValidationError("Billing cycle is required", 400)
    )

    const request = createRequest({
      plan: "team",
    })

    const response = await POST(request, mockAuth)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it("should return 500 when checkout session creation fails", async () => {
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockResolvedValue({
      plan: "team",
      billingCycle: "monthly",
    })
    mockGetOrCreateCustomer.mockResolvedValue({
      id: "cus_123456",
    })
    mockOrgUpdate.mockResolvedValue(undefined)
    mockCreateCheckoutSession.mockRejectedValue(
      new Error("Stripe API error")
    )

    const request = createRequest({
      plan: "team",
      billingCycle: "monthly",
    })

    const response = await POST(request, mockAuth)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Failed to create checkout session")
  })

  it("should return 500 when checkout session has no URL", async () => {
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockResolvedValue({
      plan: "team",
      billingCycle: "monthly",
    })
    mockGetOrCreateCustomer.mockResolvedValue({
      id: "cus_123456",
    })
    mockOrgUpdate.mockResolvedValue(undefined)
    mockCreateCheckoutSession.mockResolvedValue({
      id: "cs_test_123",
      url: null,
    })

    const request = createRequest({
      plan: "team",
      billingCycle: "monthly",
    })

    const response = await POST(request, mockAuth)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Failed to create checkout session")
  })

  it("should include correct success and cancel URLs", async () => {
    mockGetStripeConfig.mockReturnValue({ isConfigured: true })
    mockValidateBody.mockResolvedValue({
      plan: "team",
      billingCycle: "monthly",
    })
    mockGetOrCreateCustomer.mockResolvedValue({
      id: "cus_123456",
    })
    mockOrgUpdate.mockResolvedValue(undefined)
    mockCreateCheckoutSession.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/pay/cs_test_123",
    })

    const request = createRequest({
      plan: "team",
      billingCycle: "monthly",
    })

    await POST(request, mockAuth)

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
      organizationId: "org-1",
      organizationName: "Test Organization",
      billingEmail: "admin@example.com",
      plan: "team",
      billingCycle: "monthly",
      successUrl: "http://localhost:3000/settings?billing=success",
      cancelUrl: "http://localhost:3000/settings?billing=canceled",
      customerId: "cus_123456",
    })
  })
})
