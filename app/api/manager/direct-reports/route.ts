import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess, getWorkspaceMembers } from "@/lib/db/workspaces"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { assignManagerSchema } from "@/lib/validation/schemas"
import type { ApiResponse, TeamMember } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// GET /api/manager/direct-reports - Get direct reports for the current user
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get managerId and workspaceId from query params
    const { searchParams } = new URL(request.url)
    const managerId = searchParams.get("managerId") || auth.user.id
    const workspaceId = searchParams.get("workspaceId")

    // CRITICAL: workspaceId is REQUIRED for data isolation
    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // Validate workspace access (unless org admin)
    if (!isAdmin(auth)) {
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
      if (!hasAccess) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "You don't have access to this workspace" },
          { status: 403 }
        )
      }
    }

    // Only admins can view other managers' direct reports
    if (managerId !== auth.user.id && !isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You can only view your own direct reports" },
        { status: 403 }
      )
    }

    // Get direct reports and filter by workspace membership
    const directReports = await db.members.findDirectReports(auth.organization.id, managerId)
    const workspaceMembers = await getWorkspaceMembers(workspaceId)
    const workspaceMemberUserIds = new Set(workspaceMembers.map((wm) => wm.userId))

    // Filter direct reports to only those in the current workspace
    const workspaceDirectReports = directReports.filter((member) =>
      workspaceMemberUserIds.has(member.userId || member.id)
    )

    // Convert to TeamMember format
    const teamMembers: TeamMember[] = workspaceDirectReports.map((member) => ({
      id: member.userId || member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      department: member.department,
      avatar: member.avatar,
      joinDate: member.joinDate,
      weeklyMeasurable: member.weeklyMeasurable,
      status: member.status,
      timezone: member.timezone,
      eodReminderTime: member.eodReminderTime,
      jobTitle: member.jobTitle,
      managerId: managerId,
    }))

    return NextResponse.json<ApiResponse<TeamMember[]>>({
      success: true,
      data: teamMembers,
    })
  } catch (error) {
    logError(logger, "Get direct reports error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get direct reports" },
      { status: 500 }
    )
  }
}

// PATCH /api/manager/direct-reports - Assign a manager to a team member
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only admins can assign managers
    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can assign managers" },
        { status: 403 }
      )
    }

    const { memberId, managerId } = await validateBody(request, assignManagerSchema)

    // Get the member to update
    const member = await db.members.findByOrgAndUser(auth.organization.id, memberId)
    if (!member) {
      // Try finding by member ID (for draft members)
      const draftMember = await db.members.findByOrgAndId(auth.organization.id, memberId)
      if (!draftMember) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Member not found" },
          { status: 404 }
        )
      }
      // Update draft member
      await db.members.updateManager(draftMember.id, managerId || null)
    } else {
      // Update regular member
      await db.members.updateManager(member.id, managerId || null)
    }

    // If managerId is provided, verify the manager exists
    if (managerId) {
      const managerMember = await db.members.findByOrgAndUser(auth.organization.id, managerId)
      if (!managerMember) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Manager not found" },
          { status: 404 }
        )
      }
    }

    return NextResponse.json<ApiResponse<{ success: boolean }>>({
      success: true,
      data: { success: true },
      message: managerId ? "Manager assigned successfully" : "Manager unassigned successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Assign manager error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to assign manager" },
      { status: 500 }
    )
  }
}
