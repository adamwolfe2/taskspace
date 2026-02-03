import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/api/middleware"
import { isOwner } from "@/lib/auth/middleware"
import { generateId, slugify } from "@/lib/auth/password"
import type { Organization, ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// GET /api/organizations - Get current user's organizations
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    // Get all organizations the user is a member of
    const memberships = await db.members.findByUserId(auth.user.id)
    const organizations: Organization[] = []

    for (const membership of memberships) {
      const org = await db.organizations.findById(membership.organizationId)
      if (org) {
        organizations.push(org)
      }
    }

    return NextResponse.json<ApiResponse<Organization[]>>({
      success: true,
      data: organizations,
    })
  } catch (error) {
    logError(logger, "Get organizations error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get organizations" },
      { status: 500 }
    )
  }
})

// POST /api/organizations - Create a new organization
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const { name, timezone = "America/New_York" } = body

    if (!name || name.trim().length < 2) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization name must be at least 2 characters" },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const orgId = generateId()

    // Generate unique slug
    let slug = slugify(name)
    let existingOrg = await db.organizations.findBySlug(slug)
    let counter = 1
    while (existingOrg) {
      slug = `${slugify(name)}-${counter}`
      existingOrg = await db.organizations.findBySlug(slug)
      counter++
    }

    const organization: Organization = {
      id: orgId,
      name: name.trim(),
      slug,
      createdAt: now,
      updatedAt: now,
      ownerId: auth.user.id,
      settings: {
        timezone,
        weekStartDay: 1,
        eodReminderTime: "17:00",
        enableEmailNotifications: true,
        enableSlackIntegration: false,
      },
      subscription: {
        plan: "free",
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 100, // Internal tool - generous limit
        features: ["basic_rocks", "basic_tasks", "eod_reports"],
      },
    }

    await db.organizations.create(organization)

    // Create owner membership
    await db.members.create({
      id: generateId(),
      organizationId: orgId,
      userId: auth.user.id,
      email: auth.user.email,
      name: auth.user.name,
      role: "owner",
      department: "Leadership",
      joinedAt: now,
      status: "active",
    })

    return NextResponse.json<ApiResponse<Organization>>({
      success: true,
      data: organization,
      message: "Organization created successfully",
    })
  } catch (error) {
    logError(logger, "Create organization error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create organization" },
      { status: 500 }
    )
  }
})

// PATCH /api/organizations - Update current organization
export const PATCH = withAuth(async (request: NextRequest, auth) => {
  try {
    if (!isOwner(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only organization owners can update settings" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, settings, subscription } = body

    const updates: Partial<Organization> = {}

    if (name) {
      updates.name = name.trim()
    }

    if (settings) {
      updates.settings = {
        ...auth.organization.settings,
        ...settings,
      }
    }

    // Allow owner to update subscription (e.g., maxUsers for internal tools)
    if (subscription) {
      updates.subscription = {
        ...auth.organization.subscription,
        ...subscription,
      }
    }

    const updated = await db.organizations.update(auth.organization.id, updates)

    return NextResponse.json<ApiResponse<Organization | null>>({
      success: true,
      data: updated,
      message: "Organization updated successfully",
    })
  } catch (error) {
    logError(logger, "Update organization error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update organization" },
      { status: 500 }
    )
  }
})
