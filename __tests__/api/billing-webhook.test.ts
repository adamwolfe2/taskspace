/**
 * Billing Webhook API Tests
 *
 * Tests the POST /api/billing/webhook endpoint for Stripe webhook events
 */

import { NextRequest } from "next/server"

// Mock dependencies
const mockConstructWebhookEvent = jest.fn()
const mockGetPlanFromPriceId = jest.fn()
const mockSql = jest.fn()
const mockOrgUpdate = jest.fn()
const mockOrgFindByStripeCustomerId = jest.fn()
const mockBillingHistoryCreate = jest.fn()
const mockAuditLoggerLog = jest.fn()
const mockWithTransaction = jest.fn()
const mockIsEmailConfigured = jest.fn()
const mockSendBillingAlertEmail = jest.fn()

jest.mock("@/lib/integrations/stripe", () => ({
  constructWebhookEvent: mockConstructWebhookEvent,
  getPlanFromPriceId: mockGetPlanFromPriceId,
}))

jest.mock("@/lib/integrations/stripe-config", () => ({
  STRIPE_EVENTS: {
    CHECKOUT_COMPLETED: "checkout.session.completed",
    SUBSCRIPTION_CREATED: "customer.subscription.created",
    SUBSCRIPTION_UPDATED: "customer.subscription.updated",
    SUBSCRIPTION_DELETED: "customer.subscription.deleted",
    INVOICE_PAID: "invoice.payment_succeeded",
    INVOICE_PAYMENT_FAILED: "invoice.payment_failed",
  },
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

jest.mock("@/lib/db", () => ({
  db: {
    organizations: {
      update: mockOrgUpdate,
      findByStripeCustomerId: mockOrgFindByStripeCustomerId,
    },
    billingHistory: {
      create: mockBillingHistoryCreate,
    },
  },
}))

jest.mock("@/lib/db/sql", () => ({
  sql: mockSql,
}))

jest.mock("@/lib/db/transactions", () => ({
  withTransaction: mockWithTransaction,
}))

jest.mock("@/lib/audit/logger", () => ({
  auditLogger: {
    log: mockAuditLoggerLog,
  },
}))

jest.mock("@/lib/integrations/email", () => ({
  isEmailConfigured: mockIsEmailConfigured,
  sendBillingAlertEmail: mockSendBillingAlertEmail,
}))

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logError: jest.fn(),
}))

import { POST } from "@/app/api/billing/webhook/route"

