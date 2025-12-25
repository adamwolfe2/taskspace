import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { generateId } from "@/lib/auth/password"
import type { TeamMember, OrganizationMember, ApiResponse } from "@/lib/types"

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

    const members = await db.members.findByOrganizationId(auth.organization.id)

    // Build full team member objects by joining with user data
    const teamMembers: TeamMember[] = []

    for (const member of members) {
      const user = await db.users.findById(member.userId)
      if (user) {
        teamMembers.push({
          id: user.id,
          name: user.name,
          email: user.email,
          role: member.role,
          department: member.department,
          avatar: user.avatar,
          joinDate: member.joinedAt,
          weeklyMeasurable: member.weeklyMeasurable,
          status: member.status,
        })
      }
    }

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
    const { memberId, department, weeklyMeasurable, role } = body

    if (!memberId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Member ID is required" },
        { status: 400 }
      )
    }

    // Get the member record
    const member = await db.members.findByOrgAndUser(auth.organization.id, memberId)
    if (!member) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Member not found" },
        { status: 404 }
      )
    }

    // Check permissions - admins can update members, users can only update themselves
    const isSelf = memberId === auth.user.id
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

    await db.members.update(member.id, updates)

    // Get updated member with user data
    const user = await db.users.findById(memberId)
    const updatedMember = await db.members.findByOrgAndUser(auth.organization.id, memberId)

    if (!user || !updatedMember) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to retrieve updated member" },
        { status: 500 }
      )
    }

    const teamMember: TeamMember = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: updatedMember.role,
      department: updatedMember.department,
      avatar: user.avatar,
      joinDate: updatedMember.joinedAt,
      weeklyMeasurable: updatedMember.weeklyMeasurable,
      status: updatedMember.status,
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

    const member = await db.members.findByOrgAndUser(auth.organization.id, memberId)
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
