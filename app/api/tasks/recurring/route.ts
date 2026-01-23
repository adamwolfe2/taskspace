/**
 * Recurring Task Templates API
 *
 * Manages recurring task templates:
 * - Create/update/delete recurring templates
 * - View all templates and their status
 * - Manually trigger task generation
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { Errors, successResponse } from "@/lib/api/errors"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { logTaskEvent } from "@/lib/audit/logger"
import { logger, logError } from "@/lib/logger"
import {
  createRecurringTask,
  updateRecurringTask,
  deleteRecurringTask,
  getRecurringTasks,
  processDueRecurringTasks,
  type RecurrenceRule,
} from "@/lib/scheduler/recurring-tasks"
import { z } from "zod"

// ============================================
// VALIDATION SCHEMAS
// ============================================

const recurrenceRuleSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.number().int().min(1).max(365),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  monthOfYear: z.number().int().min(1).max(12).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  maxOccurrences: z.number().int().min(1).max(1000).optional(),
  skipWeekends: z.boolean().optional(),
  skipHolidays: z.boolean().optional(),
})

const createRecurringTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  priority: z.enum(["high", "medium", "normal"]).default("normal"),
  defaultAssigneeId: z.string().uuid().optional(),
  estimatedMinutes: z.number().int().min(1).max(480).optional(),
  labels: z.array(z.string().max(50)).max(10).optional(),
  recurrenceRule: recurrenceRuleSchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const updateRecurringTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(["high", "medium", "normal"]).optional(),
  defaultAssigneeId: z.string().uuid().optional(),
  estimatedMinutes: z.number().int().min(1).max(480).optional(),
  labels: z.array(z.string().max(50)).max(10).optional(),
  recurrenceRule: recurrenceRuleSchema.optional(),
  isActive: z.boolean().optional(),
})

// ============================================
// GET - List Recurring Task Templates
// ============================================

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return Errors.unauthorized().toResponse()
    }

    const templates = await getRecurringTasks(auth.organization.id)

    return successResponse({
      templates,
      count: templates.length,
    })
  } catch (error) {
    logError(logger, "Error fetching recurring tasks", error)
    return Errors.internal().toResponse()
  }
}

// ============================================
// POST - Create Recurring Task Template
// ============================================

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return Errors.unauthorized().toResponse()
    }

    // Only admins can create recurring tasks
    if (auth.member.role !== "admin" && auth.member.role !== "owner") {
      return Errors.insufficientPermissions("create recurring tasks").toResponse()
    }

    const body = await validateBody(request, createRecurringTaskSchema)

    const templateId = await createRecurringTask(
      auth.organization.id,
      auth.user.id,
      {
        title: body.title,
        description: body.description,
        priority: body.priority,
        defaultAssigneeId: body.defaultAssigneeId,
        estimatedMinutes: body.estimatedMinutes,
        labels: body.labels,
        recurrenceRule: body.recurrenceRule as RecurrenceRule,
        startDate: body.startDate,
      }
    )

    await logTaskEvent(
      "task.recurring_created",
      auth.organization.id,
      auth.user.id,
      templateId,
      {
        title: body.title,
        frequency: body.recurrenceRule.frequency,
        interval: body.recurrenceRule.interval,
      }
    )

    return successResponse({
      id: templateId,
      message: "Recurring task template created successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return Errors.validationError(error.message).toResponse()
    }
    logError(logger, "Error creating recurring task", error)
    return Errors.internal().toResponse()
  }
}

// ============================================
// PATCH - Update Recurring Task Template
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return Errors.unauthorized().toResponse()
    }

    if (auth.member.role !== "admin" && auth.member.role !== "owner") {
      return Errors.insufficientPermissions("update recurring tasks").toResponse()
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get("id")

    if (!templateId) {
      return Errors.validationError("Template ID is required").toResponse()
    }

    const body = await validateBody(request, updateRecurringTaskSchema)

    await updateRecurringTask(templateId, auth.organization.id, {
      title: body.title,
      description: body.description,
      priority: body.priority,
      defaultAssigneeId: body.defaultAssigneeId,
      estimatedMinutes: body.estimatedMinutes,
      labels: body.labels,
      recurrenceRule: body.recurrenceRule as RecurrenceRule | undefined,
      isActive: body.isActive,
    })

    await logTaskEvent(
      "task.recurring_updated",
      auth.organization.id,
      auth.user.id,
      templateId,
      { updates: Object.keys(body) }
    )

    return successResponse({
      message: "Recurring task template updated successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return Errors.validationError(error.message).toResponse()
    }
    logError(logger, "Error updating recurring task", error)
    return Errors.internal().toResponse()
  }
}

// ============================================
// DELETE - Remove Recurring Task Template
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return Errors.unauthorized().toResponse()
    }

    if (auth.member.role !== "admin" && auth.member.role !== "owner") {
      return Errors.insufficientPermissions("delete recurring tasks").toResponse()
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get("id")

    if (!templateId) {
      return Errors.validationError("Template ID is required").toResponse()
    }

    await deleteRecurringTask(templateId, auth.organization.id)

    await logTaskEvent(
      "task.recurring_deleted",
      auth.organization.id,
      auth.user.id,
      templateId,
      {}
    )

    return successResponse({
      message: "Recurring task template deleted successfully",
    })
  } catch (error) {
    logError(logger, "Error deleting recurring task", error)
    return Errors.internal().toResponse()
  }
}

// ============================================
// PUT - Manually Process Due Tasks
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return Errors.unauthorized().toResponse()
    }

    // Only admins can manually trigger processing
    if (auth.member.role !== "admin" && auth.member.role !== "owner") {
      return Errors.insufficientPermissions("process recurring tasks").toResponse()
    }

    const processed = await processDueRecurringTasks()

    await logTaskEvent(
      "task.recurring_processed",
      auth.organization.id,
      auth.user.id,
      "manual",
      { tasksGenerated: processed }
    )

    return successResponse({
      processed,
      message: `Processed ${processed} recurring task(s)`,
    })
  } catch (error) {
    logError(logger, "Error processing recurring tasks", error)
    return Errors.internal().toResponse()
  }
}
