import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { parseBrainDump, isClaudeConfigured } from "@/lib/ai/claude-client"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse, AdminBrainDump, AIGeneratedTask, TeamMember } from "@/lib/types"

// POST /api/ai/brain-dump - Process a brain dump and generate task suggestions
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
        { success: false, error: "Only admins can use the brain dump feature" },
        { status: 403 }
      )
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

    // Update brain dump status
    await db.brainDumps.update(brainDumpId, {
      processedAt: now,
      tasksGenerated: generatedTasks.length,
      status: "completed",
    })

    return NextResponse.json<ApiResponse<{
      brainDump: AdminBrainDump
      tasks: AIGeneratedTask[]
      summary: string
      warnings?: string[]
    }>>({
      success: true,
      data: {
        brainDump: { ...brainDump, processedAt: now, tasksGenerated: generatedTasks.length, status: "completed" },
        tasks: generatedTasks,
        summary: result.summary,
        warnings: result.warnings,
      },
      message: `Generated ${generatedTasks.length} task suggestions`,
    })
  } catch (error) {
    console.error("Brain dump processing error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Failed to process brain dump" },
      { status: 500 }
    )
  }
}

// GET /api/ai/brain-dump - Get brain dump history
export async function GET(request: NextRequest) {
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
        { success: false, error: "Only admins can view brain dump history" },
        { status: 403 }
      )
    }

    const brainDumps = await db.brainDumps.findByOrganizationId(auth.organization.id)

    return NextResponse.json<ApiResponse<AdminBrainDump[]>>({
      success: true,
      data: brainDumps,
    })
  } catch (error) {
    console.error("Get brain dumps error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get brain dump history" },
      { status: 500 }
    )
  }
}
