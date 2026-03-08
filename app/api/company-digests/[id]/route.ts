import { NextRequest, NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import type { RouteContext } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateCompanyDigestSchema } from "@/lib/validation/schemas"
import type { ApiResponse, CompanyDigest } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

function rowToCompanyDigest(row: Record<string, unknown>): CompanyDigest {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    workspaceId: row.workspace_id as string,
    title: row.title as string,
    periodType: row.period_type as string,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    content: (row.content as CompanyDigest["content"]) || {
      title: "",
      executiveSummary: "",
      rockUpdate: "",
      keyMetrics: [],
      teamHighlights: [],
      challenges: [],
      outlook: "",
    },
    format: (row.format as string) || "markdown",
    createdBy: (row.created_by as string) || undefined,
    createdAt: (row.created_at as Date)?.toISOString() || new Date().toISOString(),
    updatedAt: (row.updated_at as Date)?.toISOString() || new Date().toISOString(),
  }
}

// GET /api/company-digests/[id] - Get a single company digest
export const GET = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params

    const result = await sql`
      SELECT * FROM company_digests WHERE id = ${id}
    `

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Digest not found" },
        { status: 404 }
      )
    }

    const row = result.rows[0] as Record<string, unknown>
    const workspaceId = row.workspace_id as string

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Digest not found" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<CompanyDigest>>({
      success: true,
      data: rowToCompanyDigest(row),
    })
  } catch (error) {
    logError(logger, "Get company digest error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get company digest" },
      { status: 500 }
    )
  }
})

// PUT /api/company-digests/[id] - Update digest title or content
export const PUT = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params

    const existing = await sql`
      SELECT * FROM company_digests WHERE id = ${id}
    `

    if (existing.rows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Digest not found" },
        { status: 404 }
      )
    }

    const row = existing.rows[0] as Record<string, unknown>
    const workspaceId = row.workspace_id as string

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Digest not found" },
        { status: 404 }
      )
    }

    const { title, content } = await validateBody(request, updateCompanyDigestSchema)

    await sql`
      UPDATE company_digests
      SET
        title = COALESCE(${title || null}, title),
        content = COALESCE(${content !== undefined ? JSON.stringify(content) : null}::jsonb, content),
        updated_at = NOW()
      WHERE id = ${id}
    `

    const updated = await sql`SELECT * FROM company_digests WHERE id = ${id}`
    const updatedRow = updated.rows[0] as Record<string, unknown>

    return NextResponse.json<ApiResponse<CompanyDigest>>({
      success: true,
      data: rowToCompanyDigest(updatedRow),
      message: "Digest updated successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Update company digest error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update company digest" },
      { status: 500 }
    )
  }
})

// DELETE /api/company-digests/[id] - Delete a digest
export const DELETE = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params

    const existing = await sql`
      SELECT * FROM company_digests WHERE id = ${id}
    `

    if (existing.rows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Digest not found" },
        { status: 404 }
      )
    }

    const row = existing.rows[0] as Record<string, unknown>
    const workspaceId = row.workspace_id as string

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Digest not found" },
        { status: 404 }
      )
    }

    await sql`DELETE FROM company_digests WHERE id = ${id}`

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Digest deleted successfully",
    })
  } catch (error) {
    logError(logger, "Delete company digest error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete company digest" },
      { status: 500 }
    )
  }
})
