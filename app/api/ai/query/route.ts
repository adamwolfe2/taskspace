import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth, withAdmin } from "@/lib/api/middleware"
import { answerQuery, isClaudeConfigured } from "@/lib/ai/claude-client"
import { generateId } from "@/lib/auth/password"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import { aiRateLimit } from "@/lib/api/rate-limit"
import type { ApiResponse, AIQueryResponse, AIConversation, TeamMember } from "@/lib/types"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { aiQueryRequestSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"

// POST /api/ai/query - Ask a natural language question about team data
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Rate limit: 20 AI queries per user per hour
    const rateCheck = aiRateLimit(auth.user.id, 'query')
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
    // If workspaceId is provided, filter data to only that workspace
    const workspaceFilter = workspaceId || null

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

    // Fetch all data
    const allTasks = await db.assignedTasks.findByOrganizationId(auth.organization.id)
    const allRocks = await db.rocks.findByOrganizationId(auth.organization.id)
    const allEodReports = await db.eodReports.findByOrganizationId(auth.organization.id)

    // Filter by workspace if specified
    const tasks = workspaceFilter
      ? allTasks.filter(t => t.workspaceId === workspaceFilter)
      : allTasks
    const rocks = workspaceFilter
      ? allRocks.filter(r => r.workspaceId === workspaceFilter)
      : allRocks
    const eodReports = workspaceFilter
      ? allEodReports.filter(e => e.workspaceId === workspaceFilter)
      : allEodReports

    // Get the last 30 days of reports for context
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentReports = eodReports.filter(r => new Date(r.date) >= thirtyDaysAgo)

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
      eodReports: recentReports,
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
      { success: false, error: error instanceof Error ? error.message : "Failed to process query" },
      { status: 500 }
    )
  }
})

// GET /api/ai/query - Get conversation history
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50", 10)

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
