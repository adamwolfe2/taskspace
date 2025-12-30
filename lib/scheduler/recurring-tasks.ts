/**
 * Recurring Task Scheduler
 *
 * Handles automatic creation of task instances based on recurrence rules:
 * - Daily, weekly, monthly, yearly patterns
 * - Custom intervals
 * - End dates and occurrence limits
 * - Workday-only options
 */

import { db } from "@/lib/db"
import crypto from "crypto"

// ============================================
// TYPES
// ============================================

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly"

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  interval: number // Every N days/weeks/months/years
  daysOfWeek?: number[] // 0-6 for weekly (0=Sunday)
  dayOfMonth?: number // 1-31 for monthly
  monthOfYear?: number // 1-12 for yearly
  endDate?: string // ISO date
  maxOccurrences?: number
  skipWeekends?: boolean
  skipHolidays?: boolean
}

export interface RecurringTaskTemplate {
  id: string
  organizationId: string
  title: string
  description?: string
  priority: "high" | "medium" | "normal"
  defaultAssigneeId?: string
  estimatedMinutes?: number
  labels?: string[]
  recurrenceRule: RecurrenceRule
  nextRunDate: string
  lastRunDate?: string
  occurrenceCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ============================================
// DATE UTILITIES
// ============================================

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7)
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + years)
  return result
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

function getNextWeekday(date: Date): Date {
  let result = new Date(date)
  while (isWeekend(result)) {
    result = addDays(result, 1)
  }
  return result
}

function formatDateString(date: Date): string {
  return date.toISOString().split("T")[0]
}

// ============================================
// NEXT DATE CALCULATION
// ============================================

function calculateNextRunDate(
  currentDate: Date,
  rule: RecurrenceRule
): Date | null {
  let nextDate: Date

  switch (rule.frequency) {
    case "daily":
      nextDate = addDays(currentDate, rule.interval)
      break

    case "weekly":
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        // Find next matching day of week
        nextDate = new Date(currentDate)
        let found = false
        for (let i = 1; i <= 7 * rule.interval; i++) {
          nextDate = addDays(currentDate, i)
          if (rule.daysOfWeek.includes(nextDate.getDay())) {
            found = true
            break
          }
        }
        if (!found) {
          nextDate = addWeeks(currentDate, rule.interval)
        }
      } else {
        nextDate = addWeeks(currentDate, rule.interval)
      }
      break

    case "monthly":
      nextDate = addMonths(currentDate, rule.interval)
      if (rule.dayOfMonth) {
        nextDate.setDate(Math.min(rule.dayOfMonth, new Date(
          nextDate.getFullYear(),
          nextDate.getMonth() + 1,
          0
        ).getDate()))
      }
      break

    case "yearly":
      nextDate = addYears(currentDate, rule.interval)
      if (rule.monthOfYear) {
        nextDate.setMonth(rule.monthOfYear - 1)
      }
      if (rule.dayOfMonth) {
        nextDate.setDate(Math.min(rule.dayOfMonth, new Date(
          nextDate.getFullYear(),
          nextDate.getMonth() + 1,
          0
        ).getDate()))
      }
      break

    default:
      return null
  }

  // Skip weekends if configured
  if (rule.skipWeekends) {
    nextDate = getNextWeekday(nextDate)
  }

  // Check end date
  if (rule.endDate && nextDate > new Date(rule.endDate)) {
    return null
  }

  return nextDate
}

// ============================================
// RECURRING TASK PROCESSOR
// ============================================

class RecurringTaskProcessor {
  private isRunning = false
  private processInterval: NodeJS.Timeout | null = null

  /**
   * Start the recurring task processor
   */
  start(intervalMs = 60000): void {
    if (this.processInterval) {
      return
    }

    console.log("Starting recurring task processor...")
    this.processInterval = setInterval(() => {
      this.processDueTasks()
    }, intervalMs)

    // Process immediately on start
    this.processDueTasks()
  }

