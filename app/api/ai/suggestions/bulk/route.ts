import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import {
  getSuggestions,
  bulkRejectSuggestions,
  approveSuggestion,
  type ApprovalResult,
} from "@/lib/ai/suggestions"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse, AISuggestion, AssignedTask } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

interface BulkActionRequest {
  action: "approve" | "reject"
  suggestionIds: string[]
  reviewerNotes?: string
}

interface BulkActionResponse {
  processed: number
  succeeded: number
  failed: number
  results: Array<{
    suggestionId: string
    success: boolean
    error?: string
    createdEntity?: { type: string; id: string }
  }>
}

/**
 * POST /api/ai/suggestions/bulk
 * Bulk approve or reject suggestions
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
        { success: false, error: "Admin access required" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, suggestionIds, reviewerNotes } = body as BulkActionRequest

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      )
    }

    if (!suggestionIds || !Array.isArray(suggestionIds) || suggestionIds.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "suggestionIds array is required" },
        { status: 400 }
      )
    }

    // Limit bulk operations
    if (suggestionIds.length > 100) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Maximum 100 suggestions per bulk operation" },
        { status: 400 }
      )
    }

    // Verify all suggestions belong to this org
    const suggestions = await getSuggestions(auth.organization.id, {
      status: "pending",
      limit: 200,
    })
    const orgSuggestionIds = new Set(suggestions.map(s => s.id))
    const validIds = suggestionIds.filter(id => orgSuggestionIds.has(id))

    if (validIds.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No valid pending suggestions found" },
        { status: 404 }
      )
    }

    const results: BulkActionResponse["results"] = []

    if (action === "reject") {
      // Bulk reject is simpler
      const rejected = await bulkRejectSuggestions(validIds, auth.user.id, reviewerNotes)

      for (const id of validIds) {
        const wasRejected = rejected.some(s => s.id === id)
        results.push({
          suggestionId: id,
          success: wasRejected,
          error: wasRejected ? undefined : "Failed to reject",
        })
      }
    } else {
      // Bulk approve - process each one
      for (const id of validIds) {
        try {
          const result = await approveSuggestion(
            {
              suggestionId: id,
              reviewedBy: auth.user.id,
              reviewerNotes,
            },
            async (s: AISuggestion) => {
              return await createEntityFromSuggestion(s, auth.organization.id)
            }
          )

          results.push({
            suggestionId: id,
            success: true,
            createdEntity: result.createdEntity
              ? { type: result.createdEntity.type, id: result.createdEntity.id }
              : undefined,
          })
        } catch (error) {
          results.push({
            suggestionId: id,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }
    }

    const succeeded = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json<ApiResponse<BulkActionResponse>>({
      success: true,
      data: {
        processed: results.length,
        succeeded,
        failed,
        results,
      },
    })
  } catch (error) {
    logError(logger, "Bulk suggestion action error", error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bulk action failed",
      },
      { status: 500 }
    )
  }
}

/**
 * Create entity from suggestion (duplicated for simplicity, could be shared)
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

    case "alert":
      return {
        type: "alert",
        id: suggestion.id,
        data: { acknowledged: true, acknowledgedAt: now },
      }

    case "rock_update": {
      const rockData = suggestion.suggestedData as {
        rockId?: string
        progress?: number
        status?: string
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
