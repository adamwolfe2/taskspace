/**
 * Bulk Task Operations API
 *
 * Provides enterprise-grade bulk operations for tasks:
 * - Bulk complete
 * - Bulk delete
 * - Bulk reassign
 * - Bulk priority change
 * - Bulk due date change
 */

import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { logTaskEvent } from "@/lib/audit/logger"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { Errors, successResponse } from "@/lib/api/errors"
import { invalidateTaskCache } from "@/lib/cache"
import { z } from "zod"
import type { AssignedTask } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// ============================================
// VALIDATION SCHEMAS
// ============================================

// TaskSpace uses 24-char hex IDs (not standard UUIDs)
const idString = z.string().min(1, "ID is required")

const bulkCompleteSchema = z.object({
  operation: z.literal("complete"),
  taskIds: z.array(idString).min(1).max(100),
})

const bulkDeleteSchema = z.object({
  operation: z.literal("delete"),
  taskIds: z.array(idString).min(1).max(100),
})

const bulkReassignSchema = z.object({
  operation: z.literal("reassign"),
  taskIds: z.array(idString).min(1).max(100),
  newAssigneeId: idString,
})

const bulkChangePrioritySchema = z.object({
  operation: z.literal("changePriority"),
  taskIds: z.array(idString).min(1).max(100),
  priority: z.enum(["high", "medium", "normal"]),
})

const bulkChangeDueDateSchema = z.object({
  operation: z.literal("changeDueDate"),
  taskIds: z.array(idString).min(1).max(100),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const bulkOperationSchema = z.discriminatedUnion("operation", [
  bulkCompleteSchema,
  bulkDeleteSchema,
  bulkReassignSchema,
  bulkChangePrioritySchema,
  bulkChangeDueDateSchema,
])

// ============================================
// BULK OPERATIONS HANDLER
// ============================================

export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    const body = await validateBody(request, bulkOperationSchema)

    // Verify all tasks belong to the organization (targeted query, not full table scan)
    const taskIdArray = `{${body.taskIds.join(",")}}`
    const { rows: validRows } = await sql<{ id: string; assignee_id: string; status: string }>`
      SELECT id, assignee_id, status
      FROM assigned_tasks
      WHERE organization_id = ${auth.organization.id}
        AND id = ANY(${taskIdArray}::text[])
    `
    const taskMap = new Map(validRows.map((t) => [t.id, { id: t.id, assigneeId: t.assignee_id, status: t.status } as unknown as AssignedTask]))

    const validTaskIds = validRows.map((r) => r.id)

    if (validTaskIds.length === 0) {
      return Errors.validationError("No valid tasks found for this operation").toResponse()
    }

    let result: {
      processed: number
      skipped: number
      errors: string[]
    }

    switch (body.operation) {
      case "complete":
        result = await bulkComplete(
          validTaskIds,
          taskMap,
          auth.organization.id,
          auth.user.id
        )
        break

      case "delete":
        result = await bulkDelete(
          validTaskIds,
          auth.organization.id,
          auth.user.id
        )
        break

      case "reassign":
        result = await bulkReassign(
          validTaskIds,
          body.newAssigneeId,
          taskMap,
          auth.organization.id,
          auth.user.id
        )
        break

      case "changePriority":
        result = await bulkChangePriority(
          validTaskIds,
          body.priority,
          taskMap,
          auth.organization.id,
          auth.user.id
        )
        break

      case "changeDueDate":
        result = await bulkChangeDueDate(
          validTaskIds,
          body.dueDate,
          taskMap,
          auth.organization.id,
          auth.user.id
        )
        break

      default:
        return Errors.validationError("Invalid operation").toResponse()
    }

    // Invalidate caches
    const affectedUserIds = new Set<string>()
    validTaskIds.forEach((id) => {
      const task = taskMap.get(id)
      if (task && task.assigneeId) affectedUserIds.add(task.assigneeId)
    })
    affectedUserIds.forEach((userId) => {
      invalidateTaskCache(auth.organization.id, userId)
    })

    // Log the bulk operation
    await logTaskEvent(
      "task.bulk_operation",
      auth.organization.id,
      auth.user.id,
      "bulk",
      {
        operation: body.operation,
        taskCount: result.processed,
        skipped: result.skipped,
      }
    )

    return successResponse({
      operation: body.operation,
      processed: result.processed,
      skipped: result.skipped,
      errors: result.errors,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return Errors.validationError(error.message).toResponse()
    }
    const errMsg = error instanceof Error ? error.message : String(error)
    logError(logger, "Bulk operation error", error)
    return NextResponse.json(
      { success: false, error: `Bulk operation failed: ${errMsg}` },
      { status: 500 }
    )
  }
})

