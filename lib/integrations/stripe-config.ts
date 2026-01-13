/**
 * Stripe Integration Configuration
 * Handles payment processing for subscription management
 */

// Note: In production, install stripe package: npm install stripe
// For now, we'll create the integration structure

export interface StripeConfig {
  secretKey: string | undefined
  publishableKey: string | undefined
  webhookSecret: string | undefined
  isConfigured: boolean
}

export interface PriceConfig {
  monthly: string
  yearly: string
}

// Price IDs for each plan (configure in Stripe Dashboard)
export const STRIPE_PRICE_IDS: Record<string, PriceConfig> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || "",
  },
  professional: {
    monthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY || "",
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || "",
  },
}

// Get Stripe configuration
export function getStripeConfig(): StripeConfig {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  return {
    secretKey,
    publishableKey,
    webhookSecret,
    isConfigured: !!(secretKey && publishableKey),
  }
}

// Plan feature definitions
export const PLAN_FEATURES: Record<string, {
  name: string
  maxSeats: number | null
  features: string[]
  monthlyPrice: number // in cents
  yearlyPrice: number // in cents
}> = {
  free: {
    name: "Free",
    maxSeats: 5,
    features: ["basic_rocks", "basic_tasks", "eod_reports"],
    monthlyPrice: 0,
    yearlyPrice: 0,
  },
  starter: {
    name: "Starter",
    maxSeats: 15,
    features: ["basic_rocks", "basic_tasks", "eod_reports", "email_notifications", "basic_analytics"],
    monthlyPrice: 2900, // $29/month
    yearlyPrice: 29000, // $290/year (save ~17%)
  },
  professional: {
    name: "Professional",
    maxSeats: 50,
    features: [
      "basic_rocks",
      "basic_tasks",
      "eod_reports",
      "email_notifications",
      "advanced_analytics",
      "ai_insights",
      "custom_branding",
      "api_access",
      "priority_support",
    ],
    monthlyPrice: 7900, // $79/month
    yearlyPrice: 79000, // $790/year
  },
  enterprise: {
    name: "Enterprise",
    maxSeats: null, // unlimited
    features: [
      "basic_rocks",
      "basic_tasks",
      "eod_reports",
      "email_notifications",
      "advanced_analytics",
      "ai_insights",
      "custom_branding",
      "api_access",
      "priority_support",
      "sso_saml",
      "custom_integrations",
      "dedicated_support",
      "sla_guarantee",
    ],
    monthlyPrice: 19900, // $199/month
    yearlyPrice: 199000, // $1990/year
  },
}

// Check if a feature is available for a plan
export function isPlanFeatureEnabled(plan: string, feature: string): boolean {
  const planConfig = PLAN_FEATURES[plan]
  if (!planConfig) return false
  return planConfig.features.includes(feature)
}

// Get seat limit for a plan
export function getPlanSeatLimit(plan: string): number | null {
  const planConfig = PLAN_FEATURES[plan]
  if (!planConfig) return 5 // default to free tier
  return planConfig.maxSeats
}

// Stripe event types we handle
export const STRIPE_EVENTS = {
  CHECKOUT_COMPLETED: "checkout.session.completed",
  SUBSCRIPTION_CREATED: "customer.subscription.created",
  SUBSCRIPTION_UPDATED: "customer.subscription.updated",
  SUBSCRIPTION_DELETED: "customer.subscription.deleted",
  INVOICE_PAID: "invoice.paid",
  INVOICE_PAYMENT_FAILED: "invoice.payment_failed",
  CUSTOMER_CREATED: "customer.created",
  CUSTOMER_UPDATED: "customer.updated",
} as const
