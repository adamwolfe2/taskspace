/**
 * Workspace Notes Database Operations
 *
 * One Notion-style document per workspace, using INSERT ON CONFLICT for upsert.
 */

import { sql } from "./sql"
import { generateId } from "@/lib/auth/password"
import { sanitizeHtml } from "@/lib/utils/sanitize"
import type { WorkspaceNote } from "@/lib/types"

// ============================================
// PARSER
// ============================================

function parseNote(row: Record<string, unknown>): WorkspaceNote {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    content: (row.content as string) || "",
    lastEditedBy: (row.last_edited_by as string) || null,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

// ============================================
// OPERATIONS
// ============================================

/**
 * Get the note for a workspace (returns null if none exists yet)
 */
export async function getNote(workspaceId: string): Promise<WorkspaceNote | null> {
  const { rows } = await sql`
    SELECT * FROM workspace_notes
    WHERE workspace_id = ${workspaceId}
  `

  if (rows.length === 0) return null
  return parseNote(rows[0])
}

/**
 * Upsert (create or update) the note for a workspace
 */
export async function upsertNote(
  workspaceId: string,
  content: string,
  userId: string
): Promise<WorkspaceNote> {
  const id = "wn_" + generateId()
  const sanitizedContent = sanitizeHtml(content)

  const { rows } = await sql`
    INSERT INTO workspace_notes (id, workspace_id, content, last_edited_by)
    VALUES (${id}, ${workspaceId}, ${sanitizedContent}, ${userId})
    ON CONFLICT (workspace_id)
    DO UPDATE SET
      content = EXCLUDED.content,
      last_edited_by = EXCLUDED.last_edited_by,
      updated_at = NOW()
    RETURNING *
  `

  return parseNote(rows[0])
}

// ============================================
// EXPORT
// ============================================

export const workspaceNotes = {
  get: getNote,
  upsert: upsertNote,
}

export default workspaceNotes
