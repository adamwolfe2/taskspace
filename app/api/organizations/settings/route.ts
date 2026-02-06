import { NextRequest, NextResponse } from "next/server"
import { withAuth, withAdmin } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { logger, logError } from "@/lib/logger"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateOrganizationSettingsSchema } from "@/lib/validation/schemas"
import type { Organization, OrganizationSettings, ApiResponse } from "@/lib/types"

/**
 * PUT /api/organizations/settings
 * Update organization settings (partial update)
 */
export const PUT = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Validate request body using Zod schema
    const body = await validateBody(request, updateOrganizationSettingsSchema, {
      errorPrefix: "Invalid settings",
    })

    // Get current organization
    const org = await db.organizations.findById(auth.organization.id)
    if (!org) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
    }

    // Merge new settings with existing settings
    const updatedSettings = {
      ...org.settings,
      ...body,
    }

    // If asanaIntegration is being updated, merge it properly
    if (body.asanaIntegration) {
      updatedSettings.asanaIntegration = {
        ...org.settings?.asanaIntegration,
        ...body.asanaIntegration,
      }
    }

    // Validate weekStartDay if provided
    if (body.weekStartDay !== undefined) {
      const validDays = [0, 1, 2, 3, 4, 5, 6] as const
      if (!validDays.includes(body.weekStartDay as typeof validDays[number])) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Invalid weekStartDay value" },
          { status: 400 }
        )
      }
    }

    // Update organization settings
    const updatedOrg = await db.organizations.update(auth.organization.id, {
      settings: updatedSettings as OrganizationSettings,
    })

    return NextResponse.json<ApiResponse<Organization | null>>({
      success: true,
      data: updatedOrg,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Update organization settings error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    )
  }
})

/**
 * GET /api/organizations/settings
 * Get organization settings
 */
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const org = await db.organizations.findById(auth.organization.id)
    if (!org) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<OrganizationSettings>>({
      success: true,
      data: org.settings,
    })
  } catch (error) {
    logError(logger, "Get organization settings error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get settings" },
      { status: 500 }
    )
  }
})
