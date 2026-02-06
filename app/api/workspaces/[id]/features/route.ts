/**
 * Workspace Features API Routes
 *
 * GET /api/workspaces/[id]/features - Get workspace feature configuration
 * PATCH /api/workspaces/[id]/features - Update workspace features (admin only)
 *
 * Part of Workspace Feature Toggles System
 */

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { isAdmin } from "@/lib/auth/middleware"
import type { ApiResponse } from "@/lib/types"
import {
  getWorkspaceById,
  updateWorkspace,
  userHasWorkspaceAccess,
  type Workspace,
} from "@/lib/db/workspaces"
import {
  getWorkspaceFeatureConfig,
  validateFeatureToggles,
  clearWorkspaceFeaturesCache,
  type WorkspaceFeatureToggles,
  type WorkspaceFeatureConfig,
} from "@/lib/auth/workspace-features"
import { logger, logError } from "@/lib/logger"

interface FeatureConfigResponse {
  features: WorkspaceFeatureToggles
  config: WorkspaceFeatureConfig
}

/**
 * GET /api/workspaces/[id]/features
 *
 * Returns workspace feature configuration with enabled/disabled status
 */
export const GET = withAuth(async (
  request: NextRequest,
  auth,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context!.params

    // Get workspace
    const workspace = await getWorkspaceById(id)
    if (!workspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Verify user is in same organization
    if (workspace.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Check access
    const hasAccess = isAdmin(auth) || await userHasWorkspaceAccess(auth.user.id, id)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You don't have access to this workspace" },
        { status: 403 }
      )
    }

    // Get feature configuration
    const config = getWorkspaceFeatureConfig(auth.organization, workspace)

    // Extract just the enabled/disabled values for the features object
    const features: Partial<WorkspaceFeatureToggles> = {
      core: {},
      productivity: {},
      integrations: {},
      advanced: {},
      admin: {},
    }

    for (const [key, value] of Object.entries(config)) {
      const [category, name] = key.split(".")
      if (category && name && features[category as keyof WorkspaceFeatureToggles]) {
        (features[category as keyof WorkspaceFeatureToggles] as Record<string, boolean>)[name] = value.enabled
      }
    }

    const response: FeatureConfigResponse = {
      features: features as WorkspaceFeatureToggles,
      config,
    }

    logger.debug("Retrieved workspace features", { workspaceId: id, userId: auth.user.id })

    return NextResponse.json<ApiResponse<FeatureConfigResponse>>({
      success: true,
      data: response,
    })
  } catch (error) {
    logError(logger, "Get workspace features error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get workspace features" },
      { status: 500 }
    )
  }
})

/**
 * PATCH /api/workspaces/[id]/features
 *
 * Update workspace feature toggles (admin only)
 */
export const PATCH = withAuth(async (
  request: NextRequest,
  auth,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context!.params

    // Get workspace
    const workspace = await getWorkspaceById(id)
    if (!workspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Verify user is in same organization
    if (workspace.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Check admin access
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, id, "admin")
    const hasOrgAdmin = isAdmin(auth)

    if (!hasAccess && !hasOrgAdmin) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Admin access required to modify workspace features" },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const newFeatures = body.features as Partial<WorkspaceFeatureToggles>

    if (!newFeatures) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Features object required" },
        { status: 400 }
      )
    }

    // Validate feature changes
    const validation = validateFeatureToggles(auth.organization, workspace, newFeatures)

    if (!validation.valid) {
      return NextResponse.json<ApiResponse<{ errors: string[]; warnings: string[] }>>(
        {
          success: false,
          error: "Feature validation failed",
          data: {
            errors: validation.errors,
            warnings: validation.warnings,
          },
        },
        { status: 400 }
      )
    }

    // Merge with existing settings
    const currentSettings = workspace.settings || {}
    const updatedSettings = {
      ...currentSettings,
      features: newFeatures,
    }

    // Update workspace
    const updatedWorkspace = await updateWorkspace(id, {
      settings: updatedSettings,
    })

    if (!updatedWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to update workspace" },
        { status: 500 }
      )
    }

    // Clear cache
    clearWorkspaceFeaturesCache(id)

    // Get updated feature config
    const config = getWorkspaceFeatureConfig(auth.organization, updatedWorkspace)

    // Extract features object
    const features: Partial<WorkspaceFeatureToggles> = {
      core: {},
      productivity: {},
      integrations: {},
      advanced: {},
      admin: {},
    }

    for (const [key, value] of Object.entries(config)) {
      const [category, name] = key.split(".")
      if (category && name && features[category as keyof WorkspaceFeatureToggles]) {
        (features[category as keyof WorkspaceFeatureToggles] as Record<string, boolean>)[name] = value.enabled
      }
    }

    const response: FeatureConfigResponse = {
      features: features as WorkspaceFeatureToggles,
      config,
    }

    logger.info("Updated workspace features", {
      workspaceId: id,
      userId: auth.user.id,
      warnings: validation.warnings,
    })

    return NextResponse.json<ApiResponse<FeatureConfigResponse>>({
      success: true,
      data: response,
      meta: validation.warnings.length > 0 ? { warnings: validation.warnings } : undefined,
    })
  } catch (error) {
    logError(logger, "Update workspace features error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update workspace features" },
      { status: 500 }
    )
  }
})
