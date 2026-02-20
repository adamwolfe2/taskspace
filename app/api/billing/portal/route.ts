import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { createCustomerPortalSession } from "@/lib/integrations/stripe"
import { getStripeConfig } from "@/lib/integrations/stripe-config"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/billing/portal
 * Create a Stripe Customer Portal session for managing subscription and payment methods
 * Admin-only: Only organization admins/owners can manage billing
 */
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Check if Stripe is configured
    const stripeConfig = getStripeConfig()
    if (!stripeConfig.isConfigured) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Stripe is not configured. Please contact support." },
        { status: 503 }
      ) as NextResponse<ApiResponse<unknown>>
    }

    const org = auth.organization

    // Check if organization has a Stripe customer ID
    if (!org.stripeCustomerId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No billing account found. Please subscribe to a plan first." },
        { status: 400 }
      ) as NextResponse<ApiResponse<unknown>>
    }

    // Create customer portal session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
    const session = await createCustomerPortalSession({
      customerId: org.stripeCustomerId,
      returnUrl: `${baseUrl}/settings/billing`,
    })

    // Redirect to the portal URL
    return NextResponse.redirect(session.url) as NextResponse<ApiResponse<unknown>>
  } catch (error) {
    logError(logger, "Billing portal error", error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "Failed to create billing portal session",
      },
      { status: 500 }
    ) as NextResponse<ApiResponse<unknown>>
  }
})
