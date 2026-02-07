/**
 * V/TO (Vision/Traction Organizer) Database Operations
 *
 * One VTO document per workspace, using INSERT ON CONFLICT for upsert.
 */

import { sql } from "./sql"
import { generateId } from "@/lib/auth/password"

// ============================================
// TYPES
// ============================================

export interface VTODocument {
  id: string
  workspaceId: string
  coreValues: unknown[]
  coreFocus: Record<string, unknown>
  tenYearTarget: Record<string, unknown>
  marketingStrategy: Record<string, unknown>
  threeYearPicture: Record<string, unknown>
  oneYearPlan: Record<string, unknown>
  quarterlyRocks: unknown[]
  issuesList: unknown[]
  lastEditedBy: string | null
  createdAt: string
  updatedAt: string
}

// ============================================
// PARSER
// ============================================

function parseVTO(row: Record<string, unknown>): VTODocument {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    coreValues: (row.core_values as unknown[]) || [],
    coreFocus: (row.core_focus as Record<string, unknown>) || {},
    tenYearTarget: (row.ten_year_target as Record<string, unknown>) || {},
    marketingStrategy: (row.marketing_strategy as Record<string, unknown>) || {},
    threeYearPicture: (row.three_year_picture as Record<string, unknown>) || {},
    oneYearPlan: (row.one_year_plan as Record<string, unknown>) || {},
    quarterlyRocks: (row.quarterly_rocks as unknown[]) || [],
    issuesList: (row.issues_list as unknown[]) || [],
    lastEditedBy: (row.last_edited_by as string) || null,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

// ============================================
// OPERATIONS
// ============================================

export async function getVTO(workspaceId: string): Promise<VTODocument | null> {
  const { rows } = await sql`
    SELECT * FROM vto_documents
    WHERE workspace_id = ${workspaceId}
  `

  if (rows.length === 0) return null
  return parseVTO(rows[0])
}

export async function upsertVTO(
  workspaceId: string,
  data: Partial<Omit<VTODocument, "id" | "workspaceId" | "createdAt" | "updatedAt" | "lastEditedBy">>,
  userId: string
): Promise<VTODocument> {
  const id = "vto_" + generateId()

  const coreValues = JSON.stringify(data.coreValues || [])
  const coreFocus = JSON.stringify(data.coreFocus || {})
  const tenYearTarget = JSON.stringify(data.tenYearTarget || {})
  const marketingStrategy = JSON.stringify(data.marketingStrategy || {})
  const threeYearPicture = JSON.stringify(data.threeYearPicture || {})
  const oneYearPlan = JSON.stringify(data.oneYearPlan || {})
  const quarterlyRocks = JSON.stringify(data.quarterlyRocks || [])
  const issuesList = JSON.stringify(data.issuesList || [])

  const { rows } = await sql`
    INSERT INTO vto_documents (id, workspace_id, core_values, core_focus, ten_year_target, marketing_strategy, three_year_picture, one_year_plan, quarterly_rocks, issues_list, last_edited_by)
    VALUES (${id}, ${workspaceId}, ${coreValues}::jsonb, ${coreFocus}::jsonb, ${tenYearTarget}::jsonb, ${marketingStrategy}::jsonb, ${threeYearPicture}::jsonb, ${oneYearPlan}::jsonb, ${quarterlyRocks}::jsonb, ${issuesList}::jsonb, ${userId})
    ON CONFLICT (workspace_id)
    DO UPDATE SET
      core_values = ${coreValues}::jsonb,
      core_focus = ${coreFocus}::jsonb,
      ten_year_target = ${tenYearTarget}::jsonb,
      marketing_strategy = ${marketingStrategy}::jsonb,
      three_year_picture = ${threeYearPicture}::jsonb,
      one_year_plan = ${oneYearPlan}::jsonb,
      quarterly_rocks = ${quarterlyRocks}::jsonb,
      issues_list = ${issuesList}::jsonb,
      last_edited_by = ${userId},
      updated_at = NOW()
    RETURNING *
  `

  return parseVTO(rows[0])
}

// ============================================
// EXPORT
// ============================================

export const vto = {
  get: getVTO,
  upsert: upsertVTO,
}

export default vto
