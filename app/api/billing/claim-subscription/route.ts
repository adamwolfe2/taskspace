import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { sql } from "@/lib/db/sql"
import { withTransaction } from "@/lib/db/transactions"
import { getStripeConfig, PLAN_FEATURES } from "@/lib/integrations/stripe-config"
import { auditLogger } from "@/lib/audit/logger"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

/**
 * POST /api/billing/claim-subscription
 *
 * Links a Stripe Payment Link checkout session to the authenticated user's org.
 * Flow:
 *   1. User pays via buy.stripe.com Payment Link (no org metadata)
 *   2. Webhook stores session in pending_subscriptions
 *   3. User signs up / logs in, then success page calls this endpoint
 *   4. We match by session_id or customer email → link to their org
 *
 * Does NOT require CSRF header since the success page calls this via fetch
 * from the same origin but may not have the CSRF header set up yet.
 */
export async function POST(request: NextRequest) {
  try {
    const stripeConfig = getStripeConfig()
    if (!stripeConfig.isConfigured) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Stripe is not configured" },
        { status: 503 }
      )
    }

    // Try to get auth context (may be null for unauthenticated users)
    const auth = await getAuthContext(request)

    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Please sign in to claim your subscription" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const sessionId = body.sessionId as string | undefined

    if (!sessionId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing session ID" },
        { status: 400 }
      )
    }

    const org = auth.organization
    const isAdminOrOwner = auth.member.role === "admin" || auth.member.role === "owner"

    if (!isAdminOrOwner) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can manage billing" },
        { status: 403 }
      )
    }

    // Check if the org already has an active paid subscription
    if (org.stripeSubscriptionId && org.subscription?.plan !== "free") {
      return NextResponse.json<ApiResponse<{ alreadyLinked: boolean }>>(
        { success: true, data: { alreadyLinked: true } }
      )
    }

    // Look up the pending subscription
    interface PendingSubscriptionRow {
      id: string
      stripe_session_id: string
      stripe_customer_id: string
      stripe_subscription_id: string | null
      customer_email: string | null
      plan: string
      billing_cycle: string | null
      status: string
    }

    let pendingSub: PendingSubscriptionRow | null = null

    try {
      const { rows } = await sql<PendingSubscriptionRow>`
        SELECT id, stripe_session_id, stripe_customer_id, stripe_subscription_id,
               customer_email, plan, billing_cycle, status
        FROM pending_subscriptions
        WHERE stripe_session_id = ${sessionId}
          AND status = 'pending'
          AND expires_at > NOW()
        LIMIT 1
      `
      pendingSub = rows[0] || null
    } catch (error) {
      // Table might not exist yet — try direct Stripe retrieval
      logError(logger, "Failed to query pending_subscriptions (table may not exist)", error)
    }

    if (!pendingSub) {
      // Try to retrieve the checkout session directly from Stripe as fallback
      try {
        const stripeModule = await import("stripe")
        const Stripe = stripeModule.default as unknown as new (key: string, opts: { apiVersion: string }) => {
          checkout: { sessions: { retrieve: (id: string, opts: { expand: string[] }) => Promise<{
            id: string; customer: string | { id: string } | null; subscription: string | { id: string } | null;
            customer_details: { email: string | null } | null; metadata: Record<string, string>;
            payment_status: string; status: string | null
          }> } }
        }
        const stripe = new Stripe(stripeConfig.secretKey!, { apiVersion: "2025-12-15.clover" })

        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["subscription"],
        })

        if (session.payment_status !== "paid" && session.status !== "complete") {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "Payment not completed" },
            { status: 400 }
          )
        }

        const customerId = typeof session.customer === "string"
          ? session.customer
          : session.customer?.id || null
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription as { id: string } | null)?.id || null

        if (!customerId) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "No customer found for this checkout session" },
            { status: 400 }
          )
        }

        // Check if the session metadata already has an orgId (in-app checkout)
        if (session.metadata?.organizationId) {
          // This was an in-app checkout — already handled by webhook
          return NextResponse.json<ApiResponse<{ alreadyLinked: boolean }>>(
            { success: true, data: { alreadyLinked: true } }
          )
        }

        // Link the subscription to the org
        await linkSubscriptionToOrg({
          organizationId: org.id,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          plan: session.metadata?.plan || "team",
          billingCycle: session.metadata?.billingCycle || "monthly",
          sessionId,
        })

        return NextResponse.json<ApiResponse<{ alreadyLinked: boolean }>>(
          { success: true, data: { alreadyLinked: false } }
        )
      } catch (stripeError) {
        logError(logger, "Failed to retrieve Stripe checkout session", stripeError)
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Could not verify checkout session. Please contact support." },
          { status: 404 }
        )
      }
    }

    // Link from pending subscription
    await linkSubscriptionToOrg({
      organizationId: org.id,
      stripeCustomerId: pendingSub.stripe_customer_id,
      stripeSubscriptionId: pendingSub.stripe_subscription_id,
      plan: pendingSub.plan,
      billingCycle: pendingSub.billing_cycle,
      sessionId,
    })

    // Mark pending subscription as claimed
    try {
      await sql`
        UPDATE pending_subscriptions
        SET status = 'claimed', claimed_by_org_id = ${org.id}, claimed_at = NOW()
        WHERE id = ${pendingSub.id}
      `
    } catch {
      // Non-critical — subscription is already linked
    }

    return NextResponse.json<ApiResponse<{ alreadyLinked: boolean }>>(
      { success: true, data: { alreadyLinked: false } }
    )
  } catch (error) {
    logError(logger, "Claim subscription error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to claim subscription" },
      { status: 500 }
    )
  }
}

