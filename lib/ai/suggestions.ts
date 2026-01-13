/**
 * AI Suggestions Module
 *
 * Handles CRUD operations for AI-generated suggestions that require human review.
 * Part of SESSION 4A: AI Inbox with Budget Controls
 */

import { sql, type QueryResult, type QueryResultRow } from "@/lib/db/sql"
import { generateId } from "@/lib/auth/password"
import { recordUsage } from "@/lib/ai/credits"
import type {
  AISuggestion,
  AISuggestionSourceType,
  AISuggestionType,
  AISuggestionStatus,
  AISuggestionPriority,
  AIBudgetSettings,
  SuggestionStats,
  AssignedTask,
} from "@/lib/types"

// ============================================
// SUGGESTION CREATION
// ============================================

export interface CreateSuggestionParams {
  organizationId: string
  sourceType: AISuggestionSourceType
  sourceId?: string
  sourceText?: string
  suggestionType: AISuggestionType
  title: string
  description?: string
  suggestedData: Record<string, unknown>
  context?: string
  confidence?: number
  priority?: AISuggestionPriority
  targetUserId?: string
  targetUserName?: string
  relatedEntityType?: string
  relatedEntityId?: string
  creditsCost?: number
  expiresInDays?: number
}

/**
 * Create a new AI suggestion
 */
export async function createSuggestion(params: CreateSuggestionParams): Promise<AISuggestion> {
  const id = generateId()
  const now = new Date().toISOString()

  // Calculate expiration date (default 7 days)
  const expiresAt = params.expiresInDays
    ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const result = await sql`
    INSERT INTO ai_suggestions (
      id, organization_id, source_type, source_id, source_text,
      suggestion_type, title, description, suggested_data, context,
      confidence, priority, target_user_id, target_user_name,
      related_entity_type, related_entity_id, credits_cost, expires_at,
      created_at, updated_at
    ) VALUES (
      ${id}, ${params.organizationId}, ${params.sourceType}, ${params.sourceId || null},
      ${params.sourceText || null}, ${params.suggestionType}, ${params.title},
      ${params.description || null}, ${JSON.stringify(params.suggestedData)},
      ${params.context || null}, ${params.confidence ?? 0.75}, ${params.priority || "medium"},
      ${params.targetUserId || null}, ${params.targetUserName || null},
      ${params.relatedEntityType || null}, ${params.relatedEntityId || null},
      ${params.creditsCost || 0}, ${expiresAt}, ${now}, ${now}
    )
    RETURNING *
  `

  return parseSuggestion(result.rows[0])
}

/**
 * Create multiple suggestions at once
 */
export async function createSuggestions(params: CreateSuggestionParams[]): Promise<AISuggestion[]> {
  const suggestions: AISuggestion[] = []

  for (const param of params) {
    const suggestion = await createSuggestion(param)
    suggestions.push(suggestion)
  }

  return suggestions
}

// ============================================
// SUGGESTION QUERIES
// ============================================

export interface SuggestionFilters {
  status?: AISuggestionStatus | AISuggestionStatus[]
  sourceType?: AISuggestionSourceType
  suggestionType?: AISuggestionType | AISuggestionType[]
  targetUserId?: string
  priority?: AISuggestionPriority | AISuggestionPriority[]
  minConfidence?: number
  includeExpired?: boolean
  limit?: number
  offset?: number
}

/**
 * Get suggestions for an organization with optional filters
 */
export async function getSuggestions(
  organizationId: string,
  filters: SuggestionFilters = {}
): Promise<AISuggestion[]> {
  const {
    status = "pending",
    sourceType,
    suggestionType,
    targetUserId,
    priority,
    minConfidence,
    includeExpired = false,
    limit = 50,
    offset = 0,
  } = filters

  // Build the query dynamically based on filters
  let query = `
    SELECT * FROM ai_suggestions
    WHERE organization_id = $1
  `
  const params: unknown[] = [organizationId]
  let paramIndex = 2

  // Status filter
  if (status) {
    if (Array.isArray(status)) {
      query += ` AND status = ANY($${paramIndex})`
      params.push(status)
    } else {
      query += ` AND status = $${paramIndex}`
      params.push(status)
    }
    paramIndex++
  }

  // Source type filter
  if (sourceType) {
    query += ` AND source_type = $${paramIndex}`
    params.push(sourceType)
    paramIndex++
  }

  // Suggestion type filter
  if (suggestionType) {
    if (Array.isArray(suggestionType)) {
      query += ` AND suggestion_type = ANY($${paramIndex})`
      params.push(suggestionType)
    } else {
      query += ` AND suggestion_type = $${paramIndex}`
      params.push(suggestionType)
    }
    paramIndex++
  }

  // Target user filter
  if (targetUserId) {
    query += ` AND target_user_id = $${paramIndex}`
    params.push(targetUserId)
    paramIndex++
  }

  // Priority filter
  if (priority) {
    if (Array.isArray(priority)) {
      query += ` AND priority = ANY($${paramIndex})`
      params.push(priority)
    } else {
      query += ` AND priority = $${paramIndex}`
      params.push(priority)
    }
    paramIndex++
  }

  // Confidence filter
  if (minConfidence !== undefined) {
    query += ` AND confidence >= $${paramIndex}`
    params.push(minConfidence)
    paramIndex++
  }

  // Expiration filter
  if (!includeExpired) {
    query += ` AND (expires_at IS NULL OR expires_at > NOW())`
  }

  // Order and pagination
  query += ` ORDER BY
    CASE priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    confidence DESC,
    created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `
  params.push(limit, offset)

  // Use type assertion since sql.query exists on both local and Vercel implementations
  const sqlWithQuery = sql as unknown as {
    query: (q: string, p: unknown[]) => Promise<QueryResult<QueryResultRow>>
  }
  const result = await sqlWithQuery.query(query, params)
  return result.rows.map((row) => parseSuggestion(row as Record<string, unknown>))
}

