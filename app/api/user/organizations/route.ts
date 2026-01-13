import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import type { UserOrganizationItem } from "@/lib/types"

// GET /api/user/organizations - List all organizations the user is a member of
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get all organizations the user is a member of
    const organizations = await db.userOrganizations.findByUserId(auth.user.id)

    // Mark the current organization
    const orgList: UserOrganizationItem[] = organizations.map((org) => ({
      ...org,
      isCurrent: org.id === auth.organization.id,
    }))

    // Sort to put current org first, then by join date
    orgList.sort((a, b) => {
      if (a.isCurrent) return -1
      if (b.isCurrent) return 1
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
    })

    return NextResponse.json({
      success: true,
      data: {
        organizations: orgList,
        currentOrganizationId: auth.organization.id,
        totalCount: orgList.length,
      },
    })
  } catch (error) {
    console.error("Error fetching user organizations:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch organizations" },
      { status: 500 }
    )
  }
}

// POST /api/user/organizations - Create a new organization
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, slug, logoUrl, primaryColor, billingEmail } = body

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Organization name is required (min 2 characters)" },
        { status: 400 }
      )
    }

    // Generate slug from name if not provided
    const orgSlug = slug || name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 50)

    // Check if slug is already taken
    const existingOrg = await db.organizations.findBySlug(orgSlug)
    if (existingOrg) {
      return NextResponse.json(
        { success: false, error: "Organization slug is already taken" },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    const orgId = `org_${crypto.randomUUID()}`
    const memberId = `mem_${crypto.randomUUID()}`

    // Create the organization
    const newOrg = await db.organizations.create({
      id: orgId,
      name: name.trim(),
      slug: orgSlug,
      ownerId: auth.user.id,
      settings: {
        timezone: "America/New_York",
        weekStartDay: 1,
        eodReminderTime: "17:00",
        enableEmailNotifications: true,
        enableSlackIntegration: false,
        customBranding: {
          logo: logoUrl || undefined,
          primaryColor: primaryColor || "#dc2626",
        },
      },
      subscription: {
        plan: "free",
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 5,
        features: ["Basic task management", "EOD reports", "1 rock per user"],
      },
      createdAt: now,
      updatedAt: now,
    })

    // Create the owner member record
    await db.members.create({
      id: memberId,
      organizationId: orgId,
      userId: auth.user.id,
      email: auth.user.email,
      name: auth.user.name,
      role: "owner",
      department: "Leadership",
      joinedAt: now,
      status: "active",
    })

    // Create a free subscription for the new org
    try {
      await db.orgSubscriptions.create({
        organizationId: orgId,
        tierId: "tier_free",
        seatsPurchased: 5,
      })
    } catch {
      // Subscription table might not exist yet, that's ok
    }

    // Log the action
    try {
      await db.auditLogs.create({
        organizationId: orgId,
        userId: auth.user.id,
        action: "organization_created",
        resourceType: "organization",
        resourceId: orgId,
        newValues: { name: newOrg.name, slug: newOrg.slug },
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      })
    } catch {
      // Audit log table might not exist yet, that's ok
    }

    return NextResponse.json({
      success: true,
      data: {
        organization: newOrg,
        memberId,
      },
      message: "Organization created successfully",
    })
  } catch (error) {
    console.error("Error creating organization:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create organization" },
      { status: 500 }
    )
  }
}