describe("POST /api/billing/webhook", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  function createRequest(signature: string | null, body: any = {}): NextRequest {
    const headers: Record<string, string> = {}
    if (signature !== null) {
      headers["stripe-signature"] = signature
    }

    return new NextRequest("http://localhost:3000/api/billing/webhook", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })
  }

  it("should return 400 when signature is missing", async () => {
    const request = createRequest(null)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Missing signature")
  })

  it("should return 400 when signature verification fails", async () => {
    mockConstructWebhookEvent.mockRejectedValue(new Error("Invalid signature"))

    const request = createRequest("invalid_signature", { type: "test" })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Invalid signature")
  })

  it("should skip duplicate webhook events", async () => {
    const event = {
      id: "evt_duplicate",
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_123",
          metadata: { organizationId: "org-1" },
        },
      },
    }

    mockConstructWebhookEvent.mockResolvedValue(event)
    mockSql.mockResolvedValueOnce({
      rows: [{ event_id: "evt_duplicate" }],
    })

    const request = createRequest("valid_signature", event)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(data.duplicate).toBe(true)
  })

  it("should process checkout.session.completed event", async () => {
    const event = {
      id: "evt_checkout",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_123",
          customer: "cus_123",
          subscription: "sub_123",
          metadata: {
            organizationId: "org-1",
            plan: "team",
            billingCycle: "monthly",
          },
        },
      },
    }

    mockConstructWebhookEvent.mockResolvedValue(event)
    mockSql
      .mockResolvedValueOnce({ rows: [] }) // No duplicate (idempotency check)
      .mockResolvedValueOnce({ rows: [{ id: "org-1" }] }) // Org verification check
      .mockResolvedValueOnce({}) // Insert processed event
    mockOrgUpdate.mockResolvedValue(undefined)
    mockAuditLoggerLog.mockResolvedValue(undefined)

    const request = createRequest("valid_signature", event)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(mockOrgUpdate).toHaveBeenCalledWith("org-1", {
      stripeCustomerId: "cus_123",
    })
    expect(mockAuditLoggerLog).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: null,
      action: "subscription.checkout_completed",
      severity: "info",
      resourceType: "subscription",
      resourceId: "sub_123",
      metadata: {
        plan: "team",
        billingCycle: "monthly",
        customerId: "cus_123",
      },
    })
  })

  it("should process customer.subscription.updated event", async () => {
    const event = {
      id: "evt_sub_updated",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "active",
          current_period_end: 1709337600,
          cancel_at_period_end: false,
          items: {
            data: [
              {
                id: "si_123",
                price: {
                  id: "price_team_monthly",
                },
              },
            ],
          },
          metadata: {
            organizationId: "org-1",
            plan: "team",
            billingCycle: "monthly",
          },
        },
      },
    }

    const mockClient = {
      sql: jest.fn(),
    }

    mockConstructWebhookEvent.mockResolvedValue(event)
    mockSql
      .mockResolvedValueOnce({ rows: [] }) // No duplicate
      .mockResolvedValueOnce({}) // Insert processed event
    mockGetPlanFromPriceId.mockReturnValue({
      plan: "team",
      billingCycle: "monthly",
    })
    mockWithTransaction.mockImplementation(async (callback) => {
      return callback(mockClient)
    })
    mockClient.sql
      .mockResolvedValueOnce({ rows: [{ id: "org-1" }] }) // SELECT organization
      .mockResolvedValueOnce({}) // UPDATE organizations
      .mockResolvedValueOnce({}) // UPSERT subscriptions
    mockAuditLoggerLog.mockResolvedValue(undefined)

    const request = createRequest("valid_signature", event)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(mockWithTransaction).toHaveBeenCalled()
  })

  it("should process customer.subscription.deleted event", async () => {
    const event = {
      id: "evt_sub_deleted",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          metadata: {
            organizationId: "org-1",
          },
        },
      },
    }

    const mockClient = {
      sql: jest.fn(),
    }

    mockConstructWebhookEvent.mockResolvedValue(event)
    mockSql
      .mockResolvedValueOnce({ rows: [] }) // No duplicate
      .mockResolvedValueOnce({}) // Insert processed event
    mockWithTransaction.mockImplementation(async (callback) => {
      return callback(mockClient)
    })
    mockClient.sql
      .mockResolvedValueOnce({ rows: [{ id: "org-1" }] }) // SELECT organization
      .mockResolvedValueOnce({}) // UPDATE organizations
      .mockResolvedValueOnce({}) // UPDATE subscriptions
    mockAuditLoggerLog.mockResolvedValue(undefined)

    const request = createRequest("valid_signature", event)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(mockWithTransaction).toHaveBeenCalled()
    expect(mockAuditLoggerLog).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: null,
      action: "subscription.canceled",
      severity: "warning",
      resourceType: "subscription",
      resourceId: "sub_123",
    })
  })

  it("should process invoice.payment_succeeded event", async () => {
    const event = {
      id: "evt_invoice_paid",
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "in_123",
          customer: "cus_123",
          subscription: "sub_123",
          amount_paid: 2999,
          currency: "usd",
          hosted_invoice_url: "https://invoice.stripe.com/i/123",
          period_start: 1706659200,
          period_end: 1709337600,
        },
      },
    }

    mockConstructWebhookEvent.mockResolvedValue(event)
    mockSql
      .mockResolvedValueOnce({ rows: [] }) // No duplicate
      .mockResolvedValueOnce({}) // Insert processed event
    mockOrgFindByStripeCustomerId.mockResolvedValue({
      id: "org-1",
      name: "Test Org",
    })
    mockBillingHistoryCreate.mockResolvedValue(undefined)

    const request = createRequest("valid_signature", event)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(mockBillingHistoryCreate).toHaveBeenCalledWith({
      organizationId: "org-1",
      subscriptionId: "sub_123",
      amount: 2999,
      currency: "usd",
      status: "paid",
      invoiceUrl: "https://invoice.stripe.com/i/123",
      stripeInvoiceId: "in_123",
      billingPeriodStart: expect.any(String),
      billingPeriodEnd: expect.any(String),
    })
  })

  it("should process invoice.payment_failed event and send email", async () => {
    const event = {
      id: "evt_invoice_failed",
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_failed",
          customer: "cus_123",
          subscription: "sub_123",
          amount_due: 2999,
          currency: "usd",
          hosted_invoice_url: "https://invoice.stripe.com/i/failed",
        },
      },
    }

    const mockClient = {
      sql: jest.fn(),
    }

    mockConstructWebhookEvent.mockResolvedValue(event)
    mockSql
      .mockResolvedValueOnce({ rows: [] }) // No duplicate (idempotency check)
      .mockResolvedValueOnce({             // SELECT admin users (inside handler, before INSERT)
        rows: [
          { email: "admin@example.com", name: "Admin User" },
        ],
      })
      .mockResolvedValueOnce({             // SELECT organization name (inside handler)
        rows: [{ name: "Test Org" }],
      })
      .mockResolvedValueOnce({})           // INSERT processed event (after handler completes)
    mockWithTransaction.mockImplementation(async (callback) => {
      return callback(mockClient)
    })
    mockClient.sql
      .mockResolvedValueOnce({
        rows: [
          {
            id: "org-1",
            subscription: { plan: "team" },
          },
        ],
      }) // SELECT organization
      .mockResolvedValueOnce({}) // UPDATE organizations
    mockAuditLoggerLog.mockResolvedValue(undefined)
    mockIsEmailConfigured.mockReturnValue(true)
    mockSendBillingAlertEmail.mockResolvedValue(undefined)

    const request = createRequest("valid_signature", event)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(mockSendBillingAlertEmail).toHaveBeenCalledWith({
      to: ["admin@example.com"],
      subject: "Action needed: Payment failed for Test Org",
      alertType: "payment_failed",
      organizationName: "Test Org",
      message: expect.stringContaining("couldn't process the payment"),
      details: expect.stringContaining("USD $29.99"),
      invoiceUrl: "https://invoice.stripe.com/i/failed",
    })
  })

  it("should handle unknown event types gracefully", async () => {
    const event = {
      id: "evt_unknown",
      type: "customer.unknown.event",
      data: {
        object: {
          id: "obj_123",
        },
      },
    }

    mockConstructWebhookEvent.mockResolvedValue(event)
    mockSql
      .mockResolvedValueOnce({ rows: [] }) // No duplicate
      .mockResolvedValueOnce({}) // Insert processed event

    const request = createRequest("valid_signature", event)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
  })

  it("should return 200 even when event processing fails", async () => {
    const event = {
      id: "evt_error",
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_123",
          metadata: { organizationId: "org-1" },
        },
      },
    }

    mockConstructWebhookEvent.mockResolvedValue(event)
    mockSql
      .mockResolvedValueOnce({ rows: [] }) // No duplicate
      .mockResolvedValueOnce({}) // Insert processed event
      .mockResolvedValueOnce({}) // Update with error
    mockOrgUpdate.mockRejectedValue(new Error("Database error"))

    const request = createRequest("valid_signature", event)

    const response = await POST(request)
    const data = await response.json()

    // Route returns 500 on processing errors so Stripe can retry the event
    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
  })

  it("should return 500 when idempotency table is missing", async () => {
    const event = {
      id: "evt_no_table",
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_123",
          metadata: { organizationId: "org-1" },
        },
      },
    }

    mockConstructWebhookEvent.mockResolvedValue(event)
    mockSql.mockRejectedValueOnce(new Error("Table does not exist"))

    const request = createRequest("valid_signature", event)

    const response = await POST(request)
    const data = await response.json()

    // Route fails fast (500) when idempotency table is missing to prevent duplicate processing
    expect(response.status).toBe(500)
    expect(data.error).toBe("Webhook infrastructure not ready")
  })

  it("should gracefully handle missing billing history table", async () => {
    const event = {
      id: "evt_no_billing_table",
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "in_123",
          customer: "cus_123",
          subscription: "sub_123",
          amount_paid: 2999,
          currency: "usd",
        },
      },
    }

    mockConstructWebhookEvent.mockResolvedValue(event)
    mockSql
      .mockResolvedValueOnce({ rows: [] }) // No duplicate
      .mockResolvedValueOnce({}) // Insert processed event
    mockOrgFindByStripeCustomerId.mockResolvedValue({
      id: "org-1",
      name: "Test Org",
    })
    mockBillingHistoryCreate.mockRejectedValue(new Error("Table does not exist"))

    const request = createRequest("valid_signature", event)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
  })

  it("should handle invoice.payment_failed without sending email when email not configured", async () => {
    const event = {
      id: "evt_invoice_failed_no_email",
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_failed",
          customer: "cus_123",
          subscription: "sub_123",
          amount_due: 2999,
        },
      },
    }

    const mockClient = {
      sql: jest.fn(),
    }

    mockConstructWebhookEvent.mockResolvedValue(event)
    mockSql
      .mockResolvedValueOnce({ rows: [] }) // No duplicate
      .mockResolvedValueOnce({}) // Insert processed event
    mockWithTransaction.mockImplementation(async (callback) => {
      return callback(mockClient)
    })
    mockClient.sql.mockResolvedValueOnce({
      rows: [{ id: "org-1", subscription: {} }],
    })
    mockClient.sql.mockResolvedValueOnce({})
    mockAuditLoggerLog.mockResolvedValue(undefined)
    mockIsEmailConfigured.mockReturnValue(false)

    const request = createRequest("valid_signature", event)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(mockSendBillingAlertEmail).not.toHaveBeenCalled()
  })
})
