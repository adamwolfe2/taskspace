/**
 * Stripe Integration Client
 * Handles all Stripe API interactions
 */

import { getStripeConfig, STRIPE_PRICE_IDS, PLAN_FEATURES } from "./stripe-config"
import type Stripe from "stripe"

// Dynamic import for Stripe to handle cases where it's not installed
type StripeConstructor = new (key: string, options: Stripe.StripeConfig) => Stripe

let StripeClient: StripeConstructor | null = null

async function getStripeClient(): Promise<Stripe> {
  const config = getStripeConfig()

  if (!config.isConfigured) {
    throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")
  }

  if (!StripeClient) {
    try {
      const stripeModule = await import("stripe")
      StripeClient = stripeModule.default as StripeConstructor
    } catch (error) {
      throw new Error("Stripe package not installed. Run: npm install stripe")
    }
  }

  return new StripeClient(config.secretKey!, {
    apiVersion: "2025-12-15.clover",
    typescript: true,
  })
}

export interface CreateCheckoutParams {
  organizationId: string
  organizationName: string
  billingEmail: string
  plan: "team" | "business"
  billingCycle: "monthly" | "yearly"
  successUrl: string
  cancelUrl: string
  customerId?: string
}

export interface CreatePortalParams {
  customerId: string
  returnUrl: string
}

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createCheckoutSession(params: CreateCheckoutParams) {
  const stripe = await getStripeClient()
  const priceId = STRIPE_PRICE_IDS[params.plan]?.[params.billingCycle]

  if (!priceId) {
    throw new Error(`Invalid plan or billing cycle: ${params.plan} / ${params.billingCycle}`)
  }

  const sessionParams: Record<string, unknown> = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: params.cancelUrl,
    metadata: {
      organizationId: params.organizationId,
      plan: params.plan,
      billingCycle: params.billingCycle,
    },
    subscription_data: {
      metadata: {
        organizationId: params.organizationId,
        plan: params.plan,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: "required",
  }

  // Use existing customer if provided
  if (params.customerId) {
    sessionParams.customer = params.customerId
  } else {
    sessionParams.customer_email = params.billingEmail
  }

  const session = await stripe.checkout.sessions.create(sessionParams)
  return session
}

/**
 * Create a customer portal session for managing subscription
 */
export async function createCustomerPortalSession(params: CreatePortalParams) {
  const stripe = await getStripeClient()

  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  })

  return session
}

/**
 * Get or create a Stripe customer for an organization
 */
export async function getOrCreateCustomer(
  organizationId: string,
  email: string,
  name: string,
  existingCustomerId?: string
) {
  const stripe = await getStripeClient()

  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId)
      if (!customer.deleted) {
        return customer
      }
    } catch (error) {
      // Customer not found, create new one
    }
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      organizationId,
    },
  })

  return customer
}

/**
 * Retrieve subscription details
 */
export async function getSubscription(subscriptionId: string) {
  const stripe = await getStripeClient()
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method", "latest_invoice"],
  })
}

/**
 * Update subscription (change plan)
 */
export async function updateSubscription(
  subscriptionId: string,
  newPlan: "team" | "business",
  billingCycle: "monthly" | "yearly"
) {
  const stripe = await getStripeClient()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  const newPriceId = STRIPE_PRICE_IDS[newPlan]?.[billingCycle]
  if (!newPriceId) {
    throw new Error(`Invalid plan: ${newPlan}`)
  }

  // Update the subscription with new price
  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: "create_prorations",
    metadata: {
      plan: newPlan,
      billingCycle,
    },
  })

  return updatedSubscription
}

/**
 * Cancel subscription (at period end)
 */
export async function cancelSubscription(subscriptionId: string, immediately: boolean = false) {
  const stripe = await getStripeClient()

  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId)
  }

  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
}

/**
 * Resume a canceled subscription (before period ends)
 */
export async function resumeSubscription(subscriptionId: string) {
  const stripe = await getStripeClient()
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })
}

/**
 * List invoices for a customer
 */
export async function listInvoices(customerId: string, limit: number = 10) {
  const stripe = await getStripeClient()
  return stripe.invoices.list({
    customer: customerId,
    limit,
    expand: ["data.subscription"],
  })
}

/**
 * Construct and verify Stripe webhook event
 */
export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
) {
  const stripe = await getStripeClient()
  const config = getStripeConfig()

  if (!config.webhookSecret) {
    throw new Error("Stripe webhook secret not configured")
  }

  return stripe.webhooks.constructEvent(payload, signature, config.webhookSecret)
}

/**
 * Get plan from price ID
 */
export function getPlanFromPriceId(priceId: string): { plan: string; billingCycle: string } | null {
  for (const [plan, prices] of Object.entries(STRIPE_PRICE_IDS)) {
    if (prices.monthly === priceId) {
      return { plan, billingCycle: "monthly" }
    }
    if (prices.yearly === priceId) {
      return { plan, billingCycle: "yearly" }
    }
  }
  return null
}
