import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { withAuth, withAdmin } from "@/lib/api/middleware"
import { answerQuery, isClaudeConfigured } from "@/lib/ai/claude-client"
import { generateId } from "@/lib/auth/password"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import { aiRateLimit } from "@/lib/api/rate-limit"
import type { ApiResponse, AIQueryResponse, AIConversation, TeamMember } from "@/lib/types"
import { validateBody } from "@/lib/validation/middleware"
import { aiQueryRequestSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"

// POST /api/ai/query - Ask a natural language question about team data
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Rate limit: 20 AI queries per user per hour
    const rateCheck = aiRateLimit(auth.user.id, 'query', undefined, undefined, auth.organization.id, auth.organization.subscription.plan)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
    }

    if (!isClaudeConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "AI features are not configured. Please add ANTHROPIC_API_KEY to environment." },
        { status: 503 }
      )
    }

    // Check AI credits before processing
    const creditCheck = await checkCreditsOrRespond({
      organizationId: auth.organization.id,
      userId: auth.user.id,
    })
    if (creditCheck instanceof NextResponse) {
      return creditCheck as NextResponse<ApiResponse<null>>
    }

    const { query, workspaceId } = await validateBody(request, aiQueryRequestSchema)

    // SECURITY: Add optional workspace filtering to prevent cross-workspace data leakage
    // Pass workspaceId directly to DB queries — no in-memory filtering needed
    const workspaceFilter = workspaceId || undefined

    // Build context from team data
    const teamMembersData = await db.members.findWithUsersByOrganizationId(auth.organization.id)
    const teamMembers: TeamMember[] = teamMembersData.map(m => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      department: m.department,
      avatar: m.avatar,
      joinDate: m.joinDate,
      weeklyMeasurable: m.weeklyMeasurable,
      status: m.status,
    }))

    // Fetch data with filters pushed to SQL layer
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [tasks, rocks, recentReports, scorecardResult] = await Promise.all([
      db.assignedTasks.findByOrganizationId(auth.organization.id, workspaceFilter),
      db.rocks.findByOrganizationId(auth.organization.id, workspaceFilter),
      db.eodReports.findByOrganizationId(auth.organization.id, workspaceFilter, thirtyDaysAgo),
      sql`
        SELECT
          COALESCE(NULLIF(om.name, ''), u.name, 'Unknown') as member_name,
          tmm.metric_name,
          tmm.weekly_goal,
          wme.actual_value,
          wme.week_ending
        FROM team_member_metrics tmm
        JOIN organization_members om ON om.id = tmm.team_member_id
        LEFT JOIN users u ON u.id = om.user_id
        LEFT JOIN weekly_metric_entries wme ON wme.metric_id = tmm.id
          AND wme.week_ending = (SELECT MAX(week_ending) FROM weekly_metric_entries)
        WHERE om.organization_id = ${auth.organization.id}
          AND om.status = 'active'
          AND tmm.is_active = true
        ORDER BY COALESCE(NULLIF(om.name, ''), u.name) ASC
      `,
    ])

    // Build member name lookup for EOD reports
    const _memberNameMap = new Map(teamMembers.map(m => [m.id, m.name]))
    const memberUserIdMap = new Map(teamMembersData.map(m => [m.userId, m.name]))
    const enrichedReports = recentReports.map(r => ({
      ...r,
      userName: memberUserIdMap.get(r.userId) || r.userId,
    }))

    const scorecardData = scorecardResult.rows.map(row => ({
      memberName: row.member_name as string,
      metricName: row.metric_name as string,
      weeklyGoal: Number(row.weekly_goal),
      actualValue: row.actual_value !== null ? Number(row.actual_value) : null,
      weekEnding: row.week_ending instanceof Date
        ? `${row.week_ending.getFullYear()}-${String(row.week_ending.getMonth() + 1).padStart(2, '0')}-${String(row.week_ending.getDate()).padStart(2, '0')}`
        : String(row.week_ending || ""),
    }))

    // Create conversation record
    const now = new Date().toISOString()
    const conversation: AIConversation = {
      id: generateId(),
      organizationId: auth.organization.id,
      userId: auth.user.id,
      query: query.trim(),
      createdAt: now,
    }

    await db.aiConversations.create(conversation)

    // Answer query with Claude
    const { result, usage } = await answerQuery(query.trim(), {
      teamMembers,
      tasks,
      rocks,
      eodReports: enrichedReports,
      scorecardData,
    })

    // Record AI usage
    await recordUsage({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "query",
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      metadata: {
        conversationId: conversation.id,
        queryLength: query.length,
      },
      reservationId: creditCheck.reservationId,
    })

    // Update conversation with response
    await db.aiConversations.update(conversation.id, {
      response: result.response,
      contextUsed: {
        teamMembersCount: teamMembers.length,
        tasksCount: tasks.length,
        rocksCount: rocks.length,
        reportsCount: recentReports.length,
      },
    })

    return NextResponse.json<ApiResponse<AIQueryResponse & { conversationId: string }>>({
      success: true,
      data: {
        ...result,
        conversationId: conversation.id,
      },
    })
  } catch (error) {
    logError(logger, "AI query error", error)

    // Handle credit exhaustion error
    if ((error as Error & { code?: string }).code === "CREDITS_EXHAUSTED") {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "AI credit limit reached. Please upgrade your plan for more credits.",
          code: "CREDITS_EXHAUSTED",
        },
        { status: 402 }
      )
    }

    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to process query" },
      { status: 500 }
    )
  }
})

// GET /api/ai/query - Get conversation history
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100)

    const conversations = await db.aiConversations.findByUserId(
      auth.user.id,
      auth.organization.id,
      limit
    )

    return NextResponse.json<ApiResponse<AIConversation[]>>({
      success: true,
      data: conversations,
    })
  } catch (error) {
    logError(logger, "Get conversations error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get conversation history" },
      { status: 500 }
    )
  }
})
