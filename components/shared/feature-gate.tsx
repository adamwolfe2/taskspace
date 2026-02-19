/**
 * Feature Gate Component
 *
 * Wrapper for pages that require a specific workspace feature.
 * Shows FeatureDisabled component if feature is not enabled.
 */

"use client"

import { useRequireFeature } from "@/lib/hooks/use-workspace-features"
import { FeatureDisabled } from "./feature-disabled"
import type { WorkspaceFeatureKey } from "@/lib/types/workspace-features"
import { WORKSPACE_FEATURE_METADATA } from "@/lib/types/workspace-features"
import { Loader2 } from "lucide-react"

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

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" role="status" aria-label="Loading" />
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
      />
    )
  }

  // Feature is enabled - render children
  return <>{children}</>
}
