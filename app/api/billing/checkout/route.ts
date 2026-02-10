import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { createCheckoutSession, getOrCreateCustomer } from "@/lib/integrations/stripe"
import { getStripeConfig } from "@/lib/integrations/stripe-config"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { checkoutSchema } from "@/lib/validation/schemas"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout Session for subscription
 */
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Check if Stripe is configured
    const stripeConfig = getStripeConfig()
    if (!stripeConfig.isConfigured) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Stripe is not configured. Please contact support." },
        { status: 503 }
      )
    }

    // Validate request body
    const { plan, billingCycle } = await validateBody(request, checkoutSchema)

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

    if (!session.url) {
      throw new Error("Stripe checkout session created but no URL returned")
    }

    return NextResponse.json<ApiResponse<{ checkoutUrl: string; sessionId: string }>>({
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    })
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    logError(logger, "Checkout error", error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "Failed to create checkout session",
      },
      { status: 500 }
    )
  }
})
