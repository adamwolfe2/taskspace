/**
 * Workspace Features Hook
 *
 * Provides feature checking for UI components with automatic redirection
 * when accessing disabled features.
 */

"use client"

import { useEffect, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useWorkspaces } from "./use-workspace"
import type { WorkspaceFeatureKey } from "@/lib/types/workspace-features"
import { getWorkspaceFeatures } from "@/lib/auth/workspace-features"

/**
 * Hook to check workspace features in client components
 */
export function useWorkspaceFeatures() {
  const { currentWorkspace, isLoading } = useWorkspaces()
  const router = useRouter()
  const pathname = usePathname()

  // Get features for current workspace
  const features = useMemo(() => {
    if (!currentWorkspace) return null
    return getWorkspaceFeatures(currentWorkspace)
  }, [currentWorkspace])

  // Check if a specific feature is enabled
  const isFeatureEnabled = useMemo(() => {
    return (feature: WorkspaceFeatureKey): boolean => {
      if (!features) return false

      const [category, name] = feature.split(".") as [
        keyof typeof features,
        string
      ]

      const categoryFeatures = features[category] as Record<string, boolean>
      return categoryFeatures?.[name] ?? true // Default to enabled
    }
  }, [features])

  // Get all enabled features
  const enabledFeatures = useMemo(() => {
    if (!features) return []

    const enabled: WorkspaceFeatureKey[] = []

    for (const [category, categoryFeatures] of Object.entries(features)) {
      for (const [name, value] of Object.entries(categoryFeatures as Record<string, boolean>)) {
        if (value === true) {
          enabled.push(`${category}.${name}` as WorkspaceFeatureKey)
        }
      }
    }

    return enabled
  }, [features])

  return {
    features,
    isFeatureEnabled,
    enabledFeatures,
    isLoading,
    hasWorkspace: !!currentWorkspace,
  }
}

/**
 * Hook with automatic redirect for feature-gated pages
 *
 * Usage:
 * ```tsx
 * const { isEnabled, isLoading } = useRequireFeature("core.tasks")
 * if (isLoading) return <Loading />
 * if (!isEnabled) return null // Will auto-redirect
 * ```
 */
export function useRequireFeature(
  feature: WorkspaceFeatureKey,
  redirectTo: string = "/dashboard"
) {
  const { isFeatureEnabled, isLoading, hasWorkspace } = useWorkspaceFeatures()
  const router = useRouter()
  const pathname = usePathname()

  const isEnabled = isFeatureEnabled(feature)

  useEffect(() => {
    // Don't redirect while loading or if no workspace
    if (isLoading || !hasWorkspace) return

    // Don't redirect if already on the redirect target
    if (pathname === redirectTo) return

    // Redirect if feature is disabled
    if (!isEnabled) {
      router.push(redirectTo)
    }
  }, [isEnabled, isLoading, hasWorkspace, pathname, redirectTo, router])

  return {
    isEnabled,
    isLoading,
  }
}
