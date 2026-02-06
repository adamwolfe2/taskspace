import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAdmin } from "@/lib/api/middleware"
import { parseBrainDump, isClaudeConfigured } from "@/lib/ai/claude-client"
import { generateId } from "@/lib/auth/password"
import { setTeamMemberMetric } from "@/lib/metrics"
import { checkApiRateLimit, getRateLimitHeaders } from "@/lib/auth/rate-limit"
import type { ApiResponse, AdminBrainDump, AIGeneratedTask, TeamMember, ParsedScorecardMetric } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// Rate limit: 10 brain dumps per user per hour (expensive operation)
const MAX_BRAIN_DUMPS_PER_HOUR = 10
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// POST /api/ai/brain-dump - Process a brain dump and generate task suggestions
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Rate limit: 10 brain dumps per user per hour
    const rateLimitKey = `ai-brain-dump:${auth.user.id}`
    const rateLimitResult = await checkApiRateLimit(
      request,
      rateLimitKey,
      MAX_BRAIN_DUMPS_PER_HOUR,
      RATE_LIMIT_WINDOW_MS
    )

    if (!rateLimitResult.success) {
      const response = NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "You have reached the maximum number of brain dumps. Please try again later.",
        },
        { status: 429 }
      )
      const headers = getRateLimitHeaders(rateLimitResult, MAX_BRAIN_DUMPS_PER_HOUR)
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value)
      }
      return response
    }

    if (!isClaudeConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "AI features are not configured. Please add ANTHROPIC_API_KEY to environment." },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Brain dump content is required" },
        { status: 400 }
      )
    }

    const MAX_CONTENT_LENGTH = 50000
    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Content too long. Maximum ${MAX_CONTENT_LENGTH} characters allowed.` },
        { status: 400 }
      )
    }

    // Create brain dump record
    const brainDumpId = generateId()
    const now = new Date().toISOString()
    const brainDump: AdminBrainDump = {
      id: brainDumpId,
      organizationId: auth.organization.id,
      adminId: auth.user.id,
      content: content.trim(),
      tasksGenerated: 0,
      status: "processing",
      createdAt: now,
    }

    await db.brainDumps.create(brainDump)

    // Get team members for context
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

    // Get current tasks and rocks for context
    const currentTasks = await db.assignedTasks.findByOrganizationId(auth.organization.id)
    const rocks = await db.rocks.findByOrganizationId(auth.organization.id)

    // Parse brain dump with Claude
    const result = await parseBrainDump(content.trim(), teamMembers, currentTasks, rocks)

    // Create AI generated tasks
    const generatedTasks: AIGeneratedTask[] = []
    for (const taskData of result.tasks) {
      const member = teamMembers.find(m => m.id === taskData.assigneeId)
      const task: AIGeneratedTask = {
        id: generateId(),
        organizationId: auth.organization.id,
        brainDumpId: brainDumpId,
        assigneeId: taskData.assigneeId,
        assigneeName: member?.name || taskData.assigneeName,
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        dueDate: taskData.dueDate,
        context: taskData.context,
        status: "pending_approval",
        pushedToSlack: false,
        createdAt: now,
      }
      await db.aiGeneratedTasks.create(task)
      generatedTasks.push(task)
    }

    // Process and save parsed scorecard metrics
    const savedMetrics: ParsedScorecardMetric[] = []
    if (result.metrics && result.metrics.length > 0) {
      for (const metricData of result.metrics) {
        // Try to match the assignee by ID first, then by name
        let member = teamMembers.find(m => m.id === metricData.assigneeId)
        if (!member) {
          // Try fuzzy name match
          const nameLower = metricData.assigneeName.toLowerCase()
          member = teamMembers.find(m =>
            m.name.toLowerCase().includes(nameLower) ||
            nameLower.includes(m.name.toLowerCase())
          )
        }

        if (member && metricData.metricName && metricData.weeklyGoal > 0) {
          try {
            await setTeamMemberMetric(member.id, metricData.metricName, metricData.weeklyGoal)
            savedMetrics.push({
              assigneeId: member.id,
              assigneeName: member.name,
              metricName: metricData.metricName,
              weeklyGoal: metricData.weeklyGoal,
            })
          } catch (err) {
            logError(logger, `Failed to save metric for ${member.name}`, err)
          }
        }
      }
    }

    // Update brain dump status
    await db.brainDumps.update(brainDumpId, {
      processedAt: now,
      tasksGenerated: generatedTasks.length,
      status: "completed",
    })

    const metricsMessage = savedMetrics.length > 0
      ? ` and ${savedMetrics.length} scorecard metric(s)`
      : ""

    return NextResponse.json<ApiResponse<{
      brainDump: AdminBrainDump
      tasks: AIGeneratedTask[]
      metrics: ParsedScorecardMetric[]
      summary: string
      warnings?: string[]
    }>>({
      success: true,
      data: {
        brainDump: { ...brainDump, processedAt: now, tasksGenerated: generatedTasks.length, status: "completed" },
        tasks: generatedTasks,
        metrics: savedMetrics,
        summary: result.summary,
        warnings: result.warnings,
      },
      message: `Generated ${generatedTasks.length} task suggestions${metricsMessage}`,
    })
  } catch (error) {
    logError(logger, "Brain dump processing error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Failed to process brain dump" },
      { status: 500 }
    )
  }
})

// GET /api/ai/brain-dump - Get brain dump history
export const GET = withAdmin(async (request: NextRequest, auth) => {
  try {
    const brainDumps = await db.brainDumps.findByOrganizationId(auth.organization.id)

    return NextResponse.json<ApiResponse<AdminBrainDump[]>>({
      success: true,
      data: brainDumps,
    })
  } catch (error) {
    logError(logger, "Get brain dumps error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get brain dump history" },
      { status: 500 }
    )
  }
})
