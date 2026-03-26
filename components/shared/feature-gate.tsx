/**
 * Feature Gate Component
 *
 * Wrapper for pages that require a specific workspace feature.
 * Shows FeatureDisabled component if feature is not enabled.
 *
 * Automatically distinguishes between:
 *   - Admin-disabled features (toggle in workspace settings)
 *   - Plan-gated features (requires a higher billing plan)
 */

"use client"

import { useMemo } from "react"
import { useRequireFeature } from "@/lib/hooks/use-workspace-features"
import { useApp } from "@/lib/contexts/app-context"
import { FeatureDisabled } from "./feature-disabled"
import type { WorkspaceFeatureKey } from "@/lib/types/workspace-features"
import { WORKSPACE_FEATURE_METADATA } from "@/lib/types/workspace-features"
import { Skeleton } from "@/components/ui/skeleton"
import type { PlanTier } from "@/lib/billing/plans"

/**
 * Maps workspace feature keys to the minimum billing plan required.
 *
 * Built by checking each feature against plan definitions in PLANS.
 * A feature maps to "team" if Team includes it but Free does not,
 * to "business" if only Business includes it, or null if Free covers it.
 *
 * Only workspace feature keys that have a corresponding plan-level feature
 * are listed. Core features available on all plans (e.g. tasks, rocks, eodReports)
 * are intentionally omitted — they return null (no upgrade needed).
 */
const WORKSPACE_FEATURE_TO_PLAN: Partial<Record<WorkspaceFeatureKey, "team" | "business">> = {
  // Core features gated by plan
  "core.meetings": "team",          // l10Meetings
  "core.scorecard": "team",         // managerDashboard (team analytics)

  // Integrations
  "integrations.slack": "team",     // slackIntegration
  "integrations.asana": "team",     // asanaSync
  "integrations.googleCalendar": "team", // googleCalendarSync
  "integrations.webhooks": "business",   // apiAccess required

  // Advanced features — Team tier
  "advanced.analytics": "team",          // advancedAnalytics
  "advanced.managerDashboard": "team",   // managerDashboard
  "advanced.aiCommandCenter": "team",    // aiDailyDigest / aiBrainDump
  "advanced.companyDigest": "team",      // aiDailyDigest
  "advanced.eosHealthReport": "team",    // aiDailyDigest

  // Advanced features — Business tier
  "advanced.apiAccess": "business",      // apiAccess
  "admin.branding": "business",          // customBranding
  "admin.databaseManagement": "business", // apiAccess
}

/**
 * Given the org's current plan, determine if a workspace feature
 * requires an upgrade. Returns the target plan tier or undefined.
 */
function getRequiredPlan(
  feature: WorkspaceFeatureKey,
  currentPlan: PlanTier
): "team" | "business" | undefined {
  const minimumPlan = WORKSPACE_FEATURE_TO_PLAN[feature]
  if (!minimumPlan) return undefined

  const tierRank: Record<PlanTier, number> = { free: 0, team: 1, business: 2 }
  const currentRank = tierRank[currentPlan]
  const requiredRank = tierRank[minimumPlan]

  if (currentRank >= requiredRank) return undefined
  return minimumPlan
}

interface FeatureGateProps {
  feature: WorkspaceFeatureKey
  children: React.ReactNode
  redirectTo?: string
  // Override default feature name and description
  featureName?: string
  description?: string
  icon?: React.ReactNode
}

export function FeatureGate({
  feature,
  children,
  redirectTo,
  featureName,
  description,
  icon,
}: FeatureGateProps) {
  const { isEnabled, isLoading } = useRequireFeature(feature, redirectTo)
  const { currentOrganization } = useApp()

  const currentPlan: PlanTier = currentOrganization?.subscription?.plan ?? "free"

  const requiredPlan = useMemo(
    () => getRequiredPlan(feature, currentPlan),
    [feature, currentPlan]
  )

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-[400px] p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  // Show disabled state
  if (!isEnabled) {
    const metadata = WORKSPACE_FEATURE_METADATA[feature]
    return (
      <FeatureDisabled
        featureName={featureName || metadata.name}
        description={description || metadata.description}
        icon={icon}
        requiredPlan={requiredPlan}
      />
    )
  }

  // Feature is enabled - render children
  return <>{children}</>
}
