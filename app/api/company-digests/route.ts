import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import { generateCompanyDigest } from "@/lib/ai/claude-client"
import { generateId } from "@/lib/auth/password"
import { sql } from "@/lib/db/sql"
import type { ApiResponse, CompanyDigest } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { generateCompanyDigestSchema } from "@/lib/validation/schemas"
import { checkApiRateLimit, getRateLimitHeaders } from "@/lib/auth/rate-limit"

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

// GET /api/company-digests - List company digests for a workspace
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    const result = await sql`
      SELECT * FROM company_digests
      WHERE workspace_id = ${workspaceId}
        AND org_id = ${auth.organization.id}
      ORDER BY created_at DESC
      LIMIT 20
    `

    const digests: CompanyDigest[] = result.rows.map(row =>
      rowToCompanyDigest(row as Record<string, unknown>)
    )

    return NextResponse.json<ApiResponse<CompanyDigest[]>>({
      success: true,
      data: digests,
    })
  } catch (error) {
    logError(logger, "List company digests error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to list company digests" },
      { status: 500 }
    )
  }
})

// POST /api/company-digests - Generate a new company digest
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const { workspaceId, periodType, periodStart, periodEnd } = await validateBody(request, generateCompanyDigestSchema)

    // Per-user rate limit: max 5 requests per minute
    const rateLimit = await checkApiRateLimit(request, `company-digests:${auth.user.id}`, 5, 60_000)
    if (!rateLimit.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Too many requests. Please wait a moment." },
        { status: 429, headers: getRateLimitHeaders(rateLimit, 5) }
      )
    }

    // Credit check
    const creditCheck = await checkCreditsOrRespond({
      organizationId: auth.organization.id,
      userId: auth.user.id,
    })
    if (creditCheck instanceof NextResponse) return creditCheck as NextResponse<ApiResponse<null>>

    // Gather rocks for the period
    const rocksResult = await sql`
      SELECT title, status, progress
      FROM rocks
      WHERE workspace_id = ${workspaceId}
        AND org_id = ${auth.organization.id}
        AND created_at::date <= ${periodEnd}::date
        AND (status != 'completed' OR updated_at::date >= ${periodStart}::date)
      ORDER BY status, progress DESC
      LIMIT 20
    `

    const rocks = rocksResult.rows.map(row => ({
      title: row.title as string,
      status: row.status as string,
      progress: (row.progress as number) || 0,
    }))

    // Gather scorecard metrics for the period
    const metricsResult = await sql`
      SELECT sm.name, se.value::text AS value
      FROM scorecard_metrics sm
      JOIN scorecard_entries se ON se.metric_id = sm.id
      WHERE sm.workspace_id = ${workspaceId}
        AND sm.org_id = ${auth.organization.id}
        AND se.week_start::date >= ${periodStart}::date
        AND se.week_start::date <= ${periodEnd}::date
      ORDER BY sm.name, se.week_start DESC
      LIMIT 20
    `

    const metrics = metricsResult.rows.map(row => ({
      name: row.name as string,
      value: row.value as string,
    }))

    // Gather team highlights (recently completed rocks)
    const highlightsResult = await sql`
      SELECT title
      FROM rocks
      WHERE workspace_id = ${workspaceId}
        AND org_id = ${auth.organization.id}
        AND status = 'completed'
        AND updated_at::date >= ${periodStart}::date
        AND updated_at::date <= ${periodEnd}::date
      LIMIT 5
    `

    const teamHighlights = highlightsResult.rows.map(row => `Completed rock: ${row.title as string}`)

    // Gather challenges (blocked or at-risk rocks)
    const challengesResult = await sql`
      SELECT title, status
      FROM rocks
      WHERE workspace_id = ${workspaceId}
        AND org_id = ${auth.organization.id}
        AND status IN ('blocked', 'at-risk')
        AND created_at::date <= ${periodEnd}::date
      LIMIT 5
    `

    const challenges = challengesResult.rows.map(row =>
      `${row.status === "blocked" ? "Blocked" : "At risk"}: ${row.title as string}`
    )

    // Generate AI digest
    const { result: digestContent, usage } = await generateCompanyDigest({
      periodType,
      periodStart,
      periodEnd,
      rocks,
      metrics,
      teamHighlights,
      challenges,
    })

    const id = "digest_" + generateId()
    await sql`
      INSERT INTO company_digests (
        id, org_id, workspace_id, title,
        period_type, period_start, period_end,
        content, format, created_by, created_at, updated_at
      )
      VALUES (
        ${id},
        ${auth.organization.id},
        ${workspaceId},
        ${digestContent.title},
        ${periodType},
        ${periodStart},
        ${periodEnd},
        ${JSON.stringify(digestContent)}::jsonb,
        'markdown',
        ${auth.user.id},
        NOW(),
        NOW()
      )
    `

    await recordUsage({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "company-digest",
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    })

    const digest: CompanyDigest = {
      id,
      orgId: auth.organization.id,
      workspaceId,
      title: digestContent.title,
      periodType,
      periodStart,
      periodEnd,
      content: digestContent,
      format: "markdown",
      createdBy: auth.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json<ApiResponse<CompanyDigest>>({
      success: true,
      data: digest,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    logError(logger, "Generate company digest error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to generate company digest" },
      { status: 500 }
    )
  }
})
