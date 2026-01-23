import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { createCheckoutSession, getOrCreateCustomer } from "@/lib/integrations/stripe"
import { getStripeConfig } from "@/lib/integrations/stripe-config"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout Session for subscription
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only admins can manage billing
    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can manage billing" },
        { status: 403 }
      )
    }

    // Check if Stripe is configured
    const stripeConfig = getStripeConfig()
    if (!stripeConfig.isConfigured) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Stripe is not configured. Please contact support." },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { plan, billingCycle } = body

    // Validate plan
    if (!["starter", "professional", "enterprise"].includes(plan)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid plan" },
        { status: 400 }
      )
    }

    // Validate billing cycle
    if (!["monthly", "yearly"].includes(billingCycle)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid billing cycle" },
        { status: 400 }
      )
    }

    const org = auth.organization
    const billingEmail = org.billingEmail || auth.user.email

    // Get or create Stripe customer
    let customerId = org.stripeCustomerId
    if (!customerId) {
      const customer = await getOrCreateCustomer(
        org.id,
        billingEmail,
        org.name
      )
      customerId = customer.id

      // Save customer ID to organization
      await db.organizations.update(org.id, {
        stripeCustomerId: customerId,
      })
    }

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || ""
    const session = await createCheckoutSession({
      organizationId: org.id,
      organizationName: org.name,
      billingEmail,
      plan,
      billingCycle,
      successUrl: `${baseUrl}/settings?billing=success`,
      cancelUrl: `${baseUrl}/settings?billing=canceled`,
      customerId,
    })

    return NextResponse.json<ApiResponse<{ checkoutUrl: string; sessionId: string }>>({
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    })
  } catch (error) {
    logError(logger, "Checkout error", error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create checkout session",
      },
      { status: 500 }
    )
  }
}
