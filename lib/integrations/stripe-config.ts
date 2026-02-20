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
  team: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM_MONTHLY || "",
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM_YEARLY || "",
  },
  business: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY || "",
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_YEARLY || "",
  },
}

// AI Credit Pack Price IDs
export const AI_CREDIT_PRICE_IDS = {
  credits_500: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_500 || "",
  credits_2000: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_2000 || "",
  credits_5000: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_5000 || "",
}

// Stripe Payment Links (direct checkout URLs for marketing pages)
// All subscription links include 14-day free trial (card required upfront, $0 due today)
// Stripe Payment Links — configure via environment variables, no hardcoded fallbacks
export const STRIPE_PAYMENT_LINKS: Record<string, { monthly: string; yearly: string }> = {
  team: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_TEAM_MONTHLY || "",
    yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_TEAM_YEARLY || "",
  },
  business: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_BUSINESS_MONTHLY || "",
    yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_BUSINESS_YEARLY || "",
  },
}

// AI Credit Purchase Links
export const AI_CREDIT_PAYMENT_LINKS = {
  credits_500: process.env.NEXT_PUBLIC_STRIPE_LINK_AI_500 || "",
  credits_2000: process.env.NEXT_PUBLIC_STRIPE_LINK_AI_2000 || "",
  credits_5000: process.env.NEXT_PUBLIC_STRIPE_LINK_AI_5000 || "",
}

/**
 * Get the payment link for a given plan and billing cycle
 */
export function getPaymentLink(plan: string, billingCycle: "monthly" | "yearly"): string | null {
  const links = STRIPE_PAYMENT_LINKS[plan]
  if (!links) return null
  return links[billingCycle] || null
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
  team: {
    name: "Team",
    maxSeats: 25,
    aiCreditsMonthly: 200,
    features: [
      "basic_rocks",
      "basic_tasks",
      "eod_reports",
      "l10_meetings",
      "ids_board",
      "scorecard",
      "manager_dashboard",
      "ai_insights",
      "team_analytics",
      "slack_integration",
      "asana_integration",
      "google_calendar",
      "multiple_workspaces",
    ],
    monthlyPrice: 900, // $9/month per user
    yearlyPrice: 8640, // $86.40/year per user (20% off)
  },
  business: {
    name: "Business",
    maxSeats: null, // unlimited
    aiCreditsMonthly: -1, // unlimited
    features: [
      "basic_rocks",
      "basic_tasks",
      "eod_reports",
      "l10_meetings",
      "ids_board",
      "scorecard",
      "manager_dashboard",
      "ai_insights",
      "team_analytics",
      "slack_integration",
      "asana_integration",
      "google_calendar",
      "multiple_workspaces",
      "custom_branding",
      "api_access",
      "sso_saml",
      "priority_support",
      "unlimited_ai",
      "unlimited_workspaces",
    ],
    monthlyPrice: 1900, // $19/month per user
    yearlyPrice: 18240, // $182.40/year per user (20% off)
  },
}

// Get AI credit limit for a plan
export function getPlanAICredits(plan: string): number {
  const planConfig = PLAN_FEATURES[plan]
  if (!planConfig) return 50 // default to free tier
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
  if (!planConfig) return 3 // default to free tier
  return planConfig.maxSeats
}

// Stripe event types we handle
export const STRIPE_EVENTS = {
  CHECKOUT_COMPLETED: "checkout.session.completed",
  SUBSCRIPTION_CREATED: "customer.subscription.created",
  SUBSCRIPTION_UPDATED: "customer.subscription.updated",
  SUBSCRIPTION_DELETED: "customer.subscription.deleted",
  SUBSCRIPTION_TRIAL_WILL_END: "customer.subscription.trial_will_end",
  INVOICE_PAID: "invoice.paid",
  INVOICE_PAYMENT_FAILED: "invoice.payment_failed",
  CUSTOMER_CREATED: "customer.created",
  CUSTOMER_UPDATED: "customer.updated",
} as const