/**
 * Link a Stripe subscription to an organization
 */
async function linkSubscriptionToOrg(params: {
  organizationId: string
  stripeCustomerId: string
  stripeSubscriptionId: string | null
  plan: string
  billingCycle: string | null
  sessionId: string
}) {
  const planConfig = PLAN_FEATURES[params.plan] || PLAN_FEATURES.team

  await withTransaction(async (client) => {
    // Update organization with Stripe data
    const subscriptionData = {
      plan: params.plan as "free" | "team" | "business",
      status: "trialing" as const,
      billingCycle: (params.billingCycle || "monthly") as "monthly" | "yearly" | null,
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14-day trial
      cancelAtPeriodEnd: false,
      maxUsers: planConfig.maxSeats ?? 3,
      features: planConfig.features,
    }

    await client.sql`
      UPDATE organizations
      SET
        stripe_customer_id = ${params.stripeCustomerId},
        stripe_subscription_id = ${params.stripeSubscriptionId},
        subscription = ${JSON.stringify(subscriptionData)},
        updated_at = NOW()
      WHERE id = ${params.organizationId}
    `

    // Upsert subscriptions table row
    const creditsLimit = params.plan === "business" ? -1 : params.plan === "team" ? 200 : 50
    const periodEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    await client.sql`
      INSERT INTO subscriptions (
        id, organization_id, stripe_customer_id, stripe_subscription_id,
        plan, seat_count, ai_credits_limit, status, current_period_end
      ) VALUES (
        gen_random_uuid()::text,
        ${params.organizationId}, ${params.stripeCustomerId}, ${params.stripeSubscriptionId},
        ${params.plan}, ${subscriptionData.maxUsers || 3}, ${creditsLimit},
        'trialing', ${periodEnd}
      )
      ON CONFLICT (organization_id) DO UPDATE SET
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        plan = EXCLUDED.plan,
        seat_count = EXCLUDED.seat_count,
        ai_credits_limit = EXCLUDED.ai_credits_limit,
        status = EXCLUDED.status,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = NOW()
    `
  })

  logger.info({ orgId: params.organizationId, plan: params.plan }, "Subscription claimed and linked to org")

  await auditLogger.log({
    organizationId: params.organizationId,
    userId: null,
    action: "subscription.claimed",
    severity: "info",
    resourceType: "subscription",
    resourceId: params.sessionId,
    metadata: {
      plan: params.plan,
      billingCycle: params.billingCycle,
      stripeCustomerId: params.stripeCustomerId,
    },
  })
}
