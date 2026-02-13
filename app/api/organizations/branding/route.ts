import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth, withAdmin } from "@/lib/api/middleware"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateBrandingSchema } from "@/lib/validation/schemas"
import type { ApiResponse, Organization } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// GET /api/organizations/branding - Get organization branding settings
export const GET = withAuth(async (request, auth) => {
  try {
    const org = auth.organization

    return NextResponse.json<ApiResponse<{
      logoUrl: string | null
      primaryColor: string | null
      secondaryColor: string | null
      accentColor: string | null
      faviconUrl: string | null
      customDomain: string | null
    }>>({
      success: true,
      data: {
        logoUrl: org.logoUrl || null,
        primaryColor: org.primaryColor || null,
        secondaryColor: org.secondaryColor || null,
        accentColor: org.accentColor || null,
        faviconUrl: org.faviconUrl || null,
        customDomain: org.customDomain || null,
      },
    })
  } catch (error) {
    logError(logger, "Get branding error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get branding settings" },
      { status: 500 }
    )
  }
})

// PATCH /api/organizations/branding - Update organization branding (admin only)
export const PATCH = withAdmin(async (request, auth) => {
  try {
    // Validate request body using Zod schema
    const {
      logoUrl,
      primaryColor,
      secondaryColor,
      accentColor,
      faviconUrl,
      customDomain,
    } = await validateBody(request, updateBrandingSchema)

    // Build updates object
    const updates: Partial<Organization> = {}

    if (logoUrl !== undefined) updates.logoUrl = logoUrl || undefined
    if (primaryColor !== undefined) updates.primaryColor = primaryColor || undefined
    if (secondaryColor !== undefined) updates.secondaryColor = secondaryColor || undefined
    if (accentColor !== undefined) updates.accentColor = accentColor || undefined
    if (faviconUrl !== undefined) updates.faviconUrl = faviconUrl || undefined
    if (customDomain !== undefined) updates.customDomain = customDomain || undefined

    // Also update the settings.customBranding object
    const currentSettings = auth.organization.settings || {}
    updates.settings = {
      ...currentSettings,
      customBranding: {
        ...currentSettings.customBranding,
        logo: logoUrl ?? currentSettings.customBranding?.logo,
        primaryColor: primaryColor ?? currentSettings.customBranding?.primaryColor,
        secondaryColor: secondaryColor ?? currentSettings.customBranding?.secondaryColor,
        accentColor: accentColor ?? currentSettings.customBranding?.accentColor,
      },
    }

    // Update organization
    await db.organizations.update(auth.organization.id, updates)

    // Fetch updated organization
    const updatedOrg = await db.organizations.findById(auth.organization.id)

    return NextResponse.json<ApiResponse<{
      logoUrl: string | null
      primaryColor: string | null
      secondaryColor: string | null
      accentColor: string | null
      faviconUrl: string | null
      customDomain: string | null
    }>>({
      success: true,
      data: {
        logoUrl: updatedOrg?.logoUrl || null,
        primaryColor: updatedOrg?.primaryColor || null,
        secondaryColor: updatedOrg?.secondaryColor || null,
        accentColor: updatedOrg?.accentColor || null,
        faviconUrl: updatedOrg?.faviconUrl || null,
        customDomain: updatedOrg?.customDomain || null,
      },
      message: "Branding settings updated successfully",
    })
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    logError(logger, "Update branding error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update branding settings" },
      { status: 500 }
    )
  }
})