/**
 * Get a single suggestion by ID
 */
export async function getSuggestionById(id: string): Promise<AISuggestion | null> {
  const result = await sql`
    SELECT * FROM ai_suggestions WHERE id = ${id}
  `
  return result.rows[0] ? parseSuggestion(result.rows[0]) : null
}

/**
 * Get suggestion statistics for an organization
 */
export async function getSuggestionStats(organizationId: string): Promise<SuggestionStats> {
  const result = await sql`
    SELECT * FROM get_suggestion_stats(${organizationId})
  `

  if (result.rows[0]) {
    return {
      pending: result.rows[0].pending_count || 0,
      approvedToday: result.rows[0].approved_today || 0,
      rejectedToday: result.rows[0].rejected_today || 0,
      autoAppliedToday: result.rows[0].auto_applied_today || 0,
      creditsUsedToday: result.rows[0].credits_used_today || 0,
      avgConfidence: result.rows[0].avg_confidence ? parseFloat(result.rows[0].avg_confidence) : undefined,
    }
  }

  return {
    pending: 0,
    approvedToday: 0,
    rejectedToday: 0,
    autoAppliedToday: 0,
    creditsUsedToday: 0,
  }
}

// ============================================
// SUGGESTION APPROVAL/REJECTION
// ============================================

export interface ApproveSuggestionParams {
  suggestionId: string
  reviewedBy: string
  reviewerNotes?: string
  modifiedData?: Record<string, unknown> // Allow editing before approval
}

export interface ApprovalResult {
  suggestion: AISuggestion
  createdEntity?: {
    type: string
    id: string
    data: Record<string, unknown>
  }
}

/**
 * Approve a suggestion and create the corresponding entity
 */
export async function approveSuggestion(
  params: ApproveSuggestionParams,
  createEntity: (suggestion: AISuggestion) => Promise<{ type: string; id: string; data: Record<string, unknown> } | null>
): Promise<ApprovalResult> {
  const suggestion = await getSuggestionById(params.suggestionId)

  if (!suggestion) {
    throw new Error("Suggestion not found")
  }

  if (suggestion.status !== "pending") {
    throw new Error(`Suggestion is already ${suggestion.status}`)
  }

  // If modified data provided, merge it with suggested data
  const finalData = params.modifiedData
    ? { ...suggestion.suggestedData, ...params.modifiedData }
    : suggestion.suggestedData

  // Update suggestion with modified data if needed
  const updatedSuggestion: AISuggestion = {
    ...suggestion,
    suggestedData: finalData,
  }

  // Create the entity
  const createdEntity = await createEntity(updatedSuggestion)

  // Update suggestion status
  const now = new Date().toISOString()
  await sql`
    UPDATE ai_suggestions
    SET
      status = 'approved',
      reviewed_by = ${params.reviewedBy},
      reviewed_at = ${now},
      reviewer_notes = ${params.reviewerNotes || null},
      action_taken = ${createdEntity ? JSON.stringify(createdEntity) : null},
      suggested_data = ${JSON.stringify(finalData)},
      updated_at = ${now}
    WHERE id = ${params.suggestionId}
  `

  // Record AI usage (credits are deducted on approval)
  if (suggestion.creditsCost > 0) {
    await recordUsage({
      organizationId: suggestion.organizationId,
      userId: params.reviewedBy,
      action: `suggestion_approved_${suggestion.suggestionType}`,
      credits: suggestion.creditsCost,
      metadata: {
        suggestionId: suggestion.id,
        suggestionType: suggestion.suggestionType,
        createdEntityId: createdEntity?.id,
      },
    })
  }

  return {
    suggestion: {
      ...updatedSuggestion,
      status: "approved",
      reviewedBy: params.reviewedBy,
      reviewedAt: now,
      reviewerNotes: params.reviewerNotes,
      actionTaken: createdEntity || undefined,
    },
    createdEntity: createdEntity || undefined,
  }
}

