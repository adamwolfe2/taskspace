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

    // Verify and construct event — cast to local StripeWebhookObject at handler call sites
    let event: { id: string; type: string; data: { object: StripeWebhookObject } }
    try {
      event = await constructWebhookEvent(payload, signature) as unknown as typeof event
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

        case STRIPE_EVENTS.SUBSCRIPTION_TRIAL_WILL_END: {
          await handleTrialWillEnd(event.data.object)
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
  customer?: string
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
  customer_details?: { email?: string }
  customer_email?: string
  [key: string]: unknown
}

/**
 * Handle checkout.session.completed
 * This is the first event after a successful subscription checkout.
 *
 * Two flows:
 * 1. In-app checkout (has organizationId metadata) → link customer to org directly
 * 2. Payment Link checkout (no metadata) → store in pending_subscriptions for claim
 */
async function handleCheckoutCompleted(session: StripeWebhookObject) {
  const organizationId = session.metadata?.organizationId
  const plan = session.metadata?.plan || "team"
  const billingCycle = session.metadata?.billingCycle || "monthly"

  if (organizationId) {
    // Flow 1: In-app checkout — org is known
    logger.info({ organizationId, plan, billingCycle }, "Checkout completed for org")

    if (session.customer) {
      await db.organizations.update(organizationId, {
        stripeCustomerId: session.customer,
      })
    }

    await auditLogger.log({
      organizationId,
      userId: null,
      action: "subscription.checkout_completed",
      severity: "info",
      resourceType: "subscription",
      resourceId: session.subscription || session.id,
      metadata: { plan, billingCycle, customerId: session.customer },
    })
    return
  }

  // Flow 2: Payment Link checkout — no org metadata
  // Try to match by customer email to an existing org
  const customerEmail = session.customer_details?.email || session.customer_email || null
  let matchedOrgId: string | null = null

  if (customerEmail) {
    try {
      const { rows } = await sql<{ organization_id: string }>`
        SELECT om.organization_id
        FROM users u
        JOIN organization_members om ON om.user_id = u.id
        WHERE LOWER(u.email) = LOWER(${customerEmail})
          AND (om.role = 'admin' OR om.role = 'owner')
        LIMIT 1
      `
      if (rows.length > 0) {
        matchedOrgId = rows[0].organization_id
      }
    } catch (error) {
      logError(logger, "Failed to look up org by customer email", error)
    }
  }

  if (matchedOrgId && session.customer) {
    // Auto-link: found an org matching the checkout email
    logger.info({ matchedOrgId, customerEmail, plan }, "Payment Link checkout auto-linked to org by email")

    await db.organizations.update(matchedOrgId, {
      stripeCustomerId: session.customer,
    })

    await auditLogger.log({
      organizationId: matchedOrgId,
      userId: null,
      action: "subscription.checkout_completed",
      severity: "info",
      resourceType: "subscription",
      resourceId: session.subscription || session.id,
      metadata: { plan, billingCycle, customerId: session.customer, source: "payment_link_auto" },
    })
    return
  }

  // No org match — store as pending for later claim
  logger.info({ sessionId: session.id, customerEmail }, "Payment Link checkout stored as pending (no org match)")

  try {
    await sql`
      INSERT INTO pending_subscriptions (
        stripe_session_id, stripe_customer_id, stripe_subscription_id,
        customer_email, plan, billing_cycle, status, metadata
      ) VALUES (
        ${session.id},
        ${session.customer || ''},
        ${session.subscription || null},
        ${customerEmail},
        ${plan},
        ${billingCycle},
        'pending',
        ${JSON.stringify({ source: "payment_link", eventId: session.id })}
      )
      ON CONFLICT (stripe_session_id) DO NOTHING
    `
  } catch (error) {
    // Table might not exist yet — log but don't fail the webhook
    logError(logger, "Failed to insert pending subscription (table may not exist yet)", error)
  }
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
      if (orgResults.length > 0) {
        orgId = orgResults[0].id
      } else {
        // Payment Link flow: subscription may not be linked to an org yet.
        // Update the pending_subscriptions record with the subscription ID for later claim.
        logger.info({ customerId: subscription.customer }, "Subscription updated: No org found, may be pending Payment Link claim")
        try {
          await sql`
            UPDATE pending_subscriptions
            SET stripe_subscription_id = ${subscription.id}
            WHERE stripe_customer_id = ${subscription.customer}
              AND status = 'pending'
          `
        } catch {
          // Table may not exist — non-critical
        }
        return
      }
    }

    if (!orgId) return

    // Get plan from price ID
    const priceId = subscription.items?.data?.[0]?.price?.id
    const planInfo = priceId ? getPlanFromPriceId(priceId) : null
    const plan = planInfo?.plan || subscription.metadata?.plan || "team"
    const billingCycle = planInfo?.billingCycle || subscription.metadata?.billingCycle || "monthly"

    // Get plan configuration
    const planConfig = PLAN_FEATURES[plan] || PLAN_FEATURES.team

    // Update organization subscription within transaction
    const subscriptionData = {
      plan: plan as "free" | "team" | "business",
      status: subscription.status as "active" | "trialing" | "past_due" | "canceled",
      billingCycle: billingCycle as "monthly" | "yearly" | null,
      currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : new Date().toISOString(),
      cancelAtPeriodEnd: (subscription.cancel_at_period_end as boolean) ?? false,
      maxUsers: planConfig.maxSeats ?? 3, // Default to 3 if null
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

    // Upsert subscriptions table row for AI credit tracking
    const creditsLimit = plan === "business" ? -1 : plan === "team" ? 200 : 50
    const periodEnd = subscription.current_period_end
      ? new Date((subscription.current_period_end as number) * 1000).toISOString()
      : null

    await client.sql`
      INSERT INTO subscriptions (
        id, organization_id, stripe_customer_id, stripe_subscription_id,
        plan, seat_count, ai_credits_limit, status, current_period_end
      ) VALUES (
        gen_random_uuid()::text,
        ${orgId}, ${subscription.customer}, ${subscription.id},
        ${plan}, ${subscriptionData.maxUsers || 3}, ${creditsLimit},
        ${subscription.status || 'active'}, ${periodEnd}
      )
      ON CONFLICT (organization_id) DO UPDATE SET
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        plan = EXCLUDED.plan,
        seat_count = EXCLUDED.seat_count,
        ai_credits_limit = EXCLUDED.ai_credits_limit,
        status = EXCLUDED.status,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = NOW()
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
      maxUsers: freeConfig.maxSeats ?? 3,
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

    // Downgrade subscriptions table row for AI credit tracking
    await client.sql`
      UPDATE subscriptions
      SET
        stripe_subscription_id = NULL,
        plan = 'free',
        seat_count = ${freeSubscriptionData.maxUsers},
        ai_credits_limit = 50,
        ai_credits_used = 0,
        status = 'canceled',
        current_period_end = NULL,
        updated_at = NOW()
      WHERE organization_id = ${orgId}
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
  if (!invoice.subscription || !invoice.customer) return

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
 * Handle failed invoice payment with dunning logic.
 *
 * Tracks attempt count and sends escalating emails:
 * - 1st attempt: Gentle reminder
 * - 2nd attempt: Urgent warning
 * - 3rd+ attempt: Final notice + access restriction warning
 *
 * Grace period: Org stays on paid plan for 7 days past_due.
 * After 7 days, a separate cron/webhook event (subscription.deleted) will downgrade.
 */
async function handleInvoicePaymentFailed(invoice: StripeWebhookObject) {
  let orgId: string | null = null
  let subscriptionData: Record<string, unknown> | null = null
  let failureCount = 1

  // Use transaction for atomic read + update
  await withTransaction(async (client) => {
    const { rows: orgResults } = await client.sql<{ id: string; subscription: Record<string, unknown> }>`
      SELECT id, subscription FROM organizations WHERE stripe_customer_id = ${invoice.customer} LIMIT 1
    `

    if (orgResults.length === 0) return

    const org = orgResults[0]
    orgId = org.id
    subscriptionData = org.subscription

    // Track failure count from subscription metadata
    const existingSub = org.subscription as { paymentFailureCount?: number } | null
    failureCount = (existingSub?.paymentFailureCount || 0) + 1

    // Update subscription status to past_due with failure tracking
    if (org.subscription) {
      const updatedSubscription = {
        ...org.subscription,
        status: "past_due",
        paymentFailureCount: failureCount,
        firstFailedAt: (org.subscription as { firstFailedAt?: string }).firstFailedAt || new Date().toISOString(),
        lastFailedAt: new Date().toISOString(),
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

  logger.info({ orgId, failureCount }, "Invoice payment failed for org")

  await auditLogger.log({
    organizationId: orgId,
    userId: null,
    action: "subscription.payment_failed",
    severity: "error",
    resourceType: "subscription",
    resourceId: invoice.subscription,
    metadata: { invoiceId: invoice.id, amount: invoice.amount_due, failureCount },
  })

  // Send escalating email based on failure count
  if (isEmailConfigured() && orgId) {
    try {
      const { rows: adminUsers } = await sql`
        SELECT u.email, u.name
        FROM users u
        JOIN organization_members om ON om.user_id = u.id
        WHERE om.organization_id = ${orgId}
          AND (om.role = 'admin' OR om.role = 'owner')
          AND u.email IS NOT NULL
      `

      if (adminUsers.length > 0) {
        const { rows: orgResults } = await sql<{ name: string }>`
          SELECT name FROM organizations WHERE id = ${orgId} LIMIT 1
        `
        const orgName = orgResults.length > 0 ? orgResults[0].name : "Your Organization"
        const adminEmails = adminUsers.map(u => u.email as string)
        const amount = invoice.amount_due ? (invoice.amount_due / 100).toFixed(2) : "0.00"
        const currency = (invoice.currency || "usd").toUpperCase()
        const planName = ((subscriptionData || {}) as { plan?: string })?.plan || "subscription"

        if (failureCount === 1) {
          // Gentle first reminder
          await sendBillingAlertEmail({
            to: adminEmails,
            subject: `Action needed: Payment failed for ${orgName}`,
            alertType: "payment_failed",
            organizationName: orgName,
            message: `We couldn't process the payment for your ${planName} plan.`,
            details: `Amount due: ${currency} $${amount}. Please update your payment method. We'll retry automatically in a few days.`,
            invoiceUrl: invoice.hosted_invoice_url as string | undefined,
          })
        } else if (failureCount === 2) {
          // Urgent second attempt
          await sendBillingAlertEmail({
            to: adminEmails,
            subject: `Urgent: Second payment attempt failed for ${orgName}`,
            alertType: "payment_failed_urgent",
            organizationName: orgName,
            message: `We've now tried twice to process your ${planName} plan payment.`,
            details: `Amount due: ${currency} $${amount}. Please update your payment method immediately to avoid losing access to paid features.`,
            invoiceUrl: invoice.hosted_invoice_url as string | undefined,
          })
        } else {
          // Final notice — access will be restricted
          await sendBillingAlertEmail({
            to: adminEmails,
            subject: `Final notice: Your ${orgName} subscription will be downgraded`,
            alertType: "payment_failed_final",
            organizationName: orgName,
            message: `After ${failureCount} failed payment attempts, your ${planName} plan will be downgraded to Free.`,
            details: `Amount due: ${currency} $${amount}. Update your payment method now to keep your current plan and avoid losing access to paid features.`,
            invoiceUrl: invoice.hosted_invoice_url as string | undefined,
          })
        }

        logger.info({ orgId, adminCount: adminEmails.length, failureCount }, "Dunning email sent to admins")
      } else {
        logger.warn({ orgId }, "No admin emails found for payment failed notification")
      }
    } catch (emailError) {
      logError(logger, "Failed to send payment failed email", emailError)
    }
  }
}

/**
 * Handle trial ending in 3 days (customer.subscription.trial_will_end)
 * Sends a reminder email to org admins so they can add a payment method.
 */
async function handleTrialWillEnd(subscription: StripeWebhookObject) {
  const orgId = subscription.metadata?.organizationId

  // Find org by metadata or customer ID
  let resolvedOrgId: string | null = orgId || null
  if (!resolvedOrgId && subscription.customer) {
    try {
      const { rows } = await sql<{ id: string }>`
        SELECT id FROM organizations WHERE stripe_customer_id = ${subscription.customer} LIMIT 1
      `
      if (rows.length > 0) resolvedOrgId = rows[0].id
    } catch {
      // Non-critical
    }
  }

  if (!resolvedOrgId) {
    logger.warn({ customerId: subscription.customer }, "Trial ending: Cannot find organization")
    return
  }

  // Update subscription with trial_end timestamp
  try {
    const trialEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    await sql`
      UPDATE organizations
      SET
        subscription = jsonb_set(
          COALESCE(subscription, '{}')::jsonb,
          '{trialEnd}',
          ${JSON.stringify(trialEnd)}::jsonb
        ),
        updated_at = NOW()
      WHERE id = ${resolvedOrgId}
    `
  } catch (error) {
    logError(logger, "Failed to update trial end date", error)
  }

  logger.info({ orgId: resolvedOrgId }, "Trial ending in 3 days for org")

  await auditLogger.log({
    organizationId: resolvedOrgId,
    userId: null,
    action: "subscription.updated",
    severity: "warning",
    resourceType: "subscription",
    resourceId: subscription.id,
    metadata: { event: "trial_will_end" },
  })

  // Send trial ending reminder email
  if (isEmailConfigured()) {
    try {
      const { rows: adminUsers } = await sql`
        SELECT u.email, u.name
        FROM users u
        JOIN organization_members om ON om.user_id = u.id
        WHERE om.organization_id = ${resolvedOrgId}
          AND (om.role = 'admin' OR om.role = 'owner')
          AND u.email IS NOT NULL
      `

      if (adminUsers.length > 0) {
        const { rows: orgResults } = await sql<{ name: string; subscription: Record<string, unknown> }>`
          SELECT name, subscription FROM organizations WHERE id = ${resolvedOrgId} LIMIT 1
        `
        const orgName = orgResults[0]?.name || "Your Organization"
        const planName = (orgResults[0]?.subscription as { plan?: string })?.plan || "Team"
        const adminEmails = adminUsers.map(u => u.email as string)

        await sendBillingAlertEmail({
          to: adminEmails,
          subject: `Your ${orgName} free trial ends in 3 days`,
          alertType: "trial_ending",
          organizationName: orgName,
          message: `Your ${planName} plan free trial is ending soon.`,
          details: `Your card on file will be charged automatically when the trial ends. If you'd like to continue using Taskspace, no action is needed. To cancel, visit your billing settings before the trial expires.`,
        })

        logger.info({ orgId: resolvedOrgId, adminCount: adminEmails.length }, "Trial ending reminder email sent")
      }
    } catch (emailError) {
      logError(logger, "Failed to send trial ending email", emailError)
    }
  }
}
