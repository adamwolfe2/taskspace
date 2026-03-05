import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/sql"
import { db } from "@/lib/db"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse, EodComment } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import type { RouteContext } from "@/lib/api/middleware"

/**
 * POST /api/portal/[token]/comments
 * Public endpoint — no auth required.
 * Allows a client to post a comment on an EOD report via the portal.
 * Body: { eodReportId, content, authorName }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params
    const token = params.token

    if (!token) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Portal token is required" },
        { status: 400 }
      )
    }

    // Validate token — look up client by portal_token
    const { rows: clientRows } = await sql`
      SELECT c.id, c.organization_id, c.workspace_id, c.portal_enabled
      FROM clients c
      WHERE c.portal_token = ${token}
        AND c.portal_enabled = true
    `

    if (clientRows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "This portal link is no longer active." },
        { status: 403 }
      )
    }

    const clientRow = clientRows[0]
    const clientId = clientRow.id as string
    const orgId = clientRow.organization_id as string
    const workspaceId = clientRow.workspace_id as string

    // Parse and validate body
    let body: { eodReportId?: string; content?: string; authorName?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      )
    }

    const { eodReportId, content, authorName } = body

    if (!eodReportId || typeof eodReportId !== "string") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "eodReportId is required" },
        { status: 400 }
      )
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "content is required" },
        { status: 400 }
      )
    }

    if (!authorName || typeof authorName !== "string" || authorName.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "authorName is required" },
        { status: 400 }
      )
    }

    // Verify the EOD report belongs to this workspace/org
    const { rows: eodRows } = await sql`
      SELECT id FROM eod_reports
      WHERE id = ${eodReportId}
        AND org_id = ${orgId}
        AND workspace_id = ${workspaceId}
    `

    if (eodRows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "EOD report not found" },
        { status: 404 }
      )
    }

    // Insert comment with is_client = true
    const comment = await db.eodComments.create({
      eodReportId,
      orgId,
      clientId,
      authorName: authorName.trim().slice(0, 255),
      isClient: true,
      content: content.trim().slice(0, 5000),
    })

    logger.info({ eodReportId, clientId, orgId }, "Client portal comment added")

    return NextResponse.json<ApiResponse<EodComment>>(
      {
        success: true,
        data: comment,
        message: "Comment added successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    logError(logger, "Portal comment POST error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to add comment" },
      { status: 500 }
    )
  }
}
