import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { withTransaction } from "@/lib/db/transactions"
import { generateId, slugify } from "@/lib/auth/password"
import type { ApiResponse, UserOrganizationItem } from "@/lib/types"
import { validateBody } from "@/lib/validation/middleware"
import { userCreateOrganizationSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"
import { CONFIG } from "@/lib/config"

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
          logoUrl: org.logoUrl || (org.settings as { customBranding?: { logo?: string } })?.customBranding?.logo || undefined,
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

    // Build organization data
    const settingsJson = JSON.stringify({
      timezone: CONFIG.organization.defaultTimezone,
      weekStartDay: 1,
      eodReminderTime: "17:00",
      enableEmailNotifications: true,
      enableSlackIntegration: false,
    })
    const subscriptionJson = JSON.stringify({
      plan: "free",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      maxUsers: 3,
      features: ["basic_rocks", "basic_tasks", "eod_reports"],
    })

    const defaultWorkspaceId = generateId()
    const memberId = generateId()
    const workspaceMemberId = generateId()

    // Wrap all 4 inserts in a transaction for atomicity
    await withTransaction(async (client) => {
      // 1. Create organization
      await client.sql`
        INSERT INTO organizations (id, name, slug, owner_id, settings, subscription, created_at, updated_at)
        VALUES (${orgId}, ${name.trim()}, ${slug}, ${auth.user.id},
                ${settingsJson}::jsonb, ${subscriptionJson}::jsonb, ${now}, ${now})
      `

      // 2. Create default workspace
      await client.sql`
        INSERT INTO workspaces (id, organization_id, name, slug, type, description, is_default, created_by, created_at, updated_at, settings)
        VALUES (${defaultWorkspaceId}, ${orgId}, ${"Default"}, ${"default"}, ${"team"},
                ${"Default workspace for all organization members"}, ${true}, ${auth.user.id},
                ${now}, ${now}, ${JSON.stringify({})}::jsonb)
      `

      // 3. Create member record
      await client.sql`
        INSERT INTO organization_members (id, organization_id, user_id, email, name, role, department, joined_at, status)
        VALUES (${memberId}, ${orgId}, ${auth.user.id}, ${auth.user.email},
                ${auth.user.name}, ${"owner"}, ${"Leadership"}, ${now}, ${"active"})
      `

      // 4. Add to default workspace
      await client.sql`
        INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
        VALUES (${workspaceMemberId}, ${defaultWorkspaceId}, ${auth.user.id}, ${"admin"}, ${now})
      `
    })

    const organization = {
      id: orgId,
      name: name.trim(),
      slug,
      createdAt: now,
      updatedAt: now,
      ownerId: auth.user.id,
      settings: {
        timezone: CONFIG.organization.defaultTimezone,
        weekStartDay: 1 as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        eodReminderTime: "17:00",
        enableEmailNotifications: true,
        enableSlackIntegration: false,
      },
      subscription: {
        plan: "free" as "free" | "team" | "business",
        status: "active" as "active" | "trialing" | "past_due" | "canceled",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 3,
        features: ["basic_rocks", "basic_tasks", "eod_reports"],
      },
    }

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
