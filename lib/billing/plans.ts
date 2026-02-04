/**
 * Subscription Plans & Pricing Configuration
 *
 * This module defines all subscription tiers, their features, limits, and pricing.
 * Used across the application for feature gating, billing, and pricing display.
 */

export type PlanTier = "free" | "starter" | "professional" | "enterprise"

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
  supportLevel: "community" | "standard" | "priority" | "dedicated"
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
    name: "Free Trial",
    description: "Try Taskspace for 14 days, no credit card required",
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    limits: {
      maxUsers: 5,
      maxWorkspaces: 1,
      maxManagers: 1,
      aiCreditsPerUser: 50,
      maxStorageGB: 1,
    },
    features: {
      eodReports: true,
      rocksAndTasks: true,
      l10Meetings: true,
      managerDashboard: true,
      multipleWorkspaces: false,
      customBranding: false,
      apiAccess: false,
      advancedAnalytics: false,
      slackIntegration: true,
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
    cta: "Start Free Trial",
  },

  starter: {
    id: "starter",
    name: "Starter",
    description: "Perfect for small teams just adopting EOS",
    priceMonthly: 1200, // $12/user
    priceYearly: 12000, // $10/user * 12 = $120/user/year
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY || "price_starter_monthly",
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEARLY || "price_starter_yearly",
    limits: {
      maxUsers: 10,
      maxWorkspaces: 1,
      maxManagers: 1,
      aiCreditsPerUser: 100,
      maxStorageGB: 10,
    },
    features: {
      eodReports: true,
      rocksAndTasks: true,
      l10Meetings: true,
      managerDashboard: true,
      multipleWorkspaces: false,
      customBranding: false,
      apiAccess: false,
      advancedAnalytics: false,
      slackIntegration: true,
      asanaSync: false,
      googleCalendarSync: false,
      ssoAuth: false,
      aiEodParsing: true,
      aiQuery: true,
      aiDailyDigest: true,
      aiBrainDump: false,
      unlimitedAI: false,
      supportLevel: "standard",
      responseTime: "48 hours",
      onboarding: false,
      dedicatedSuccessManager: false,
    },
    cta: "Get Started",
  },

  professional: {
    id: "professional",
    name: "Professional",
    description: "For growing companies with multiple teams",
    priceMonthly: 2000, // $20/user
    priceYearly: 19200, // $16/user * 12 = $192/user/year
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || "price_pro_monthly",
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY || "price_pro_yearly",
    limits: {
      maxUsers: 50,
      maxWorkspaces: null, // unlimited
      maxManagers: null, // unlimited
      aiCreditsPerUser: 500,
      maxStorageGB: 100,
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
      ssoAuth: false,
      aiEodParsing: true,
      aiQuery: true,
      aiDailyDigest: true,
      aiBrainDump: true,
      unlimitedAI: false,
      supportLevel: "priority",
      responseTime: "24 hours",
      onboarding: true,
      dedicatedSuccessManager: false,
    },
    badge: "Most Popular",
    popular: true,
    cta: "Start Free Trial",
  },

  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations and multi-company portfolios",
    priceMonthly: 3500, // $35/user (display only, actual billing is custom)
    priceYearly: 42000, // $35/user * 12 = $420/user/year
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY || "price_enterprise_monthly",
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEARLY || "price_enterprise_yearly",
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
      supportLevel: "dedicated",
      responseTime: "4 hours",
      onboarding: true,
      dedicatedSuccessManager: true,
    },
    badge: "Best Value",
    cta: "Contact Sales",
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
