/**
 * Onboarding Checklist API
 *
 * GET /api/onboarding - Returns computed checklist status
 * PUT /api/onboarding - Dismiss or complete onboarding
 */

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import { isAdmin as checkIsAdmin } from "@/lib/auth/middleware"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

export interface ChecklistItem {
  id: string
  label: string
  description: string
  completed: boolean
  page: string
  settingsTab?: string
  adminOnly: boolean
}

interface OnboardingStatus {
  items: ChecklistItem[]
  completedCount: number
  totalCount: number
  dismissed: boolean
  completedAt: string | null
}

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const userId = auth.user.id
    const orgId = auth.organization.id
    const memberIsAdmin = checkIsAdmin(auth)

    // Check dismissed / completed status
    const memberResult = await sql`
      SELECT onboarding_dismissed, onboarding_completed_at
      FROM organization_members
      WHERE organization_id = ${orgId} AND user_id = ${userId}
      LIMIT 1
    `
    const dismissed = memberResult.rows[0]?.onboarding_dismissed || false
    const completedAt = memberResult.rows[0]?.onboarding_completed_at
      ? new Date(memberResult.rows[0].onboarding_completed_at).toISOString()
      : null

    // Run all data checks in parallel
    const [profileResult, rocksResult, eodResult, tasksResult, workspaceResult, invitationsResult] =
      await Promise.all([
        // 1. Profile: has job_title AND timezone
        sql`
          SELECT om.job_title, om.timezone
          FROM organization_members om
          WHERE om.organization_id = ${orgId} AND om.user_id = ${userId}
          LIMIT 1
        `,
        // 2. Rocks: user has >= 1 rock
        sql`
          SELECT EXISTS(
            SELECT 1 FROM rocks WHERE organization_id = ${orgId} AND user_id = ${userId}
          ) as has_rocks
        `,
        // 3. EOD: user has >= 1 report
        sql`
          SELECT EXISTS(
            SELECT 1 FROM eod_reports WHERE organization_id = ${orgId} AND user_id = ${userId}
          ) as has_eod
        `,
        // 4. Tasks: user has >= 1 task (created or assigned)
        sql`
          SELECT EXISTS(
            SELECT 1 FROM assigned_tasks
            WHERE organization_id = ${orgId}
              AND (assignee_id = ${userId} OR assigned_by_id = ${userId})
          ) as has_tasks
        `,
        // 5. Workspace customized: has custom primary_color or logo_url (admin only)
        sql`
          SELECT logo_url, primary_color
          FROM organizations
          WHERE id = ${orgId}
          LIMIT 1
        `,
        // 6. Team invited: org has >= 1 sent invite (admin only)
        sql`
          SELECT EXISTS(
            SELECT 1 FROM invitations WHERE organization_id = ${orgId}
          ) as has_invitations
        `,
      ])

    const profileRow = profileResult.rows[0]
    const hasProfile = !!(profileRow?.job_title && profileRow?.timezone)
    const hasRocks = rocksResult.rows[0]?.has_rocks === true
    const hasEod = eodResult.rows[0]?.has_eod === true
    const hasTasks = tasksResult.rows[0]?.has_tasks === true
    const wsRow = workspaceResult.rows[0]
    const hasCustomizedWorkspace = !!(wsRow?.logo_url || (wsRow?.primary_color && wsRow.primary_color !== "#dc2626"))
    const hasInvitedTeam = invitationsResult.rows[0]?.has_invitations === true

    // Build checklist items
    const items: ChecklistItem[] = [
      {
        id: "profile",
        label: "Complete your profile",
        description: "Set your job title and timezone",
        completed: hasProfile,
        page: "settings",
        settingsTab: "profile",
        adminOnly: false,
      },
      {
        id: "rock",
        label: "Create your first Rock",
        description: "Set a quarterly goal to track",
        completed: hasRocks,
        page: "rocks",
        adminOnly: false,
      },
      {
        id: "eod",
        label: "Submit an EOD report",
        description: "Share your daily progress",
        completed: hasEod,
        page: "dashboard",
        adminOnly: false,
      },
      {
        id: "task",
        label: "Create a task",
        description: "Track your to-dos",
        completed: hasTasks,
        page: "tasks",
        adminOnly: false,
      },
      {
        id: "calendar",
        label: "Explore the calendar",
        description: "View meetings and events",
        completed: false, // Tracked client-side via localStorage
        page: "calendar",
        adminOnly: false,
      },
    ]

    // Admin-only items
    if (memberIsAdmin) {
      items.push(
        {
          id: "workspace",
          label: "Customize your workspace",
          description: "Add branding, colors, and logo",
          completed: hasCustomizedWorkspace,
          page: "settings",
          settingsTab: "workspace",
          adminOnly: true,
        },
        {
          id: "features",
          label: "Review feature settings",
          description: "Toggle EOS modules on/off",
          completed: false, // Tracked client-side via localStorage
          page: "settings",
          settingsTab: "features",
          adminOnly: true,
        },
        {
          id: "invite",
          label: "Invite your team",
          description: "Add team members to your workspace",
          completed: hasInvitedTeam,
          page: "settings",
          settingsTab: "team",
          adminOnly: true,
        }
      )
    }

    const completedCount = items.filter((i) => i.completed).length
    const totalCount = items.length

    return NextResponse.json<ApiResponse<OnboardingStatus>>({
      success: true,
      data: {
        items,
        completedCount,
        totalCount,
        dismissed,
        completedAt,
      },
    })
  } catch (error) {
    logError(logger, "Get onboarding status error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get onboarding status" },
      { status: 500 }
    )
  }
})

export const PUT = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const userId = auth.user.id
    const orgId = auth.organization.id

    if (body.dismissed) {
      await sql`
        UPDATE organization_members
        SET onboarding_dismissed = true
        WHERE organization_id = ${orgId} AND user_id = ${userId}
      `
    }

    if (body.completed) {
      await sql`
        UPDATE organization_members
        SET onboarding_completed_at = NOW(), onboarding_dismissed = true
        WHERE organization_id = ${orgId} AND user_id = ${userId}
      `
    }

    return NextResponse.json<ApiResponse<{ success: boolean }>>({
      success: true,
      data: { success: true },
    })
  } catch (error) {
    logError(logger, "Update onboarding status error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update onboarding status" },
      { status: 500 }
    )
  }
})
