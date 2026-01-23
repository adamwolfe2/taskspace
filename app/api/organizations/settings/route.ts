import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { logger, logError } from "@/lib/logger"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateOrganizationSettingsSchema } from "@/lib/validation/schemas"

/**
 * PUT /api/organizations/settings
 * Update organization settings (partial update)
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin permissions
    if (!isAdmin(auth)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Validate request body using Zod schema
    const body = await validateBody(request, updateOrganizationSettingsSchema, {
      errorPrefix: "Invalid settings",
    })

    // Get current organization
    const org = await db.organizations.findById(auth.organization.id)
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
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

    // Update organization settings
    const updatedOrg = await db.organizations.update(auth.organization.id, {
      settings: updatedSettings,
    })

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Update organization settings error", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/organizations/settings
 * Get organization settings
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const org = await db.organizations.findById(auth.organization.id)
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    return NextResponse.json({
      settings: org.settings,
    })
  } catch (error) {
    logError(logger, "Get organization settings error", error)
    return NextResponse.json(
      { error: "Failed to get settings" },
      { status: 500 }
    )
  }
}
