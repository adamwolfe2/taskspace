import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { withTransaction } from "@/lib/db/transactions"
import { constructWebhookEvent, getPlanFromPriceId } from "@/lib/integrations/stripe"
import { STRIPE_EVENTS, PLAN_FEATURES } from "@/lib/integrations/stripe-config"
import { auditLogger } from "@/lib/audit/logger"
import { logger, logError } from "@/lib/logger"
import { isEmailConfigured } from "@/lib/integrations/email"
import { sendBillingAlertEmail } from "@/lib/integrations/email"

/**
 * POST /api/billing/webhook
 * Stripe webhook handler for subscription events
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      logger.error("Webhook: Missing signature")
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    // Verify and construct event
    let event: { id: string; type: string; data: { object: StripeWebhookObject } }
    try {
      event = await constructWebhookEvent(payload, signature)
    } catch (error) {
      logError(logger, "Webhook signature verification failed", error)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Log the event
    logger.info({ eventId: event.id, eventType: event.type }, "Stripe webhook received")

    // Check for idempotency - ensure this event hasn't been processed before
    try {
      const { rows: existingEvents } = await sql<{ event_id: string }>`
        SELECT event_id FROM processed_webhook_events WHERE event_id = ${event.id}
      `

      if (existingEvents.length > 0) {
        logger.info({ eventId: event.id, eventType: event.type }, "Webhook event already processed, skipping")
        return NextResponse.json({ received: true, duplicate: true })
      }

      // Record this event as processed (before processing to prevent duplicate processing)
      await sql`
        INSERT INTO processed_webhook_events (event_id, event_type, stripe_customer_id, organization_id, metadata)
        VALUES (
          ${event.id},
          ${event.type},
          ${event.data.object.customer || null},
          ${event.data.object.metadata?.organizationId || null},
          ${JSON.stringify(event.data.object.metadata || {})}
        )
        ON CONFLICT (event_id) DO NOTHING
      `
    } catch (error) {
      // If the table doesn't exist yet, log and continue (graceful degradation)
      // This allows webhooks to work even before migration is run
      logError(logger, "Failed to check/record webhook idempotency (table may not exist yet)", error)
    }

    // Handle different event types with proper error handling
    // Return 200 to Stripe even if processing fails to prevent infinite retries
    // Log errors for manual investigation
    try {
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
          logger.info({ eventType: event.type }, "Unhandled event type")
      }
    } catch (processingError) {
      // Log the error but return 200 to Stripe to prevent infinite retries
      logError(logger, `Webhook processing failed for event ${event.id}`, processingError)

      // Update the processed event with error information for manual investigation
      try {
        await sql`
          UPDATE processed_webhook_events
          SET metadata = jsonb_set(
            metadata,
            '{processing_error}',
            ${JSON.stringify({
              error: processingError instanceof Error ? processingError.message : String(processingError),
              timestamp: new Date().toISOString()
            })}
          )
          WHERE event_id = ${event.id}
        `
      } catch {
        // Silently fail if update fails
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logError(logger, "Webhook error", error)
    // Return 500 only for infrastructure errors (signature verification, etc.)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

/** Stripe webhook object with dynamic properties */
interface StripeWebhookObject {
  id: string
  customer: string
  metadata?: Record<string, string>
  subscription?: string
  status?: string
  items?: { data: { id: string; price: { id: string } }[] }
  current_period_end?: number
  cancel_at_period_end?: boolean
  amount_paid?: number
  amount_due?: number
  currency?: string
  hosted_invoice_url?: string
  period_start?: number
  period_end?: number
  needs_escalation?: boolean
  escalation_note?: string
  [key: string]: unknown
}

/**
 * Handle checkout.session.completed
 * This is the first event after a successful subscription checkout
 */
async function handleCheckoutCompleted(session: StripeWebhookObject) {
  const organizationId = session.metadata?.organizationId
  const plan = session.metadata?.plan
  const billingCycle = session.metadata?.billingCycle

  if (!organizationId) {
    logger.error("Checkout completed: Missing organizationId in metadata")
    return
  }

  logger.info({ organizationId, plan, billingCycle }, "Checkout completed for org")

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
    userId: null,
    action: "subscription.checkout_completed",
    severity: "info",
    resourceType: "subscription",
    resourceId: session.subscription || session.id,
    metadata: { plan, billingCycle, customerId: session.customer },
  })
}

