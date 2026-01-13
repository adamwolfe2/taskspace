/**
 * Feature Gating System
 * Controls access to features based on subscription plan
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "./middleware"
import { PLAN_FEATURES, isPlanFeatureEnabled, getPlanSeatLimit } from "@/lib/integrations/stripe-config"
import type { ApiResponse, Organization } from "@/lib/types"

// Feature definitions with metadata
export const FEATURES = {
  // Basic features (free tier)
  basic_rocks: { name: "Rock Goals", tier: "free", description: "Create and track quarterly goals" },
  basic_tasks: { name: "Task Management", tier: "free", description: "Assign and track tasks" },
  eod_reports: { name: "EOD Reports", tier: "free", description: "Daily end-of-day reporting" },

  // Starter tier features
  email_notifications: { name: "Email Notifications", tier: "starter", description: "Automated email reminders" },
  basic_analytics: { name: "Basic Analytics", tier: "starter", description: "Team performance charts" },

  // Professional tier features
  advanced_analytics: { name: "Advanced Analytics", tier: "professional", description: "Deep dive analytics" },
  ai_insights: { name: "AI Insights", tier: "professional", description: "AI-powered team analysis" },
  custom_branding: { name: "Custom Branding", tier: "professional", description: "Logo and color customization" },
  api_access: { name: "API Access", tier: "professional", description: "Programmatic API access" },
  priority_support: { name: "Priority Support", tier: "professional", description: "Fast-track support" },

  // Enterprise tier features
  sso_saml: { name: "SSO/SAML", tier: "enterprise", description: "Single sign-on integration" },
  custom_integrations: { name: "Custom Integrations", tier: "enterprise", description: "Custom API integrations" },
  dedicated_support: { name: "Dedicated Support", tier: "enterprise", description: "Dedicated account manager" },
  sla_guarantee: { name: "SLA Guarantee", tier: "enterprise", description: "99.9% uptime SLA" },
} as const

export type FeatureKey = keyof typeof FEATURES

/**
 * Check if a feature is enabled for an organization
 */
export function isFeatureEnabled(organization: Organization, feature: FeatureKey): boolean {
  const plan = organization.subscription?.plan || "free"
  const features = organization.subscription?.features || PLAN_FEATURES.free.features

  // Check if feature is in the org's feature list
  if (features.includes(feature)) {
    return true
  }

  // Also check via plan configuration
  return isPlanFeatureEnabled(plan, feature)
}

/**
 * Check if organization has available seats
 */
export function hasAvailableSeats(organization: Organization, currentMemberCount: number): boolean {
  const plan = organization.subscription?.plan || "free"
  const maxSeats = organization.subscription?.maxUsers ?? getPlanSeatLimit(plan)

  // null means unlimited
  if (maxSeats === null) return true

  return currentMemberCount < maxSeats
}

/**
 * Get feature gate error response
 */
export function getFeatureGateError(feature: FeatureKey): NextResponse<ApiResponse<null>> {
  const featureInfo = FEATURES[feature]
  return NextResponse.json<ApiResponse<null>>(
    {
      success: false,
      error: `${featureInfo.name} requires a ${featureInfo.tier} plan or higher. Please upgrade to access this feature.`,
    },
    { status: 403 }
  )
}

/**
 * Get seat limit error response
 */
export function getSeatLimitError(maxSeats: number): NextResponse<ApiResponse<null>> {
  return NextResponse.json<ApiResponse<null>>(
    {
      success: false,
      error: `Your plan allows a maximum of ${maxSeats} team members. Please upgrade to add more members.`,
    },
    { status: 403 }
  )
}

/**
 * Middleware to check feature access
 * Use this in API routes that require specific features
 */
export async function requireFeature(
  request: NextRequest,
  feature: FeatureKey
): Promise<{ authorized: true; auth: NonNullable<Awaited<ReturnType<typeof getAuthContext>>> } | { authorized: false; response: NextResponse }> {
  const auth = await getAuthContext(request)

  if (!auth) {
    return {
      authorized: false,
      response: NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    }
  }

  if (!isFeatureEnabled(auth.organization, feature)) {
    return {
      authorized: false,
      response: getFeatureGateError(feature),
    }
  }

  return { authorized: true, auth }
}

/**
 * Higher-order function to wrap API handlers with feature gating
 */
export function withFeatureGate(feature: FeatureKey) {
  return function <T>(
    handler: (request: NextRequest, auth: NonNullable<Awaited<ReturnType<typeof getAuthContext>>>) => Promise<NextResponse<T>>
  ) {
    return async (request: NextRequest): Promise<NextResponse<T | ApiResponse<null>>> => {
      const result = await requireFeature(request, feature)

      if (!result.authorized) {
        return result.response
      }

      return handler(request, result.auth)
    }
  }
}

/**
 * Get all features available for a plan
 */
export function getPlanFeatures(plan: string): FeatureKey[] {
  const planConfig = PLAN_FEATURES[plan]
  if (!planConfig) return PLAN_FEATURES.free.features as unknown as FeatureKey[]
  return planConfig.features as unknown as FeatureKey[]
}

/**
 * Get features that would be gained by upgrading
 */
export function getUpgradeFeatures(currentPlan: string, targetPlan: string): FeatureKey[] {
  const currentFeatures = new Set(getPlanFeatures(currentPlan))
  const targetFeatures = getPlanFeatures(targetPlan)

  return targetFeatures.filter(f => !currentFeatures.has(f))
}

/**
 * Check subscription status
 */
export function isSubscriptionActive(organization: Organization): boolean {
  const status = organization.subscription?.status
  return status === "active" || status === "trialing"
}

/**
 * Check if subscription is past due (payment failed)
 */
export function isSubscriptionPastDue(organization: Organization): boolean {
  return organization.subscription?.status === "past_due"
}

/**
 * Check if subscription is canceled but still active
 */
export function isSubscriptionCanceling(organization: Organization): boolean {
  return organization.subscription?.cancelAtPeriodEnd === true
}