/**
 * Reject a suggestion
 */
export async function rejectSuggestion(
  suggestionId: string,
  reviewedBy: string,
  reviewerNotes?: string
): Promise<AISuggestion> {
  const suggestion = await getSuggestionById(suggestionId)

  if (!suggestion) {
    throw new Error("Suggestion not found")
  }

  if (suggestion.status !== "pending") {
    throw new Error(`Suggestion is already ${suggestion.status}`)
  }

  const now = new Date().toISOString()
  await sql`
    UPDATE ai_suggestions
    SET
      status = 'rejected',
      reviewed_by = ${reviewedBy},
      reviewed_at = ${now},
      reviewer_notes = ${reviewerNotes || null},
      updated_at = ${now}
    WHERE id = ${suggestionId}
  `

  return {
    ...suggestion,
    status: "rejected",
    reviewedBy,
    reviewedAt: now,
    reviewerNotes,
  }
}

/**
 * Bulk approve suggestions
 */
export async function bulkApproveSuggestions(
  suggestionIds: string[],
  reviewedBy: string,
  createEntity: (suggestion: AISuggestion) => Promise<{ type: string; id: string; data: Record<string, unknown> } | null>
): Promise<ApprovalResult[]> {
  const results: ApprovalResult[] = []

  for (const id of suggestionIds) {
    try {
      const result = await approveSuggestion({ suggestionId: id, reviewedBy }, createEntity)
      results.push(result)
    } catch (error) {
      console.error(`Failed to approve suggestion ${id}:`, error)
      // Continue with other suggestions
    }
  }

  return results
}

/**
 * Bulk reject suggestions
 */
export async function bulkRejectSuggestions(
  suggestionIds: string[],
  reviewedBy: string,
  reviewerNotes?: string
): Promise<AISuggestion[]> {
  const results: AISuggestion[] = []

  for (const id of suggestionIds) {
    try {
      const result = await rejectSuggestion(id, reviewedBy, reviewerNotes)
      results.push(result)
    } catch (error) {
      console.error(`Failed to reject suggestion ${id}:`, error)
    }
  }

  return results
}

// ============================================
// BUDGET SETTINGS
// ============================================

/**
 * Get budget settings for an organization (with defaults)
 */
export async function getBudgetSettings(organizationId: string): Promise<AIBudgetSettings> {
  const result = await sql`
    SELECT * FROM ai_budget_settings WHERE organization_id = ${organizationId}
  `

  if (result.rows[0]) {
    return parseBudgetSettings(result.rows[0])
  }

  // Return default settings if none exist
  return {
    id: "",
    organizationId,
    monthlyBudgetCredits: 1000,
    warningThresholdPercent: 80,
    autoApproveEnabled: false,
    autoApproveMinConfidence: 0.9,
    autoApproveTypes: [],
    pauseOnBudgetExceeded: true,
    createdAt: "",
    updatedAt: "",
  }
}

/**
 * Update budget settings (creates if not exists)
 */
export async function updateBudgetSettings(
  organizationId: string,
  settings: Partial<AIBudgetSettings>
): Promise<AIBudgetSettings> {
  const existing = await sql`
    SELECT * FROM ai_budget_settings WHERE organization_id = ${organizationId}
  `
  const now = new Date().toISOString()

  if (existing.rows[0]) {
    const current = parseBudgetSettings(existing.rows[0])
    await sql`
      UPDATE ai_budget_settings
      SET
        monthly_budget_credits = ${settings.monthlyBudgetCredits ?? current.monthlyBudgetCredits},
        warning_threshold_percent = ${settings.warningThresholdPercent ?? current.warningThresholdPercent},
        auto_approve_enabled = ${settings.autoApproveEnabled ?? current.autoApproveEnabled},
        auto_approve_min_confidence = ${settings.autoApproveMinConfidence ?? current.autoApproveMinConfidence},
        auto_approve_types = ${JSON.stringify(settings.autoApproveTypes ?? current.autoApproveTypes)},
        pause_on_budget_exceeded = ${settings.pauseOnBudgetExceeded ?? current.pauseOnBudgetExceeded},
        updated_at = ${now}
      WHERE organization_id = ${organizationId}
    `

    return {
      ...current,
      ...settings,
      updatedAt: now,
    }
  }

  // Create new settings
  const id = generateId()
  const newSettings: AIBudgetSettings = {
    id,
    organizationId,
    monthlyBudgetCredits: settings.monthlyBudgetCredits ?? 1000,
    warningThresholdPercent: settings.warningThresholdPercent ?? 80,
    autoApproveEnabled: settings.autoApproveEnabled ?? false,
    autoApproveMinConfidence: settings.autoApproveMinConfidence ?? 0.9,
    autoApproveTypes: settings.autoApproveTypes ?? [],
    pauseOnBudgetExceeded: settings.pauseOnBudgetExceeded ?? true,
    createdAt: now,
    updatedAt: now,
  }

  await sql`
    INSERT INTO ai_budget_settings (
      id, organization_id, monthly_budget_credits, warning_threshold_percent,
      auto_approve_enabled, auto_approve_min_confidence, auto_approve_types,
      pause_on_budget_exceeded, created_at, updated_at
    ) VALUES (
      ${id}, ${organizationId}, ${newSettings.monthlyBudgetCredits},
      ${newSettings.warningThresholdPercent}, ${newSettings.autoApproveEnabled},
      ${newSettings.autoApproveMinConfidence}, ${JSON.stringify(newSettings.autoApproveTypes)},
      ${newSettings.pauseOnBudgetExceeded}, ${now}, ${now}
    )
  `

  return newSettings
}

