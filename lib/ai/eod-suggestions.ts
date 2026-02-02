/**
 * EOD Suggestions Generator
 *
 * Generates AI suggestions from EOD report insights.
 * Part of SESSION 4A: AI Inbox with Budget Controls
 */

import { createSuggestion, createSuggestions, type CreateSuggestionParams } from "./suggestions"
import { AI_CREDIT_COSTS } from "./credits"
import type { EODInsight, EODReport, TeamMember } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

interface GenerateSuggestionsParams {
  organizationId: string
  report: EODReport
  insight: EODInsight
  member: {
    id: string
    name: string
    department: string
  }
  adminIds?: string[]
}

/**
 * Generate AI suggestions from an EOD report insight
 */
export async function generateEODSuggestions(
  params: GenerateSuggestionsParams
): Promise<void> {
  const { organizationId, report, insight, member, adminIds = [] } = params
  const suggestions: CreateSuggestionParams[] = []

  // 1. Generate suggestions from blockers
  if (insight.blockers && insight.blockers.length > 0) {
    for (const blocker of insight.blockers) {
      const suggestion: CreateSuggestionParams = {
        organizationId,
        sourceType: "eod_report",
        sourceId: report.id,
        sourceText: `${member.name}'s EOD Report (${report.date}): ${blocker.text}`,
        suggestionType: "blocker",
        title: `Address blocker: ${blocker.text.substring(0, 100)}${blocker.text.length > 100 ? "..." : ""}`,
        description: blocker.text,
        suggestedData: {
          blockerText: blocker.text,
          severity: blocker.severity,
          suggestedAction: blocker.suggestedAction,
          relatedTo: blocker.relatedTo,
        },
        context: insight.aiSummary,
        confidence: blocker.severity === "high" ? 0.9 : 0.75,
        priority: blocker.severity === "high" ? "high" : "medium",
        targetUserId: adminIds[0], // Assign to first admin for review
        targetUserName: undefined, // Will be filled by approver
        relatedEntityType: "eod_report",
        relatedEntityId: report.id,
        creditsCost: AI_CREDIT_COSTS.taskSuggestion,
        expiresInDays: 7,
      }
      suggestions.push(suggestion)
    }
  }

  // 2. Generate follow-up suggestions from follow-up questions
  if (insight.followUpQuestions && insight.followUpQuestions.length > 0) {
    for (const question of insight.followUpQuestions) {
      const suggestion: CreateSuggestionParams = {
        organizationId,
        sourceType: "eod_report",
        sourceId: report.id,
        sourceText: `${member.name}'s EOD Report (${report.date})`,
        suggestionType: "follow_up",
        title: `Follow up with ${member.name}: ${question.substring(0, 80)}${question.length > 80 ? "..." : ""}`,
        description: question,
        suggestedData: {
          question,
          memberName: member.name,
          memberId: member.id,
          department: member.department,
        },
        context: `AI identified this follow-up question based on ${member.name}'s EOD report: "${insight.aiSummary}"`,
        confidence: 0.7,
        priority: "medium",
        targetUserId: adminIds[0],
        relatedEntityType: "eod_report",
        relatedEntityId: report.id,
        creditsCost: AI_CREDIT_COSTS.taskSuggestion,
        expiresInDays: 5,
      }
      suggestions.push(suggestion)
    }
  }

  // 3. Generate alert if sentiment is negative/stressed
  if (insight.sentiment === "negative" || insight.sentiment === "stressed") {
    const suggestion: CreateSuggestionParams = {
      organizationId,
      sourceType: "eod_report",
      sourceId: report.id,
      sourceText: `${member.name}'s EOD Report shows ${insight.sentiment} sentiment (score: ${insight.sentimentScore}/100)`,
      suggestionType: "alert",
      title: `Check in with ${member.name} - ${insight.sentiment} sentiment detected`,
      description: `${member.name} from ${member.department} appears to be ${insight.sentiment}. Consider having a 1:1 conversation.`,
      suggestedData: {
        sentiment: insight.sentiment,
        sentimentScore: insight.sentimentScore,
        summary: insight.aiSummary,
      },
      context: insight.aiSummary,
      confidence: insight.sentimentScore < 30 ? 0.9 : 0.75,
      priority: insight.sentimentScore < 30 ? "high" : "medium",
      targetUserId: adminIds[0],
      relatedEntityType: "eod_report",
      relatedEntityId: report.id,
      creditsCost: 0, // Alerts don't cost credits
      expiresInDays: 3,
    }
    suggestions.push(suggestion)
  }

  // 4. Generate rock update suggestion if rock mentioned in completed items
  // This is a simplified version - could be enhanced with AI-based rock matching
  for (const item of insight.completedItems) {
    if (item.rockId) {
      const suggestion: CreateSuggestionParams = {
        organizationId,
        sourceType: "eod_report",
        sourceId: report.id,
        sourceText: `${member.name} completed work on rock: ${item.text}`,
        suggestionType: "rock_update",
        title: `Review rock progress for "${item.text.substring(0, 60)}${item.text.length > 60 ? "..." : ""}"`,
        description: item.text,
        suggestedData: {
          rockId: item.rockId,
          itemText: item.text,
          category: item.category,
        },
        context: `${member.name} completed work related to this rock in their EOD report`,
        confidence: 0.7,
        priority: "low",
        targetUserId: member.id,
        targetUserName: member.name,
        relatedEntityType: "rock",
        relatedEntityId: item.rockId,
        creditsCost: 0,
        expiresInDays: 7,
      }
      suggestions.push(suggestion)
    }
  }

  // Create all suggestions
  if (suggestions.length > 0) {
    try {
      await createSuggestions(suggestions)
      logger.info({ count: suggestions.length, reportId: report.id }, "AI suggestions created from EOD report")
    } catch (error) {
      logError(logger, "Failed to create AI suggestions", error)
    }
  }
}

/**
 * Check if suggestions should be generated based on budget settings
 */
export async function shouldGenerateSuggestions(
  organizationId: string,
  creditsRemaining: number
): Promise<boolean> {
  // Don't generate suggestions if credits are very low (< 10)
  if (creditsRemaining < 10) {
    logger.debug({ creditsRemaining }, "AI suggestions skipped due to low credits")
    return false
  }

  return true
}
