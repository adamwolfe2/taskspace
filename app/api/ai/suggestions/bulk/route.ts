import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import {
  getSuggestions,
  bulkRejectSuggestions,
  approveSuggestion,
} from "@/lib/ai/suggestions"
import { generateId } from "@/lib/auth/password"
import { aiRateLimit } from "@/lib/api/rate-limit"
import type { ApiResponse, AISuggestion, AssignedTask } from "@/lib/types"
import { validateBody } from "@/lib/validation/middleware"
import { aiBulkSuggestionSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"

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
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Rate limit: 20 bulk suggestion operations per user per hour
    const rateCheck = aiRateLimit(auth.user.id, 'suggestions-bulk')
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
    }

    const { action, suggestionIds, reviewerNotes } = await validateBody(request, aiBulkSuggestionSchema)

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
      // Bulk approve - process in batches of 5 for concurrency
      const BATCH_SIZE = 5
      for (let i = 0; i < validIds.length; i += BATCH_SIZE) {
        const batch = validIds.slice(i, i + BATCH_SIZE)
        const batchResults = await Promise.allSettled(
          batch.map(async (id) => {
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
            return { id, result }
          })
        )

        for (const settled of batchResults) {
          if (settled.status === 'fulfilled') {
            const { id, result } = settled.value
            results.push({
              suggestionId: id,
              success: true,
              createdEntity: result.createdEntity
                ? { type: result.createdEntity.type, id: result.createdEntity.id }
                : undefined,
            })
          } else {
            const err = settled.reason
            // Extract the suggestion id from the error or batch index
            const batchIndex = batchResults.indexOf(settled)
            const failedId = batch[batchIndex]
            logError(logger, `Bulk approve failed for suggestion ${failedId}`, err)
            results.push({
              suggestionId: failedId,
              success: false,
              error: err instanceof Error ? err.message : "Unknown error",
            })
          }
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
        error: "Bulk action failed",
      },
      { status: 500 }
    )
  }
})

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
        // SECURITY: Verify rock belongs to this organization before updating
        const rock = await db.rocks.findById(rockData.rockId, organizationId)
        if (!rock || rock.organizationId !== organizationId) {
          return null
        }

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
