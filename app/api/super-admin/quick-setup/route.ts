import { NextRequest, NextResponse } from "next/server"
import { withSuperAdmin } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { withTransaction } from "@/lib/db/transactions"
import { generateId, generateInviteToken, getExpirationDate, slugify } from "@/lib/auth/password"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { quickSetupSchema } from "@/lib/validation/schemas"
import { sendInvitationEmail } from "@/lib/integrations/email"
import type { ApiResponse, Rock, AssignedTask, Invitation, Organization } from "@/lib/types"
import { logError, logger } from "@/lib/logger"
import { CONFIG } from "@/lib/config"

interface QuickSetupResult {
  orgId: string
  orgSlug: string
  workspaceId: string
  rocksCreated: number
  tasksCreated: number
  invitesSent: number
  invitesFailed: number
  newOrg: {
    id: string
    name: string
    slug: string
    logoUrl: string | null
    primaryColor: string | null
    role: string
    memberCount: number
    eodsToday: number
    activeTasks: number
    openEscalations: number
    plan: string
    eodRate7Day: number
    eodRateTrend: "up" | "down" | "stable"
    completedTasksThisWeek: number
    riskLevel: "healthy" | "warning" | "critical"
    avgRockProgress: number
    rockHealth: { onTrack: number; atRisk: number; blocked: number; completed: number }
  }
}

/**
 * POST /api/super-admin/quick-setup
 *
 * Fully provisions a new org in one pass: creates org + workspace + membership,
 * bulk-creates rocks/milestones/tasks, and sends invitation emails.
 * All DB writes happen in a single transaction for atomicity.
 */
