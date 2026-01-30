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
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || "",
  },
  team: {
    monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_TEAM_YEARLY || "",
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

// Plan feature definitions (matches database plan_configs table)
export const PLAN_FEATURES: Record<string, {
  name: string
  maxSeats: number | null
  aiCreditsMonthly: number // -1 = unlimited
  features: string[]
  monthlyPrice: number // in cents
  yearlyPrice: number // in cents
}> = {
  free: {
    name: "Free",
    maxSeats: 5,
    aiCreditsMonthly: 100,
    features: ["basic_rocks", "basic_tasks", "eod_reports"],
    monthlyPrice: 0,
    yearlyPrice: 0,
  },
  pro: {
    name: "Pro",
    maxSeats: 20,
    aiCreditsMonthly: 1000,
    features: [
      "basic_rocks",
      "basic_tasks",
      "eod_reports",
      "ai_insights",
      "team_analytics",
      "asana_integration",
    ],
    monthlyPrice: 1500, // $15/month
    yearlyPrice: 14400, // $144/year (save 20%)
  },
  team: {
    name: "Team",
    maxSeats: 100,
    aiCreditsMonthly: 5000,
    features: [
      "basic_rocks",
      "basic_tasks",
      "eod_reports",
      "ai_insights",
      "team_analytics",
      "asana_integration",
      "custom_branding",
      "api_access",
      "priority_support",
    ],
    monthlyPrice: 2500, // $25/month
    yearlyPrice: 24000, // $240/year (save 20%)
  },
  enterprise: {
    name: "Enterprise",
    maxSeats: null, // unlimited
    aiCreditsMonthly: -1, // unlimited
    features: [
      "basic_rocks",
      "basic_tasks",
      "eod_reports",
      "ai_insights",
      "team_analytics",
      "asana_integration",
      "custom_branding",
      "api_access",
      "priority_support",
      "sso_saml",
      "dedicated_support",
      "sla_guarantee",
      "unlimited_ai",
    ],
    monthlyPrice: 7500, // $75/month
    yearlyPrice: 72000, // $720/year (save 20%)
  },
}

// Get AI credit limit for a plan
export function getPlanAICredits(plan: string): number {
  const planConfig = PLAN_FEATURES[plan]
  if (!planConfig) return 100 // default to free tier
  return planConfig.aiCreditsMonthly
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