  /**
   * Stop the processor
   */
  stop(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval)
      this.processInterval = null
    }
  }

  /**
   * Process all due recurring tasks
   */
  async processDueTasks(): Promise<number> {
    if (this.isRunning) {
      return 0
    }

    this.isRunning = true
    let processed = 0

    try {
      const today = formatDateString(new Date())

      // Find all active recurring tasks due today or earlier
      const dueTasks = await db.sql`
        SELECT * FROM recurring_task_templates
        WHERE is_active = true
          AND next_run_date <= ${today}
        ORDER BY next_run_date ASC
        LIMIT 100
      `

      for (const template of dueTasks) {
        try {
          await this.processTemplate(template as RecurringTaskTemplate)
          processed++
        } catch (error) {
          console.error(`Error processing recurring task ${template.id}:`, error)
        }
      }
    } finally {
      this.isRunning = false
    }

    if (processed > 0) {
      console.log(`Processed ${processed} recurring tasks`)
    }

    return processed
  }

  /**
   * Process a single recurring task template
   */
  private async processTemplate(template: RecurringTaskTemplate): Promise<void> {
    const rule = template.recurrenceRule

    // Check max occurrences
    if (rule.maxOccurrences && template.occurrenceCount >= rule.maxOccurrences) {
      await db.sql`
        UPDATE recurring_task_templates
        SET is_active = false, updated_at = NOW()
        WHERE id = ${template.id}
      `
      return
    }

    // Create the task instance
    const taskId = crypto.randomUUID()
    const today = formatDateString(new Date())

    // Get default assignee if set
    let assigneeName = "Unassigned"
    if (template.defaultAssigneeId) {
      const member = await db.sql`
        SELECT name FROM organization_members
        WHERE id = ${template.defaultAssigneeId} AND status = 'active'
      `
      if (member.length > 0) {
        assigneeName = member[0].name
      }
    }

    await db.sql`
      INSERT INTO assigned_tasks (
        id,
        organization_id,
        assignee_id,
        assignee_name,
        title,
        description,
        priority,
        status,
        due_date,
        estimated_minutes,
        labels,
        recurring_task_id,
        created_at,
        updated_at
      ) VALUES (
        ${taskId},
        ${template.organizationId},
        ${template.defaultAssigneeId || null},
        ${assigneeName},
        ${template.title},
        ${template.description || null},
        ${template.priority},
        'pending',
        ${today},
        ${template.estimatedMinutes || null},
        ${JSON.stringify(template.labels || [])},
        ${template.id},
        NOW(),
        NOW()
      )
    `

    // Calculate next run date
    const currentDate = new Date(template.nextRunDate)
    const nextDate = calculateNextRunDate(currentDate, rule)

    // Update template
    await db.sql`
      UPDATE recurring_task_templates
      SET
        last_run_date = ${today},
        next_run_date = ${nextDate ? formatDateString(nextDate) : null},
        occurrence_count = occurrence_count + 1,
        is_active = ${nextDate !== null},
        updated_at = NOW()
      WHERE id = ${template.id}
    `
  }

  /**
   * Create a new recurring task template
   */
  async createTemplate(
    organizationId: string,
    userId: string,
    data: {
      title: string
      description?: string
      priority: "high" | "medium" | "normal"
      defaultAssigneeId?: string
      estimatedMinutes?: number
      labels?: string[]
      recurrenceRule: RecurrenceRule
      startDate: string
    }
  ): Promise<string> {
    const id = crypto.randomUUID()
    const rule = data.recurrenceRule

    // Calculate first run date
    let firstRun = new Date(data.startDate)
    if (rule.skipWeekends) {
      firstRun = getNextWeekday(firstRun)
    }

    await db.sql`
      INSERT INTO recurring_task_templates (
        id,
        organization_id,
        created_by,
        title,
        description,
        priority,
        default_assignee_id,
        estimated_minutes,
        labels,
        recurrence_rule,
        next_run_date,
        occurrence_count,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        ${id},
        ${organizationId},
        ${userId},
        ${data.title},
        ${data.description || null},
        ${data.priority},
        ${data.defaultAssigneeId || null},
        ${data.estimatedMinutes || null},
        ${JSON.stringify(data.labels || [])},
        ${JSON.stringify(rule)},
        ${formatDateString(firstRun)},
        0,
        true,
        NOW(),
        NOW()
      )
    `

    return id
  }

  /**
   * Update a recurring task template
   */
  async updateTemplate(
    templateId: string,
    organizationId: string,
    updates: Partial<{
      title: string
      description: string
      priority: "high" | "medium" | "normal"
      defaultAssigneeId: string
      estimatedMinutes: number
      labels: string[]
      recurrenceRule: RecurrenceRule
      isActive: boolean
    }>
  ): Promise<boolean> {
    const fields: string[] = ["updated_at = NOW()"]

    if (updates.title !== undefined) fields.push(`title = '${updates.title}'`)
    if (updates.description !== undefined) fields.push(`description = '${updates.description}'`)
    if (updates.priority !== undefined) fields.push(`priority = '${updates.priority}'`)
    if (updates.defaultAssigneeId !== undefined) fields.push(`default_assignee_id = '${updates.defaultAssigneeId}'`)
    if (updates.estimatedMinutes !== undefined) fields.push(`estimated_minutes = ${updates.estimatedMinutes}`)
    if (updates.labels !== undefined) fields.push(`labels = '${JSON.stringify(updates.labels)}'`)
    if (updates.recurrenceRule !== undefined) {
      fields.push(`recurrence_rule = '${JSON.stringify(updates.recurrenceRule)}'`)
      // Recalculate next run date
      const nextDate = calculateNextRunDate(new Date(), updates.recurrenceRule)
      if (nextDate) {
        fields.push(`next_run_date = '${formatDateString(nextDate)}'`)
      }
    }
    if (updates.isActive !== undefined) fields.push(`is_active = ${updates.isActive}`)

    const result = await db.sql`
      UPDATE recurring_task_templates
      SET ${db.sql.raw(fields.join(", "))}
      WHERE id = ${templateId} AND organization_id = ${organizationId}
    `

    return true
  }

  /**
   * Delete a recurring task template
   */
  async deleteTemplate(templateId: string, organizationId: string): Promise<boolean> {
    await db.sql`
      DELETE FROM recurring_task_templates
      WHERE id = ${templateId} AND organization_id = ${organizationId}
    `
    return true
  }

  /**
   * Get all templates for an organization
   */
  async getTemplates(organizationId: string): Promise<RecurringTaskTemplate[]> {
    const templates = await db.sql`
      SELECT * FROM recurring_task_templates
      WHERE organization_id = ${organizationId}
      ORDER BY created_at DESC
    `

    return templates.map((t: Record<string, unknown>) => ({
      id: t.id,
      organizationId: t.organization_id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      defaultAssigneeId: t.default_assignee_id,
      estimatedMinutes: t.estimated_minutes,
      labels: t.labels,
      recurrenceRule: t.recurrence_rule,
      nextRunDate: t.next_run_date,
      lastRunDate: t.last_run_date,
      occurrenceCount: t.occurrence_count,
      isActive: t.is_active,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    })) as RecurringTaskTemplate[]
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const recurringTaskProcessor = new RecurringTaskProcessor()

// ============================================
// CONVENIENCE EXPORTS
// ============================================

export const createRecurringTask = recurringTaskProcessor.createTemplate.bind(
  recurringTaskProcessor
)

export const updateRecurringTask = recurringTaskProcessor.updateTemplate.bind(
  recurringTaskProcessor
)

export const deleteRecurringTask = recurringTaskProcessor.deleteTemplate.bind(
  recurringTaskProcessor
)

export const getRecurringTasks = recurringTaskProcessor.getTemplates.bind(
  recurringTaskProcessor
)

export const processDueRecurringTasks = recurringTaskProcessor.processDueTasks.bind(
  recurringTaskProcessor
)
