import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { constructWebhookEvent, getPlanFromPriceId } from "@/lib/integrations/stripe"
import { STRIPE_EVENTS, PLAN_FEATURES } from "@/lib/integrations/stripe-config"
import { auditLogger } from "@/lib/audit/logger"

/**
 * POST /api/billing/webhook
 * Stripe webhook handler for subscription events
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      console.error("Webhook: Missing signature")
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    // Verify and construct event
    let event: any
    try {
      event = await constructWebhookEvent(payload, signature)
    } catch (error) {
      console.error("Webhook signature verification failed:", error)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Log the event
    console.log(`Stripe webhook received: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case STRIPE_EVENTS.CHECKOUT_COMPLETED: {
        await handleCheckoutCompleted(event.data.object)
        break
      }

      case STRIPE_EVENTS.SUBSCRIPTION_CREATED:
      case STRIPE_EVENTS.SUBSCRIPTION_UPDATED: {
        await handleSubscriptionUpdated(event.data.object)
        break
      }

      case STRIPE_EVENTS.SUBSCRIPTION_DELETED: {
        await handleSubscriptionDeleted(event.data.object)
        break
      }

      case STRIPE_EVENTS.INVOICE_PAID: {
        await handleInvoicePaid(event.data.object)
        break
      }

      case STRIPE_EVENTS.INVOICE_PAYMENT_FAILED: {
        await handleInvoicePaymentFailed(event.data.object)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

/**
 * Handle checkout.session.completed
 * This is the first event after a successful subscription checkout
 */
async function handleCheckoutCompleted(session: any) {
  const organizationId = session.metadata?.organizationId
  const plan = session.metadata?.plan
  const billingCycle = session.metadata?.billingCycle

  if (!organizationId) {
    console.error("Checkout completed: Missing organizationId in metadata")
    return
  }

  console.log(`Checkout completed for org ${organizationId}: ${plan} / ${billingCycle}`)

  // The subscription details will be handled by subscription.created event
  // Here we just ensure the customer ID is saved
  if (session.customer) {
    await db.organizations.update(organizationId, {
      stripeCustomerId: session.customer,
    })
  }

  // Log the event
  await auditLogger.log({
    organizationId,
    action: "subscription.checkout_completed",
    resourceType: "subscription",
    resourceId: session.subscription || session.id,
    newValues: { plan, billingCycle, customerId: session.customer },
  })
}

/**
 * Handle subscription created/updated events
 */
async function handleSubscriptionUpdated(subscription: any) {
  const organizationId = subscription.metadata?.organizationId

  if (!organizationId) {
    // Try to find org by customer ID
    const org = await db.organizations.findByStripeCustomerId(subscription.customer)
    if (!org) {
      console.error("Subscription updated: Cannot find organization for customer", subscription.customer)
      return
    }
  }

  const orgId = organizationId || (await db.organizations.findByStripeCustomerId(subscription.customer))?.id
  if (!orgId) return

  // Get plan from price ID
  const priceId = subscription.items?.data?.[0]?.price?.id
  const planInfo = priceId ? getPlanFromPriceId(priceId) : null
  const plan = planInfo?.plan || subscription.metadata?.plan || "starter"
  const billingCycle = planInfo?.billingCycle || subscription.metadata?.billingCycle || "monthly"

  // Get plan configuration
  const planConfig = PLAN_FEATURES[plan] || PLAN_FEATURES.starter

  // Update organization subscription
  const subscriptionData = {
    plan,
    status: subscription.status,
    billingCycle,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    maxUsers: planConfig.maxSeats,
    features: planConfig.features,
  }

  await db.organizations.update(orgId, {
    stripeSubscriptionId: subscription.id,
    subscription: subscriptionData,
  })

  console.log(`Subscription updated for org ${orgId}: ${plan} (${subscription.status})`)

  // Log the event
  await auditLogger.log({
    organizationId: orgId,
    action: "subscription.updated",
    resourceType: "subscription",
    resourceId: subscription.id,
    newValues: subscriptionData,
  })
}

/**
 * Handle subscription deleted (canceled)
 */
async function handleSubscriptionDeleted(subscription: any) {
  const organizationId = subscription.metadata?.organizationId
  const org = organizationId
    ? await db.organizations.findById(organizationId)
    : await db.organizations.findByStripeCustomerId(subscription.customer)

  if (!org) {
    console.error("Subscription deleted: Cannot find organization")
    return
  }

  // Downgrade to free plan
  const freeConfig = PLAN_FEATURES.free
  await db.organizations.update(org.id, {
    stripeSubscriptionId: null,
    subscription: {
      plan: "free",
      status: "active",
      billingCycle: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      maxUsers: freeConfig.maxSeats,
      features: freeConfig.features,
    },
  })

  console.log(`Subscription canceled for org ${org.id}, downgraded to free`)

  // Log the event
  await auditLogger.log({
    organizationId: org.id,
    action: "subscription.canceled",
    resourceType: "subscription",
    resourceId: subscription.id,
  })
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaid(invoice: any) {
  if (!invoice.subscription) return

  const org = await db.organizations.findByStripeCustomerId(invoice.customer)
  if (!org) return

  // Record billing history
  try {
    await db.billingHistory.create({
      organizationId: org.id,
      subscriptionId: invoice.subscription,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: "paid",
      invoiceUrl: invoice.hosted_invoice_url,
      stripeInvoiceId: invoice.id,
      billingPeriodStart: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : null,
      billingPeriodEnd: invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : null,
    })
  } catch (error) {
    // Billing history table might not exist yet
    console.error("Failed to record billing history:", error)
  }

  console.log(`Invoice paid for org ${org.id}: ${invoice.amount_paid / 100} ${invoice.currency}`)
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: any) {
  const org = await db.organizations.findByStripeCustomerId(invoice.customer)
  if (!org) return

  // Update subscription status to past_due
  if (org.subscription) {
    await db.organizations.update(org.id, {
      subscription: {
        ...org.subscription,
        status: "past_due",
      },
    })
  }

  console.log(`Invoice payment failed for org ${org.id}`)

  // Log the event
  await auditLogger.log({
    organizationId: org.id,
    action: "subscription.payment_failed",
    resourceType: "subscription",
    resourceId: invoice.subscription,
    newValues: { invoiceId: invoice.id, amount: invoice.amount_due },
  })

  // TODO: Send email notification to billing admin
}
