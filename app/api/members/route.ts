import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth, withAdmin } from "@/lib/api/middleware"
import { isAdmin } from "@/lib/auth/middleware"
import { sql } from "@/lib/db/sql"
import { generateId } from "@/lib/auth/password"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createMemberSchema, updateMemberSchema } from "@/lib/validation/schemas"
import type { TeamMember, OrganizationMember, ApiResponse } from "@/lib/types"
import { parsePaginationParams, buildPaginatedResponse, decodeCursor } from "@/lib/utils/pagination"
import type { PaginatedResponse } from "@/lib/utils/pagination"
import { logger, logError } from "@/lib/logger"
import { audit } from "@/lib/audit"

// POST /api/members - Create a draft team member (before invitation)
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Validate request body
    const { name, email, role, department } = await validateBody(request, createMemberSchema)

    // Check if user already exists in org
    const existingUser = await db.users.findByEmail(email)
    if (existingUser) {
      const existingMember = await db.members.findByOrgAndUser(auth.organization.id, existingUser.id)
      if (existingMember) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "This user is already a member of your organization" },
          { status: 409 }
        )
      }
    }

    // Check if email already has a draft member
    const existingDraft = await db.members.findByOrgAndEmail(auth.organization.id, email)
    if (existingDraft) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "A team member with this email already exists" },
        { status: 409 }
      )
    }

    // Check subscription limits
    const members = await db.members.findByOrganizationId(auth.organization.id)
    if (members.length >= auth.organization.subscription.maxUsers) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `You have reached your plan limit of ${auth.organization.subscription.maxUsers} users. Please upgrade to add more team members.` },
        { status: 403 }
      )
    }

    const now = new Date().toISOString()
    const memberId = generateId()

    const member: OrganizationMember = {
      id: memberId,
      organizationId: auth.organization.id,
      userId: null, // No user yet - this is a draft
      email: email.toLowerCase(),
      name: name.trim(),
      role: role === "admin" ? "admin" : "member",
      department,
      joinedAt: now,
      invitedBy: auth.user.id,
      status: "pending", // Draft status
    }

    await db.members.create(member)

    audit(auth, request, "member.created", {
      resourceType: "member",
      resourceId: memberId,
      newValues: { email: member.email, role: member.role, department: member.department },
    })

    const teamMember: TeamMember = {
      id: memberId,
      name: member.name,
      email: member.email,
      role: member.role,
      department: member.department,
      joinDate: member.joinedAt,
      status: "pending",
    }

    return NextResponse.json<ApiResponse<TeamMember>>({
      success: true,
      data: teamMember,
      message: "Team member created. You can now assign rocks and tasks, then send an invitation when ready.",
    })
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    logError(logger, "Create draft member error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create team member" },
      { status: 500 }
    )
  }
})

// GET /api/members - Get all team members in the organization
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)

    // Check if pagination params are provided
    const cursor = searchParams.get("cursor")
    const limitParam = searchParams.get("limit")
    const usePagination = cursor !== null || limitParam !== null

    if (usePagination) {
      const pagination = parsePaginationParams(searchParams)
      const decoded = pagination.cursor ? decodeCursor(pagination.cursor) : null

      const { data, totalCount } = await db.members.findWithUsersByOrganizationIdPaginated(
        auth.organization.id, {
          limit: pagination.limit,
          cursorTimestamp: decoded?.timestamp,
          cursorId: decoded?.id,
          direction: pagination.direction,
        }
      )

      const response = buildPaginatedResponse(
        data,
        pagination.limit,
        totalCount,
        (m) => m.joinDate,
        (m) => m.id
      )

      return NextResponse.json<ApiResponse<PaginatedResponse<TeamMember>>>({
        success: true,
        data: response,
      })
    }

    // Legacy non-paginated path (backward compatible)
    // Uses optimized JOIN query to get members with user data in a single call
    const teamMembers = await db.members.findWithUsersByOrganizationId(auth.organization.id)
    return NextResponse.json<ApiResponse<TeamMember[]>>({
      success: true,
      data: teamMembers,
    })
  } catch (error) {
    logError(logger, "Get members error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get team members" },
      { status: 500 }
    )
  }
})

