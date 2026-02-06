/**
 * Workspace Feature Checking Utilities
 *
 * Provides feature gating at the workspace level with caching and middleware support.
 * Respects both org-level subscription features and workspace-level toggles.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "./middleware"
import { isFeatureEnabled as isOrgFeatureEnabled } from "./feature-gate"
import type { Organization, ApiResponse } from "@/lib/types"
import type { Workspace } from "@/lib/db/workspaces"
import type {
  WorkspaceFeatureToggles,
  WorkspaceFeatureKey,
  WorkspaceFeatureMetadata,
  FeatureValidationResult,
  FeatureToggleConfig,
  WorkspaceFeatureConfig,
} from "@/lib/types/workspace-features"
import {
  DEFAULT_WORKSPACE_FEATURES,
  WORKSPACE_FEATURE_METADATA,
} from "@/lib/types/workspace-features"

// Re-export types for convenience
export type {
  WorkspaceFeatureToggles,
  WorkspaceFeatureKey,
  WorkspaceFeatureMetadata,
  FeatureValidationResult,
  FeatureToggleConfig,
  WorkspaceFeatureConfig,
}

export { DEFAULT_WORKSPACE_FEATURES, WORKSPACE_FEATURE_METADATA }

// ============================================
// IN-MEMORY CACHE
// ============================================

interface CacheEntry {
  features: WorkspaceFeatureToggles
  timestamp: number
}

const featureCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Clear cache for a specific workspace
 */
export function clearWorkspaceFeaturesCache(workspaceId: string): void {
  featureCache.delete(workspaceId)
}

/**
 * Clear entire feature cache
 */
export function clearAllFeaturesCache(): void {
  featureCache.clear()
}

// ============================================
// CORE FEATURE UTILITIES
// ============================================

/**
 * Get workspace features from settings or return defaults
 */
export function getWorkspaceFeatures(workspace: Workspace): WorkspaceFeatureToggles {
  // Check cache first
  const cached = featureCache.get(workspace.id)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.features
  }

  // Extract features from workspace.settings.features
  const settings = workspace.settings || {}
  const featuresFromSettings = (settings as Record<string, unknown>).features as WorkspaceFeatureToggles | undefined

  // If no features set, use defaults (all enabled)
  const features = featuresFromSettings || DEFAULT_WORKSPACE_FEATURES

  // Ensure all feature keys exist (for backward compatibility)
  const completeFeatures: WorkspaceFeatureToggles = {
    core: { ...DEFAULT_WORKSPACE_FEATURES.core, ...features.core },
    productivity: { ...DEFAULT_WORKSPACE_FEATURES.productivity, ...features.productivity },
    integrations: { ...DEFAULT_WORKSPACE_FEATURES.integrations, ...features.integrations },
    advanced: { ...DEFAULT_WORKSPACE_FEATURES.advanced, ...features.advanced },
    admin: { ...DEFAULT_WORKSPACE_FEATURES.admin, ...features.admin },
  }

  // Cache the result
  featureCache.set(workspace.id, {
    features: completeFeatures,
    timestamp: Date.now(),
  })

  return completeFeatures
}

/**
 * Parse feature key into category and feature name
 */
function parseFeatureKey(feature: WorkspaceFeatureKey): { category: string; name: string } {
  const [category, name] = feature.split(".")
  return { category, name }
}

/**
 * Check if a specific workspace feature is enabled
 * This checks three layers:
 * 1. Organization subscription (org-level feature gates)
 * 2. Workspace settings (workspace-level toggles)
 * 3. Feature dependencies
 */
export function isWorkspaceFeatureEnabled(
  org: Organization,
  workspace: Workspace,
  feature: WorkspaceFeatureKey
): boolean {
  const metadata = WORKSPACE_FEATURE_METADATA[feature]
  if (!metadata) return false

  // Layer 1: Check org-level feature requirements
  if (metadata.requiredOrgFeature) {
    if (!isOrgFeatureEnabled(org, metadata.requiredOrgFeature as any)) {
      return false
    }
  }

  // Layer 2: Check workspace-level toggle
  const workspaceFeatures = getWorkspaceFeatures(workspace)
  const { category, name } = parseFeatureKey(feature)
  const categoryFeatures = workspaceFeatures[category as keyof WorkspaceFeatureToggles] as Record<string, boolean>

  if (!categoryFeatures || categoryFeatures[name] !== true) {
    return false
  }

  // Layer 3: Check dependencies (recursive)
  if (metadata.dependencies && metadata.dependencies.length > 0) {
    for (const dep of metadata.dependencies) {
      if (!isWorkspaceFeatureEnabled(org, workspace, dep)) {
        return false
      }
    }
  }

  return true
}

