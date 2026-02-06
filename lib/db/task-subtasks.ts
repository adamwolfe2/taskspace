/**
 * Task Subtasks Database Operations
 *
 * Helper functions for managing task subtasks stored in a dedicated table.
 * Provides better scalability and query performance compared to JSONB storage.
 */

import { sql } from "./sql"
import { generateId } from "@/lib/auth/password"
import type { TaskSubtask } from "@/lib/types"

// ============================================
// TYPES
// ============================================

export interface TaskSubtaskInput {
  title: string
  completed?: boolean
  orderIndex?: number
}

export interface TaskSubtaskUpdate {
  title?: string
  completed?: boolean
  completedAt?: string | null
  orderIndex?: number
}

// ============================================
// PARSERS
// ============================================

/**
 * Parse database row to TaskSubtask type
 */
function parseSubtask(row: Record<string, unknown>): TaskSubtask {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    title: row.title as string,
    completed: row.completed as boolean,
    completedAt: row.completed_at ? (row.completed_at as Date).toISOString() : undefined,
    sortOrder: row.order_index as number,
    createdAt: (row.created_at as Date)?.toISOString() || "",
  }
}

/**
 * Validate subtask data
 */
export function validateSubtask(input: TaskSubtaskInput): void {
  if (!input.title || input.title.trim().length === 0) {
    throw new Error("Subtask title cannot be empty")
  }
  if (input.title.length > 500) {
    throw new Error("Subtask title cannot exceed 500 characters")
  }
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all subtasks for a task (ordered by order_index)
 */
export async function getSubtasksByTaskId(taskId: string): Promise<TaskSubtask[]> {
  const { rows } = await sql`
    SELECT * FROM task_subtasks
    WHERE task_id = ${taskId}
    ORDER BY order_index ASC
  `
  return rows.map(parseSubtask)
}

/**
 * Get a single subtask by ID
 */
export async function getSubtaskById(subtaskId: string): Promise<TaskSubtask | null> {
  const { rows } = await sql`
    SELECT * FROM task_subtasks WHERE id = ${subtaskId}
  `
  if (rows.length === 0) return null
  return parseSubtask(rows[0])
}

/**
 * Get subtask count for a task
 */
export async function getSubtaskCount(taskId: string): Promise<{ total: number; completed: number }> {
  const { rows } = await sql`
    SELECT
      COUNT(*)::integer as total,
      COUNT(*) FILTER (WHERE completed = true)::integer as completed
    FROM task_subtasks
    WHERE task_id = ${taskId}
  `
  return {
    total: rows[0]?.total || 0,
    completed: rows[0]?.completed || 0,
  }
}

// ============================================
// CREATE OPERATIONS
// ============================================

/**
 * Create a new subtask for a task
 */
export async function createSubtask(
  taskId: string,
  input: TaskSubtaskInput
): Promise<TaskSubtask> {
  validateSubtask(input)

  // Get the current max order_index for this task
  const { rows: maxRows } = await sql`
    SELECT COALESCE(MAX(order_index), -1) as max_order FROM task_subtasks WHERE task_id = ${taskId}
  `
  const nextOrder = input.orderIndex ?? (maxRows[0]?.max_order + 1 || 0)

  const subtaskId = "sub_" + generateId()
  const now = new Date()

  const { rows } = await sql`
    INSERT INTO task_subtasks (
      id, task_id, title, completed, order_index, created_at, updated_at
    ) VALUES (
      ${subtaskId},
      ${taskId},
      ${input.title.trim()},
      ${input.completed ?? false},
      ${nextOrder},
      ${now},
      ${now}
    )
    RETURNING *
  `

  // Update the parent task's updated_at timestamp
  await sql`
    UPDATE assigned_tasks
    SET updated_at = ${now}
    WHERE id = ${taskId}
  `

  return parseSubtask(rows[0])
}

// ============================================
// UPDATE OPERATIONS
// ============================================

/**
 * Update a subtask
 */
export async function updateSubtask(
  subtaskId: string,
  updates: TaskSubtaskUpdate
): Promise<TaskSubtask | null> {
  // Build dynamic update query
  const setParts: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (updates.title !== undefined) {
    if (!updates.title || updates.title.trim().length === 0) {
      throw new Error("Subtask title cannot be empty")
    }
    if (updates.title.length > 500) {
      throw new Error("Subtask title cannot exceed 500 characters")
    }
    setParts.push(`title = $${paramIndex++}`)
    values.push(updates.title.trim())
  }

  if (updates.completed !== undefined) {
    setParts.push(`completed = $${paramIndex++}`)
    values.push(updates.completed)

    // Set or clear completed_at timestamp
    if (updates.completed) {
      setParts.push(`completed_at = $${paramIndex++}`)
      values.push(new Date())
    } else {
      setParts.push(`completed_at = NULL`)
    }
  }

  if (updates.orderIndex !== undefined) {
    setParts.push(`order_index = $${paramIndex++}`)
    values.push(updates.orderIndex)
  }

  if (setParts.length === 0) {
    // No updates, just fetch and return current state
    return getSubtaskById(subtaskId)
  }

  // Always update updated_at
  setParts.push(`updated_at = $${paramIndex++}`)
  values.push(new Date())

  // Add subtaskId as final parameter
  values.push(subtaskId)

  const query = `
    UPDATE task_subtasks
    SET ${setParts.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING *
  `

  const { rows } = await sql.query(query, values)
  if (rows.length === 0) return null

  const subtask = parseSubtask(rows[0])

  // Update the parent task's updated_at timestamp
  await sql`
    UPDATE assigned_tasks
    SET updated_at = NOW()
    WHERE id = ${subtask.taskId}
  `

  return subtask
}

/**
 * Toggle subtask completion status
 */
export async function toggleSubtask(subtaskId: string): Promise<TaskSubtask | null> {
  const subtask = await getSubtaskById(subtaskId)
  if (!subtask) return null

  return updateSubtask(subtaskId, {
    completed: !subtask.completed,
  })
}

/**
 * Reorder subtasks for a task (batch update)
 */
export async function reorderSubtasks(
  taskId: string,
  subtaskIds: string[]
): Promise<TaskSubtask[]> {
  // Start a transaction
  const client = await sql.connect()

  try {
    // Update each subtask's order_index based on array position
    for (let i = 0; i < subtaskIds.length; i++) {
      await client.sql`
        UPDATE task_subtasks
        SET order_index = ${i}, updated_at = NOW()
        WHERE id = ${subtaskIds[i]} AND task_id = ${taskId}
      `
    }

    // Update parent task timestamp
    await client.sql`
      UPDATE assigned_tasks
      SET updated_at = NOW()
      WHERE id = ${taskId}
    `

    // Fetch updated subtasks
    const { rows } = await client.sql`
      SELECT * FROM task_subtasks
      WHERE task_id = ${taskId}
      ORDER BY order_index ASC
    `

    client.release()
    return rows.map(parseSubtask)
  } catch (error) {
    client.release()
    throw error
  }
}

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Delete a subtask
 */
export async function deleteSubtask(subtaskId: string): Promise<boolean> {
  const subtask = await getSubtaskById(subtaskId)
  if (!subtask) return false

  const { rowCount } = await sql`
    DELETE FROM task_subtasks WHERE id = ${subtaskId}
  `

  if (rowCount && rowCount > 0) {
    // Update the parent task's updated_at timestamp
    await sql`
      UPDATE assigned_tasks
      SET updated_at = NOW()
      WHERE id = ${subtask.taskId}
    `
    return true
  }

  return false
}

/**
 * Delete all subtasks for a task
 */
export async function deleteAllSubtasks(taskId: string): Promise<number> {
  const { rowCount } = await sql`
    DELETE FROM task_subtasks WHERE task_id = ${taskId}
  `
  return rowCount || 0
}

// ============================================
// EXPORT
// ============================================

export const taskSubtasks = {
  // Read
  getByTaskId: getSubtasksByTaskId,
  getById: getSubtaskById,
  getCount: getSubtaskCount,

  // Create
  create: createSubtask,

  // Update
  update: updateSubtask,
  toggle: toggleSubtask,
  reorder: reorderSubtasks,

  // Delete
  delete: deleteSubtask,
  deleteAll: deleteAllSubtasks,

  // Validation
  validate: validateSubtask,
}

export default taskSubtasks