// PATCH /api/members - Update a team member
export const PATCH = withAuth(async (request: NextRequest, auth) => {
  try {
    // Validate request body
    const { memberId, department, weeklyMeasurable, role, jobTitle, timezone, eodReminderTime, notificationPreferences } =
      await validateBody(request, updateMemberSchema)

    // Get the member record - try organization_members.id first, then user_id
    let member = await db.members.findByOrgAndId(auth.organization.id, memberId)
    if (!member) {
      member = await db.members.findByOrgAndUser(auth.organization.id, memberId)
    }

    if (!member) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Member not found" },
        { status: 404 }
      )
    }

    // Check permissions - admins can update members, users can only update themselves
    // Compare both the member.id and member.userId to auth.member.id and auth.user.id
    const isSelf = member.id === auth.member.id || member.userId === auth.user.id
    if (!isSelf && !isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You can only update your own profile" },
        { status: 403 }
      )
    }

    // Role changes require owner permission
    if (role && role !== member.role) {
      if (auth.member.role !== "owner") {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Only owners can change member roles" },
          { status: 403 }
        )
      }
      // Prevent demoting the only owner (targeted count query)
      if (member.role === "owner") {
        const { rows: [{ count }] } = await sql<{ count: number }>`
          SELECT COUNT(*)::int AS count FROM organization_members
          WHERE organization_id = ${auth.organization.id} AND role = 'owner'
        `
        if (count <= 1) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "Cannot remove the only owner" },
            { status: 400 }
          )
        }
      }
    }

    const updates: Partial<OrganizationMember> = {}
    if (department !== undefined) updates.department = department
    if (weeklyMeasurable !== undefined) updates.weeklyMeasurable = weeklyMeasurable
    if (jobTitle !== undefined) updates.jobTitle = jobTitle
    if (role !== undefined && isAdmin(auth)) updates.role = role
    if (timezone !== undefined) updates.timezone = timezone
    if (eodReminderTime !== undefined) updates.eodReminderTime = eodReminderTime
    if (notificationPreferences !== undefined) updates.notificationPreferences = notificationPreferences

    await db.members.update(member.id, updates)

    if (role && role !== member.role) {
      audit(auth, request, "member.role_changed", {
        resourceType: "member",
        resourceId: member.id,
        oldValues: { role: member.role },
        newValues: { role },
      })
    }

    // Get updated member with user data - use member.userId if available
    const user = member.userId ? await db.users.findById(member.userId) : null
    const updatedMember = await db.members.findById(member.id)

    if (!updatedMember) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to retrieve updated member" },
        { status: 500 }
      )
    }

    // Return team member with correct ID (organization_members.id)
    const teamMember: TeamMember = {
      id: updatedMember.id, // organization_members.id
      userId: updatedMember.userId || undefined, // users.id if exists
      name: user?.name || updatedMember.name || '',
      email: user?.email || updatedMember.email || '',
      role: updatedMember.role,
      department: updatedMember.department,
      avatar: user?.avatar,
      joinDate: updatedMember.joinedAt,
      weeklyMeasurable: updatedMember.weeklyMeasurable,
      status: updatedMember.status,
      timezone: updatedMember.timezone,
      eodReminderTime: updatedMember.eodReminderTime,
      notificationPreferences: updatedMember.notificationPreferences,
    }

    return NextResponse.json<ApiResponse<TeamMember>>({
      success: true,
      data: teamMember,
      message: "Member updated successfully",
    })
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    logError(logger, "Update member error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update member" },
      { status: 500 }
    )
  }
})

// DELETE /api/members - Remove a member from the organization
export const DELETE = withAdmin(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("memberId")

    if (!memberId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Member ID is required" },
        { status: 400 }
      )
    }

    // Cannot remove yourself
    if (memberId === auth.user.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You cannot remove yourself from the organization" },
        { status: 400 }
      )
    }

    // Try to find by member ID first (for draft members), then by user ID
    let member = await db.members.findByOrgAndId(auth.organization.id, memberId)
    if (!member) {
      member = await db.members.findByOrgAndUser(auth.organization.id, memberId)
    }

    if (!member) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Member not found" },
        { status: 404 }
      )
    }

    // Cannot remove owner unless you're the owner
    if (member.role === "owner" && auth.member.role !== "owner") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only owners can remove other owners" },
        { status: 403 }
      )
    }

    await db.members.delete(member.id, auth.organization.id)

    // Invalidate all sessions for the removed member in this organization
    if (member.userId) {
      await db.sessions.deleteByUserAndOrg(member.userId, auth.organization.id)
    }

    audit(auth, request, "member.removed", {
      resourceType: "member",
      resourceId: member.id,
      oldValues: { email: member.email, role: member.role, userId: member.userId },
    })

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Member removed successfully",
    })
  } catch (error) {
    logError(logger, "Remove member error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to remove member" },
      { status: 500 }
    )
  }
})
