/**
 * Automation Evaluation Engine
 *
 * Evaluates and executes automations when a trigger event fires.
 * Called from feature-specific API routes (e.g., task completion, EOD submission).
 *
 * Supported trigger types:
 *   "task_completed" | "eod_submitted" | "rock_status_changed" | "meeting_ended" | "scorecard_updated"
 *
 * Supported action types:
 *   "notify"      — create a notification record
 *   "create_task" — insert a new task via SQL
 *   "send_slack"  — POST to configured Slack webhook
 *   "send_email"  — send via Resend
 */

import { sql } from "@/lib/db/sql"
import { generateId } from "@/lib/auth/password"
import { logger, logError } from "@/lib/logger"
import type { Automation, AutomationAction, AutomationTriggerType, NotificationType } from "@/lib/types"
import { sendNotification } from "@/lib/db/notifications"
import { isEmailConfigured } from "@/lib/integrations/email"

const VALID_NOTIFICATION_TYPES: NotificationType[] = [
  "task_assigned", "task_completed", "rock_updated", "eod_reminder",
  "escalation", "invitation", "mention", "meeting_starting", "issue_created", "system",
]

function toNotificationType(value: unknown): NotificationType {
  if (typeof value === "string" && VALID_NOTIFICATION_TYPES.includes(value as NotificationType)) {
    return value as NotificationType
  }
  return "system"
}

// ============================================
// ROW PARSER
// ============================================

function parseAutomation(row: Record<string, unknown>): Automation {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    description: (row.description as string) || undefined,
    triggerType: row.trigger_type as AutomationTriggerType,
    triggerConfig: (row.trigger_config as Record<string, unknown>) || {},
    actions: (row.actions as AutomationAction[]) || [],
    isEnabled: row.is_enabled as boolean,
    runCount: (row.run_count as number) || 0,
    lastRunAt: row.last_run_at ? (row.last_run_at as Date).toISOString() : undefined,
    createdBy: (row.created_by as string) || undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

// ============================================
// TRIGGER CONFIG FILTER CHECK
// ============================================

/**
 * Check whether an automation's trigger_config filters match the incoming event.
 * Supports optional filter keys: userId, taskStatus, rockStatus.
 * If a filter key is absent in trigger_config it is treated as "match all".
 */
function matchesTriggerConfig(
  triggerConfig: Record<string, unknown>,
  eventData: Record<string, unknown>
): boolean {
  // userId filter — e.g., only fire for a specific user
  if (triggerConfig.userId && triggerConfig.userId !== eventData.userId) {
    return false
  }

  // taskStatus filter — e.g., only fire when a task moves to "completed"
  if (triggerConfig.taskStatus && triggerConfig.taskStatus !== eventData.taskStatus) {
    return false
  }

  // rockStatus filter — e.g., only fire when a rock changes to "at-risk"
  if (triggerConfig.rockStatus && triggerConfig.rockStatus !== eventData.rockStatus) {
    return false
  }

  // workspaceId filter — can further scope beyond the query-level workspace filter
  if (triggerConfig.workspaceId && triggerConfig.workspaceId !== eventData.workspaceId) {
    return false
  }

  return true
}

// ============================================
// ACTION EXECUTORS
// ============================================

async function executeNotify(
  action: AutomationAction,
  orgId: string,
  workspaceId: string,
  eventData: Record<string, unknown>
): Promise<void> {
  const config = action.config
  const userId = (config.userId || eventData.userId) as string | undefined

  if (!userId) {
    logger.warn({ orgId, action }, "Automation notify action: no userId resolved, skipping")
    return
  }

  await sendNotification({
    organizationId: orgId,
    workspaceId,
    userId,
    type: toNotificationType(config.notificationType),
    title: (config.title as string) || "Automation triggered",
    message: (config.message as string) || undefined,
    link: (config.link as string) || undefined,
  })
}

async function executeCreateTask(
  action: AutomationAction,
  orgId: string,
  workspaceId: string,
  eventData: Record<string, unknown>
): Promise<void> {
  const config = action.config
  const taskId = generateId()
  const assigneeId = (config.assigneeId || eventData.userId) as string | null
  const assigneeName = (config.assigneeName as string) || "Automation"
  const title = (config.title as string) || "Automated Task"
  const description = (config.description as string) || null
  const priority = (config.priority as string) || "normal"
  const dueDate = (config.dueDate as string) || null
  const now = new Date().toISOString()

  await sql`
    INSERT INTO assigned_tasks (
      id, organization_id, workspace_id, title, description,
      assignee_id, assignee_name, assigned_by_id, assigned_by_name,
      type, priority, due_date, status, created_at, updated_at
    ) VALUES (
      ${taskId}, ${orgId}, ${workspaceId}, ${title}, ${description},
      ${assigneeId}, ${assigneeName}, ${null}, ${"Automation"},
      ${"assigned"}, ${priority}, ${dueDate}, ${"pending"}, NOW(), NOW()
    )
  `

  logger.info({ taskId, orgId, workspaceId }, "Automation created task")
}

async function executeSendSlack(
  action: AutomationAction,
  orgId: string,
  eventData: Record<string, unknown>
): Promise<void> {
  const config = action.config
  const webhookUrl = config.webhookUrl as string | undefined

  if (!webhookUrl) {
    logger.warn({ orgId, action }, "Automation send_slack: no webhookUrl configured, skipping")
    return
  }

  const text = (config.message as string) || `Automation triggered: ${JSON.stringify(eventData).slice(0, 200)}`

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    throw new Error(`Slack webhook returned ${response.status}`)
  }
}

