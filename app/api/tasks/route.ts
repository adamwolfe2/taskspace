import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { generateId } from "@/lib/auth/password"
import { sendSlackMessage, buildTaskAssignmentMessage, isSlackConfigured } from "@/lib/integrations/slack"
import { asanaClient } from "@/lib/integrations/asana"
import type { AssignedTask, ApiResponse, TeamMember, Notification } from "@/lib/types"

// GET /api/tasks - Get tasks
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
    const userId = searchParams.get("userId")
    const status = searchParams.get("status")

    let tasks: AssignedTask[]

    if (isAdmin(auth)) {
      // Admins can see all tasks, optionally filtered by user
      tasks = await db.assignedTasks.findByOrganizationId(auth.organization.id)
      if (userId) {
        tasks = tasks.filter(t => t.assigneeId === userId)
      }
    } else {
      // Regular members see only their tasks
      tasks = await db.assignedTasks.findByAssigneeId(auth.user.id, auth.organization.id)
    }

    // Filter by status if specified
    if (status) {
      tasks = tasks.filter(t => t.status === status)
    }

    return NextResponse.json<ApiResponse<AssignedTask[]>>({
      success: true,
      data: tasks,
    })
  } catch (error) {
    console.error("Get tasks error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get tasks" },
      { status: 500 }
    )
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      assigneeId,
      rockId,
      priority = "normal",
      dueDate,
      type = "personal",
    } = body

    if (!title) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task title is required" },
        { status: 400 }
      )
    }

    // Determine assignee
    let targetUserId = auth.user.id
    let assigneeName = auth.user.name
    let taskType: "assigned" | "personal" = "personal"
    let assignedById: string | null = null
    let assignedByName: string | null = null

    if (assigneeId && assigneeId !== auth.user.id) {
      if (!isAdmin(auth)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Only admins can assign tasks to others" },
          { status: 403 }
        )
      }

      // Get assignee info
      const assigneeMember = await db.members.findByOrgAndUser(auth.organization.id, assigneeId)
      if (!assigneeMember) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Assignee is not a member of this organization" },
          { status: 404 }
        )
      }

      const assigneeUser = await db.users.findById(assigneeId)
      if (!assigneeUser) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Assignee not found" },
          { status: 404 }
        )
      }

      targetUserId = assigneeId
      assigneeName = assigneeUser.name
      taskType = "assigned"
      assignedById = auth.user.id
      assignedByName = auth.user.name
    }

    // Get rock title if linked to a rock
    let rockTitle: string | null = null
    if (rockId) {
      const rock = await db.rocks.findById(rockId)
      if (rock && rock.organizationId === auth.organization.id) {
        rockTitle = rock.title
      }
    }

    const now = new Date().toISOString()
    const taskId = generateId()

    // Check if Asana integration is enabled and get user mapping
    let asanaGid: string | null = null
    const org = await db.organizations.findById(auth.organization.id)
    const asanaConfig = org?.settings?.asanaIntegration

    if (asanaConfig?.enabled && asanaConfig?.projectGid && asanaClient.isConfigured()) {
      // Find the Asana user mapping for the assignee
      const userMapping = asanaConfig.userMappings?.find(
        (m: { aimsUserId: string }) => m.aimsUserId === targetUserId
      )

      if (userMapping) {
        try {
          // Create task in Asana
          const asanaTask = await asanaClient.createTask({
            name: title.trim(),
            notes: `${description?.trim() || ""}\n\n---\nAIMS Task ID: AIMS-${taskId}`,
            projects: [asanaConfig.projectGid],
            assignee: userMapping.asanaUserGid,
            due_on: dueDate ? dueDate.split("T")[0] : undefined,
          })
          asanaGid = asanaTask.gid
          console.log(`Created Asana task ${asanaGid} for AIMS task ${taskId}`)
        } catch (asanaErr) {
          // Log but don't fail - Asana sync is best-effort
          console.error(`Failed to create Asana task for AIMS task ${taskId}:`, asanaErr)
        }
      }
    }

    const task: AssignedTask = {
      id: taskId,
      organizationId: auth.organization.id,
      title: title.trim(),
      description: description?.trim(),
      assigneeId: targetUserId,
      assigneeName,
      assignedById,
      assignedByName,
      type: taskType,
      rockId: rockId || null,
      rockTitle,
      priority,
      dueDate: dueDate || new Date().toISOString().split("T")[0],
      createdAt: now,
      updatedAt: now,
      status: "pending",
      completedAt: null,
      addedToEOD: false,
      eodReportId: null,
      source: "manual",
      asanaGid,
    }

    await db.assignedTasks.create(task)

    // Send notifications for assigned tasks (not personal tasks)
    if (taskType === "assigned" && assigneeId !== auth.user.id) {
      // Create in-app notification
      const notification: Notification = {
        id: generateId(),
        organizationId: auth.organization.id,
        userId: targetUserId,
        type: "task_assigned",
        title: "New Task Assigned",
        message: `${auth.user.name} assigned you a task: ${task.title}`,
        read: false,
        createdAt: now,
        actionUrl: "/tasks",
        metadata: { taskId: task.id, assignedBy: auth.user.name },
      }
      await db.notifications.create(notification).catch(err => {
        console.error("Failed to create notification:", err)
      })

      // Send Slack notification if configured
      const webhookUrl = auth.organization.settings?.slackWebhookUrl
      if (isSlackConfigured(webhookUrl)) {
        const slackMessage = buildTaskAssignmentMessage(
          assigneeName,
          task.title,
          task.description,
          task.priority,
          task.dueDate,
          auth.user.name
        )
        sendSlackMessage(webhookUrl!, slackMessage).catch(err => {
          console.error("Failed to send Slack notification:", err)
        })
      }
    }

    return NextResponse.json<ApiResponse<AssignedTask>>({
      success: true,
      data: task,
      message: taskType === "assigned" ? "Task assigned successfully" : "Task created successfully",
    })
  } catch (error) {
    console.error("Create task error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create task" },
      { status: 500 }
    )
  }
}

