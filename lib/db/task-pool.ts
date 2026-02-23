/**
 * Task Pool Database Operations
 *
 * Manages the shared task pool — tasks that any workspace member can claim.
 * Daily reset: claimed_date is compared against CURRENT_DATE at query time.
 */

import { sql } from "./sql"
import { generateId } from "@/lib/auth/password"
import { sanitizeText } from "@/lib/utils/sanitize"
import type { TaskPoolItem } from "@/lib/types"

// ============================================
// PARSER
// ============================================

function parseItem(row: Record<string, unknown>): TaskPoolItem {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    workspaceId: row.workspace_id as string,
    title: row.title as string,
    description: row.description as string | null | undefined,
    priority: row.priority as TaskPoolItem["priority"],
    createdById: row.created_by_id as string,
    createdByName: row.created_by_name as string,
    claimedById: row.claimed_by_id as string | null | undefined,
    claimedByName: row.claimed_by_name as string | null | undefined,
    claimedAt: row.claimed_at ? (row.claimed_at as Date).toISOString() : null,
    claimedDate: row.claimed_date
      ? (row.claimed_date instanceof Date
          ? row.claimed_date.toISOString().split("T")[0]
          : String(row.claimed_date))
      : null,
    isClaimedToday: Boolean(row.is_claimed_today),
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

// ============================================
// OPERATIONS
// ============================================

/**
 * List all pool tasks for a workspace.
 * Unclaimed tasks come first, then tasks claimed today, ordered by created_at DESC within each group.
 */
export async function findByWorkspace(orgId: string, workspaceId: string): Promise<TaskPoolItem[]> {
  const { rows } = await sql`
    SELECT *,
      (claimed_date = CURRENT_DATE) AS is_claimed_today
    FROM task_pool
    WHERE organization_id = ${orgId}
      AND workspace_id = ${workspaceId}
    ORDER BY
      (claimed_date = CURRENT_DATE) ASC,
      created_at DESC
  `
  return rows.map(parseItem)
}

/**
 * Create a new pool task.
 */
export async function create(item: {
  organizationId: string
  workspaceId: string
  title: string
  description?: string
  priority: TaskPoolItem["priority"]
  createdById: string
  createdByName: string
}): Promise<TaskPoolItem> {
  const id = generateId()
  const title = sanitizeText(item.title)
  const description = item.description ? sanitizeText(item.description) : null

  const { rows } = await sql`
    INSERT INTO task_pool (
      id, organization_id, workspace_id, title, description,
      priority, created_by_id, created_by_name
    ) VALUES (
      ${id}, ${item.organizationId}, ${item.workspaceId}, ${title}, ${description},
      ${item.priority}, ${item.createdById}, ${item.createdByName}
    )
    RETURNING *, FALSE AS is_claimed_today
  `
  return parseItem(rows[0])
}

/**
 * Atomically claim a task — only succeeds if not already claimed today.
 * Returns null if the task was already claimed today (race condition / double-claim).
 */
export async function claim(
  id: string,
  orgId: string,
  claimedById: string,
  claimedByName: string
): Promise<TaskPoolItem | null> {
  const { rows } = await sql`
    UPDATE task_pool
    SET
      claimed_by_id = ${claimedById},
      claimed_by_name = ${claimedByName},
      claimed_at = NOW(),
      claimed_date = CURRENT_DATE,
      updated_at = NOW()
    WHERE id = ${id}
      AND organization_id = ${orgId}
      AND (claimed_date IS NULL OR claimed_date < CURRENT_DATE)
    RETURNING *, TRUE AS is_claimed_today
  `
  if (rows.length === 0) return null
  return parseItem(rows[0])
}

/**
 * Unclaim a task — clears claim fields.
 */
export async function unclaim(id: string, orgId: string): Promise<TaskPoolItem | null> {
  const { rows } = await sql`
    UPDATE task_pool
    SET
      claimed_by_id = NULL,
      claimed_by_name = NULL,
      claimed_at = NULL,
      claimed_date = NULL,
      updated_at = NOW()
    WHERE id = ${id}
      AND organization_id = ${orgId}
    RETURNING *, FALSE AS is_claimed_today
  `
  if (rows.length === 0) return null
  return parseItem(rows[0])
}

/**
 * Get a single task by ID (org-scoped).
 */
export async function findById(id: string, orgId: string): Promise<TaskPoolItem | null> {
  const { rows } = await sql`
    SELECT *, (claimed_date = CURRENT_DATE) AS is_claimed_today
    FROM task_pool
    WHERE id = ${id} AND organization_id = ${orgId}
  `
  if (rows.length === 0) return null
  return parseItem(rows[0])
}

/**
 * Hard delete a task (admin-only).
 */
export async function deleteById(id: string, orgId: string): Promise<boolean> {
  const { rowCount } = await sql`
    DELETE FROM task_pool
    WHERE id = ${id} AND organization_id = ${orgId}
  `
  return (rowCount ?? 0) > 0
}

export const taskPool = {
  findByWorkspace,
  create,
  claim,
  unclaim,
  findById,
  delete: deleteById,
}