// ============================================
// ENTITY CREATION HELPERS
// ============================================

/**
 * Create a task from a suggestion
 */
export function createTaskFromSuggestion(
  suggestion: AISuggestion,
  db: {
    assignedTasks: {
      create: (task: AssignedTask) => Promise<AssignedTask>
    }
  }
): (s: AISuggestion) => Promise<{ type: string; id: string; data: Record<string, unknown> } | null> {
  return async (s: AISuggestion) => {
    if (s.suggestionType !== "task" && s.suggestionType !== "follow_up") {
      return null
    }

    const taskData = s.suggestedData as {
      title?: string
      description?: string
      priority?: string
      dueDate?: string
    }

    const task: AssignedTask = {
      id: generateId(),
      organizationId: s.organizationId,
      title: taskData.title || s.title,
      description: taskData.description || s.description,
      assigneeId: s.targetUserId || "",
      assigneeName: s.targetUserName || "Unassigned",
      assignedById: null,
      assignedByName: null,
      type: "assigned",
      rockId: null,
      rockTitle: null,
      priority: (taskData.priority as "low" | "medium" | "high" | "normal") || "medium",
      status: "pending",
      dueDate: taskData.dueDate || null,
      createdAt: new Date().toISOString(),
      source: "ai_suggestion",
    }

    const created = await db.assignedTasks.create(task)

    return {
      type: "task",
      id: created.id,
      data: created as unknown as Record<string, unknown>,
    }
  }
}

// ============================================
// HELPERS
// ============================================

function parseSuggestion(row: Record<string, unknown>): AISuggestion {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    sourceType: row.source_type as AISuggestionSourceType,
    sourceId: row.source_id as string | undefined,
    sourceText: row.source_text as string | undefined,
    suggestionType: row.suggestion_type as AISuggestionType,
    title: row.title as string,
    description: row.description as string | undefined,
    suggestedData: (typeof row.suggested_data === "string"
      ? JSON.parse(row.suggested_data)
      : row.suggested_data) as Record<string, unknown>,
    context: row.context as string | undefined,
    confidence: parseFloat(row.confidence as string) || 0.75,
    priority: row.priority as AISuggestionPriority,
    targetUserId: row.target_user_id as string | undefined,
    targetUserName: row.target_user_name as string | undefined,
    relatedEntityType: row.related_entity_type as string | undefined,
    relatedEntityId: row.related_entity_id as string | undefined,
    status: row.status as AISuggestionStatus,
    reviewedBy: row.reviewed_by as string | undefined,
    reviewedAt: row.reviewed_at as string | undefined,
    reviewerNotes: row.reviewer_notes as string | undefined,
    actionTaken: row.action_taken as Record<string, unknown> | undefined,
    creditsCost: (row.credits_cost as number) || 0,
    expiresAt: row.expires_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function parseBudgetSettings(row: Record<string, unknown>): AIBudgetSettings {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    monthlyBudgetCredits: (row.monthly_budget_credits as number) || 1000,
    warningThresholdPercent: (row.warning_threshold_percent as number) || 80,
    autoApproveEnabled: row.auto_approve_enabled as boolean,
    autoApproveMinConfidence: parseFloat(row.auto_approve_min_confidence as string) || 0.9,
    autoApproveTypes: (typeof row.auto_approve_types === "string"
      ? JSON.parse(row.auto_approve_types)
      : row.auto_approve_types || []) as string[],
    pauseOnBudgetExceeded: (row.pause_on_budget_exceeded as boolean) ?? true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}
