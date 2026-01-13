/**
 * AI Credits Helper
 *
 * Provides utilities for checking and recording AI credit usage
 * in API endpoints.
 */

import { NextResponse } from "next/server"
import { checkAICredits, recordAIUsage } from "@/lib/billing/stripe"
import type { ApiResponse } from "@/lib/types"

export interface AICreditsContext {
  organizationId: string
  userId: string
}

export interface CreditCheckResult {
  hasCredits: boolean
  creditsUsed: number
  creditsLimit: number
  remainingCredits: number
}

/**
 * Check if organization has AI credits and return error response if not
 */
export async function checkCreditsOrRespond(
  context: AICreditsContext
): Promise<CreditCheckResult | NextResponse> {
  const result = await checkAICredits(context.organizationId)

  if (!result.hasCredits) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "AI credit limit reached. Please upgrade your plan for more credits.",
        code: "CREDITS_EXHAUSTED",
      },
      { status: 402 } // Payment Required
    )
  }

  return result
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
 * Record AI usage after successful operation
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
  } = params

  // Calculate credits if not provided
  const creditsUsed = credits ?? calculateTokenCost(inputTokens, outputTokens)

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
