/**
 * Diagnostic endpoint to check data visibility issues
 * Shows workspace_id distribution across all data tables
 */

import { NextRequest, NextResponse } from "next/server"
import { withDangerousAdmin } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"

export const POST = withDangerousAdmin(async (request: NextRequest, auth) => {
  const orgId = auth.organization.id

  // Get all workspaces for this org
  const { rows: workspaces } = await sql`
    SELECT id, name, is_default FROM workspaces WHERE organization_id = ${orgId}
  `

  // Check data distribution by workspace_id
  const { rows: rocksDist } = await sql`
    SELECT workspace_id, COUNT(*) as cnt
    FROM rocks WHERE organization_id = ${orgId}
    GROUP BY workspace_id
  `

  const { rows: tasksDist } = await sql`
    SELECT workspace_id, COUNT(*) as cnt
    FROM assigned_tasks WHERE organization_id = ${orgId}
    GROUP BY workspace_id
  `

  const { rows: eodDist } = await sql`
    SELECT workspace_id, COUNT(*) as cnt
    FROM eod_reports WHERE organization_id = ${orgId}
    GROUP BY workspace_id
  `

  // Count totals regardless of workspace_id
  const { rows: totals } = await sql`
    SELECT
      (SELECT COUNT(*) FROM rocks WHERE organization_id = ${orgId}) as total_rocks,
      (SELECT COUNT(*) FROM assigned_tasks WHERE organization_id = ${orgId}) as total_tasks,
      (SELECT COUNT(*) FROM eod_reports WHERE organization_id = ${orgId}) as total_eod,
      (SELECT COUNT(*) FROM rocks WHERE organization_id = ${orgId} AND workspace_id IS NULL) as null_rocks,
      (SELECT COUNT(*) FROM assigned_tasks WHERE organization_id = ${orgId} AND workspace_id IS NULL) as null_tasks,
      (SELECT COUNT(*) FROM eod_reports WHERE organization_id = ${orgId} AND workspace_id IS NULL) as null_eod
  `

  return NextResponse.json<ApiResponse<unknown>>({
    success: true,
    data: {
      orgId,
      workspaces,
      totals: totals[0],
      distribution: {
        rocks: rocksDist,
        tasks: tasksDist,
        eod: eodDist,
      },
    },
  })
})
