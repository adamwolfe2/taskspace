/**
 * Subscription Plans & Pricing Configuration
 *
 * This module defines all subscription tiers, their features, limits, and pricing.
 * Used across the application for feature gating, billing, and pricing display.
 */

export type PlanTier = "free" | "team" | "business"

export interface PlanLimits {
  maxUsers: number | null // null = unlimited
  maxWorkspaces: number | null // null = unlimited
  maxManagers: number | null // null = unlimited
  aiCreditsPerUser: number // monthly allocation
  maxStorageGB: number | null // null = unlimited
}

export interface PlanFeatures {
  // Core Features
  eodReports: boolean
  rocksAndTasks: boolean
  l10Meetings: boolean
  managerDashboard: boolean

  // Advanced Features
  multipleWorkspaces: boolean
  customBranding: boolean
  apiAccess: boolean
  advancedAnalytics: boolean

  // Integrations
  slackIntegration: boolean
  asanaSync: boolean
  googleCalendarSync: boolean
  ssoAuth: boolean

  // AI Features
  aiEodParsing: boolean
  aiQuery: boolean
  aiDailyDigest: boolean
  aiBrainDump: boolean
  unlimitedAI: boolean

  // Support
  supportLevel: "community" | "standard" | "priority"
  responseTime: string
  onboarding: boolean
  dedicatedSuccessManager: boolean
}

export interface PlanConfig {
  id: PlanTier
  name: string
  description: string
  priceMonthly: number // in cents
  priceYearly: number // in cents (total for the year)
  stripePriceIdMonthly: string | null
  stripePriceIdYearly: string | null
  limits: PlanLimits
  features: PlanFeatures
  badge?: string
  cta: string
  popular?: boolean
}

/**
 * Subscription Plan Definitions
 */
export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    description: "For individuals and small teams getting started with EOS",
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    limits: {
      maxUsers: 3,
      maxWorkspaces: 1,
      maxManagers: 1,
      aiCreditsPerUser: 50,
      maxStorageGB: 1,
    },
    features: {
      eodReports: true,
      rocksAndTasks: true,
      l10Meetings: false,
      managerDashboard: false,
      multipleWorkspaces: false,
      customBranding: false,
      apiAccess: false,
      advancedAnalytics: false,
      slackIntegration: false,
      asanaSync: false,
      googleCalendarSync: false,
      ssoAuth: false,
      aiEodParsing: true,
      aiQuery: true,
      aiDailyDigest: false,
      aiBrainDump: false,
      unlimitedAI: false,
      supportLevel: "community",
      responseTime: "Best effort",
      onboarding: false,
      dedicatedSuccessManager: false,
    },
    cta: "Start Free",
  },

  team: {
    id: "team",
    name: "Team",
    description: "For teams running on EOS with full meeting and tracking tools",
    priceMonthly: 900, // $9/user/month
    priceYearly: 8640, // $7.20/user/month billed annually ($86.40/user/year) — 20% savings
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM_MONTHLY || "",
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM_YEARLY || "",
    limits: {
      maxUsers: 25,
      maxWorkspaces: 3,
      maxManagers: 3,
      aiCreditsPerUser: 200,
      maxStorageGB: 25,
    },
    features: {
      eodReports: true,
      rocksAndTasks: true,
      l10Meetings: true,
      managerDashboard: true,
      multipleWorkspaces: true,
      customBranding: false,
      apiAccess: false,
      advancedAnalytics: true,
      slackIntegration: true,
      asanaSync: true,
      googleCalendarSync: true,
      ssoAuth: false,
      aiEodParsing: true,
      aiQuery: true,
      aiDailyDigest: true,
      aiBrainDump: true,
      unlimitedAI: false,
      supportLevel: "standard",
      responseTime: "24 hours",
      onboarding: false,
      dedicatedSuccessManager: false,
    },
    badge: "Most Popular",
    popular: true,
    cta: "Start Free Trial",
  },

  business: {
    id: "business",
    name: "Business",
    description: "For scaling organizations that need branding, API access, and unlimited AI",
    priceMonthly: 1900, // $19/user/month
    priceYearly: 18240, // $15.20/user/month billed annually ($182.40/user/year) — 20% savings
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY || "",
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_YEARLY || "",
    limits: {
      maxUsers: null, // unlimited
      maxWorkspaces: null, // unlimited
      maxManagers: null, // unlimited
      aiCreditsPerUser: 9999999, // effectively unlimited
      maxStorageGB: null, // unlimited
    },
    features: {
      eodReports: true,
      rocksAndTasks: true,
      l10Meetings: true,
      managerDashboard: true,
      multipleWorkspaces: true,
      customBranding: true,
      apiAccess: true,
      advancedAnalytics: true,
      slackIntegration: true,
      asanaSync: true,
      googleCalendarSync: true,
      ssoAuth: true,
      aiEodParsing: true,
      aiQuery: true,
      aiDailyDigest: true,
      aiBrainDump: true,
      unlimitedAI: true,
      supportLevel: "priority",
      responseTime: "4 hours",
      onboarding: true,
      dedicatedSuccessManager: false,
    },
    cta: "Start Free Trial",
  },
}

