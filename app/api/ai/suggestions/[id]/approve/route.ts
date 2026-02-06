import { NextRequest, NextResponse } from "next/server"
import { withAdmin, type RouteContext } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import {
  getSuggestionById,
  approveSuggestion,
  type ApprovalResult,
} from "@/lib/ai/suggestions"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse, AISuggestion, AssignedTask } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/ai/suggestions/[id]/approve
 * Approve a suggestion and create the corresponding entity
 */
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Extract id from URL path since middleware wrapper doesn't pass params directly
    const url = new URL(request.url)
    const pathParts = url.pathname.split("/")
    // Path: /api/ai/suggestions/[id]/approve
    const idIndex = pathParts.indexOf("suggestions") + 1
    const id = pathParts[idIndex]

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Suggestion ID is required" },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { modifiedData, reviewerNotes } = body as {
      modifiedData?: Record<string, unknown>
      reviewerNotes?: string
    }

    // Verify suggestion exists and belongs to this org
    const suggestion = await getSuggestionById(id)
    if (!suggestion) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Suggestion not found" },
        { status: 404 }
      )
    }

    if (suggestion.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Suggestion not found" },
        { status: 404 }
      )
    }

    if (suggestion.status !== "pending") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Suggestion is already ${suggestion.status}` },
        { status: 400 }
      )
    }

    // Create entity based on suggestion type
    const result = await approveSuggestion(
      {
        suggestionId: id,
        reviewedBy: auth.user.id,
        reviewerNotes,
        modifiedData,
      },
      async (s: AISuggestion) => {
        return await createEntityFromSuggestion(s, auth.organization.id)
      }
    )

    return NextResponse.json<ApiResponse<ApprovalResult>>({
      success: true,
      data: result,
    })
  } catch (error) {
    logError(logger, "Approve suggestion error", error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to approve suggestion",
      },
      { status: 500 }
    )
  }
})

/**
 * Create the appropriate entity based on suggestion type
 */
async function createEntityFromSuggestion(
  suggestion: AISuggestion,
  organizationId: string
): Promise<{ type: string; id: string; data: Record<string, unknown> } | null> {
  const now = new Date().toISOString()

  switch (suggestion.suggestionType) {
    case "task":
    case "follow_up": {
      const taskData = suggestion.suggestedData as {
        title?: string
        description?: string
        priority?: string
        dueDate?: string
      }

      const task: AssignedTask = {
        id: generateId(),
        organizationId,
        title: taskData.title || suggestion.title,
        description: taskData.description || suggestion.description,
        assigneeId: suggestion.targetUserId || "",
        assigneeName: suggestion.targetUserName || "Unassigned",
        assignedById: null,
        assignedByName: null,
        type: "assigned",
        rockId: null,
        rockTitle: null,
        priority: (taskData.priority as "low" | "medium" | "high" | "normal") || "medium",
        status: "pending",
        dueDate: taskData.dueDate || null,
        createdAt: now,
        source: "ai_suggestion",
      }

      const created = await db.assignedTasks.create(task)

      return {
        type: "task",
        id: created.id,
        data: created as unknown as Record<string, unknown>,
      }
    }

    case "blocker": {
      // Blockers become high-priority tasks
      const blockerData = suggestion.suggestedData as {
        title?: string
        description?: string
        severity?: string
      }

      const task: AssignedTask = {
        id: generateId(),
        organizationId,
        title: `[Blocker] ${blockerData.title || suggestion.title}`,
        description: blockerData.description || suggestion.description || suggestion.context,
        assigneeId: suggestion.targetUserId || "",
        assigneeName: suggestion.targetUserName || "Unassigned",
        assignedById: null,
        assignedByName: null,
        type: "assigned",
        rockId: null,
        rockTitle: null,
        priority: blockerData.severity === "high" ? "high" : "medium",
        status: "pending",
        dueDate: null,
        createdAt: now,
        source: "ai_suggestion",
      }

      const created = await db.assignedTasks.create(task)

      return {
        type: "task",
        id: created.id,
        data: created as unknown as Record<string, unknown>,
      }
    }

    case "alert": {
      // Alerts are logged but don't create entities
      // Could trigger notifications instead
      return {
        type: "alert",
        id: suggestion.id,
        data: {
          acknowledged: true,
          acknowledgedAt: now,
        },
      }
    }

    case "rock_update": {
      // Rock updates modify existing rocks
      const rockData = suggestion.suggestedData as {
        rockId?: string
        progress?: number
        status?: string
        note?: string
      }

      if (rockData.rockId) {
        await db.rocks.update(rockData.rockId, {
          progress: rockData.progress,
          status: rockData.status as "on-track" | "at-risk" | "blocked" | "completed" | undefined,
        })

        return {
          type: "rock_update",
          id: rockData.rockId,
          data: rockData,
        }
      }

      return null
    }

    default:
      return null
  }
}
