/**
 * POST /api/admin/eod-reminder
 * Sends an in-app EOD reminder notification to all workspace members
 * who haven't submitted an EOD report today.
 * Admin only.
 */

import { NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { sendNotificationToMany } from "@/lib/db/notifications"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

function getTodayInTimezone(timezone: string): string {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: timezone })
  } catch {
    return new Date().toLocaleDateString("en-CA")
  }
}

export const POST = withAdmin(async (request, auth) => {
  try {
    // Get optional workspaceId from query or body
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    // Verify workspace belongs to this org (if specified)
    if (workspaceId) {
      const validWorkspace = await db.workspaces.findById(workspaceId)
      if (!validWorkspace || validWorkspace.organizationId !== auth.organization.id) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Workspace not found" },
          { status: 404 }
        )
      }
    }

    // Get all active org members
    const allMembers = await db.members.findByOrganizationId(auth.organization.id)
    const activeMembers = allMembers.filter((m) => m.status === "active")

    // Determine today's date in the org's timezone
    const org = await db.organizations.findById(auth.organization.id)
    const timezone = org?.settings?.timezone || "America/New_York"
    const today = getTodayInTimezone(timezone)

    // Get all EOD reports submitted today for this org
    const todayReports = await db.eodReports.findByOrganizationId(auth.organization.id)
    const todaySubmittedUserIds = new Set(
      todayReports.filter((r) => r.date === today).map((r) => r.userId)
    )

    // Filter members who haven't submitted today
    let membersToNudge = activeMembers.filter(
      (m) => !todaySubmittedUserIds.has(m.userId || m.id)
    )

    // If workspaceId provided, further filter to workspace members
    if (workspaceId) {
      const wsAccessChecks = await Promise.all(
        membersToNudge.map(async (m) => {
          const hasAccess = await userHasWorkspaceAccess(m.userId || m.id, workspaceId)
          return hasAccess ? m : null
        })
      )
      membersToNudge = wsAccessChecks.filter(Boolean) as typeof membersToNudge
    }

    if (membersToNudge.length === 0) {
      return NextResponse.json<ApiResponse<{ notifiedCount: number }>>({
        success: true,
        data: { notifiedCount: 0 },
        message: "All team members have already submitted their EOD today!",
      })
    }

    const userIds = membersToNudge.map((m) => m.userId || m.id)

    await sendNotificationToMany({
      organizationId: auth.organization.id,
      userIds,
      type: "eod_reminder",
      title: "EOD Report Reminder",
      message: `${auth.user.name || "Your manager"} is asking you to submit your end-of-day report. Only takes a few minutes!`,
    })

    logger.info(
      { orgId: auth.organization.id, count: userIds.length, sentBy: auth.user.id },
      "Admin manually triggered EOD reminder"
    )

    return NextResponse.json<ApiResponse<{ notifiedCount: number }>>({
      success: true,
      data: { notifiedCount: userIds.length },
      message: `Reminder sent to ${userIds.length} team member${userIds.length > 1 ? "s" : ""}`,
    })
  } catch (error) {
    logError(logger, "Admin EOD reminder error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to send EOD reminders" },
      { status: 500 }
    )
  }
})
