import { NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * Recurring Tasks Cron Job
 *
 * Runs daily at 6 AM UTC. Finds recurring tasks completed in the last 24h
 * that don't yet have a follow-on pending instance, then creates the next instance.
 *
 * Configured in vercel.json:
 * { "path": "/api/cron/recurring-tasks", "schedule": "0 6 * * *" }
 */

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const isProduction = process.env.NODE_ENV === "production"

  if (!cronSecret) {
    if (isProduction) {
      logger.error("CRON_SECRET not configured in production - denying request")
      return false
    }
    logger.info("CRON_SECRET not configured, allowing request in development")
    return true
  }

  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${cronSecret}`
}

function computeNextDueDate(currentDueDate: string, recurrence: { type: string; interval: number }): string {
  const date = new Date(currentDueDate)
  const { type, interval } = recurrence

  switch (type) {
    case "daily":
      date.setDate(date.getDate() + interval)
      break
    case "weekly":
      date.setDate(date.getDate() + interval * 7)
      break
    case "monthly":
      date.setMonth(date.getMonth() + interval)
      break
  }

  return date.toISOString().split("T")[0]
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    logger.info({ timestamp: new Date().toISOString() }, "Running recurring tasks cron")

    // Find recurring tasks completed in the last 24h
    const { rows: completedRecurring } = await sql`
      SELECT *
      FROM assigned_tasks
      WHERE recurrence IS NOT NULL
        AND status = 'completed'
        AND completed_at >= NOW() - INTERVAL '24 hours'
    `

    if (completedRecurring.length === 0) {
      return NextResponse.json<ApiResponse<{ processed: number }>>({
        success: true,
        data: { processed: 0 },
        message: "No recurring tasks to process",
      })
    }

    let processed = 0

    for (const task of completedRecurring) {
      try {
        // Check if a follow-on instance already exists (any non-completed task pointing to this one)
        const { rows: existing } = await sql`
          SELECT 1 FROM assigned_tasks
          WHERE parent_recurring_task_id = ${task.id}
            AND status != 'completed'
          LIMIT 1
        `

        if (existing.length > 0) {
          logger.info({ taskId: task.id }, "Follow-on instance already exists, skipping")
          continue
        }

        const recurrence = task.recurrence as { type: string; interval: number }
        if (!recurrence?.type || !recurrence?.interval) {
          logger.warn({ taskId: task.id }, "Invalid recurrence data, skipping")
          continue
        }

        const currentDueDate = task.due_date
          ? (task.due_date instanceof Date ? task.due_date.toISOString().split("T")[0] : String(task.due_date).split("T")[0])
          : new Date().toISOString().split("T")[0]

        // Check if recurrence has ended
        const endDate = recurrence && "endDate" in recurrence ? (recurrence as { endDate?: string }).endDate : undefined
        if (endDate && new Date(currentDueDate) >= new Date(endDate)) {
          logger.info({ taskId: task.id }, "Recurrence end date reached, skipping")
          continue
        }

        const nextDueDate = computeNextDueDate(currentDueDate, recurrence)
        const now = new Date().toISOString()
        const newId = crypto.randomUUID()

        await sql`
          INSERT INTO assigned_tasks (
            id, organization_id, workspace_id, title, description,
            assignee_id, assignee_email, assignee_name,
            assigned_by_id, assigned_by_name, type, rock_id, rock_title,
            priority, due_date, status, completed_at, added_to_eod,
            eod_report_id, recurrence, parent_recurring_task_id,
            source, created_at, updated_at
          ) VALUES (
            ${newId}, ${task.organization_id}, ${task.workspace_id || null},
            ${task.title}, ${task.description || null},
            ${task.assignee_id || null}, ${task.assignee_email || null}, ${task.assignee_name},
            ${task.assigned_by_id || null}, ${task.assigned_by_name || null},
            ${task.type}, ${task.rock_id || null}, ${task.rock_title || null},
            ${task.priority}, ${nextDueDate}, 'pending', null, false,
            null, ${JSON.stringify(recurrence)}::jsonb, ${task.id},
            'manual', ${now}, ${now}
          )
        `

        processed++
        logger.info({ taskId: task.id, newTaskId: newId, nextDueDate }, "Created follow-on recurring task instance")
      } catch (err) {
        logError(logger, `Failed to process recurring task ${task.id}`, err)
      }
    }

    logger.info({ processed }, "Recurring tasks cron completed")

    return NextResponse.json<ApiResponse<{ processed: number }>>({
      success: true,
      data: { processed },
      message: `Processed ${processed} recurring task(s)`,
    })
  } catch (error) {
    logError(logger, "Recurring tasks cron error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to process recurring tasks" },
      { status: 500 }
    )
  }
}
