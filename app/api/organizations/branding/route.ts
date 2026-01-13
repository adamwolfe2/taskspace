import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import type { ApiResponse, Organization } from "@/lib/types"

// GET /api/organizations/branding - Get organization branding settings
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const org = auth.organization

    return NextResponse.json<ApiResponse<{
      logoUrl: string | null
      primaryColor: string | null
      secondaryColor: string | null
      faviconUrl: string | null
      customDomain: string | null
    }>>({
      success: true,
      data: {
        logoUrl: org.logoUrl || null,
        primaryColor: org.primaryColor || null,
        secondaryColor: org.secondaryColor || null,
        faviconUrl: org.faviconUrl || null,
        customDomain: org.customDomain || null,
      },
    })
  } catch (error) {
    console.error("Get branding error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get branding settings" },
      { status: 500 }
    )
  }
}

// PATCH /api/organizations/branding - Update organization branding
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only admins can update branding
    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can update branding settings" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      logoUrl,
      primaryColor,
      secondaryColor,
      accentColor,
      faviconUrl,
      customDomain,
    } = body

    // Validate color format if provided
    const colorRegex = /^#[0-9A-Fa-f]{6}$/
    if (primaryColor && !colorRegex.test(primaryColor)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid primary color format. Use hex format (e.g., #3b82f6)" },
        { status: 400 }
      )
    }
    if (secondaryColor && !colorRegex.test(secondaryColor)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid secondary color format. Use hex format (e.g., #60a5fa)" },
        { status: 400 }
      )
    }

    // Build updates object
    const updates: Partial<Organization> = {}

    if (logoUrl !== undefined) updates.logoUrl = logoUrl
    if (primaryColor !== undefined) updates.primaryColor = primaryColor
    if (secondaryColor !== undefined) updates.secondaryColor = secondaryColor
    if (faviconUrl !== undefined) updates.faviconUrl = faviconUrl
    if (customDomain !== undefined) updates.customDomain = customDomain

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
      faviconUrl: string | null
      customDomain: string | null
    }>>({
      success: true,
      data: {
        logoUrl: updatedOrg?.logoUrl || null,
        primaryColor: updatedOrg?.primaryColor || null,
        secondaryColor: updatedOrg?.secondaryColor || null,
        faviconUrl: updatedOrg?.faviconUrl || null,
        customDomain: updatedOrg?.customDomain || null,
      },
      message: "Branding settings updated successfully",
    })
  } catch (error) {
    console.error("Update branding error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update branding settings" },
      { status: 500 }
    )
  }
}