/**
 * Get all enabled workspace features
 */
export function getEnabledWorkspaceFeatures(org: Organization, workspace: Workspace): WorkspaceFeatureKey[] {
  const enabledFeatures: WorkspaceFeatureKey[] = []

  for (const key of Object.keys(WORKSPACE_FEATURE_METADATA) as WorkspaceFeatureKey[]) {
    if (isWorkspaceFeatureEnabled(org, workspace, key)) {
      enabledFeatures.push(key)
    }
  }

  return enabledFeatures
}

/**
 * Get workspace feature configuration with reasons for disabled features
 */
export function getWorkspaceFeatureConfig(org: Organization, workspace: Workspace): WorkspaceFeatureConfig {
  const config: Partial<WorkspaceFeatureConfig> = {}

  for (const [key, metadata] of Object.entries(WORKSPACE_FEATURE_METADATA) as Array<
    [WorkspaceFeatureKey, WorkspaceFeatureMetadata]
  >) {
    const enabled = isWorkspaceFeatureEnabled(org, workspace, key)
    const reason = enabled ? undefined : getDisabledReason(org, workspace, key, metadata)

    config[key] = { enabled, reason }
  }

  return config as WorkspaceFeatureConfig
}

/**
 * Get reason why a feature is disabled
 */
function getDisabledReason(
  org: Organization,
  workspace: Workspace,
  feature: WorkspaceFeatureKey,
  metadata: WorkspaceFeatureMetadata
): string | undefined {
  // Check org-level requirement
  if (metadata.requiredOrgFeature && !isOrgFeatureEnabled(org, metadata.requiredOrgFeature as any)) {
    const plan = org.subscription?.plan || "free"
    return `Requires ${metadata.requiredOrgFeature} (available in ${plan} plan or higher)`
  }

  // Check workspace toggle
  const workspaceFeatures = getWorkspaceFeatures(workspace)
  const { category, name } = parseFeatureKey(feature)
  const categoryFeatures = workspaceFeatures[category as keyof WorkspaceFeatureToggles] as Record<string, boolean>

  if (!categoryFeatures || categoryFeatures[name] !== true) {
    return "Disabled by workspace admin"
  }

  // Check dependencies
  if (metadata.dependencies && metadata.dependencies.length > 0) {
    for (const dep of metadata.dependencies) {
      if (!isWorkspaceFeatureEnabled(org, workspace, dep)) {
        const depMetadata = WORKSPACE_FEATURE_METADATA[dep]
        return `Requires ${depMetadata.name} to be enabled`
      }
    }
  }

  return undefined
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate feature toggle changes before applying
 */
export function validateFeatureToggles(
  org: Organization,
  workspace: Workspace,
  newFeatures: Partial<WorkspaceFeatureToggles>
): FeatureValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Merge with existing features
  const currentFeatures = getWorkspaceFeatures(workspace)
  const mergedFeatures: WorkspaceFeatureToggles = {
    core: { ...currentFeatures.core, ...newFeatures.core },
    productivity: { ...currentFeatures.productivity, ...newFeatures.productivity },
    integrations: { ...currentFeatures.integrations, ...newFeatures.integrations },
    advanced: { ...currentFeatures.advanced, ...newFeatures.advanced },
    admin: { ...currentFeatures.admin, ...newFeatures.admin },
  }

  // Rule 1: At least one admin feature must remain enabled
  const adminFeatures = Object.values(mergedFeatures.admin)
  if (!adminFeatures.some((enabled) => enabled === true)) {
    errors.push("At least one admin feature must remain enabled")
  }

  // Rule 2: Check org-level feature requirements
  for (const [key, metadata] of Object.entries(WORKSPACE_FEATURE_METADATA) as Array<
    [WorkspaceFeatureKey, WorkspaceFeatureMetadata]
  >) {
    const { category, name } = parseFeatureKey(key)
    const categoryFeatures = mergedFeatures[category as keyof WorkspaceFeatureToggles] as Record<string, boolean>
    const willBeEnabled = categoryFeatures[name] === true

    if (willBeEnabled && metadata.requiredOrgFeature) {
      if (!isOrgFeatureEnabled(org, metadata.requiredOrgFeature as any)) {
        errors.push(`Cannot enable ${metadata.name}: requires ${metadata.requiredOrgFeature} in organization plan`)
      }
    }
  }

  // Rule 3: Check dependencies - can't disable if other features depend on it
  for (const [key, metadata] of Object.entries(WORKSPACE_FEATURE_METADATA) as Array<
    [WorkspaceFeatureKey, WorkspaceFeatureMetadata]
  >) {
    const { category, name } = parseFeatureKey(key)
    const categoryFeatures = mergedFeatures[category as keyof WorkspaceFeatureToggles] as Record<string, boolean>
    const willBeEnabled = categoryFeatures[name] === true

    if (!willBeEnabled && metadata.dependencies) {
      // Check if any other enabled feature depends on this one
      for (const [otherKey, otherMetadata] of Object.entries(WORKSPACE_FEATURE_METADATA) as Array<
        [WorkspaceFeatureKey, WorkspaceFeatureMetadata]
      >) {
        const { category: otherCategory, name: otherName } = parseFeatureKey(otherKey)
        const otherCategoryFeatures = mergedFeatures[otherCategory as keyof WorkspaceFeatureToggles] as Record<
          string,
          boolean
        >
        const otherWillBeEnabled = otherCategoryFeatures[otherName] === true

        if (
          otherWillBeEnabled &&
          otherMetadata.dependencies &&
          otherMetadata.dependencies.includes(key as WorkspaceFeatureKey)
        ) {
          errors.push(`Cannot disable ${metadata.name}: ${otherMetadata.name} depends on it`)
        }
      }
    }
  }

  // Warnings: Features that will affect navigation
  const disabledNavigationFeatures: string[] = []
  for (const [key, metadata] of Object.entries(WORKSPACE_FEATURE_METADATA) as Array<
    [WorkspaceFeatureKey, WorkspaceFeatureMetadata]
  >) {
    const { category, name } = parseFeatureKey(key)
    const categoryFeatures = mergedFeatures[category as keyof WorkspaceFeatureToggles] as Record<string, boolean>
    const willBeEnabled = categoryFeatures[name] === true

    if (!willBeEnabled && metadata.impact.navigation) {
      disabledNavigationFeatures.push(metadata.name)
    }
  }

  if (disabledNavigationFeatures.length > 0) {
    warnings.push(`These features will be hidden from navigation: ${disabledNavigationFeatures.join(", ")}`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Middleware to require a workspace feature
 */
export function withWorkspaceFeature(feature: WorkspaceFeatureKey) {
  return function <T>(
    handler: (
      request: NextRequest,
      auth: NonNullable<Awaited<ReturnType<typeof getAuthContext>>>,
      workspace: Workspace
    ) => Promise<NextResponse<T>>
  ) {
    return async (request: NextRequest, context?: { params: { id: string } }): Promise<NextResponse<T | ApiResponse<null>>> => {
      const auth = await getAuthContext(request)

      if (!auth) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        )
      }

      // Get workspace ID from context params
      const workspaceId = context?.params?.id
      if (!workspaceId) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Workspace ID required" },
          { status: 400 }
        )
      }

      // Fetch workspace (you'll need to import this)
      // For now, we'll assume the workspace is passed in or fetched
      // TODO: Import and use getWorkspaceById from @/lib/db/workspaces
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Not implemented yet" },
        { status: 501 }
      )
    }
  }
}

/**
 * Get feature gate error response
 */
export function getWorkspaceFeatureGateError(feature: WorkspaceFeatureKey): NextResponse<ApiResponse<null>> {
  const metadata = WORKSPACE_FEATURE_METADATA[feature]
  return NextResponse.json<ApiResponse<null>>(
    {
      success: false,
      error: `${metadata.name} is not enabled for this workspace. Please contact your workspace admin to enable it.`,
    },
    { status: 403 }
  )
}
