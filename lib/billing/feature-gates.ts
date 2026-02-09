/**
 * Feature Gate Utilities
 *
 * Functions to check if a user/organization can access specific features
 * based on their subscription plan and usage limits.
 */

import { PLANS, PlanTier, AI_OPERATION_COSTS, getPlanById } from "./plans"

export interface FeatureGateContext {
  organizationId: string
  subscription?: {
    plan: PlanTier
    status: string
    currentPeriodEnd?: string | null
  } | null
  usage: {
    activeUsers: number
    workspaces: number
    managers: number
    aiCreditsUsed: number
    aiCreditsTotal: number
    storageUsedGB: number
  }
}

/**
 * Check if organization can create a new workspace
 */
export function canCreateWorkspace(context: FeatureGateContext): {
  allowed: boolean
  reason?: string
  upgradeRequired?: PlanTier
} {
  const plan = getPlanById(context.subscription?.plan || "free")

  // Check if plan allows multiple workspaces
  if (!plan.features.multipleWorkspaces) {
    return {
      allowed: false,
      reason: "Multiple workspaces require Team plan or higher",
      upgradeRequired: "team",
    }
  }

  // Check workspace limit
  if (plan.limits.maxWorkspaces !== null && context.usage.workspaces >= plan.limits.maxWorkspaces) {
    return {
      allowed: false,
      reason: `Workspace limit reached (${plan.limits.maxWorkspaces}). Upgrade for unlimited workspaces.`,
      upgradeRequired: "business",
    }
  }

  return { allowed: true }
}

/**
 * Check if organization can add a new user
 */
export function canAddUser(context: FeatureGateContext): {
  allowed: boolean
  reason?: string
  upgradeRequired?: PlanTier
} {
  const plan = getPlanById(context.subscription?.plan || "free")

  if (plan.limits.maxUsers === null) {
    return { allowed: true } // Unlimited users
  }

  if (context.usage.activeUsers >= plan.limits.maxUsers) {
    // Suggest next tier based on current plan
    let upgradeRequired: PlanTier = "team"
    if (plan.id === "free") upgradeRequired = "team"
    else if (plan.id === "team") upgradeRequired = "business"

    return {
      allowed: false,
      reason: `User limit reached (${plan.limits.maxUsers}). Upgrade to add more users.`,
      upgradeRequired,
    }
  }

  return { allowed: true }
}

/**
 * Check if organization can add a new manager
 */
export function canAddManager(context: FeatureGateContext): {
  allowed: boolean
  reason?: string
  upgradeRequired?: PlanTier
} {
  const plan = getPlanById(context.subscription?.plan || "free")

  if (plan.limits.maxManagers === null) {
    return { allowed: true } // Unlimited managers
  }

  if (context.usage.managers >= plan.limits.maxManagers) {
    return {
      allowed: false,
      reason: `Manager limit reached (${plan.limits.maxManagers}). Upgrade to Business for unlimited managers.`,
      upgradeRequired: "business",
    }
  }

  return { allowed: true }
}

/**
 * Check if user can perform an AI operation
 */
export function canUseAI(
  context: FeatureGateContext,
  operation: keyof typeof AI_OPERATION_COSTS
): {
  allowed: boolean
  reason?: string
  creditsNeeded?: number
  creditsAvailable?: number
  upgradeRequired?: PlanTier
} {
  const plan = getPlanById(context.subscription?.plan || "free")
  const operationCost = AI_OPERATION_COSTS[operation]

  // Check if plan includes unlimited AI
  if (plan.features.unlimitedAI) {
    return { allowed: true }
  }

  // Check AI credits
  const creditsRemaining = context.usage.aiCreditsTotal - context.usage.aiCreditsUsed

  if (creditsRemaining < operationCost) {
    return {
      allowed: false,
      reason: `Insufficient AI credits. Need ${operationCost}, have ${creditsRemaining}.`,
      creditsNeeded: operationCost,
      creditsAvailable: creditsRemaining,
      upgradeRequired: "business", // or suggest buying credit pack
    }
  }

  return { allowed: true }
}

/**
 * Check if organization can use a specific integration
 */
