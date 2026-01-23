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

import { NextRequest } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { withTransaction } from "@/lib/db/transactions"
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

const bulkCompleteSchema = z.object({
  operation: z.literal("complete"),
  taskIds: z.array(z.string().uuid()).min(1).max(100),
})

const bulkDeleteSchema = z.object({
  operation: z.literal("delete"),
  taskIds: z.array(z.string().uuid()).min(1).max(100),
})

const bulkReassignSchema = z.object({
  operation: z.literal("reassign"),
  taskIds: z.array(z.string().uuid()).min(1).max(100),
  newAssigneeId: z.string().uuid(),
})

const bulkChangePrioritySchema = z.object({
  operation: z.literal("changePriority"),
  taskIds: z.array(z.string().uuid()).min(1).max(100),
  priority: z.enum(["high", "medium", "normal"]),
})

const bulkChangeDueDateSchema = z.object({
  operation: z.literal("changeDueDate"),
  taskIds: z.array(z.string().uuid()).min(1).max(100),
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

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return Errors.unauthorized().toResponse()
    }

    // Only admins can perform bulk operations
    if (auth.member.role !== "admin" && auth.member.role !== "owner") {
      return Errors.insufficientPermissions("perform bulk task operations").toResponse()
    }

    const body = await validateBody(request, bulkOperationSchema)

    // Verify all tasks belong to the organization
    const tasks = await db.assignedTasks.findByOrganizationId(auth.organization.id)
    const taskMap = new Map(tasks.map((t) => [t.id, t]))

    const validTaskIds = body.taskIds.filter((id) => taskMap.has(id))

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
      if (task) affectedUserIds.add(task.assigneeId)
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
    logError(logger, "Bulk operation error", error)
    return Errors.internal().toResponse()
  }
}

// ============================================
// OPERATION IMPLEMENTATIONS
// ============================================

async function bulkComplete(
  taskIds: string[],
  taskMap: Map<string, AssignedTask>,
  _organizationId: string,
  _userId: string
): Promise<{ processed: number; skipped: number; errors: string[] }> {
  let processed = 0
  let skipped = 0
  const errors: string[] = []
  const completedAt = new Date().toISOString()

  await withTransaction(async (client) => {
    for (const id of taskIds) {
      const task = taskMap.get(id)
      if (!task) {
        skipped++
        continue
      }

      if (task.status === "completed") {
        skipped++
        continue
      }

      try {
        await client.sql`
          UPDATE assigned_tasks
          SET status = 'completed', completed_at = ${completedAt}, updated_at = NOW()
          WHERE id = ${id}
        `
        processed++
      } catch (error) {
        errors.push(`Failed to complete task ${id}`)
        skipped++
      }
    }
  })

  return { processed, skipped, errors }
}

async function bulkDelete(
  taskIds: string[],
  organizationId: string,
  _userId: string
): Promise<{ processed: number; skipped: number; errors: string[] }> {
  let processed = 0
  const errors: string[] = []

  await withTransaction(async (client) => {
    for (const id of taskIds) {
      try {
        await client.sql`
          DELETE FROM assigned_tasks
          WHERE id = ${id} AND organization_id = ${organizationId}
        `
        processed++
      } catch (error) {
        errors.push(`Failed to delete task ${id}`)
      }
    }
  })

  return { processed, skipped: taskIds.length - processed, errors }
}

async function bulkReassign(
  taskIds: string[],
  newAssigneeId: string,
  taskMap: Map<string, AssignedTask>,
  organizationId: string,
  _userId: string
): Promise<{ processed: number; skipped: number; errors: string[] }> {
  let processed = 0
  let skipped = 0
  const errors: string[] = []

  // Verify new assignee exists
  const members = await db.members.findByOrganizationId(organizationId)
  const assignee = members.find((m: { id: string; status?: string }) => m.id === newAssigneeId && m.status === "active")

  if (!assignee) {
    return { processed: 0, skipped: taskIds.length, errors: ["Invalid assignee"] }
  }

  await withTransaction(async (client) => {
    for (const id of taskIds) {
      const task = taskMap.get(id)
      if (!task) {
        skipped++
        continue
      }

      try {
        await client.sql`
          UPDATE assigned_tasks
          SET assignee_id = ${newAssigneeId}, assignee_name = ${assignee.name}, updated_at = NOW()
          WHERE id = ${id}
        `
        processed++
      } catch (error) {
        errors.push(`Failed to reassign task ${id}`)
        skipped++
      }
    }
  })

  return { processed, skipped, errors }
}

async function bulkChangePriority(
  taskIds: string[],
  priority: "high" | "medium" | "normal",
  taskMap: Map<string, AssignedTask>,
  _organizationId: string,
  _userId: string
): Promise<{ processed: number; skipped: number; errors: string[] }> {
  let processed = 0
  let skipped = 0
  const errors: string[] = []

  await withTransaction(async (client) => {
    for (const id of taskIds) {
      const task = taskMap.get(id)
      if (!task) {
        skipped++
        continue
      }

      try {
        await client.sql`
          UPDATE assigned_tasks
          SET priority = ${priority}, updated_at = NOW()
          WHERE id = ${id}
        `
        processed++
      } catch (error) {
        errors.push(`Failed to change priority for task ${id}`)
        skipped++
      }
    }
  })

  return { processed, skipped, errors }
}

async function bulkChangeDueDate(
  taskIds: string[],
  dueDate: string,
  taskMap: Map<string, AssignedTask>,
  _organizationId: string,
  _userId: string
): Promise<{ processed: number; skipped: number; errors: string[] }> {
  let processed = 0
  let skipped = 0
  const errors: string[] = []

  await withTransaction(async (client) => {
    for (const id of taskIds) {
      const task = taskMap.get(id)
      if (!task) {
        skipped++
        continue
      }

      try {
        await client.sql`
          UPDATE assigned_tasks
          SET due_date = ${dueDate}, updated_at = NOW()
          WHERE id = ${id}
        `
        processed++
      } catch (error) {
        errors.push(`Failed to change due date for task ${id}`)
        skipped++
      }
    }
  })

  return { processed, skipped, errors }
}
