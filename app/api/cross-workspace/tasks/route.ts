import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { logger, logError } from "@/lib/logger"
import { withAuth } from "@/lib/api/middleware"
import type { ApiResponse } from "@/lib/types"

// GET /api/cross-workspace/tasks - Get all cross-workspace tasks for the user
export const GET = withAuth(async (request, auth) => {
  try {
    // Get all cross-workspace tasks assigned by this user
    const tasks = await db.crossWorkspaceTasks.findByUser(auth.user.id)

    return NextResponse.json<ApiResponse<{ tasks: typeof tasks; totalCount: number }>>({
      success: true,
      data: {
        tasks,
        totalCount: tasks.length,
      },
    })
  } catch (error) {
    logError(logger, "Error fetching cross-workspace tasks", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch cross-workspace tasks" },
      { status: 500 }
    )
  }
})

// POST /api/cross-workspace/tasks - Create a cross-workspace task
export const POST = withAuth(async (request, auth) => {
  try {
    const body = await request.json()
    const {
      targetOrganizationId,
      title,
      description,
      priority,
      assigneeId,
      dueDate,
    } = body

    // Validate required fields
    if (!targetOrganizationId || typeof targetOrganizationId !== "string") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Target organization ID is required" },
        { status: 400 }
      )
    }

    if (!title || typeof title !== "string" || title.trim().length < 2) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Task title is required (min 2 characters)" },
        { status: 400 }
      )
    }

    // Verify user is a member of the target organization
    const targetMember = await db.members.findByOrgAndUser(
      targetOrganizationId,
      auth.user.id
    )
    if (!targetMember || targetMember.status !== "active") {
      // Check if user is owner/admin of source org (allowing delegation across orgs they manage)
      const userOrgs = await db.userOrganizations.findByUserId(auth.user.id)
      const hasAccessToTarget = userOrgs.some(
        (org) =>
          org.id === targetOrganizationId &&
          (org.role === "owner" || org.role === "admin")
      )
      if (!hasAccessToTarget) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "You do not have access to the target organization" },
          { status: 403 }
        )
      }
    }

    // Get target organization
    const targetOrg = await db.organizations.findById(targetOrganizationId)
    if (!targetOrg) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Target organization not found" },
        { status: 404 }
      )
    }

    // Create the cross-workspace task record
    const crossWorkspaceTask = await db.crossWorkspaceTasks.create({
      sourceOrganizationId: auth.organization.id,
      targetOrganizationId,
      assignedByUserId: auth.user.id,
      title: title.trim(),
      description: description?.trim(),
      priority: priority || "normal",
    })

    // If an assignee is specified, create the actual task in the target org
    let createdTaskId: string | undefined
    if (assigneeId) {
      // Verify assignee is a member of the target org
      const assignee = await db.members.findByOrgAndUser(targetOrganizationId, assigneeId)
      if (assignee && assignee.status === "active") {
        // Create the task in the target organization
        const taskId = `task_${crypto.randomUUID()}`
        const now = new Date().toISOString()

        await db.assignedTasks.create({
          id: taskId,
          organizationId: targetOrganizationId,
          title: title.trim(),
          description: description?.trim() || "",
          assigneeId,
          assigneeName: assignee.name,
          assignedById: auth.user.id,
          assignedByName: auth.user.name,
          type: "assigned",
          rockId: null,
          rockTitle: null,
          priority: priority || "normal",
          dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status: "pending",
          completedAt: null,
          addedToEOD: false,
          eodReportId: null,
          createdAt: now,
          updatedAt: now,
        })

        createdTaskId = taskId

        // Update cross-workspace task with the created task reference
        await db.crossWorkspaceTasks.updateStatus(
          crossWorkspaceTask.id,
          "synced",
          taskId
        )
      }
    }

    // Log the action
    try {
      await db.auditLogs.create({
        organizationId: auth.organization.id,
        userId: auth.user.id,
        action: "cross_workspace_task_created",
        resourceType: "cross_workspace_task",
        resourceId: crossWorkspaceTask.id,
        newValues: {
          title,
          targetOrganizationId,
          targetOrganizationName: targetOrg.name,
        },
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      })
    } catch {
      // Audit log might not exist yet
    }

    return NextResponse.json<ApiResponse<unknown>>({
      success: true,
      data: {
        crossWorkspaceTask: {
          ...crossWorkspaceTask,
          targetOrganizationName: targetOrg.name,
          sourceOrganizationName: auth.organization.name,
        },
        createdTaskId,
      },
      message: `Task "${title}" created in ${targetOrg.name}`,
    })
  } catch (error) {
    logError(logger, "Error creating cross-workspace task", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create cross-workspace task" },
      { status: 500 }
    )
  }
})
