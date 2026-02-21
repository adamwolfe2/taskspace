/**
 * GET /api/admin/ai-usage
 *
 * Returns comprehensive AI usage statistics for the admin dashboard.
 * Super-admins see cross-org data; regular admins see their org only.
 *
 * Query params:
 *   - days: number of days to look back (default 30)
 *   - orgId: filter to specific org (super-admin only)
 */

import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

interface AIUsageDashboard {
  summary: {
    totalCredits: number
    totalTokens: number
    totalCalls: number
    creditsToday: number
    callsToday: number
    creditsLimit: number
    remainingCredits: number
  }
  dailyTrend: Array<{ date: string; calls: number; credits: number; tokens: number }>
  byAction: Array<{ action: string; calls: number; credits: number; avgTokens: number }>
  byModel: Array<{ model: string; calls: number; credits: number; avgInputTokens: number; avgOutputTokens: number }>
  byOrganization: Array<{ organizationId: string; organizationName: string; calls: number; credits: number; plan: string }>
  recentCalls: Array<{ id: string; action: string; model: string; inputTokens: number; outputTokens: number; creditsUsed: number; createdAt: string; organizationName: string }>
  isSuperAdmin: boolean
}

// Helper: queries filtered by org
function querySummary(startISO: string, orgId: string) {
  return sql`
    SELECT COALESCE(SUM(credits_used), 0)::int as total_credits,
           COALESCE(SUM(input_tokens + output_tokens), 0)::bigint as total_tokens,
           COUNT(*)::int as total_calls
    FROM ai_usage WHERE created_at >= ${startISO} AND organization_id = ${orgId}
  `
}
function querySummaryAll(startISO: string) {
  return sql`
    SELECT COALESCE(SUM(credits_used), 0)::int as total_credits,
           COALESCE(SUM(input_tokens + output_tokens), 0)::bigint as total_tokens,
           COUNT(*)::int as total_calls
    FROM ai_usage WHERE created_at >= ${startISO}
  `
}

function queryToday(todayISO: string, orgId: string) {
  return sql`
    SELECT COALESCE(SUM(credits_used), 0)::int as credits_today, COUNT(*)::int as calls_today
    FROM ai_usage WHERE created_at >= ${todayISO} AND organization_id = ${orgId}
  `
}
function queryTodayAll(todayISO: string) {
  return sql`
    SELECT COALESCE(SUM(credits_used), 0)::int as credits_today, COUNT(*)::int as calls_today
    FROM ai_usage WHERE created_at >= ${todayISO}
  `
}

function queryTrend(startISO: string, days: number, orgId: string) {
  return sql`
    SELECT DATE(created_at) as date, COUNT(*)::int as calls,
           COALESCE(SUM(credits_used), 0)::int as credits,
           COALESCE(SUM(input_tokens + output_tokens), 0)::bigint as tokens
    FROM ai_usage WHERE created_at >= ${startISO} AND organization_id = ${orgId}
    GROUP BY DATE(created_at) ORDER BY date DESC LIMIT ${days}
  `
}
function queryTrendAll(startISO: string, days: number) {
  return sql`
    SELECT DATE(created_at) as date, COUNT(*)::int as calls,
           COALESCE(SUM(credits_used), 0)::int as credits,
           COALESCE(SUM(input_tokens + output_tokens), 0)::bigint as tokens
    FROM ai_usage WHERE created_at >= ${startISO}
    GROUP BY DATE(created_at) ORDER BY date DESC LIMIT ${days}
  `
}

function queryByAction(startISO: string, orgId: string) {
  return sql`
    SELECT action, COUNT(*)::int as calls, COALESCE(SUM(credits_used), 0)::int as credits,
           COALESCE(AVG(input_tokens + output_tokens), 0)::int as avg_tokens
    FROM ai_usage WHERE created_at >= ${startISO} AND organization_id = ${orgId}
    GROUP BY action ORDER BY credits DESC
  `
}
function queryByActionAll(startISO: string) {
  return sql`
    SELECT action, COUNT(*)::int as calls, COALESCE(SUM(credits_used), 0)::int as credits,
           COALESCE(AVG(input_tokens + output_tokens), 0)::int as avg_tokens
    FROM ai_usage WHERE created_at >= ${startISO}
    GROUP BY action ORDER BY credits DESC
  `
}

function queryByModel(startISO: string, orgId: string) {
  return sql`
    SELECT model, COUNT(*)::int as calls, COALESCE(SUM(credits_used), 0)::int as credits,
           COALESCE(AVG(input_tokens), 0)::int as avg_input_tokens,
           COALESCE(AVG(output_tokens), 0)::int as avg_output_tokens
    FROM ai_usage WHERE created_at >= ${startISO} AND organization_id = ${orgId}
    GROUP BY model ORDER BY credits DESC
  `
}
function queryByModelAll(startISO: string) {
  return sql`
    SELECT model, COUNT(*)::int as calls, COALESCE(SUM(credits_used), 0)::int as credits,
           COALESCE(AVG(input_tokens), 0)::int as avg_input_tokens,
           COALESCE(AVG(output_tokens), 0)::int as avg_output_tokens
    FROM ai_usage WHERE created_at >= ${startISO}
    GROUP BY model ORDER BY credits DESC
  `
}

