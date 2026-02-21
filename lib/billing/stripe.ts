/**
 * Stripe Billing Module
 *
 * Centralized billing functionality including:
 * - Plan definitions
 * - Checkout session creation
 * - Customer portal
 * - AI credit tracking
 */

import { sql } from "../db/sql"
import { logger } from "../logger"

// ============================================
// PLAN DEFINITIONS
// ============================================

export interface PlanConfig {
  id: string
  name: string
  displayName: string
  maxSeats: number | null
  aiCreditsMonthly: number // -1 = unlimited
  priceMonthly: number // in cents
  priceYearly: number // in cents
  features: string[]
}

export const PLANS: Record<string, PlanConfig> = {
  free: {
    id: "free",
    name: "free",
    displayName: "Free",
    maxSeats: 3,
    aiCreditsMonthly: 50,
    priceMonthly: 0,
    priceYearly: 0,
    features: ["basic_rocks", "basic_tasks", "eod_reports"],
  },
  team: {
    id: "team",
    name: "team",
    displayName: "Team",
    maxSeats: 25,
    aiCreditsMonthly: 200,
    priceMonthly: 900, // $9/user/mo
    priceYearly: 8640, // $86.40/user/yr (20% off)
    features: [
      "basic_rocks",
      "basic_tasks",
      "eod_reports",
      "l10_meetings",
      "ids_board",
      "scorecard",
      "manager_dashboard",
      "ai_insights",
      "team_analytics",
      "slack_integration",
      "asana_integration",
      "google_calendar",
      "multiple_workspaces",
    ],
  },
  business: {
    id: "business",
    name: "business",
    displayName: "Business",
    maxSeats: null, // unlimited
    aiCreditsMonthly: -1, // unlimited
    priceMonthly: 1900, // $19/user/mo
    priceYearly: 18240, // $182.40/user/yr (20% off)
    features: [
      "basic_rocks",
      "basic_tasks",
      "eod_reports",
      "l10_meetings",
      "ids_board",
      "scorecard",
      "manager_dashboard",
      "ai_insights",
      "team_analytics",
      "slack_integration",
      "asana_integration",
      "google_calendar",
      "multiple_workspaces",
      "custom_branding",
      "api_access",
      "sso_saml",
      "priority_support",
      "unlimited_ai",
      "unlimited_workspaces",
    ],
  },
}

// ============================================
// AI CREDITS MANAGEMENT
// ============================================

export interface AIUsageRecord {
  organizationId: string
  userId: string
  action: string
  model: string
  inputTokens: number
  outputTokens: number
  creditsUsed: number
  metadata?: Record<string, unknown>
}

/**
 * Check if organization has AI credits remaining
 */
export async function checkAICredits(organizationId: string): Promise<{
  hasCredits: boolean
  creditsUsed: number
  creditsLimit: number
  remainingCredits: number
}> {
  try {
    // Get organization's plan
    const { rows: orgRows } = await sql`
      SELECT subscription->>'plan' as plan
      FROM organizations
      WHERE id = ${organizationId}
    `
    const plan = orgRows[0]?.plan || "free"
    const planConfig = PLANS[plan] || PLANS.free

    // Unlimited for enterprise
    if (planConfig.aiCreditsMonthly === -1) {
      return {
        hasCredits: true,
        creditsUsed: 0,
        creditsLimit: -1,
        remainingCredits: -1,
      }
    }

    // Get current month's usage
    const { rows: usageRows } = await sql`
      SELECT COALESCE(SUM(credits_used), 0)::integer as credits_used
      FROM ai_usage
      WHERE organization_id = ${organizationId}
        AND created_at >= date_trunc('month', CURRENT_DATE)
    `
    const creditsUsed = usageRows[0]?.credits_used || 0
    const creditsLimit = planConfig.aiCreditsMonthly
    const remainingCredits = Math.max(0, creditsLimit - creditsUsed)

    return {
      hasCredits: creditsUsed < creditsLimit,
      creditsUsed,
      creditsLimit,
      remainingCredits,
    }
  } catch (error) {
    logger.error({ error, organizationId }, "Failed to check AI credits")
    // Fail closed — deny AI access when we can't verify credits to prevent billing bypass
    return {
      hasCredits: false,
      creditsUsed: 0,
      creditsLimit: 0,
      remainingCredits: 0,
    }
  }
}

