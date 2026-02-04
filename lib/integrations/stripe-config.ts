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
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY || "",
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEARLY || "",
  },
  professional: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || "",
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY || "",
  },
  enterprise: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY || "",
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEARLY || "",
  },
}

// AI Credit Pack Price IDs
export const AI_CREDIT_PRICE_IDS = {
  credits_500: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_500 || "",
  credits_2000: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_2000 || "",
  credits_5000: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_5000 || "",
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

// Plan feature definitions (matches new pricing strategy)
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
    maxSeats: 3,
    aiCreditsMonthly: 50,
    features: ["basic_rocks", "basic_tasks", "eod_reports"],
    monthlyPrice: 0,
    yearlyPrice: 0,
  },
  starter: {
    name: "Starter",
    maxSeats: 10,
    aiCreditsMonthly: 100,
    features: [
      "basic_rocks",
      "basic_tasks",
      "eod_reports",
      "ai_insights",
      "slack_integration",
    ],
    monthlyPrice: 1200, // $12/month per user
    yearlyPrice: 12000, // $120/year per user (saves $24/year)
  },
  professional: {
    name: "Professional",
    maxSeats: 50,
    aiCreditsMonthly: 500,
    features: [
      "basic_rocks",
      "basic_tasks",
      "eod_reports",
      "ai_insights",
      "team_analytics",
      "asana_integration",
      "google_calendar",
      "slack_integration",
      "custom_branding",
      "priority_support",
      "unlimited_workspaces",
    ],
    monthlyPrice: 2000, // $20/month per user
    yearlyPrice: 19200, // $192/year per user (saves $48/year, 20% off)
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
      "google_calendar",
      "slack_integration",
      "custom_branding",
      "api_access",
      "priority_support",
      "sso_saml",
      "dedicated_support",
      "success_manager",
      "sla_guarantee",
      "unlimited_ai",
      "unlimited_workspaces",
    ],
    monthlyPrice: 3500, // $35/month per user
    yearlyPrice: 42000, // $420/year per user
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
