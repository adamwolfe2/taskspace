/**
 * IDS Board Database Operations
 *
 * Manages IDS board items (Identify, Discuss, Solve) per workspace.
 */

import { sql } from "./sql"
import { generateId } from "@/lib/auth/password"
import type { IdsBoardItem, IdsBoardColumn, IdsBoardItemType } from "@/lib/types"

// ============================================
// PARSER
// ============================================

function parseItem(row: Record<string, unknown>): IdsBoardItem {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    columnName: row.column_name as IdsBoardColumn,
    orderIndex: Number(row.order_index) || 0,
    itemType: (row.item_type as IdsBoardItemType) || "custom",
    linkedId: row.linked_id as string | undefined,
    createdBy: row.created_by as string | undefined,
    createdByName: row.created_by_name as string | undefined,
    assignedTo: row.assigned_to as string | undefined,
    assignedToName: row.assigned_to_name as string | undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

// ============================================
// OPERATIONS
// ============================================

export interface CreateIdsBoardItemParams {
  workspaceId: string
  title: string
  description?: string
  columnName: IdsBoardColumn
  itemType?: IdsBoardItemType
  linkedId?: string
  createdBy?: string
  assignedTo?: string
}

/**
 * Get all IDS board items for a workspace
 */
export async function getIdsBoardItems(workspaceId: string): Promise<IdsBoardItem[]> {
  const { rows } = await sql`
    SELECT i.*,
      cu.name as created_by_name,
      au.name as assigned_to_name
    FROM ids_board_items i
    LEFT JOIN users cu ON cu.id = i.created_by
    LEFT JOIN users au ON au.id = i.assigned_to
    WHERE i.workspace_id = ${workspaceId}
    ORDER BY i.column_name, i.order_index ASC
  `
  return rows.map(parseItem)
}

/**
 * Get a single IDS board item by ID (optionally workspace-scoped)
 */
export async function getIdsBoardItemById(itemId: string, workspaceId?: string): Promise<IdsBoardItem | null> {
  const { rows } = workspaceId
    ? await sql`
        SELECT i.*,
          cu.name as created_by_name,
          au.name as assigned_to_name
        FROM ids_board_items i
        LEFT JOIN users cu ON cu.id = i.created_by
        LEFT JOIN users au ON au.id = i.assigned_to
        WHERE i.id = ${itemId} AND i.workspace_id = ${workspaceId}
      `
    : await sql`
        SELECT i.*,
          cu.name as created_by_name,
          au.name as assigned_to_name
        FROM ids_board_items i
        LEFT JOIN users cu ON cu.id = i.created_by
        LEFT JOIN users au ON au.id = i.assigned_to
        WHERE i.id = ${itemId}
      `
  if (rows.length === 0) return null
  return parseItem(rows[0])
}

/**
 * Create a new IDS board item
 */
export async function createIdsBoardItem(params: CreateIdsBoardItemParams): Promise<IdsBoardItem> {
  const id = "ibi_" + generateId()
  const {
    workspaceId,
    title,
    description,
    columnName,
    itemType = "custom",
    linkedId,
    createdBy,
    assignedTo,
  } = params

  // Get the next order index for this column
  const { rows: maxRows } = await sql`
    SELECT COALESCE(MAX(order_index), -1) + 1 as next_index
    FROM ids_board_items
    WHERE workspace_id = ${workspaceId} AND column_name = ${columnName}
  `
  const orderIndex = Number(maxRows[0]?.next_index) || 0

  const { rows } = await sql`
    INSERT INTO ids_board_items (id, workspace_id, title, description, column_name, order_index, item_type, linked_id, created_by, assigned_to)
    VALUES (${id}, ${workspaceId}, ${title}, ${description || null}, ${columnName}, ${orderIndex}, ${itemType}, ${linkedId || null}, ${createdBy || null}, ${assignedTo || null})
    RETURNING *
  `

  return parseItem(rows[0])
}

/**
 * Update an IDS board item
 */
export async function updateIdsBoardItem(
  itemId: string,
  updates: Partial<{
    title: string
    description: string | null
    assignedTo: string | null
    itemType: IdsBoardItemType
  }>
): Promise<IdsBoardItem | null> {
  const item = await getIdsBoardItemById(itemId)
  if (!item) return null

  const { rows } = await sql`
    UPDATE ids_board_items
    SET
      title = ${updates.title ?? item.title},
      description = ${updates.description !== undefined ? updates.description : item.description ?? null},
      assigned_to = ${updates.assignedTo !== undefined ? updates.assignedTo : item.assignedTo ?? null},
      item_type = ${updates.itemType ?? item.itemType},
      updated_at = NOW()
    WHERE id = ${itemId}
    RETURNING *
  `

  if (rows.length === 0) return null
  return parseItem(rows[0])
}

/**
 * Move an IDS board item to a new column and/or position
 */
export async function moveIdsBoardItem(
  itemId: string,
  targetColumn: IdsBoardColumn,
  targetIndex: number
): Promise<IdsBoardItem | null> {
  const item = await getIdsBoardItemById(itemId)
  if (!item) return null

  const sourceColumn = item.columnName

  if (sourceColumn === targetColumn) {
    // Moving within the same column - shift items around
    if (item.orderIndex < targetIndex) {
      // Moving down: shift items between old and new position up
      await sql`
        UPDATE ids_board_items
        SET order_index = order_index - 1, updated_at = NOW()
        WHERE workspace_id = ${item.workspaceId}
          AND column_name = ${targetColumn}
          AND order_index > ${item.orderIndex}
          AND order_index <= ${targetIndex}
      `
    } else if (item.orderIndex > targetIndex) {
      // Moving up: shift items between new and old position down
      await sql`
        UPDATE ids_board_items
        SET order_index = order_index + 1, updated_at = NOW()
        WHERE workspace_id = ${item.workspaceId}
          AND column_name = ${targetColumn}
          AND order_index >= ${targetIndex}
          AND order_index < ${item.orderIndex}
      `
    }
  } else {
    // Moving across columns
    // Close gap in source column
    await sql`
      UPDATE ids_board_items
      SET order_index = order_index - 1, updated_at = NOW()
      WHERE workspace_id = ${item.workspaceId}
        AND column_name = ${sourceColumn}
        AND order_index > ${item.orderIndex}
    `

    // Make room in target column
    await sql`
      UPDATE ids_board_items
      SET order_index = order_index + 1, updated_at = NOW()
      WHERE workspace_id = ${item.workspaceId}
        AND column_name = ${targetColumn}
        AND order_index >= ${targetIndex}
    `
  }

  // Place the item at its new position
  const { rows } = await sql`
    UPDATE ids_board_items
    SET column_name = ${targetColumn}, order_index = ${targetIndex}, updated_at = NOW()
    WHERE id = ${itemId}
    RETURNING *
  `

  if (rows.length === 0) return null
  return parseItem(rows[0])
}

/**
 * Delete an IDS board item
 */
export async function deleteIdsBoardItem(itemId: string): Promise<boolean> {
  const item = await getIdsBoardItemById(itemId)
  if (!item) return false

  const { rowCount } = await sql`
    DELETE FROM ids_board_items WHERE id = ${itemId}
  `

  // Close the gap in ordering
  if ((rowCount ?? 0) > 0) {
    await sql`
      UPDATE ids_board_items
      SET order_index = order_index - 1
      WHERE workspace_id = ${item.workspaceId}
        AND column_name = ${item.columnName}
        AND order_index > ${item.orderIndex}
    `
  }

  return (rowCount ?? 0) > 0
}

// ============================================
// EXPORT
// ============================================

export const idsBoard = {
  getItems: getIdsBoardItems,
  getItemById: getIdsBoardItemById,
  createItem: createIdsBoardItem,
  updateItem: updateIdsBoardItem,
  moveItem: moveIdsBoardItem,
  deleteItem: deleteIdsBoardItem,
}

export default idsBoard
