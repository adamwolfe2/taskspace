import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { generateId, slugify } from "@/lib/auth/password"
import type { ApiResponse, UserOrganizationItem } from "@/lib/types"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { userCreateOrganizationSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"

/**
 * GET /api/user/organizations
 * Get all organizations the current user is a member of
 */
export const GET = withAuth(async (request, auth) => {
  try {
    // Get all organization memberships for this user
    const memberships = await db.members.findByUserId(auth.user.id)

    // Filter active memberships
    const activeMemberships = memberships.filter(m => m.status === "active")

    // Batch fetch all organizations at once (reduces N+1 queries)
    const organizationIds = activeMemberships.map(m => m.organizationId)
    const orgs = await db.organizations.findByIds(organizationIds)

    // Create a map for quick lookup
    const orgMap = new Map(orgs.map(o => [o.id, o]))

    // Build the organization list
    const organizations = activeMemberships
      .map(membership => {
        const org = orgMap.get(membership.organizationId)
        if (!org) return null

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logoUrl: org.logoUrl,
          primaryColor: org.primaryColor,
          role: membership.role,
          memberStatus: membership.status,
          joinedAt: membership.joinedAt,
          subscriptionTier: org.subscription?.plan || "free",
          isCurrent: org.id === auth.organization.id,
        } as UserOrganizationItem
      })
      .filter((org): org is UserOrganizationItem => org !== null)

    return NextResponse.json<ApiResponse<{ organizations: UserOrganizationItem[] }>>({
      success: true,
      data: { organizations },
    })
  } catch (error) {
    logError(logger, "Get user organizations error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch organizations" },
      { status: 500 }
    )
  }
})

/**
 * POST /api/user/organizations
 * Create a new organization for the current user
 */
export const POST = withAuth(async (request, auth) => {
  try {
    const { name } = await validateBody(request, userCreateOrganizationSchema)

    const now = new Date().toISOString()
    const orgId = generateId()
    let slug = slugify(name)

    // Ensure unique slug
    let existingOrg = await db.organizations.findBySlug(slug)
    let counter = 1
    while (existingOrg) {
      slug = `${slugify(name)}-${counter}`
      existingOrg = await db.organizations.findBySlug(slug)
      counter++
    }

    // Create organization
    const organization = {
      id: orgId,
      name: name.trim(),
      slug,
      createdAt: now,
      updatedAt: now,
      ownerId: auth.user.id,
      settings: {
        timezone: "America/New_York",
        weekStartDay: 1 as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        eodReminderTime: "17:00",
        enableEmailNotifications: true,
        enableSlackIntegration: false,
      },
      subscription: {
        plan: "free" as "free" | "starter" | "professional" | "enterprise",
        status: "active" as "active" | "trialing" | "past_due" | "canceled",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 5,
        features: ["basic_rocks", "basic_tasks", "eod_reports"],
      },
    }

    await db.organizations.create(organization)

    // Create default workspace
    const defaultWorkspaceId = generateId()
    const defaultWorkspace = {
      id: defaultWorkspaceId,
      organizationId: orgId,
      name: "Default",
      slug: "default",
      type: "team",
      description: "Default workspace for all organization members",
      isDefault: true,
      createdBy: auth.user.id,
      createdAt: now,
      updatedAt: now,
      settings: {},
    }

    await db.workspaces.create(defaultWorkspace)

    // Create member record
    const member = {
      id: generateId(),
      organizationId: orgId,
      userId: auth.user.id,
      email: auth.user.email,
      name: auth.user.name,
      role: "owner" as "owner" | "admin" | "member",
      department: "Leadership",
      joinedAt: now,
      status: "active" as "active" | "invited" | "inactive",
    }

    await db.members.create(member)

    // Add to default workspace
    const workspaceMember = {
      id: generateId(),
      workspaceId: defaultWorkspaceId,
      userId: auth.user.id,
      role: "admin" as "admin" | "member" | "owner",
      joinedAt: now,
    }

    await db.workspaceMembers.create(workspaceMember)

    return NextResponse.json<ApiResponse<{ organization: typeof organization }>>({
      success: true,
      data: { organization },
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
