import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { generateId } from "@/lib/auth/password"
import type { Rock, ApiResponse } from "@/lib/types"

// GET /api/rocks - Get rocks
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    let rocks: Rock[]

    if (userId) {
      // Get specific user's rocks (admin only for other users)
      if (userId !== auth.user.id && !isAdmin(auth)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "You can only view your own rocks" },
          { status: 403 }
        )
      }
      rocks = await db.rocks.findByUserId(userId, auth.organization.id)
    } else if (isAdmin(auth)) {
      // Admins can see all rocks
      rocks = await db.rocks.findByOrganizationId(auth.organization.id)
    } else {
      // Regular members see only their rocks
      rocks = await db.rocks.findByUserId(auth.user.id, auth.organization.id)
    }

    return NextResponse.json<ApiResponse<Rock[]>>({
      success: true,
      data: rocks,
    })
  } catch (error) {
    console.error("Get rocks error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get rocks" },
      { status: 500 }
    )
  }
}

// POST /api/rocks - Create a new rock
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      dueDate,
      bucket,
      outcome,
      doneWhen,
      userId,
      quarter,
    } = body

    if (!title || !description || !dueDate) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Title, description, and due date are required" },
        { status: 400 }
      )
    }

    // Determine which user the rock belongs to
    let targetUserId = auth.user.id
    if (userId && userId !== auth.user.id) {
      if (!isAdmin(auth)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Only admins can create rocks for other users" },
          { status: 403 }
        )
      }
      // Verify target user is in the organization
      const targetMember = await db.members.findByOrgAndUser(auth.organization.id, userId)
      if (!targetMember) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "User is not a member of this organization" },
          { status: 404 }
        )
      }
      targetUserId = userId
    }

    const now = new Date().toISOString()
    const rock: Rock = {
      id: generateId(),
      organizationId: auth.organization.id,
      userId: targetUserId,
      title: title.trim(),
      description: description.trim(),
      progress: 0,
      dueDate,
      status: "on-track",
      createdAt: now,
      updatedAt: now,
      bucket,
      outcome,
      doneWhen: doneWhen || [],
      quarter,
    }

    await db.rocks.create(rock)

    return NextResponse.json<ApiResponse<Rock>>({
      success: true,
      data: rock,
      message: "Rock created successfully",
    })
  } catch (error) {
    console.error("Create rock error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create rock" },
      { status: 500 }
    )
  }
}

// PATCH /api/rocks - Update a rock
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
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Rock ID is required" },
        { status: 400 }
      )
    }

    const rock = await db.rocks.findById(id)
    if (!rock) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Rock not found" },
        { status: 404 }
      )
    }

    // Verify rock belongs to this organization
    if (rock.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Rock not found" },
        { status: 404 }
      )
    }

    // Check permissions - users can update their own rocks, admins can update any
    if (rock.userId !== auth.user.id && !isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You can only update your own rocks" },
        { status: 403 }
      )
    }

    // Update progress status based on progress value
    if (updates.progress !== undefined) {
      if (updates.progress >= 100) {
        updates.status = "completed"
      } else if (rock.status === "completed" && updates.progress < 100) {
        updates.status = "on-track"
      }
    }

    const updatedRock = await db.rocks.update(id, updates)

    return NextResponse.json<ApiResponse<Rock | null>>({
      success: true,
      data: updatedRock,
      message: "Rock updated successfully",
    })
  } catch (error) {
    console.error("Update rock error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update rock" },
      { status: 500 }
    )
  }
}

// DELETE /api/rocks - Delete a rock
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Rock ID is required" },
        { status: 400 }
      )
    }

    const rock = await db.rocks.findById(id)
    if (!rock) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Rock not found" },
        { status: 404 }
      )
    }

    // Verify rock belongs to this organization
    if (rock.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Rock not found" },
        { status: 404 }
      )
    }

    // Only admins or the rock owner can delete
    if (rock.userId !== auth.user.id && !isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You can only delete your own rocks" },
        { status: 403 }
      )
    }

    await db.rocks.delete(id)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Rock deleted successfully",
    })
  } catch (error) {
    console.error("Delete rock error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete rock" },
      { status: 500 }
    )
  }
}
