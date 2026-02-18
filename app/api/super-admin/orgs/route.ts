import { NextRequest, NextResponse } from "next/server"
import { withSuperAdmin } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { withTransaction } from "@/lib/db/transactions"
import { generateId, slugify } from "@/lib/auth/password"
import type { ApiResponse } from "@/lib/types"
import { logError, logger } from "@/lib/logger"

/**
 * POST /api/super-admin/orgs
 *
 * Create a new organization from the portfolio page.
 * Auto-sets the super admin as owner.
 */
export const POST = withSuperAdmin(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const { name, logoUrl } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization name is required" },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const orgId = generateId()
    let slug = slugify(name.trim())

    // Ensure unique slug
    let existingOrg = await db.organizations.findBySlug(slug)
    let counter = 1
    while (existingOrg) {
      slug = `${slugify(name.trim())}-${counter}`
      existingOrg = await db.organizations.findBySlug(slug)
      counter++
    }

    const settingsJson = JSON.stringify({
      timezone: "America/New_York",
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

    await withTransaction(async (client) => {
      // 1. Create organization
      await client.sql`
        INSERT INTO organizations (id, name, slug, owner_id, logo_url, settings, subscription, created_at, updated_at)
        VALUES (${orgId}, ${name.trim()}, ${slug}, ${auth.user.id},
                ${logoUrl || null}, ${settingsJson}::jsonb, ${subscriptionJson}::jsonb, ${now}, ${now})
      `

      // 2. Create default workspace
      await client.sql`
        INSERT INTO workspaces (id, organization_id, name, slug, type, description, is_default, created_by, created_at, updated_at, settings)
        VALUES (${defaultWorkspaceId}, ${orgId}, ${"Default"}, ${"default"}, ${"team"},
                ${"Default workspace for all organization members"}, ${true}, ${auth.user.id},
                ${now}, ${now}, ${JSON.stringify({})}::jsonb)
      `

      // 3. Create member record (owner)
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

    return NextResponse.json<ApiResponse<{
      organization: { id: string; name: string; slug: string }
    }>>({
      success: true,
      data: {
        organization: { id: orgId, name: name.trim(), slug },
      },
      message: "Organization created successfully",
    })
  } catch (error) {
    logError(logger, "Super admin create org error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create organization" },
      { status: 500 }
    )
  }
})