// PATCH /api/tasks - Update a task
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      )
    }

    const task = await db.assignedTasks.findById(id)
    if (!task) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task not found" },
        { status: 404 }
      )
    }

    // Verify task belongs to this organization
    if (task.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task not found" },
        { status: 404 }
      )
    }

    // Check permissions
    const isAssignee = task.assigneeId === auth.user.id
    const isAssigner = task.assignedById === auth.user.id

    if (!isAssignee && !isAssigner && !isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You don't have permission to update this task" },
        { status: 403 }
      )
    }

    // Handle status change to completed
    if (updates.status === "completed" && task.status !== "completed") {
      updates.completedAt = new Date().toISOString()
    } else if (updates.status !== "completed" && task.status === "completed") {
      updates.completedAt = null
    }

    const updatedTask = await db.assignedTasks.update(id, updates)

    // Sync to Asana if task has an asanaGid
    if (task.asanaGid && asanaClient.isConfigured()) {
      try {
        const asanaUpdates: {
          name?: string
          notes?: string
          completed?: boolean
          due_on?: string
        } = {}

        // Map AIMS fields to Asana fields
        if (updates.title) asanaUpdates.name = updates.title
        if (updates.description !== undefined) asanaUpdates.notes = updates.description || ""
        if (updates.dueDate) asanaUpdates.due_on = updates.dueDate

        // Handle status/completion
        if (updates.status === "completed") {
          asanaUpdates.completed = true
        } else if (updates.status && task.status === "completed") {
          // Task was completed but now being un-completed
          asanaUpdates.completed = false
        }

        // Only call Asana API if there are actual updates
        if (Object.keys(asanaUpdates).length > 0) {
          await asanaClient.updateTask(task.asanaGid, asanaUpdates)
          console.log(`Synced task ${task.id} to Asana (${task.asanaGid})`)
        }
      } catch (asanaErr) {
        // Log but don't fail the request - Asana sync is best-effort
        console.error(`Failed to sync task ${task.id} to Asana:`, asanaErr)
      }
    }

    return NextResponse.json<ApiResponse<AssignedTask | null>>({
      success: true,
      data: updatedTask,
      message: "Task updated successfully",
    })
  } catch (error) {
    console.error("Update task error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update task" },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks - Delete a task
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      )
    }

    const task = await db.assignedTasks.findById(id)
    if (!task) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task not found" },
        { status: 404 }
      )
    }

    // Verify task belongs to this organization
    if (task.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task not found" },
        { status: 404 }
      )
    }

    // Check permissions - personal tasks can be deleted by owner, assigned tasks by assigner or admin
    const isOwner = task.assigneeId === auth.user.id && task.type === "personal"
    const isAssigner = task.assignedById === auth.user.id

    if (!isOwner && !isAssigner && !isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You don't have permission to delete this task" },
        { status: 403 }
      )
    }

    await db.assignedTasks.delete(id)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Task deleted successfully",
    })
  } catch (error) {
    console.error("Delete task error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete task" },
      { status: 500 }
    )
  }
}
