/**
 * Client Portal — EOD Report Comments
 *
 * GET /api/client/[slug]/[token]/comments?reportId=xxx — rate-limited 30/15min
 * POST /api/client/[slug]/[token]/comments — rate-limited 10/15min
 */

import { NextRequest, NextResponse } from "next/server"
import { validatePortalToken } from "@/lib/auth/client-portal-auth"
import { enforceIpRateLimit, ipRateLimitHeaders } from "@/lib/auth/ip-rate-limit"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { clientPortalCommentSchema } from "@/lib/validation/schemas"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse, EodComment } from "@/lib/types"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  const headers = new Headers()
  headers.set("X-Robots-Tag", "noindex, nofollow")
  headers.set("Cache-Control", "private, no-store")

  try {
    const { result: rateLimitResult, response: rateLimitResponse } = enforceIpRateLimit(
      request,
      { endpoint: "client-portal-comments-get", maxRequests: 30 }
    )
    if (rateLimitResponse) return rateLimitResponse

    const { slug, token } = await params
    const auth = await validatePortalToken(slug, token)

    if ("error" in auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: auth.error },
        { status: auth.status, headers }
      )
    }

    const { client } = auth
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get("reportId")

    if (!reportId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "reportId is required" },
        { status: 400, headers }
      )
    }

    // Verify report belongs to this org
    const { rows: reportRows } = await sql`
      SELECT id FROM eod_reports
      WHERE id = ${reportId} AND organization_id = ${client.organizationId}
    `
    if (reportRows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report not found" },
        { status: 404, headers }
      )
    }

    const comments = await db.eodComments.getByReportId(reportId, client.organizationId)

    const rlHeaders = ipRateLimitHeaders(rateLimitResult)
    for (const [key, value] of Object.entries(rlHeaders)) {
      headers.set(key, value)
    }

    return NextResponse.json<ApiResponse<EodComment[]>>(
      { success: true, data: comments },
      { headers }
    )
  } catch (error) {
    logError(logger, "Client portal GET comments error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to load comments" },
      { status: 500, headers }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  const headers = new Headers()
  headers.set("X-Robots-Tag", "noindex, nofollow")
  headers.set("Cache-Control", "private, no-store")

  try {
    const { result: rateLimitResult, response: rateLimitResponse } = enforceIpRateLimit(
      request,
      { endpoint: "client-portal-comments-post", maxRequests: 10 }
    )
    if (rateLimitResponse) return rateLimitResponse

    const { slug, token } = await params
    const auth = await validatePortalToken(slug, token)

    if ("error" in auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: auth.error },
        { status: auth.status, headers }
      )
    }

    const { client } = auth
    const { reportId, content } = await validateBody(request, clientPortalCommentSchema)

    // Verify report belongs to this org
    const { rows: reportRows } = await sql`
      SELECT id FROM eod_reports
      WHERE id = ${reportId} AND organization_id = ${client.organizationId}
    `
    if (reportRows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report not found" },
        { status: 404, headers }
      )
    }

    const comment = await db.eodComments.create({
      eodReportId: reportId,
      orgId: client.organizationId,
      clientId: client.id,
      authorName: client.name,
      isClient: true,
      content,
    })

    logger.info({ clientId: client.id, reportId, commentId: comment.id }, "Client portal comment posted")

    const rlHeaders = ipRateLimitHeaders(rateLimitResult)
    for (const [key, value] of Object.entries(rlHeaders)) {
      headers.set(key, value)
    }

    return NextResponse.json<ApiResponse<EodComment>>(
      { success: true, data: comment },
      { status: 201, headers }
    )
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode, headers }
      )
    }
    logError(logger, "Client portal POST comment error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to post comment" },
      { status: 500, headers }
    )
  }
}
