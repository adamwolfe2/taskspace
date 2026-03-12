/**
 * AI Credits Helper
 *
 * Provides utilities for checking and recording AI credit usage
 * in API endpoints.
 *
 * Uses a reserve-then-finalize pattern to prevent TOCTOU race conditions:
 * 1. reserveCreditsOrRespond() atomically inserts a reservation row
 * 2. AI processing runs
 * 3. finalizeReservation() updates with actual token counts
 * If the AI call fails, the reservation still stands (credits stay deducted).
 */

import { NextResponse } from "next/server"
import { checkAICredits, recordAIUsage, reserveAICredits } from "@/lib/billing/stripe"
import type { ApiResponse } from "@/lib/types"
import { logger } from "@/lib/logger"

export interface AICreditsContext {
  organizationId: string
  userId: string
}

export interface CreditCheckResult {
  hasCredits: boolean
  creditsUsed: number
  creditsLimit: number
  remainingCredits: number
  reservationId?: string
}

/**
 * Atomically reserve AI credits and return error response if limit reached.
 * This replaces the old check-then-record pattern to eliminate the race window
 * where two concurrent requests could both pass a non-atomic credit check.
 */
export async function checkCreditsOrRespond(
  context: AICreditsContext & { action?: string; estimatedCredits?: number }
): Promise<CreditCheckResult | NextResponse> {
  const estimatedCredits = context.estimatedCredits ?? 5

  // Try atomic reservation first
  const reservation = await reserveAICredits({
    organizationId: context.organizationId,
    userId: context.userId,
    action: context.action ?? "ai_request",
    creditsToReserve: estimatedCredits,
  })

  if (reservation.reserved) {
    return {
      hasCredits: true,
      creditsUsed: reservation.currentUsage,
      creditsLimit: reservation.limit,
      remainingCredits: Math.max(0, reservation.limit - reservation.currentUsage - estimatedCredits),
      reservationId: reservation.reservationId,
    }
  }

  // Reservation failed — over limit
  return NextResponse.json<ApiResponse<null>>(
    {
      success: false,
      error: "AI credit limit reached. Please upgrade your plan for more credits.",
      code: "CREDITS_EXHAUSTED",
    },
    { status: 402 }
  )
}

/**
 * Check credits - throws if no credits available
 */
export async function requireCredits(context: AICreditsContext): Promise<CreditCheckResult> {
  const result = await checkAICredits(context.organizationId)

  if (!result.hasCredits) {
    const error = new Error("AI credit limit reached") as Error & { code: string }
    error.code = "CREDITS_EXHAUSTED"
    throw error
  }

  return result
}

/**
 * Credit cost calculation for different AI operations
 */
export const AI_CREDIT_COSTS = {
  // Query operations (Claude-based)
  query: 5,
  digest: 10,
  eodParse: 3,
  brainDump: 8,
  slackResponse: 5,
  taskSuggestion: 3,

  // V2 AI features
  weeklyBrief: 8,
  smartRocks: 10,
  meetingIntelligence: 12,
  oneOnOnePrep: 6,
  rockRetrospective: 10,
  eosHealthReport: 15,
  companyDigest: 12,

  // Per token costs (for detailed tracking)
  inputTokenPer1K: 1,
  outputTokenPer1K: 3,
}

/**
 * Calculate credit cost based on tokens
 */
export function calculateTokenCost(inputTokens: number, outputTokens: number): number {
  const inputCost = Math.ceil(inputTokens / 1000) * AI_CREDIT_COSTS.inputTokenPer1K
  const outputCost = Math.ceil(outputTokens / 1000) * AI_CREDIT_COSTS.outputTokenPer1K
  return inputCost + outputCost
}

/**
 * Record AI usage after successful operation.
 * If a reservationId is provided, updates the existing reservation row
 * with actual token counts instead of inserting a new row.
 */
export async function recordUsage(params: {
  organizationId: string
  userId: string
  action: string
  model?: string
  inputTokens?: number
  outputTokens?: number
  credits?: number
  metadata?: Record<string, unknown>
  reservationId?: string
}): Promise<void> {
  const {
    organizationId,
    userId,
    action,
    model = "claude-3-haiku",
    inputTokens = 0,
    outputTokens = 0,
    credits,
    metadata,
    reservationId,
  } = params

  // Calculate credits if not provided
  const creditsUsed = credits ?? calculateTokenCost(inputTokens, outputTokens)

  if (reservationId) {
    // Finalize the reservation — update with actual usage
    try {
      const { sql } = await import("@/lib/db/sql")
      await sql`
        UPDATE ai_usage
        SET
          model = ${model},
          input_tokens = ${inputTokens},
          output_tokens = ${outputTokens},
          credits_used = ${creditsUsed},
          metadata = ${JSON.stringify(metadata || {})}::jsonb
        WHERE id = ${reservationId}
      `
    } catch (error) {
      logger.error({ error, reservationId }, "Failed to finalize AI credit reservation")
    }
    return
  }

  // No reservation — fall back to legacy insert (for cron jobs, background tasks, etc.)
  await recordAIUsage({
    organizationId,
    userId,
    action,
    model,
    inputTokens,
    outputTokens,
    creditsUsed,
    metadata,
  })
}

/**
 * Middleware wrapper for AI endpoints
 * Checks credits before processing and records usage after
 */
export function withAICredits<T>(
  handler: (
    context: AICreditsContext,
    creditCheck: CreditCheckResult
  ) => Promise<{ result: T; usage: { inputTokens: number; outputTokens: number; model?: string } }>
) {
  return async (context: AICreditsContext, action: string): Promise<T> => {
    // Check credits first
    const creditCheck = await requireCredits(context)

    // Run the handler
    const { result, usage } = await handler(context, creditCheck)

    // Record usage
    await recordUsage({
      organizationId: context.organizationId,
      userId: context.userId,
      action,
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    })

    return result
  }
}

/**
 * Higher-order function to wrap existing AI endpoint handlers
 */
export async function withCreditCheck<T>(
  context: AICreditsContext,
  action: string,
  handler: () => Promise<{
    result: T
    inputTokens?: number
    outputTokens?: number
    model?: string
  }>
): Promise<T | NextResponse> {
  // Check credits
  const checkResult = await checkCreditsOrRespond(context)
  if (checkResult instanceof NextResponse) {
    return checkResult
  }

  // Run handler
  const { result, inputTokens = 0, outputTokens = 0, model } = await handler()

  // Record usage
  await recordUsage({
    organizationId: context.organizationId,
    userId: context.userId,
    action,
    model,
    inputTokens,
    outputTokens,
  })

  return result
}
