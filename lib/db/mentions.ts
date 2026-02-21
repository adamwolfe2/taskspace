/**
 * Mentions Database Operations
 *
 * Tracks @mentions across comments and other content.
 */

import { sql } from "./sql"
import { generateId } from "@/lib/auth/password"

// ============================================
// TYPES
// ============================================

export interface Mention {
  id: string
  workspaceId: string
  sourceType: string
  sourceId: string
  mentionedUserId: string
  mentionedBy: string
  read: boolean
  createdAt: string
}

// ============================================
// PARSER
// ============================================

function parseMention(row: Record<string, unknown>): Mention {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    sourceType: row.source_type as string,
    sourceId: row.source_id as string,
    mentionedUserId: row.mentioned_user_id as string,
    mentionedBy: row.mentioned_by as string,
    read: row.read as boolean,
    createdAt: (row.created_at as Date)?.toISOString() || "",
  }
}

// ============================================
// OPERATIONS
// ============================================

export async function createMention(data: {
  workspaceId: string
  sourceType: string
  sourceId: string
  mentionedUserId: string
  mentionedBy: string
}): Promise<Mention> {
  const id = "mn_" + generateId()

  const { rows } = await sql`
    INSERT INTO mentions (id, workspace_id, source_type, source_id, mentioned_user_id, mentioned_by)
    VALUES (${id}, ${data.workspaceId}, ${data.sourceType}, ${data.sourceId}, ${data.mentionedUserId}, ${data.mentionedBy})
    RETURNING *
  `
  return parseMention(rows[0])
}

export async function createMentions(
  mentions: Array<{
    workspaceId: string
    sourceType: string
    sourceId: string
    mentionedUserId: string
    mentionedBy: string
  }>
): Promise<Mention[]> {
  if (mentions.length === 0) return []

  // Batch insert all mentions in a single UNNEST query
  const result = await (
    sql.query as (q: string, p: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
  )(
    `INSERT INTO mentions (id, workspace_id, source_type, source_id, mentioned_user_id, mentioned_by)
     SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[])
     RETURNING *`,
    [
      mentions.map(() => "mn_" + generateId()),
      mentions.map((m) => m.workspaceId),
      mentions.map((m) => m.sourceType),
      mentions.map((m) => m.sourceId),
      mentions.map((m) => m.mentionedUserId),
      mentions.map((m) => m.mentionedBy),
    ]
  )
  return result.rows.map(parseMention)
}

export async function getMentionsForUser(
  userId: string,
  workspaceId: string,
  unreadOnly = false
): Promise<Mention[]> {
  if (unreadOnly) {
    // SECURITY: Limit query to prevent DoS from excessive unread mentions
    const { rows } = await sql`
      SELECT * FROM mentions
      WHERE mentioned_user_id = ${userId} AND workspace_id = ${workspaceId} AND read = false
      ORDER BY created_at DESC
      LIMIT 100
    `
    return rows.map(parseMention)
  }

  const { rows } = await sql`
    SELECT * FROM mentions
    WHERE mentioned_user_id = ${userId} AND workspace_id = ${workspaceId}
    ORDER BY created_at DESC
    LIMIT 50
  `
  return rows.map(parseMention)
}

export async function markMentionRead(id: string): Promise<boolean> {
  const { rows } = await sql`
    UPDATE mentions SET read = true WHERE id = ${id} RETURNING id
  `
  return rows.length > 0
}

export async function markAllMentionsRead(userId: string, workspaceId: string): Promise<number> {
  const { rows } = await sql`
    UPDATE mentions SET read = true
    WHERE mentioned_user_id = ${userId} AND workspace_id = ${workspaceId} AND read = false
    RETURNING id
  `
  return rows.length
}

// ============================================
// EXPORT
// ============================================

export const mentions = {
  create: createMention,
  createMany: createMentions,
  getForUser: getMentionsForUser,
  markRead: markMentionRead,
  markAllRead: markAllMentionsRead,
}

export default mentions
