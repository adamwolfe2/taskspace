import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAdmin } from "@/lib/api/middleware"
import { parseBrainDump, isClaudeConfigured } from "@/lib/ai/claude-client"
import { generateId } from "@/lib/auth/password"
import { setTeamMemberMetric } from "@/lib/metrics"
import { aiRateLimit } from "@/lib/api/rate-limit"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import type { ApiResponse, AdminBrainDump, AIGeneratedTask, TeamMember, ParsedScorecardMetric } from "@/lib/types"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { aiBrainDumpSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"

// POST /api/ai/brain-dump - Process a brain dump and generate task suggestions
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Rate limit: 20 brain dumps per user per hour
    const rateCheck = aiRateLimit(auth.user.id, 'brain-dump')
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

    const { content } = await validateBody(request, aiBrainDumpSchema)

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
    const { result, usage } = await parseBrainDump(content.trim(), teamMembers, currentTasks, rocks)

    // Record AI usage
    await recordUsage({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "brain-dump",
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    })

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
      { success: false, error: "Failed to process brain dump" },
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
