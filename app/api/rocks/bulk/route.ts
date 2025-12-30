import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { generateId } from "@/lib/auth/password"
import type { Rock, ApiResponse } from "@/lib/types"

interface BulkRockInput {
  title: string
  description: string
  milestones: string[]
  quarter?: string
  dueDate?: string
}

interface BulkCreateResponse {
  created: Rock[]
  failed: Array<{ title: string; error: string }>
}

/**
 * POST /api/rocks/bulk
 * Create multiple rocks at once for a user
 */
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
        { success: false, error: "Only admins can bulk create rocks" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { rocks, userId } = body as { rocks: BulkRockInput[]; userId: string }

    if (!rocks || !Array.isArray(rocks) || rocks.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "At least one rock is required" },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "User ID is required" },
        { status: 400 }
      )
    }

    // Verify target user is in the organization
    // The userId from frontend can be either:
    // 1. A user.id (for active members who have registered)
    // 2. An organization_member.id (for draft members who haven't registered yet)
    //
    // IMPORTANT: rocks.user_id has a foreign key constraint to users.id,
    // so we can only create rocks for active members with valid user accounts.

    // First, try to find by user_id (active members)
    let targetMember = await db.members.findByOrgAndUser(auth.organization.id, userId)
    let rockUserId: string

    if (targetMember) {
      // Found an active member - use their user.id
      rockUserId = targetMember.userId!
    } else {
      // Not found by user_id, try to find by organization_member.id (draft members)
      targetMember = await db.members.findByOrgAndId(auth.organization.id, userId)

      if (!targetMember) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "User is not a member of this organization" },
          { status: 404 }
        )
      }

      // Check if this member has a linked user account
      if (!targetMember.userId) {
        // Draft member without a user account - cannot create rocks due to FK constraint
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: `Cannot create rocks for ${targetMember.name || targetMember.email} - they need to accept their invitation and create an account first.`
          },
          { status: 400 }
        )
      }

      // Member found by organization_member.id but has a user account
      rockUserId = targetMember.userId
    }

    // Calculate default due date (end of current quarter)
    const now = new Date()
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1
    const quarterEndMonth = currentQuarter * 3
    const defaultDueDate = new Date(now.getFullYear(), quarterEndMonth, 0).toISOString().split("T")[0]
    const defaultQuarter = `Q${currentQuarter} ${now.getFullYear()}`

    const result: BulkCreateResponse = {
      created: [],
      failed: [],
    }

    for (const rockInput of rocks) {
      try {
        if (!rockInput.title || rockInput.title.trim().length < 2) {
          result.failed.push({ title: rockInput.title || "Untitled", error: "Title is required" })
          continue
        }

        const timestamp = new Date().toISOString()
        const rock: Rock = {
          id: generateId(),
          organizationId: auth.organization.id,
          userId: rockUserId,
          title: rockInput.title.trim(),
          description: rockInput.description?.trim() || "",
          progress: 0,
          dueDate: rockInput.dueDate || defaultDueDate,
          status: "on-track",
          createdAt: timestamp,
          updatedAt: timestamp,
          doneWhen: rockInput.milestones || [],
          quarter: rockInput.quarter || defaultQuarter,
        }

        await db.rocks.create(rock)
        result.created.push(rock)
      } catch (err) {
        console.error(`Failed to create rock "${rockInput.title}":`, err)
        result.failed.push({
          title: rockInput.title,
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    }

    const successCount = result.created.length
    const failCount = result.failed.length

    // If all rocks failed, include the first error message in the error field
    const errorMessage = successCount === 0 && failCount > 0
      ? result.failed[0]?.error || "All rocks failed to create"
      : undefined

    return NextResponse.json<ApiResponse<BulkCreateResponse>>({
      success: successCount > 0,
      data: result,
      error: errorMessage,
      message:
        failCount === 0
          ? `Successfully created ${successCount} rock(s)`
          : `Created ${successCount} rock(s), ${failCount} failed`,
    })
  } catch (error) {
    console.error("Bulk rock create error:", error)
    const errorMessage = error instanceof Error
      ? error.message
      : "Failed to create rocks"
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
