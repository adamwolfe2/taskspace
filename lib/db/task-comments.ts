/**
 * Task Comments Database Operations
 *
 * Helper functions for parsing and managing JSONB comments on tasks.
 * Pattern follows lib/db/rocks.ts for JSONB handling.
 */

import { sql } from "./sql"
import { generateId } from "@/lib/auth/password"
import type { TaskComment } from "@/lib/types"

// ============================================
// TYPES
// ============================================

export interface TaskCommentInput {
  userId: string
  userName: string
  text: string
}

// ============================================
// PARSERS
// ============================================

/**
 * Parse JSONB comments array from database
 */
export function parseComments(jsonb: unknown): TaskComment[] {
  if (!jsonb) return []
  if (Array.isArray(jsonb)) return jsonb as TaskComment[]
  if (typeof jsonb === "string") {
    try {
      const parsed = JSON.parse(jsonb)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Validate comment data before adding to array
 */
export function validateComment(comment: TaskCommentInput): void {
  if (!comment.text || comment.text.trim().length === 0) {
    throw new Error("Comment text cannot be empty")
  }
  if (comment.text.length > 5000) {
    throw new Error("Comment text cannot exceed 5000 characters")
  }
  if (!comment.userId || !comment.userName) {
    throw new Error("Comment must have userId and userName")
  }
}

// ============================================
// OPERATIONS
// ============================================

/**
 * Get all comments for a task
 */
export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const { rows } = await sql`
    SELECT comments FROM assigned_tasks WHERE id = ${taskId}
  `
  if (rows.length === 0) return []
  return parseComments(rows[0].comments)
}

/**
 * Add a comment to a task
 */
export async function addTaskComment(
  taskId: string,
  input: TaskCommentInput
): Promise<TaskComment> {
  validateComment(input)

  const newComment: TaskComment = {
    id: "tc_" + generateId(),
    userId: input.userId,
    userName: input.userName,
    text: input.text.trim(),
    createdAt: new Date().toISOString(),
  }

  // Fetch current comments
  const currentComments = await getTaskComments(taskId)

  // Append new comment
  const updatedComments = [...currentComments, newComment]

  // Update task
  await sql`
    UPDATE assigned_tasks
    SET
      comments = ${JSON.stringify(updatedComments)}::jsonb,
      updated_at = NOW()
    WHERE id = ${taskId}
  `

  return newComment
}

/**
 * Delete a comment from a task
 */
export async function deleteTaskComment(
  taskId: string,
  commentId: string
): Promise<boolean> {
  // Fetch current comments
  const currentComments = await getTaskComments(taskId)

  // Filter out the comment
  const updatedComments = currentComments.filter((c) => c.id !== commentId)

  // If no change, comment didn't exist
  if (updatedComments.length === currentComments.length) {
    return false
  }

  // Update task
  await sql`
    UPDATE assigned_tasks
    SET
      comments = ${JSON.stringify(updatedComments)}::jsonb,
      updated_at = NOW()
    WHERE id = ${taskId}
  `

  return true
}

/**
 * Find a specific comment by ID within a task
 */
export async function findTaskComment(
  taskId: string,
  commentId: string
): Promise<TaskComment | null> {
  const comments = await getTaskComments(taskId)
  return comments.find((c) => c.id === commentId) || null
}

// ============================================
// EXPORT
// ============================================

export const taskComments = {
  get: getTaskComments,
  add: addTaskComment,
  delete: deleteTaskComment,
  find: findTaskComment,
  parse: parseComments,
  validate: validateComment,
}

export default taskComments