// ============================================
// OPERATION IMPLEMENTATIONS
// ============================================

async function bulkComplete(
  taskIds: string[],
  taskMap: Map<string, AssignedTask>,
  organizationId: string,
  _userId: string
): Promise<{ processed: number; skipped: number; errors: string[] }> {
  // Pre-filter to only tasks not already completed
  const eligibleIds = taskIds.filter((id) => taskMap.get(id)?.status !== "completed")
  const alreadyDone = taskIds.length - eligibleIds.length

  if (eligibleIds.length === 0) {
    return { processed: 0, skipped: alreadyDone, errors: [] }
  }

  const completedAt = new Date().toISOString()
  const eligibleIdArray = `{${eligibleIds.join(",")}}`
  const { rowCount } = await sql`
    UPDATE assigned_tasks
    SET status = 'completed', completed_at = ${completedAt}, updated_at = NOW()
    WHERE id = ANY(${eligibleIdArray}::text[])
      AND organization_id = ${organizationId}
      AND status != 'completed'
  `

  const processed = rowCount ?? 0
  return { processed, skipped: taskIds.length - processed, errors: [] }
}

async function bulkDelete(
  taskIds: string[],
  organizationId: string,
  _userId: string
): Promise<{ processed: number; skipped: number; errors: string[] }> {
  const taskIdArray = `{${taskIds.join(",")}}`
  const { rowCount } = await sql`
    DELETE FROM assigned_tasks
    WHERE id = ANY(${taskIdArray}::text[])
      AND organization_id = ${organizationId}
  `

  const processed = rowCount ?? 0
  return { processed, skipped: taskIds.length - processed, errors: [] }
}

async function bulkReassign(
  taskIds: string[],
  newAssigneeId: string,
  taskMap: Map<string, AssignedTask>,
  organizationId: string,
  _userId: string
): Promise<{ processed: number; skipped: number; errors: string[] }> {
  // Verify new assignee exists — look up by id OR user_id since frontend may pass either
  const { rows: assigneeRows } = await sql<{ id: string; user_id: string; name: string }>`
    SELECT id, user_id, name FROM organization_members
    WHERE (id = ${newAssigneeId} OR user_id = ${newAssigneeId})
      AND organization_id = ${organizationId} AND status = 'active'
    LIMIT 1
  `
  const assignee = assigneeRows[0]

  if (!assignee) {
    return { processed: 0, skipped: taskIds.length, errors: ["Invalid assignee"] }
  }

  // assigned_tasks.assignee_id stores users.id, not org_members.id
  const assigneeUserId = assignee.user_id || assignee.id

  const eligibleIds = taskIds.filter((id) => taskMap.has(id))
  const eligibleIdArray = `{${eligibleIds.join(",")}}`

  const { rowCount } = await sql`
    UPDATE assigned_tasks
    SET assignee_id = ${assigneeUserId}, assignee_name = ${assignee.name}, updated_at = NOW()
    WHERE id = ANY(${eligibleIdArray}::text[])
      AND organization_id = ${organizationId}
  `

  const processed = rowCount ?? 0
  return { processed, skipped: taskIds.length - processed, errors: [] }
}

async function bulkChangePriority(
  taskIds: string[],
  priority: "high" | "medium" | "normal",
  taskMap: Map<string, AssignedTask>,
  organizationId: string,
  _userId: string
): Promise<{ processed: number; skipped: number; errors: string[] }> {
  const eligibleIds = taskIds.filter((id) => taskMap.has(id))
  const eligibleIdArray = `{${eligibleIds.join(",")}}`

  const { rowCount } = await sql`
    UPDATE assigned_tasks
    SET priority = ${priority}, updated_at = NOW()
    WHERE id = ANY(${eligibleIdArray}::text[])
      AND organization_id = ${organizationId}
  `

  const processed = rowCount ?? 0
  return { processed, skipped: taskIds.length - processed, errors: [] }
}

async function bulkChangeDueDate(
  taskIds: string[],
  dueDate: string,
  taskMap: Map<string, AssignedTask>,
  organizationId: string,
  _userId: string
): Promise<{ processed: number; skipped: number; errors: string[] }> {
  const eligibleIds = taskIds.filter((id) => taskMap.has(id))
  const eligibleIdArray = `{${eligibleIds.join(",")}}`

  const { rowCount } = await sql`
    UPDATE assigned_tasks
    SET due_date = ${dueDate}, updated_at = NOW()
    WHERE id = ANY(${eligibleIdArray}::text[])
      AND organization_id = ${organizationId}
  `

  const processed = rowCount ?? 0
  return { processed, skipped: taskIds.length - processed, errors: [] }
}
