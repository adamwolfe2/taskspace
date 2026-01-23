import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { answerQuery, isClaudeConfigured } from "@/lib/ai/claude-client"
import { generateId } from "@/lib/auth/password"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import type { ApiResponse, AIQueryResponse, AIConversation, TeamMember } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// POST /api/ai/query - Ask a natural language question about team data
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can use the AI query feature" },
        { status: 403 }
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
      return creditCheck
    }

    const body = await request.json()
    const { query } = body

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Query is required" },
        { status: 400 }
      )
    }

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

    const tasks = await db.assignedTasks.findByOrganizationId(auth.organization.id)
    const rocks = await db.rocks.findByOrganizationId(auth.organization.id)
    const eodReports = await db.eodReports.findByOrganizationId(auth.organization.id)

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
    const result = await answerQuery(query.trim(), {
      teamMembers,
      tasks,
      rocks,
      eodReports: recentReports,
    })

    // Record AI usage
    if (result.usage) {
      await recordUsage({
        organizationId: auth.organization.id,
        userId: auth.user.id,
        action: "query",
        model: result.usage.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        metadata: {
          conversationId: conversation.id,
          queryLength: query.length,
        },
      })
    }

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

    // Remove usage from response (internal tracking only)
    const { usage: _usage, ...responseData } = result

    return NextResponse.json<ApiResponse<AIQueryResponse & { conversationId: string }>>({
      success: true,
      data: {
        ...responseData,
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
}

// GET /api/ai/query - Get conversation history
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

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
}