/**
 * Handle subscription created/updated events
 * Uses transaction to ensure atomicity of organization read + update
 */
async function handleSubscriptionUpdated(subscription: StripeWebhookObject) {
  await withTransaction(async (client) => {
    const organizationId = subscription.metadata?.organizationId

    // Find organization within transaction
    let orgId: string | null = null
    if (organizationId) {
      orgId = organizationId
    } else {
      // Try to find org by customer ID
      const { rows: orgResults } = await client.sql<{ id: string }>`
        SELECT id FROM organizations WHERE stripe_customer_id = ${subscription.customer} LIMIT 1
      `
      if (orgResults.length === 0) {
        logger.error({ customerId: subscription.customer }, "Subscription updated: Cannot find organization for customer")
        return
      }
      orgId = orgResults[0].id
    }

    if (!orgId) return

    // Get plan from price ID
    const priceId = subscription.items?.data?.[0]?.price?.id
    const planInfo = priceId ? getPlanFromPriceId(priceId) : null
    const plan = planInfo?.plan || subscription.metadata?.plan || "starter"
    const billingCycle = planInfo?.billingCycle || subscription.metadata?.billingCycle || "monthly"

    // Get plan configuration
    const planConfig = PLAN_FEATURES[plan] || PLAN_FEATURES.starter

    // Update organization subscription within transaction
    const subscriptionData = {
      plan: plan as "free" | "starter" | "professional" | "enterprise",
      status: subscription.status as "active" | "trialing" | "past_due" | "canceled",
      billingCycle: billingCycle as "monthly" | "yearly" | null,
      currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : new Date().toISOString(),
      cancelAtPeriodEnd: (subscription.cancel_at_period_end as boolean) ?? false,
      maxUsers: planConfig.maxSeats ?? 5, // Default to 5 if null
      features: planConfig.features,
    }

    await client.sql`
      UPDATE organizations
      SET
        stripe_subscription_id = ${subscription.id},
        subscription = ${JSON.stringify(subscriptionData)},
        updated_at = NOW()
      WHERE id = ${orgId}
    `

    logger.info({ orgId, plan, status: subscription.status }, "Subscription updated for org")

    // Log the event (outside transaction is fine for audit log)
    await auditLogger.log({
      organizationId: orgId,
      userId: null,
      action: "subscription.updated",
      severity: "info",
      resourceType: "subscription",
      resourceId: subscription.id,
      metadata: subscriptionData,
    })
  })
}

/**
 * Handle subscription deleted (canceled)
 * Uses transaction to ensure atomicity of organization read + update
 */