export const POST = withSuperAdmin(async (request: NextRequest, auth) => {
  try {
    const body = await validateBody(request, quickSetupSchema)
    const { orgName, logoUrl, primaryColor, secondaryColor, rocks, tasks, invites } = body

    const now = new Date().toISOString()
    const orgId = generateId()
    const workspaceId = generateId()
    const memberId = generateId()
    const workspaceMemberId = generateId()

    // Build unique org slug
    let slug = slugify(orgName.trim())
    let existingOrg = await db.organizations.findBySlug(slug)
    let counter = 1
    while (existingOrg) {
      slug = `${slugify(orgName.trim())}-${counter}`
      existingOrg = await db.organizations.findBySlug(slug)
      counter++
    }

    const settingsJson = JSON.stringify({
      timezone: CONFIG.organization.defaultTimezone,
      weekStartDay: 1,
      eodReminderTime: "17:00",
      enableEmailNotifications: true,
      enableSlackIntegration: false,
    })
    const subscriptionJson = JSON.stringify({
      plan: "business",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      maxUsers: null,
      features: [
        "basic_rocks","basic_tasks","eod_reports","unlimited_rocks","unlimited_tasks",
        "l10_meetings","manager_dashboard","multiple_workspaces","custom_branding",
        "api_access","advanced_analytics","slack_integration","google_calendar_sync",
        "ai_eod_parsing","ai_query","ai_daily_digest","ai_brain_dump","unlimited_ai","ai_insights",
      ],
    })

    // ── Transaction: org + workspace + memberships ───────────────────────────
    await withTransaction(async (client) => {
      // 1. Create organization
      await client.sql`
        INSERT INTO organizations (id, name, slug, owner_id, logo_url, primary_color, secondary_color, settings, subscription, created_at, updated_at)
        VALUES (${orgId}, ${orgName.trim()}, ${slug}, ${auth.user.id},
                ${logoUrl ?? null}, ${primaryColor ?? null}, ${secondaryColor ?? null},
                ${settingsJson}::jsonb, ${subscriptionJson}::jsonb, ${now}, ${now})
      `

      // 2. Create default workspace (inherits branding)
      await client.sql`
        INSERT INTO workspaces (id, organization_id, name, slug, type, description, is_default, created_by,
                                logo_url, primary_color, secondary_color, created_at, updated_at, settings)
        VALUES (${workspaceId}, ${orgId}, ${"Default"}, ${"default"}, ${"team"},
                ${"Default workspace for all organization members"}, ${true}, ${auth.user.id},
                ${logoUrl ?? null}, ${primaryColor ?? null}, ${secondaryColor ?? null},
                ${now}, ${now}, ${JSON.stringify({})}::jsonb)
      `

      // 3. Add current user as org owner
      await client.sql`
        INSERT INTO organization_members (id, organization_id, user_id, email, name, role, department, joined_at, status)
        VALUES (${memberId}, ${orgId}, ${auth.user.id}, ${auth.user.email},
                ${auth.user.name}, ${"owner"}, ${"Leadership"}, ${now}, ${"active"})
      `

      // 4. Add current user as workspace admin
      await client.sql`
        INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
        VALUES (${workspaceMemberId}, ${workspaceId}, ${auth.user.id}, ${"admin"}, ${now})
      `
    })

    logger.info({ orgId, orgName, userId: auth.user.id }, "Quick setup: org + workspace created")

    // ── Rocks, milestones, and tasks (outside transaction — partial success ok) ──
    const now2 = new Date()
    const currentQuarter = Math.floor(now2.getMonth() / 3) + 1
    const quarterEndMonth = currentQuarter * 3
    const defaultDueDate = new Date(now2.getFullYear(), quarterEndMonth, 0).toISOString().split("T")[0]
    const defaultQuarter = `Q${currentQuarter} ${now2.getFullYear()}`

    let rocksCreated = 0
    const createdRocksByTitle = new Map<string, Rock>()

    for (const rockInput of rocks ?? []) {
      try {
        const rockId = generateId()
        const timestamp = new Date().toISOString()
        const rock: Rock = {
          id: rockId,
          organizationId: orgId,
          workspaceId,
          userId: auth.user.id,
          ownerEmail: undefined,
          title: rockInput.title.trim(),
          description: rockInput.description?.trim() || "",
          progress: 0,
          dueDate: defaultDueDate,
          status: "on-track",
          doneWhen: rockInput.milestones || [],
          quarter: rockInput.quarter || defaultQuarter,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        await db.rocks.create(rock)

        if (rockInput.milestones && rockInput.milestones.length > 0) {
          try {
            await db.rockMilestones.createMany(rockId, rockInput.milestones)
          } catch (milestoneErr) {
            logger.warn({ rockTitle: rockInput.title, error: milestoneErr }, "Quick setup: milestone table insert failed (non-fatal)")
          }
        }

        createdRocksByTitle.set(rockInput.title.toLowerCase().trim(), rock)
        rocksCreated++
      } catch (err) {
        logError(logger, `Quick setup: failed to create rock "${rockInput.title}"`, err)
      }
    }

    // Build full task list: explicit tasks + auto-generated from milestones
    const allTasksToCreate = [...(tasks ?? [])]
    for (const rockInput of rocks ?? []) {
      if (!rockInput.milestones?.length) continue
      const rock = createdRocksByTitle.get(rockInput.title.toLowerCase().trim())
      if (!rock) continue
      const explicitTitles = new Set(
        allTasksToCreate
          .filter((t) => t.rockTitle?.toLowerCase() === rockInput.title.toLowerCase())
          .map((t) => t.title.toLowerCase())
      )
      for (const milestone of rockInput.milestones) {
        if (!milestone?.trim() || explicitTitles.has(milestone.toLowerCase())) continue
        allTasksToCreate.push({
          title: milestone.trim(),
          rockTitle: rockInput.title,
          priority: "medium",
          dueDate: defaultDueDate,
        })
        explicitTitles.add(milestone.toLowerCase())
      }
    }

    let tasksCreated = 0
    const priorityMap: Record<string, "high" | "medium" | "normal" | "low"> = {
      high: "high", medium: "medium", low: "low",
    }
    for (const taskInput of allTasksToCreate) {
      try {
        const matchedRock = taskInput.rockTitle
          ? createdRocksByTitle.get(taskInput.rockTitle.toLowerCase())
          : undefined
        const task: AssignedTask = {
          id: generateId(),
          organizationId: orgId,
          workspaceId,
          title: taskInput.title,
          description: "",
          assigneeId: auth.user.id,
          assigneeName: auth.user.name || "Owner",
          assignedById: auth.user.id,
          assignedByName: auth.user.name || "Owner",
          type: "assigned",
          rockId: matchedRock?.id ?? null,
          rockTitle: matchedRock?.title ?? null,
          priority: priorityMap[taskInput.priority ?? "medium"] ?? "medium",
          dueDate: taskInput.dueDate ?? defaultDueDate,
          status: "pending",
          completedAt: null,
          addedToEOD: false,
          eodReportId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        await db.assignedTasks.create(task)
        tasksCreated++
      } catch (err) {
        logError(logger, `Quick setup: failed to create task "${taskInput.title}"`, err)
      }
    }

    // ── Invitations (non-blocking, partial failures ok) ───────────────────────
    // Build a minimal Organization object for sendInvitationEmail
    const orgForEmail: Organization = {
      id: orgId,
      name: orgName.trim(),
      slug,
      ownerId: auth.user.id,
      settings: JSON.parse(settingsJson),
      subscription: JSON.parse(subscriptionJson),
      createdAt: now,
      updatedAt: now,
    }

    let invitesSent = 0
    let invitesFailed = 0

    for (const invite of invites ?? []) {
      try {
        const inviteNow = new Date().toISOString()
        const invitationId = generateId()
        const token = generateInviteToken()
        const expiresAt = getExpirationDate(7 * 24) // 7 days

        const invitation: Invitation = {
          id: invitationId,
          organizationId: orgId,
          email: invite.email,
          role: invite.role,
          department: "General",
          token,
          status: "pending",
          invitedBy: auth.user.id,
          expiresAt,
          createdAt: inviteNow,
        }

        await db.invitations.create(invitation)

        try {
          await sendInvitationEmail(invitation, orgForEmail, auth.user.name || "An admin")
          invitesSent++
        } catch (emailErr) {
          logError(logger, `Quick setup: email send failed for ${invite.email}`, emailErr)
          invitesSent++ // invitation was created; email is best-effort
        }
      } catch (err) {
        logError(logger, `Quick setup: failed to create invitation for ${invite.email}`, err)
        invitesFailed++
      }
    }

    logger.info(
      { orgId, rocksCreated, tasksCreated, invitesSent, invitesFailed },
      "Quick setup: completed"
    )

    // Build minimal PortfolioOrg shape for immediate UI use
    const newOrg: QuickSetupResult["newOrg"] = {
      id: orgId,
      name: orgName.trim(),
      slug,
      logoUrl: logoUrl ?? null,
      primaryColor: primaryColor ?? null,
      role: "owner",
      memberCount: 1,
      eodsToday: 0,
      activeTasks: tasksCreated,
      openEscalations: 0,
      plan: "business",
      eodRate7Day: 0,
      eodRateTrend: "stable",
      completedTasksThisWeek: 0,
      riskLevel: "healthy",
      avgRockProgress: 0,
      rockHealth: { onTrack: rocksCreated, atRisk: 0, blocked: 0, completed: 0 },
    }

    return NextResponse.json<ApiResponse<QuickSetupResult>>({
      success: true,
      data: { orgId, orgSlug: slug, workspaceId, rocksCreated, tasksCreated, invitesSent, invitesFailed, newOrg },
      message: `Workspace "${orgName.trim()}" created successfully`,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Quick setup error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create workspace" },
      { status: 500 }
    )
  }
})
