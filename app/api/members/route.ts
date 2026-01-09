import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { generateId, validateEmail } from "@/lib/auth/password"
import type { TeamMember, OrganizationMember, ApiResponse } from "@/lib/types"

// POST /api/members - Create a draft team member (before invitation)
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can create team members" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, role = "member", department = "General" } = body

    if (!name || name.trim().length < 2) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Name must be at least 2 characters" },
        { status: 400 }
      )
    }

    if (!email || !validateEmail(email)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Valid email is required" },
        { status: 400 }
      )
    }

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
    console.error("Create draft member error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create team member" },
      { status: 500 }
    )
  }
}

// GET /api/members - Get all team members in the organization
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Use optimized JOIN query to get members with user data in a single call
    // This fixes the N+1 query problem (was: 1 query + N queries for each user)
    const teamMembers = await db.members.findWithUsersByOrganizationId(auth.organization.id)

    return NextResponse.json<ApiResponse<TeamMember[]>>({
      success: true,
      data: teamMembers,
    })
  } catch (error) {
    console.error("Get members error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get team members" },
      { status: 500 }
    )
  }
}

// PATCH /api/members - Update a team member
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { memberId, department, weeklyMeasurable, role, timezone, eodReminderTime, notificationPreferences } = body

    if (!memberId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Member ID is required" },
        { status: 400 }
      )
    }

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
      // Prevent demoting the only owner
      if (member.role === "owner") {
        const members = await db.members.findByOrganizationId(auth.organization.id)
        const ownerCount = members.filter(m => m.role === "owner").length
        if (ownerCount <= 1) {
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
    if (role !== undefined && isAdmin(auth)) updates.role = role
    if (timezone !== undefined) updates.timezone = timezone
    if (eodReminderTime !== undefined) updates.eodReminderTime = eodReminderTime
    if (notificationPreferences !== undefined) updates.notificationPreferences = notificationPreferences

    await db.members.update(member.id, updates)

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
    console.error("Update member error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update member" },
      { status: 500 }
    )
  }
}

// DELETE /api/members - Remove a member from the organization
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can remove members" },
        { status: 403 }
      )
    }

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

    await db.members.delete(member.id)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Member removed successfully",
    })
  } catch (error) {
    console.error("Remove member error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to remove member" },
      { status: 500 }
    )
  }
}
