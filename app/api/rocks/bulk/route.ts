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
    const targetMember = await db.members.findByOrgAndUser(auth.organization.id, userId)
    if (!targetMember) {
      // Also check for draft members by email
      const allMembers = await db.members.findByOrganizationId(auth.organization.id)
      const draftMember = allMembers.find((m) => m.id === userId)
      if (!draftMember) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "User is not a member of this organization" },
          { status: 404 }
        )
      }
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
          userId,
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

    return NextResponse.json<ApiResponse<BulkCreateResponse>>({
      success: successCount > 0,
      data: result,
      message:
        failCount === 0
          ? `Successfully created ${successCount} rock(s)`
          : `Created ${successCount} rock(s), ${failCount} failed`,
    })
  } catch (error) {
    console.error("Bulk rock create error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create rocks" },
      { status: 500 }
    )
  }
}