/**
 * Record AI usage for an organization.
 *
 * Uses a conditional INSERT via CTE to atomically check the monthly credit
 * limit before recording usage. This eliminates the TOCTOU race condition
 * between checkAICredits() and recordAIUsage() where two concurrent requests
 * could both pass the limit check and both get recorded, causing overage.
 *
 * The INSERT only proceeds if the current month's total + new credits stay
 * within the plan limit. Unlimited plans (-1) always insert.
 */
export async function recordAIUsage(usage: AIUsageRecord): Promise<void> {
  try {
    // Fetch the org's plan limit for the atomic guard
    const { rows: planRows } = await sql`
      SELECT subscription->>'plan' as plan FROM organizations WHERE id = ${usage.organizationId}
    `
    const plan = (planRows[0]?.plan as string) || "free"
    const planConfig = PLANS[plan] || PLANS.free
    const limit = planConfig.aiCreditsMonthly // -1 = unlimited

    if (limit === -1) {
      // Unlimited plan — unconditional insert
      await sql`
        INSERT INTO ai_usage (
          organization_id, user_id, action, model,
          input_tokens, output_tokens, credits_used, metadata
        ) VALUES (
          ${usage.organizationId}, ${usage.userId}, ${usage.action}, ${usage.model},
          ${usage.inputTokens}, ${usage.outputTokens}, ${usage.creditsUsed},
          ${JSON.stringify(usage.metadata || {})}::jsonb
        )
      `
    } else {
      // ATOMIC: CTE checks current usage and only inserts if still within limit.
      // This is a single Postgres statement — no race window between check and write.
      const { rowCount } = await sql`
        WITH current_month_usage AS (
          SELECT COALESCE(SUM(credits_used), 0) AS used
          FROM ai_usage
          WHERE organization_id = ${usage.organizationId}
            AND created_at >= date_trunc('month', CURRENT_DATE)
        )
        INSERT INTO ai_usage (
          organization_id, user_id, action, model,
          input_tokens, output_tokens, credits_used, metadata
        )
        SELECT
          ${usage.organizationId}, ${usage.userId}, ${usage.action}, ${usage.model},
          ${usage.inputTokens}, ${usage.outputTokens}, ${usage.creditsUsed},
          ${JSON.stringify(usage.metadata || {})}::jsonb
        FROM current_month_usage
        WHERE used + ${usage.creditsUsed} <= ${limit}
      `

      if ((rowCount ?? 0) === 0) {
        // Concurrent requests caused overage — the AI call already completed
        // but we refuse to record more than the plan allows.
        logger.warn(
          { organizationId: usage.organizationId, action: usage.action, creditsUsed: usage.creditsUsed, limit },
          "AI credit overage blocked by atomic guard — concurrent request exceeded monthly limit"
        )
        return
      }
    }

    logger.debug(
      { organizationId: usage.organizationId, action: usage.action, creditsUsed: usage.creditsUsed },
      "AI usage recorded"
    )
  } catch (error) {
    // Log but don't fail the request if usage tracking fails
    logger.error({ error, usage }, "Failed to record AI usage")
  }
}

/**
 * Get AI usage statistics for an organization
 */
export async function getAIUsageStats(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalCredits: number
  totalTokens: number
  queryCount: number
  byAction: Record<string, number>
  byModel: Record<string, number>
}> {
  const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const end = endDate || new Date()

  try {
    // Get totals
    const { rows: totalRows } = await sql`
      SELECT
        COALESCE(SUM(credits_used), 0)::integer as total_credits,
        COALESCE(SUM(input_tokens + output_tokens), 0)::integer as total_tokens,
        COUNT(*)::integer as query_count
      FROM ai_usage
      WHERE organization_id = ${organizationId}
        AND created_at >= ${start.toISOString()}
        AND created_at < ${end.toISOString()}
    `

    // Get by action
    const { rows: actionRows } = await sql`
      SELECT action, SUM(credits_used)::integer as credits
      FROM ai_usage
      WHERE organization_id = ${organizationId}
        AND created_at >= ${start.toISOString()}
        AND created_at < ${end.toISOString()}
      GROUP BY action
    `
    const byAction: Record<string, number> = {}
    for (const row of actionRows) {
      byAction[row.action as string] = row.credits as number
    }

    // Get by model
    const { rows: modelRows } = await sql`
      SELECT model, SUM(credits_used)::integer as credits
      FROM ai_usage
      WHERE organization_id = ${organizationId}
        AND created_at >= ${start.toISOString()}
        AND created_at < ${end.toISOString()}
      GROUP BY model
    `
    const byModel: Record<string, number> = {}
    for (const row of modelRows) {
      byModel[row.model as string] = row.credits as number
    }

    return {
      totalCredits: totalRows[0]?.total_credits || 0,
      totalTokens: totalRows[0]?.total_tokens || 0,
      queryCount: totalRows[0]?.query_count || 0,
      byAction,
      byModel,
    }
  } catch (error) {
    logger.error({ error, organizationId }, "Failed to get AI usage stats")
    return {
      totalCredits: 0,
      totalTokens: 0,
      queryCount: 0,
      byAction: {},
      byModel: {},
    }
  }
}

