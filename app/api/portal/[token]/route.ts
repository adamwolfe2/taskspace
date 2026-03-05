import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { validatePortalToken } from "@/lib/auth/client-portal-auth"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import type { RouteContext } from "@/lib/api/middleware"

/**
 * GET /api/portal/[token]
 * Public endpoint — no auth required.
 * Validates the portal token and returns client data filtered by portal settings.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params
    const token = params.token

    if (!token) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Portal token is required" },
        { status: 400 }
      )
    }

    // Look up the client directly by portal_token (no org slug needed for token-only route)
    const { rows: clientRows } = await sql`
      SELECT c.*,
        o.slug as org_slug,
        o.name as org_name,
        o.logo_url as org_logo_url,
        o.primary_color as org_primary_color
      FROM clients c
      JOIN organizations o ON o.id = c.organization_id
      WHERE c.portal_token = ${token}
        AND c.portal_enabled = true
    `

    if (clientRows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "This portal link is no longer active." },
        { status: 403 }
      )
    }

    const row = clientRows[0]
    const orgId = row.organization_id as string
    const workspaceId = row.workspace_id as string
    const clientId = row.id as string
    const portalShowRocks = (row.portal_show_rocks as boolean) || false
    const portalShowTasks = (row.portal_show_tasks as boolean) || false
    const portalMemberFilter = (row.portal_member_filter as string[]) || null
    const portalBranding = (row.portal_branding as Record<string, unknown>) || null

    // Build client info (safe subset)
    const clientInfo = {
      id: clientId,
      name: row.name as string,
      description: (row.description as string) || null,
      contactName: (row.contact_name as string) || null,
      contactEmail: (row.contact_email as string) || null,
      industry: (row.industry as string) || null,
      status: row.status as string,
    }

    // Branding
    const branding = {
      orgName: row.org_name as string,
      orgSlug: row.org_slug as string,
      orgLogoUrl: (row.org_logo_url as string) || null,
      orgPrimaryColor: (row.org_primary_color as string) || null,
      custom: portalBranding,
    }

    // EOD reports — apply member filter if set
    let eodQuery
    if (portalMemberFilter && portalMemberFilter.length > 0) {
      // Filter EODs to only members in portalMemberFilter (array of user IDs)
      const { rows: eodRows } = await sql`
        SELECT id, user_id, date, tasks, challenges, tomorrow_priorities,
               needs_escalation, escalation_note, mood, submitted_at, created_at
        FROM eod_reports
        WHERE workspace_id = ${workspaceId}
          AND org_id = ${orgId}
          AND user_id = ANY(ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(portalMemberFilter)}::jsonb)))
        ORDER BY date DESC
        LIMIT 30
      `
      eodQuery = eodRows
    } else {
      const { rows: eodRows } = await sql`
        SELECT id, user_id, date, tasks, challenges, tomorrow_priorities,
               needs_escalation, escalation_note, mood, submitted_at, created_at
        FROM eod_reports
        WHERE workspace_id = ${workspaceId}
          AND org_id = ${orgId}
        ORDER BY date DESC
        LIMIT 30
      `
      eodQuery = eodRows
    }

    const eods = eodQuery.map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      date: r.date as string,
      tasks: r.tasks,
      challenges: r.challenges as string,
      tomorrowPriorities: r.tomorrow_priorities,
      needsEscalation: r.needs_escalation as boolean,
      escalationNote: r.escalation_note as string | null,
      mood: r.mood as string | null,
      submittedAt: (r.submitted_at as Date)?.toISOString() || "",
      createdAt: (r.created_at as Date)?.toISOString() || "",
    }))

    // Rocks — only if portal_show_rocks is enabled
    let rocks = null
    if (portalShowRocks) {
      const { rows: rockRows } = await sql`
        SELECT id, title, description, progress, status, due_date, quarter, owner_email, user_id
        FROM rocks
        WHERE workspace_id = ${workspaceId}
          AND organization_id = ${orgId}
        ORDER BY created_at DESC
      `
      rocks = rockRows.map((r) => ({
        id: r.id as string,
        title: r.title as string,
        description: r.description as string,
        progress: r.progress as number,
        status: r.status as string,
        dueDate: r.due_date as string,
        quarter: r.quarter as string | null,
      }))
    }

    // Tasks — only if portal_show_tasks is enabled
    let tasks = null
    if (portalShowTasks) {
      const { rows: taskRows } = await sql`
        SELECT id, title, description, assignee_name, priority, due_date, status, created_at
        FROM assigned_tasks
        WHERE workspace_id = ${workspaceId}
          AND organization_id = ${orgId}
          AND status != 'completed'
        ORDER BY due_date ASC NULLS LAST
        LIMIT 50
      `
      tasks = taskRows.map((r) => ({
        id: r.id as string,
        title: r.title as string,
        description: (r.description as string) || null,
        assigneeName: r.assignee_name as string,
        priority: r.priority as string,
        dueDate: r.due_date as string | null,
        status: r.status as string,
        createdAt: (r.created_at as Date)?.toISOString() || "",
      }))
    }

    return NextResponse.json<ApiResponse<{
      client: typeof clientInfo
      branding: typeof branding
      eods: typeof eods
      rocks: typeof rocks
      tasks: typeof tasks
      portalShowRocks: boolean
      portalShowTasks: boolean
    }>>({
      success: true,
      data: {
        client: clientInfo,
        branding,
        eods,
        rocks,
        tasks,
        portalShowRocks,
        portalShowTasks,
      },
    })
  } catch (error) {
    logError(logger, "Portal GET error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to load portal data" },
      { status: 500 }
    )
  }
}
