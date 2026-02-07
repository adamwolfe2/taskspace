/**
 * People Analyzer / GWC Database Operations
 *
 * CRUD for people assessments + aggregate summary view.
 */

import { sql } from "./sql"
import { generateId } from "@/lib/auth/password"

// ============================================
// TYPES
// ============================================

export interface PeopleAssessment {
  id: string
  workspaceId: string
  employeeId: string
  employeeName: string | null
  assessorId: string
  getsIt: boolean
  wantsIt: boolean
  hasCapacity: boolean
  coreValuesRating: Record<string, unknown>
  rightPersonRightSeat: "right" | "wrong" | "unsure"
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface PeopleAnalyzerSummary {
  employeeId: string
  employeeName: string | null
  getsIt: boolean
  wantsIt: boolean
  hasCapacity: boolean
  coreValuesRating: Record<string, unknown>
  rightPersonRightSeat: "right" | "wrong" | "unsure"
  assessmentCount: number
  latestAssessmentId: string
  latestNotes: string | null
  updatedAt: string
}

// ============================================
// PARSER
// ============================================

function parseAssessment(row: Record<string, unknown>): PeopleAssessment {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    employeeId: row.employee_id as string,
    employeeName: (row.employee_name as string) || null,
    assessorId: row.assessor_id as string,
    getsIt: row.gets_it as boolean,
    wantsIt: row.wants_it as boolean,
    hasCapacity: row.has_capacity as boolean,
    coreValuesRating: (row.core_values_rating as Record<string, unknown>) || {},
    rightPersonRightSeat: (row.right_person_right_seat as "right" | "wrong" | "unsure") || "unsure",
    notes: (row.notes as string) || null,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

// ============================================
// OPERATIONS
// ============================================

export async function getAssessments(workspaceId: string): Promise<PeopleAssessment[]> {
  const { rows } = await sql`
    SELECT * FROM people_assessments
    WHERE workspace_id = ${workspaceId}
    ORDER BY updated_at DESC
  `
  return rows.map(parseAssessment)
}

export async function getAssessment(id: string, workspaceId?: string): Promise<PeopleAssessment | null> {
  const { rows } = workspaceId
    ? await sql`SELECT * FROM people_assessments WHERE id = ${id} AND workspace_id = ${workspaceId}`
    : await sql`SELECT * FROM people_assessments WHERE id = ${id}`
  if (rows.length === 0) return null
  return parseAssessment(rows[0])
}

export async function createAssessment(data: {
  workspaceId: string
  employeeId: string
  employeeName?: string
  assessorId: string
  getsIt: boolean
  wantsIt: boolean
  hasCapacity: boolean
  coreValuesRating?: Record<string, unknown>
  rightPersonRightSeat?: "right" | "wrong" | "unsure"
  notes?: string
}): Promise<PeopleAssessment> {
  const id = "pa_" + generateId()
  const coreValuesRating = JSON.stringify(data.coreValuesRating || {})

  const { rows } = await sql`
    INSERT INTO people_assessments (id, workspace_id, employee_id, employee_name, assessor_id, gets_it, wants_it, has_capacity, core_values_rating, right_person_right_seat, notes)
    VALUES (${id}, ${data.workspaceId}, ${data.employeeId}, ${data.employeeName || null}, ${data.assessorId}, ${data.getsIt}, ${data.wantsIt}, ${data.hasCapacity}, ${coreValuesRating}::jsonb, ${data.rightPersonRightSeat || "unsure"}, ${data.notes || null})
    RETURNING *
  `
  return parseAssessment(rows[0])
}

export async function updateAssessment(
  id: string,
  data: Partial<Pick<PeopleAssessment, "getsIt" | "wantsIt" | "hasCapacity" | "coreValuesRating" | "rightPersonRightSeat" | "notes">>,
  workspaceId?: string
): Promise<PeopleAssessment | null> {
  const existing = await getAssessment(id, workspaceId)
  if (!existing) return null

  const getsIt = data.getsIt ?? existing.getsIt
  const wantsIt = data.wantsIt ?? existing.wantsIt
  const hasCapacity = data.hasCapacity ?? existing.hasCapacity
  const coreValuesRating = JSON.stringify(data.coreValuesRating ?? existing.coreValuesRating)
  const rprs = data.rightPersonRightSeat ?? existing.rightPersonRightSeat
  const notes = data.notes ?? existing.notes

  let rows
  if (workspaceId) {
    const result = await sql`
      UPDATE people_assessments
      SET gets_it = ${getsIt}, wants_it = ${wantsIt}, has_capacity = ${hasCapacity},
          core_values_rating = ${coreValuesRating}::jsonb, right_person_right_seat = ${rprs},
          notes = ${notes}, updated_at = NOW()
      WHERE id = ${id} AND workspace_id = ${workspaceId}
      RETURNING *
    `
    rows = result.rows
  } else {
    const result = await sql`
      UPDATE people_assessments
      SET gets_it = ${getsIt}, wants_it = ${wantsIt}, has_capacity = ${hasCapacity},
          core_values_rating = ${coreValuesRating}::jsonb, right_person_right_seat = ${rprs},
          notes = ${notes}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    rows = result.rows
  }
  if (rows.length === 0) return null
  return parseAssessment(rows[0])
}

export async function deleteAssessment(id: string, workspaceId?: string): Promise<boolean> {
  const { rows } = workspaceId
    ? await sql`DELETE FROM people_assessments WHERE id = ${id} AND workspace_id = ${workspaceId} RETURNING id`
    : await sql`DELETE FROM people_assessments WHERE id = ${id} RETURNING id`
  return rows.length > 0
}

export async function getPeopleAnalyzerSummary(workspaceId: string): Promise<PeopleAnalyzerSummary[]> {
  const { rows } = await sql`
    SELECT DISTINCT ON (employee_id)
      id as latest_assessment_id,
      employee_id,
      employee_name,
      gets_it,
      wants_it,
      has_capacity,
      core_values_rating,
      right_person_right_seat,
      notes as latest_notes,
      updated_at,
      (SELECT COUNT(*) FROM people_assessments p2 WHERE p2.employee_id = people_assessments.employee_id AND p2.workspace_id = ${workspaceId}) as assessment_count
    FROM people_assessments
    WHERE workspace_id = ${workspaceId}
    ORDER BY employee_id, updated_at DESC
  `

  return rows.map((row) => ({
    employeeId: row.employee_id as string,
    employeeName: (row.employee_name as string) || null,
    getsIt: row.gets_it as boolean,
    wantsIt: row.wants_it as boolean,
    hasCapacity: row.has_capacity as boolean,
    coreValuesRating: (row.core_values_rating as Record<string, unknown>) || {},
    rightPersonRightSeat: (row.right_person_right_seat as "right" | "wrong" | "unsure") || "unsure",
    assessmentCount: Number(row.assessment_count) || 0,
    latestAssessmentId: row.latest_assessment_id as string,
    latestNotes: (row.latest_notes as string) || null,
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }))
}

// ============================================
// EXPORT
// ============================================

export const peopleAssessments = {
  list: getAssessments,
  get: getAssessment,
  create: createAssessment,
  update: updateAssessment,
  delete: deleteAssessment,
  getSummary: getPeopleAnalyzerSummary,
}

export default peopleAssessments