/**
 * AI Credit Add-On Packs
 */
export interface AIAddonPack {
  id: string
  name: string
  credits: number
  priceMonthly: number // in cents
  stripePriceId: string
  savings?: string
}

export const AI_ADDON_PACKS: AIAddonPack[] = [
  {
    id: "ai_500",
    name: "500 Credits",
    credits: 500,
    priceMonthly: 1000, // $10
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_500 || "price_ai_500",
  },
  {
    id: "ai_2000",
    name: "2,000 Credits",
    credits: 2000,
    priceMonthly: 3000, // $30 (save $10)
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_2000 || "price_ai_2000",
    savings: "Save $10",
  },
  {
    id: "ai_5000",
    name: "5,000 Credits",
    credits: 5000,
    priceMonthly: 6000, // $60 (save $40)
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_5000 || "price_ai_5000",
    savings: "Save $40",
  },
]

/**
 * AI Operation Costs (in credits)
 */
export const AI_OPERATION_COSTS = {
  eodParsing: 5,
  aiQuery: 3,
  dailyDigest: 10,
  brainDump: 20,
  taskSuggestion: 2,
} as const

/**
 * Feature categories for comparison table
 */
export const FEATURE_CATEGORIES = [
  {
    name: "Core EOS Features",
    features: [
      { key: "eodReports", label: "EOD Reports", tooltip: "Daily end-of-day team reporting" },
      { key: "rocksAndTasks", label: "Rocks & Tasks", tooltip: "Quarterly goals and task management" },
      { key: "l10Meetings", label: "L10 Meetings", tooltip: "Weekly Level 10 meeting management" },
      { key: "managerDashboard", label: "Manager Dashboard", tooltip: "Team performance insights" },
    ],
  },
  {
    name: "Collaboration",
    features: [
      { key: "multipleWorkspaces", label: "Multiple Workspaces", tooltip: "Separate spaces for teams/departments" },
      { key: "maxManagers", label: "Managers", tooltip: "Number of managers allowed" },
      { key: "maxUsers", label: "Team Size", tooltip: "Maximum active users" },
    ],
  },
  {
    name: "AI-Powered Features",
    features: [
      { key: "aiCreditsPerUser", label: "AI Credits/User", tooltip: "Monthly AI operation allowance" },
      { key: "aiEodParsing", label: "AI EOD Parsing", tooltip: "Auto-extract tasks from EOD text" },
      { key: "aiQuery", label: "AI Search", tooltip: "Natural language search across all data" },
      { key: "aiDailyDigest", label: "Daily AI Digest", tooltip: "Automated daily summaries" },
      { key: "aiBrainDump", label: "Brain Dump AI", tooltip: "Process and organize brain dumps" },
    ],
  },
  {
    name: "Integrations",
    features: [
      { key: "slackIntegration", label: "Slack Notifications", tooltip: "Push notifications to Slack" },
      { key: "asanaSync", label: "Asana Sync", tooltip: "Bidirectional task sync with Asana" },
      { key: "googleCalendarSync", label: "Google Calendar", tooltip: "Sync tasks to Google Calendar" },
      { key: "ssoAuth", label: "SSO/SAML", tooltip: "Single sign-on authentication" },
    ],
  },
  {
    name: "Customization & Analytics",
    features: [
      { key: "customBranding", label: "Custom Branding", tooltip: "Logo, colors, custom domain" },
      { key: "advancedAnalytics", label: "Advanced Analytics", tooltip: "Deep insights and reporting" },
      { key: "apiAccess", label: "API Access", tooltip: "Programmatic access to your data" },
    ],
  },
  {
    name: "Support",
    features: [
      { key: "supportLevel", label: "Support Level", tooltip: "Level of customer support" },
      { key: "responseTime", label: "Response Time", tooltip: "Guaranteed response time" },
      { key: "onboarding", label: "Onboarding", tooltip: "Guided setup and training" },
      { key: "dedicatedSuccessManager", label: "Success Manager", tooltip: "Dedicated customer success manager" },
    ],
  },
]

/**
 * Helper to get plan by ID
 */
export function getPlanById(planId: PlanTier): PlanConfig {
  return PLANS[planId] || PLANS.free
}

/**
 * Helper to get current plan from organization subscription
 */
export function getCurrentPlan(subscription?: { plan?: string } | null): PlanConfig {
  if (!subscription?.plan) return PLANS.free
  return getPlanById(subscription.plan as PlanTier)
}

/**
 * Format price for display
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

/**
 * Calculate yearly savings
 */
export function calculateYearlySavings(plan: PlanConfig): number {
  const monthlyCost = plan.priceMonthly * 12
  const yearlyCost = plan.priceYearly
  return monthlyCost - yearlyCost
}