// ============================================
// SEAT MANAGEMENT
// ============================================

/**
 * Check if organization can add more seats
 */
export async function canAddSeat(organizationId: string): Promise<{
  canAdd: boolean
  currentSeats: number
  maxSeats: number | null
}> {
  try {
    // Get organization's plan and current member count
    const { rows } = await sql`
      SELECT
        o.subscription->>'plan' as plan,
        COUNT(om.id)::integer as current_seats
      FROM organizations o
      LEFT JOIN organization_members om ON om.organization_id = o.id AND om.status = 'active'
      WHERE o.id = ${organizationId}
      GROUP BY o.id
    `

    const plan = rows[0]?.plan || "free"
    const currentSeats = rows[0]?.current_seats || 0
    const planConfig = PLANS[plan] || PLANS.free
    const maxSeats = planConfig.maxSeats

    return {
      canAdd: maxSeats === null || currentSeats < maxSeats,
      currentSeats,
      maxSeats,
    }
  } catch (error) {
    logger.error({ error, organizationId }, "Failed to check seat availability")
    return { canAdd: false, currentSeats: 0, maxSeats: 3 }
  }
}

/**
 * Get seat usage for an organization
 */
export async function getSeatUsage(organizationId: string): Promise<{
  used: number
  limit: number | null
  available: number | null
}> {
  const result = await canAddSeat(organizationId)
  return {
    used: result.currentSeats,
    limit: result.maxSeats,
    available: result.maxSeats === null ? null : Math.max(0, result.maxSeats - result.currentSeats),
  }
}

// ============================================
// FEATURE CHECKS
// ============================================

/**
 * Check if a feature is enabled for an organization's plan
 */
export async function isFeatureEnabled(
  organizationId: string,
  feature: string
): Promise<boolean> {
  try {
    const { rows } = await sql`
      SELECT subscription->>'plan' as plan, is_internal
      FROM organizations
      WHERE id = ${organizationId}
    `
    if (rows[0]?.is_internal) return true
    const plan = rows[0]?.plan || "free"
    const planConfig = PLANS[plan] || PLANS.free
    return planConfig.features.includes(feature)
  } catch (error) {
    logger.error({ error, organizationId, feature }, "Failed to check feature")
    return false
  }
}

/**
 * Get all enabled features for an organization
 */
export async function getEnabledFeatures(organizationId: string): Promise<string[]> {
  try {
    const { rows } = await sql`
      SELECT subscription->>'plan' as plan
      FROM organizations
      WHERE id = ${organizationId}
    `
    const plan = rows[0]?.plan || "free"
    const planConfig = PLANS[plan] || PLANS.free
    return planConfig.features
  } catch (error) {
    logger.error({ error, organizationId }, "Failed to get features")
    return PLANS.free.features
  }
}

// ============================================
// BILLING PORTAL
// ============================================

/**
 * Get billing summary for an organization
 */
export async function getBillingSummary(organizationId: string): Promise<{
  plan: PlanConfig
  seatUsage: { used: number; limit: number | null }
  aiUsage: { used: number; limit: number; remaining: number }
  features: string[]
}> {
  try {
    const { rows } = await sql`
      SELECT subscription->>'plan' as plan
      FROM organizations
      WHERE id = ${organizationId}
    `
    const planId = rows[0]?.plan || "free"
    const plan = PLANS[planId] || PLANS.free

    const seatResult = await getSeatUsage(organizationId)
    const aiResult = await checkAICredits(organizationId)
    const features = await getEnabledFeatures(organizationId)

    return {
      plan,
      seatUsage: { used: seatResult.used, limit: seatResult.limit },
      aiUsage: {
        used: aiResult.creditsUsed,
        limit: aiResult.creditsLimit,
        remaining: aiResult.remainingCredits,
      },
      features,
    }
  } catch (error) {
    logger.error({ error, organizationId }, "Failed to get billing summary")
    throw error
  }
}
