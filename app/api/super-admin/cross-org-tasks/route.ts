import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSuperAdmin } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { z } from "zod"
import { validateBody, ValidationError } from "@/lib/validation/middleware"

const crossOrgTaskSchema = z.object({
  sourceOrganizationId: z.string().min(1),
  targetOrganizationId: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  priority: z.enum(["low", "normal", "medium", "high"]).default("normal"),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
})

// GET /api/super-admin/cross-org-tasks — List all cross-org tasks across the portfolio
export const GET = withSuperAdmin(async () => {
  try {
    const { rows } = await sql`
      SELECT cwt.*,
        so.name as source_org_name,
        to2.name as target_org_name,
        u.name as assigned_by_name
      FROM cross_workspace_tasks cwt
      JOIN organizations so ON cwt.source_organization_id = so.id
      JOIN organizations to2 ON cwt.target_organization_id = to2.id
      JOIN users u ON cwt.assigned_by_user_id = u.id
      ORDER BY cwt.created_at DESC
      LIMIT 100
    `

    const tasks = rows.map(row => ({
      id: row.id as string,
      sourceOrganizationId: row.source_organization_id as string,
      sourceOrganizationName: row.source_org_name as string,
      targetOrganizationId: row.target_organization_id as string,
      targetOrganizationName: row.target_org_name as string,
      assignedByUserId: row.assigned_by_user_id as string,
      assignedByName: row.assigned_by_name as string,
      title: row.title as string,
      description: row.description as string | null,
      priority: row.priority as string,
      status: row.status as string,
      sourceTaskId: row.source_task_id as string | null,
      targetTaskId: row.target_task_id as string | null,
      createdAt: (row.created_at as Date)?.toISOString() || "",
      updatedAt: (row.updated_at as Date)?.toISOString() || "",
    }))

    return NextResponse.json<ApiResponse<{ tasks: typeof tasks; totalCount: number }>>({
      success: true,
      data: { tasks, totalCount: tasks.length },
    })
  } catch (error) {
    logError(logger, "Error fetching cross-org tasks", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch cross-org tasks" },
      { status: 500 }
    )
  }
})

// POST /api/super-admin/cross-org-tasks — Create a cross-org task from portfolio view
export const POST = withSuperAdmin(async (request: NextRequest, auth) => {
  try {
    const {
      sourceOrganizationId,
      targetOrganizationId,
      title,
      description,
      priority,
      assigneeId,
      dueDate,
    } = await validateBody(request, crossOrgTaskSchema)

    // Verify both orgs exist
    const sourceOrg = await db.organizations.findById(sourceOrganizationId)
    const targetOrg = await db.organizations.findById(targetOrganizationId)
    if (!sourceOrg || !targetOrg) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Source or target organization not found" },
        { status: 404 }
      )
    }

    // Create cross-workspace task record
    const crossTaskPriority = priority === "low" ? "normal" : priority as "normal" | "medium" | "high"
    const crossTask = await db.crossWorkspaceTasks.create({
      sourceOrganizationId,
      targetOrganizationId,
      assignedByUserId: auth.user.id,
      title: title.trim(),
      description: description?.trim(),
      priority: crossTaskPriority,
    })

    // If assignee specified, create actual task in target org
    let createdTaskId: string | undefined
    if (assigneeId) {
      const assignee = await db.members.findByOrgAndUser(targetOrganizationId, assigneeId)
      if (assignee && assignee.status === "active") {
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
          priority,
          dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status: "pending",
          completedAt: null,
          addedToEOD: false,
          eodReportId: null,
          createdAt: now,
          updatedAt: now,
        })

        createdTaskId = taskId
        await db.crossWorkspaceTasks.updateStatus(crossTask.id, "synced", taskId)
      }
    }

    logger.info(`Cross-org task created: "${title}" from ${sourceOrg.name} to ${targetOrg.name}`)

    return NextResponse.json<ApiResponse<unknown>>({
      success: true,
      data: {
        crossWorkspaceTask: {
          ...crossTask,
          sourceOrganizationName: sourceOrg.name,
          targetOrganizationName: targetOrg.name,
        },
        createdTaskId,
      },
      message: `Task "${title}" delegated to ${targetOrg.name}`,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Error creating cross-org task", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create cross-org task" },
      { status: 500 }
    )
  }
})
