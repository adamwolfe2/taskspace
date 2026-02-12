import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAdmin } from "@/lib/api/middleware"
import { generateId } from "@/lib/auth/password"
import { sendTaskAssignmentEmail, isEmailConfigured } from "@/lib/integrations/email"
import { aiRateLimit } from "@/lib/api/rate-limit"
import type { ApiResponse, AIGeneratedTask, AssignedTask, TeamMember } from "@/lib/types"
import { validateBody } from "@/lib/validation/middleware"
import { aiTaskPatchSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"

// GET /api/ai/tasks - Get pending AI-generated tasks
export const GET = withAdmin(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    let tasks: AIGeneratedTask[]
    if (status === "pending") {
      tasks = await db.aiGeneratedTasks.findPending(auth.organization.id)
    } else {
      tasks = await db.aiGeneratedTasks.findByOrganizationId(auth.organization.id)
    }

    return NextResponse.json<ApiResponse<AIGeneratedTask[]>>({
      success: true,
      data: tasks,
    })
  } catch (error) {
    logError(logger, "Get AI tasks error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get AI-generated tasks" },
      { status: 500 }
    )
  }
})

// PATCH /api/ai/tasks - Approve, reject, or update AI-generated tasks
export const PATCH = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Rate limit: 20 AI task operations per user per hour
    const rateCheck = aiRateLimit(auth.user.id, 'tasks')
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
    }

    const validated = await validateBody(request, aiTaskPatchSchema)
    const { taskId, action } = validated
     
    const updates = validated.updates as Record<string, any> | undefined

    // Get the existing task
    const tasks = await db.aiGeneratedTasks.findByOrganizationId(auth.organization.id)
    const task = tasks.find(t => t.id === taskId)

    if (!task) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task not found" },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()

    switch (action) {
      case "approve": {
        // Convert AI task to real assigned task
        const newTaskId = generateId()
        const finalAssigneeId = updates?.assigneeId || task.assigneeId
        const members = await db.members.findWithUsersByOrganizationId(auth.organization.id)
        const member = members.find(m => m.id === finalAssigneeId)

        // Map AI priority to task priority (urgent/high -> high, medium -> medium, low -> normal)
        const priorityMap: Record<string, "high" | "medium" | "normal"> = {
          urgent: "high",
          high: "high",
          medium: "medium",
          low: "normal",
        }
        const rawPriority = updates?.priority || task.priority
        const mappedPriority = priorityMap[rawPriority] || "normal"

        const assignedTask: AssignedTask = {
          id: newTaskId,
          organizationId: auth.organization.id,
          title: updates?.title || task.title,
          description: updates?.description || task.description,
          assigneeId: finalAssigneeId,
          assigneeName: member?.name || updates?.assigneeName || task.assigneeName || "Unknown",
          assignedById: auth.user.id,
          assignedByName: auth.user.name,
          type: "assigned",
          rockId: null,
          rockTitle: null,
          priority: mappedPriority,
          dueDate: updates?.dueDate || task.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status: "pending",
          completedAt: null,
          addedToEOD: false,
          eodReportId: null,
          createdAt: now,
          updatedAt: now,
        }

        await db.assignedTasks.create(assignedTask)

        // Update AI task status
        await db.aiGeneratedTasks.update(taskId, {
          status: "approved",
          approvedBy: auth.user.id,
          approvedAt: now,
          convertedTaskId: newTaskId,
        })

        // Send email notification to assignee
        if (isEmailConfigured() && member) {
          const assignee: TeamMember = {
            id: member.id,
            name: member.name,
            email: member.email,
            role: member.role,
            department: member.department,
            joinDate: member.joinDate,
          }

          const adminMember = members.find(m => m.id === auth.user.id)
          if (adminMember) {
            const assignedBy: TeamMember = {
              id: adminMember.id,
              name: adminMember.name,
              email: adminMember.email,
              role: adminMember.role,
              department: adminMember.department,
              joinDate: adminMember.joinDate,
            }

            sendTaskAssignmentEmail(task, assignee, assignedBy)
              .catch(err => logError(logger, "Task assignment email failed", err))
          }
        }

        return NextResponse.json<ApiResponse<{ aiTask: AIGeneratedTask; assignedTask: AssignedTask }>>({
          success: true,
          data: {
            aiTask: { ...task, status: "approved", approvedBy: auth.user.id, approvedAt: now, convertedTaskId: newTaskId },
            assignedTask,
          },
          message: "Task approved and created",
        })
      }

      case "reject": {
        await db.aiGeneratedTasks.update(taskId, {
          status: "rejected",
          approvedBy: auth.user.id,
          approvedAt: now,
        })

        return NextResponse.json<ApiResponse<AIGeneratedTask>>({
          success: true,
          data: { ...task, status: "rejected", approvedBy: auth.user.id, approvedAt: now },
          message: "Task rejected",
        })
      }

      case "update": {
        // Just update the AI task fields without approving
        // This allows editing before approval
        return NextResponse.json<ApiResponse<AIGeneratedTask>>({
          success: true,
          data: task,
          message: "Task updated",
        })
      }

      default:
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Invalid action. Use 'approve', 'reject', or 'update'" },
          { status: 400 }
        )
    }
  } catch (error) {
    logError(logger, "Update AI task error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update AI-generated task" },
      { status: 500 }
    )
  }
})

// DELETE /api/ai/tasks - Delete an AI-generated task
export const DELETE = withAdmin(async (request: NextRequest, _auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get("taskId")

    if (!taskId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      )
    }

    const deleted = await db.aiGeneratedTasks.delete(taskId)

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task not found" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Task deleted",
    })
  } catch (error) {
    logError(logger, "Delete AI task error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete AI-generated task" },
      { status: 500 }
    )
  }
})