async function handleSubscriptionDeleted(subscription: StripeWebhookObject) {
  await withTransaction(async (client) => {
    const organizationId = subscription.metadata?.organizationId

    // Find organization within transaction
    let orgId: string | null = null
    if (organizationId) {
      const { rows: orgResults } = await client.sql<{ id: string }>`
        SELECT id FROM organizations WHERE id = ${organizationId} LIMIT 1
      `
      if (orgResults.length > 0) {
        orgId = orgResults[0].id
      }
    } else {
      const { rows: orgResults } = await client.sql<{ id: string }>`
        SELECT id FROM organizations WHERE stripe_customer_id = ${subscription.customer} LIMIT 1
      `
      if (orgResults.length > 0) {
        orgId = orgResults[0].id
      }
    }

    if (!orgId) {
      logger.error("Subscription deleted: Cannot find organization")
      return
    }

    // Downgrade to free plan
    const freeConfig = PLAN_FEATURES.free
    const freeSubscriptionData = {
      plan: "free",
      status: "active",
      billingCycle: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      maxUsers: freeConfig.maxSeats ?? 5,
      features: freeConfig.features,
    }

    await client.sql`
      UPDATE organizations
      SET
        stripe_subscription_id = NULL,
        subscription = ${JSON.stringify(freeSubscriptionData)},
        updated_at = NOW()
      WHERE id = ${orgId}
    `

    logger.info({ orgId }, "Subscription canceled for org, downgraded to free")

    // Log the event (outside transaction is fine for audit log)
    await auditLogger.log({
      organizationId: orgId,
      userId: null,
      action: "subscription.canceled",
      severity: "warning",
      resourceType: "subscription",
      resourceId: subscription.id,
    })
  })
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaid(invoice: StripeWebhookObject) {
  if (!invoice.subscription) return

  const org = await db.organizations.findByStripeCustomerId(invoice.customer)
  if (!org) return

  // Record billing history
  try {
    await db.billingHistory.create({
      organizationId: org.id,
      subscriptionId: invoice.subscription,
      amount: invoice.amount_paid ?? 0,
      currency: invoice.currency ?? "usd",
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
    logError(logger, "Failed to record billing history", error)
  }

  logger.info({ orgId: org.id, amount: (invoice.amount_paid ?? 0) / 100, currency: invoice.currency ?? "usd" }, "Invoice paid for org")
}

/**
 * Handle failed invoice payment
 * Uses transaction to ensure atomicity of organization read + update
 */
async function handleInvoicePaymentFailed(invoice: StripeWebhookObject) {
  let orgId: string | null = null
  let subscriptionData: Record<string, unknown> | null = null

  // Use transaction for atomic read + update
  await withTransaction(async (client) => {
    const { rows: orgResults } = await client.sql<{ id: string; subscription: Record<string, unknown> }>`
      SELECT id, subscription FROM organizations WHERE stripe_customer_id = ${invoice.customer} LIMIT 1
    `

    if (orgResults.length === 0) return

    const org = orgResults[0]
    orgId = org.id
    subscriptionData = org.subscription

    // Update subscription status to past_due if subscription exists
    if (org.subscription) {
      const updatedSubscription = {
        ...org.subscription,
        status: "past_due",
      }

      await client.sql`
        UPDATE organizations
        SET
          subscription = ${JSON.stringify(updatedSubscription)},
          updated_at = NOW()
        WHERE id = ${org.id}
      `
    }
  })

  if (!orgId) return

  logger.info({ orgId }, "Invoice payment failed for org")

  // Log the event (outside transaction is fine for audit log)
  await auditLogger.log({
    organizationId: orgId,
    userId: null,
    action: "subscription.payment_failed",
    severity: "error",
    resourceType: "subscription",
    resourceId: invoice.subscription,
    metadata: { invoiceId: invoice.id, amount: invoice.amount_due },
  })

  // Send email notification to billing admin
  if (isEmailConfigured() && orgId) {
    try {
      // Find admins/owners for the organization
      const { rows: adminUsers } = await sql`
        SELECT u.email, u.name
        FROM users u
        WHERE u.organization_id = ${orgId}
          AND (u.role = 'admin' OR u.role = 'owner')
          AND u.email IS NOT NULL
      `

      if (adminUsers.length > 0) {
        // Get organization name
        const { rows: orgResults } = await sql<{ name: string }>`
          SELECT name FROM organizations WHERE id = ${orgId} LIMIT 1
        `
        const orgName = orgResults.length > 0 ? orgResults[0].name : "Your Organization"

        const adminEmails = adminUsers.map(u => u.email as string)
        const amount = invoice.amount_due ? (invoice.amount_due / 100).toFixed(2) : "0.00"
        const currency = (invoice.currency || "usd").toUpperCase()

        await sendBillingAlertEmail({
          to: adminEmails,
          subject: `Payment Failed for ${orgName} Subscription`,
          alertType: "payment_failed",
          organizationName: orgName,
          message: `A payment attempt has failed for your ${((subscriptionData || {}) as { plan?: string })?.plan || "subscription"} plan.`,
          details: `Amount due: ${currency} $${amount}. Please update your payment method to avoid service interruption.`,
          invoiceUrl: invoice.hosted_invoice_url as string | undefined,
        })

        logger.info({ orgId, adminCount: adminEmails.length }, "Billing alert email sent to admins")
      } else {
        logger.warn({ orgId }, "No admin emails found for payment failed notification")
      }
    } catch (emailError) {
      // Don't fail the webhook if email fails
      logError(logger, "Failed to send payment failed email", emailError)
    }
  } else {
    logger.debug("Email not configured, skipping payment failed notification")
  }
}
