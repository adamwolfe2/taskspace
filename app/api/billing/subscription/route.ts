import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import {
  getSubscription,
  updateSubscription,
  cancelSubscription,
  resumeSubscription,
  createCustomerPortalSession,
} from "@/lib/integrations/stripe"
import { getStripeConfig, PLAN_FEATURES } from "@/lib/integrations/stripe-config"
import type { ApiResponse } from "@/lib/types"

/**
 * GET /api/billing/subscription
 * Get current subscription details
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const org = auth.organization
    const subscription = org.subscription

    // Calculate usage
    const members = await db.members.findWithUsersByOrganizationId(org.id)
    const activeMembers = members.filter(m => m.status === "active").length

    return NextResponse.json<ApiResponse<{
      plan: string
      status: string
      billingCycle: string | null
      currentPeriodEnd: string | null
      cancelAtPeriodEnd: boolean
      maxSeats: number | null
      usedSeats: number
      features: string[]
      stripeConfigured: boolean
    }>>({
      success: true,
      data: {
        plan: subscription?.plan || "free",
        status: subscription?.status || "active",
        billingCycle: subscription?.billingCycle || null,
        currentPeriodEnd: subscription?.currentPeriodEnd || null,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
        maxSeats: subscription?.maxUsers || PLAN_FEATURES.free.maxSeats,
        usedSeats: activeMembers,
        features: subscription?.features || PLAN_FEATURES.free.features,
        stripeConfigured: getStripeConfig().isConfigured,
      },
    })
  } catch (error) {
    console.error("Get subscription error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get subscription" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/billing/subscription
 * Update subscription (change plan, cancel, resume)
 */
export async function PATCH(request: NextRequest) {
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

    const stripeConfig = getStripeConfig()
    if (!stripeConfig.isConfigured) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Stripe is not configured" },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { action, plan, billingCycle } = body

    const org = auth.organization
    const subscriptionId = org.stripeSubscriptionId

    if (!subscriptionId && action !== "portal") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No active subscription found" },
        { status: 400 }
      )
    }

    switch (action) {
      case "change_plan": {
        if (!plan || !billingCycle) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "Plan and billing cycle required" },
            { status: 400 }
          )
        }

        // Check seat limits before downgrade
        if (plan !== "enterprise") {
          const newPlanConfig = PLAN_FEATURES[plan]
          if (newPlanConfig?.maxSeats) {
            const members = await db.members.findWithUsersByOrganizationId(org.id)
            const activeMembers = members.filter(m => m.status === "active").length
            if (activeMembers > newPlanConfig.maxSeats) {
              return NextResponse.json<ApiResponse<null>>(
                {
                  success: false,
                  error: `Cannot downgrade: You have ${activeMembers} members but ${plan} plan only allows ${newPlanConfig.maxSeats}`,
                },
                { status: 400 }
              )
            }
          }
        }

        const updated = await updateSubscription(subscriptionId!, plan, billingCycle)
        return NextResponse.json<ApiResponse<{ message: string }>>({
          success: true,
          data: { message: "Subscription updated successfully" },
        })
      }

      case "cancel": {
        await cancelSubscription(subscriptionId!, false) // Cancel at period end
        return NextResponse.json<ApiResponse<{ message: string }>>({
          success: true,
          data: { message: "Subscription will be canceled at end of billing period" },
        })
      }

      case "resume": {
        await resumeSubscription(subscriptionId!)
        return NextResponse.json<ApiResponse<{ message: string }>>({
          success: true,
          data: { message: "Subscription resumed" },
        })
      }

      case "portal": {
        // Create customer portal session for managing payment methods, invoices, etc.
        if (!org.stripeCustomerId) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "No billing account found" },
            { status: 400 }
          )
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || ""
        const session = await createCustomerPortalSession({
          customerId: org.stripeCustomerId,
          returnUrl: `${baseUrl}/settings`,
        })

        return NextResponse.json<ApiResponse<{ portalUrl: string }>>({
          success: true,
          data: { portalUrl: session.url },
        })
      }

      default:
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Update subscription error:", error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update subscription",
      },
      { status: 500 }
    )
  }
}