export function canUseIntegration(
  context: FeatureGateContext,
  integration: "slack" | "asana" | "googleCalendar" | "sso"
): {
  allowed: boolean
  reason?: string
  upgradeRequired?: PlanTier
} {
  const plan = getPlanById(context.subscription?.plan || "free")

  const integrationFeatureMap = {
    slack: "slackIntegration",
    asana: "asanaSync",
    googleCalendar: "googleCalendarSync",
    sso: "ssoAuth",
  } as const

  const featureKey = integrationFeatureMap[integration]
  const allowed = plan.features[featureKey]

  if (!allowed) {
    const featureName = integration === "slack" ? "Slack" :
                      integration === "asana" ? "Asana" :
                      integration === "googleCalendar" ? "Google Calendar" : "SSO"

    if (integration === "sso") {
      return {
        allowed: false,
        reason: `${featureName} integration requires Business plan`,
        upgradeRequired: "business" as PlanTier,
      }
    }

    return {
      allowed: false,
      reason: `${featureName} integration requires Team plan or higher`,
      upgradeRequired: "team" as PlanTier,
    }
  }

  return { allowed: true }
}

/**
 * Check if organization can customize branding
 */
export function canCustomizeBranding(context: FeatureGateContext): {
  allowed: boolean
  reason?: string
  upgradeRequired?: PlanTier
} {
  const plan = getPlanById(context.subscription?.plan || "free")

  if (!plan.features.customBranding) {
    return {
      allowed: false,
      reason: "Custom branding requires Business plan",
      upgradeRequired: "business",
    }
  }

  return { allowed: true }
}

/**
 * Check if organization can access API
 */
export function canAccessAPI(context: FeatureGateContext): {
  allowed: boolean
  reason?: string
  upgradeRequired?: PlanTier
} {
  const plan = getPlanById(context.subscription?.plan || "free")

  if (!plan.features.apiAccess) {
    return {
      allowed: false,
      reason: "API access requires Business plan",
      upgradeRequired: "business",
    }
  }

  return { allowed: true }
}

/**
 * Check if organization can access advanced analytics
 */
export function canAccessAdvancedAnalytics(context: FeatureGateContext): {
  allowed: boolean
  reason?: string
  upgradeRequired?: PlanTier
} {
  const plan = getPlanById(context.subscription?.plan || "free")

  if (!plan.features.advancedAnalytics) {
    return {
      allowed: false,
      reason: "Advanced analytics requires Team plan or higher",
      upgradeRequired: "team",
    }
  }

  return { allowed: true }
}

/**
 * Get usage percentage for display
 */
export function getUsagePercentage(used: number, limit: number | null): number {
  if (limit === null) return 0 // Unlimited
  return Math.min(Math.round((used / limit) * 100), 100)
}

/**
 * Check if usage is approaching limit (>80%)
 */
export function isApproachingLimit(used: number, limit: number | null): boolean {
  if (limit === null) return false
  return used / limit > 0.8
}

/**
 * Check if trial has expired
 */
export function isTrialExpired(subscription?: { plan: PlanTier; currentPeriodEnd?: string } | null, isInternal?: boolean): boolean {
  if (isInternal) return false
  if (!subscription || subscription.plan !== "free") return false
  if (!subscription.currentPeriodEnd) return false

  const expiryDate = new Date(subscription.currentPeriodEnd)
  return expiryDate < new Date()
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(subscription?: { plan: PlanTier; currentPeriodEnd?: string } | null): number {
  if (!subscription || subscription.plan !== "free" || !subscription.currentPeriodEnd) return 0

  const expiryDate = new Date(subscription.currentPeriodEnd)
  const today = new Date()
  const diffTime = expiryDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

/**
 * Build feature gate context from organization and subscription data
 */
export async function buildFeatureGateContext(
  organizationId: string,
  subscription?: { plan: PlanTier; status: string; currentPeriodEnd?: string | null } | null,
  stats?: {
    activeUsers?: number
    workspaces?: number
    managers?: number
    aiCreditsUsed?: number
    storageUsedGB?: number
  },
  isInternal?: boolean
): Promise<FeatureGateContext> {
  // Internal orgs get treated as business tier with active subscription
  const effectiveSubscription = isInternal
    ? { plan: "business" as PlanTier, status: "active", currentPeriodEnd: null }
    : subscription
  const plan = getPlanById(effectiveSubscription?.plan || "free")

  return {
    organizationId,
    subscription: effectiveSubscription,
    usage: {
      activeUsers: stats?.activeUsers || 0,
      workspaces: stats?.workspaces || 0,
      managers: stats?.managers || 0,
      aiCreditsUsed: stats?.aiCreditsUsed || 0,
      aiCreditsTotal: plan.limits.aiCreditsPerUser * (stats?.activeUsers || 1),
      storageUsedGB: stats?.storageUsedGB || 0,
    },
  }
}