async function executeSendEmail(
  action: AutomationAction,
  orgId: string,
  eventData: Record<string, unknown>
): Promise<void> {
  if (!isEmailConfigured()) {
    logger.warn({ orgId }, "Automation send_email: Resend not configured, skipping")
    return
  }

  const config = action.config
  const to = config.to as string | undefined

  if (!to) {
    logger.warn({ orgId, action }, "Automation send_email: no 'to' address configured, skipping")
    return
  }

  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.EMAIL_FROM || "Taskspace <team@trytaskspace.com>"

  await resend.emails.send({
    from,
    to,
    subject: (config.subject as string) || "Taskspace Automation",
    html: `<p>${(config.body as string) || "An automation was triggered."}</p>`,
  })
}

// ============================================
// MAIN EVALUATOR
// ============================================

export async function evaluateAutomations(
  orgId: string,
  workspaceId: string,
  triggerType: AutomationTriggerType,
  eventData: Record<string, unknown>
): Promise<void> {
  let automations: Automation[] = []

  try {
    const { rows } = await sql`
      SELECT * FROM automations
      WHERE org_id = ${orgId}
        AND workspace_id = ${workspaceId}
        AND trigger_type = ${triggerType}
        AND is_enabled = true
    `
    automations = rows.map(parseAutomation)
  } catch (error) {
    logError(logger, "evaluateAutomations: failed to query automations", error)
    return
  }

  if (automations.length === 0) return

  for (const automation of automations) {
    // Wrap each automation independently so one failure doesn't block others
    try {
      // Check trigger_config filters
      if (!matchesTriggerConfig(automation.triggerConfig, eventData)) {
        continue
      }

      const actionsExecuted: Record<string, unknown>[] = []
      let automationStatus: "success" | "partial" | "failed" = "success"
      let lastError: string | undefined

      // Execute each action in order
      for (const action of automation.actions) {
        try {
          switch (action.type) {
            case "notify":
              await executeNotify(action, orgId, workspaceId, eventData)
              break
            case "create_task":
              await executeCreateTask(action, orgId, workspaceId, eventData)
              break
            case "send_slack":
              await executeSendSlack(action, orgId, eventData)
              break
            case "send_email":
              await executeSendEmail(action, orgId, eventData)
              break
            default:
              logger.warn({ automationId: automation.id, actionType: (action as AutomationAction).type }, "Unknown action type")
          }
          actionsExecuted.push({ type: action.type, status: "success" })
        } catch (actionError) {
          const errMsg = actionError instanceof Error ? actionError.message : String(actionError)
          logError(logger, `Automation ${automation.id} action ${action.type} failed`, actionError)
          actionsExecuted.push({ type: action.type, status: "failed", error: errMsg })
          automationStatus = "partial"
          lastError = errMsg
        }
      }

      // Log execution to automation_logs
      const logId = generateId()
      await sql`
        INSERT INTO automation_logs (id, automation_id, trigger_event, actions_executed, status, error, executed_at)
        VALUES (
          ${logId},
          ${automation.id},
          ${JSON.stringify(eventData)}::jsonb,
          ${JSON.stringify(actionsExecuted)}::jsonb,
          ${automationStatus},
          ${lastError ?? null},
          NOW()
        )
      `

      // Update run_count and last_run_at on the automation
      await sql`
        UPDATE automations
        SET run_count = run_count + 1,
            last_run_at = NOW(),
            updated_at = NOW()
        WHERE id = ${automation.id}
      `

      logger.info(
        { automationId: automation.id, orgId, workspaceId, triggerType, status: automationStatus },
        "Automation evaluated"
      )
    } catch (error) {
      // Log and continue — don't let one automation failure block others
      logError(logger, `evaluateAutomations: unexpected error for automation ${automation.id}`, error)

      try {
        const logId = generateId()
        await sql`
          INSERT INTO automation_logs (id, automation_id, trigger_event, actions_executed, status, error, executed_at)
          VALUES (
            ${logId},
            ${automation.id},
            ${JSON.stringify(eventData)}::jsonb,
            ${"[]"}::jsonb,
            ${"failed"},
            ${error instanceof Error ? error.message : String(error)},
            NOW()
          )
        `
      } catch {
        // Best-effort log; if this fails too, just continue
      }
    }
  }
}