function queryByOrgAll(startISO: string) {
  return sql`
    SELECT a.organization_id, o.name as organization_name, COUNT(*)::int as calls,
           COALESCE(SUM(a.credits_used), 0)::int as credits, o.subscription->>'plan' as plan
    FROM ai_usage a JOIN organizations o ON o.id = a.organization_id
    WHERE a.created_at >= ${startISO}
    GROUP BY a.organization_id, o.name, o.subscription->>'plan' ORDER BY credits DESC LIMIT 50
  `
}
function queryByOrgSingle(startISO: string, orgId: string) {
  return sql`
    SELECT a.organization_id, o.name as organization_name, COUNT(*)::int as calls,
           COALESCE(SUM(a.credits_used), 0)::int as credits, o.subscription->>'plan' as plan
    FROM ai_usage a JOIN organizations o ON o.id = a.organization_id
    WHERE a.created_at >= ${startISO} AND a.organization_id = ${orgId}
    GROUP BY a.organization_id, o.name, o.subscription->>'plan'
  `
}

function queryRecent(startISO: string, orgId: string) {
  return sql`
    SELECT a.id, a.action, a.model, a.input_tokens, a.output_tokens, a.credits_used, a.created_at,
           o.name as organization_name
    FROM ai_usage a JOIN organizations o ON o.id = a.organization_id
    WHERE a.created_at >= ${startISO} AND a.organization_id = ${orgId}
    ORDER BY a.created_at DESC LIMIT 50
  `
}
function queryRecentAll(startISO: string) {
  return sql`
    SELECT a.id, a.action, a.model, a.input_tokens, a.output_tokens, a.credits_used, a.created_at,
           o.name as organization_name
    FROM ai_usage a JOIN organizations o ON o.id = a.organization_id
    WHERE a.created_at >= ${startISO}
    ORDER BY a.created_at DESC LIMIT 50
  `
}

export const GET = withAdmin(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get("days") || "30"), 90)
    const isSuperAdmin = auth.user.isSuperAdmin === true

    const filterOrgId = isSuperAdmin
      ? searchParams.get("orgId") || null
      : auth.organization.id

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startISO = startDate.toISOString()

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayISO = todayStart.toISOString()

    const orgId = filterOrgId || auth.organization.id
    const showAll = isSuperAdmin && !filterOrgId

    const [summaryResult, todayResult, trendResult, actionResult, modelResult, orgResult, recentResult, creditsResult] =
      await Promise.all([
        showAll ? querySummaryAll(startISO) : querySummary(startISO, orgId),
        showAll ? queryTodayAll(todayISO) : queryToday(todayISO, orgId),
        showAll ? queryTrendAll(startISO, days) : queryTrend(startISO, days, orgId),
        showAll ? queryByActionAll(startISO) : queryByAction(startISO, orgId),
        showAll ? queryByModelAll(startISO) : queryByModel(startISO, orgId),
        showAll ? queryByOrgAll(startISO) : queryByOrgSingle(startISO, orgId),
        showAll ? queryRecentAll(startISO) : queryRecent(startISO, orgId),
        sql`
          SELECT o.subscription->>'plan' as plan,
                 COALESCE(SUM(a.credits_used), 0)::int as used_this_month
          FROM organizations o
          LEFT JOIN ai_usage a ON a.organization_id = o.id AND a.created_at >= date_trunc('month', NOW())
          WHERE o.id = ${orgId}
          GROUP BY o.subscription->>'plan'
        `,
      ])

    const planLimits: Record<string, number> = { free: 50, team: 200, business: -1 }
    const currentPlan = (creditsResult.rows[0]?.plan as string) || "free"
    const creditsLimit = planLimits[currentPlan] ?? 50
    const usedThisMonth = (creditsResult.rows[0]?.used_this_month as number) || 0

    const dashboard: AIUsageDashboard = {
      summary: {
        totalCredits: (summaryResult.rows[0]?.total_credits as number) || 0,
        totalTokens: Number(summaryResult.rows[0]?.total_tokens || 0),
        totalCalls: (summaryResult.rows[0]?.total_calls as number) || 0,
        creditsToday: (todayResult.rows[0]?.credits_today as number) || 0,
        callsToday: (todayResult.rows[0]?.calls_today as number) || 0,
        creditsLimit: creditsLimit === -1 ? Infinity : creditsLimit,
        remainingCredits: creditsLimit === -1 ? Infinity : Math.max(0, creditsLimit - usedThisMonth),
      },
      dailyTrend: trendResult.rows.map(r => ({
        date: (r.date as Date).toISOString().split("T")[0],
        calls: r.calls as number,
        credits: r.credits as number,
        tokens: Number(r.tokens || 0),
      })).reverse(),
      byAction: actionResult.rows.map(r => ({
        action: r.action as string,
        calls: r.calls as number,
        credits: r.credits as number,
        avgTokens: r.avg_tokens as number,
      })),
      byModel: modelResult.rows.map(r => ({
        model: r.model as string,
        calls: r.calls as number,
        credits: r.credits as number,
        avgInputTokens: r.avg_input_tokens as number,
        avgOutputTokens: r.avg_output_tokens as number,
      })),
      byOrganization: orgResult.rows.map(r => ({
        organizationId: r.organization_id as string,
        organizationName: r.organization_name as string,
        calls: r.calls as number,
        credits: r.credits as number,
        plan: (r.plan as string) || "free",
      })),
      recentCalls: recentResult.rows.map(r => ({
        id: r.id as string,
        action: r.action as string,
        model: r.model as string,
        inputTokens: r.input_tokens as number,
        outputTokens: r.output_tokens as number,
        creditsUsed: r.credits_used as number,
        createdAt: (r.created_at as Date).toISOString(),
        organizationName: r.organization_name as string,
      })),
      isSuperAdmin,
    }

    return NextResponse.json<ApiResponse<AIUsageDashboard>>({
      success: true,
      data: dashboard,
    })
  } catch (error) {
    logError(logger, "AI usage dashboard error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to load AI usage data" },
      { status: 500 }
    )
  }
})
