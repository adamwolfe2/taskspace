import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * PUT /api/organizations/settings
 * Update organization settings (partial update)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || !session?.organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin permissions
    const member = await db.organizationMembers.findByUserAndOrganization(
      session.user.id,
      session.organization.id
    )
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()

    // Get current organization
    const org = await db.organizations.findById(session.organization.id)
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
    const updatedOrg = await db.organizations.update(session.organization.id, {
      settings: updatedSettings,
    })

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
    })
  } catch (error) {
    console.error("Update organization settings error:", error)
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
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user || !session?.organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const org = await db.organizations.findById(session.organization.id)
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    return NextResponse.json({
      settings: org.settings,
    })
  } catch (error) {
    console.error("Get organization settings error:", error)
    return NextResponse.json(
      { error: "Failed to get settings" },
      { status: 500 }
    )
  }
}
