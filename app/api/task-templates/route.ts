import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/api/middleware"
import { isAdmin } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { generateId } from "@/lib/auth/password"
import type { TaskTemplate, ApiResponse } from "@/lib/types"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { taskTemplateCreateSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"

// GET /api/task-templates - Get all templates for the user
export const GET = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    // Get all org templates
    const allTemplates = await db.taskTemplates.findByOrganizationId(
      auth.organization.id,
      auth.user.id
    )

    // If workspace filter requested, validate access and filter
    let templates = allTemplates
    if (workspaceId) {
      // Validate workspace access (unless org admin)
      if (!isAdmin(auth)) {
        const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
        if (!hasAccess) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "You don't have access to this workspace" },
            { status: 403 }
          )
        }
      }

      // Include org-wide templates (workspace_id = NULL) AND workspace-specific templates
      templates = allTemplates.filter(
        t => t.workspaceId === null || t.workspaceId === workspaceId
      )
    }

    return NextResponse.json<ApiResponse<TaskTemplate[]>>({
      success: true,
      data: templates,
    })
  } catch (error) {
    logError(logger, "Get task templates error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get task templates" },
      { status: 500 }
    )
  }
})

// POST /api/task-templates - Create a new template
export const POST = withAuth(async (request, auth) => {
  try {
    const { name, title, description, priority, defaultRockId, recurrence, isShared, workspaceId } = await validateBody(request, taskTemplateCreateSchema)

    // If workspace-specific, validate access
    if (workspaceId) {
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
      if (!hasAccess) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "You don't have access to this workspace" },
          { status: 403 }
        )
      }
    }

    const template: TaskTemplate = {
      id: generateId(),
      organizationId: auth.organization.id,
      workspaceId: workspaceId || null, // NULL = org-wide, otherwise workspace-specific
      createdBy: auth.user.id,
      name,
      title,
      description,
      priority: priority || "normal",
      defaultRockId,
      recurrence,
      isShared: isShared || false,
      createdAt: new Date().toISOString(),
    }

    await db.taskTemplates.create(template)

    return NextResponse.json<ApiResponse<TaskTemplate>>({
      success: true,
      data: template,
    })
  } catch (error) {
    logError(logger, "Create task template error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create task template" },
      { status: 500 }
    )
  }
})

// DELETE /api/task-templates?id=xxx - Delete a template
export const DELETE = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Template ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership and workspace access
    const template = await db.taskTemplates.findById(id)
    if (!template) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Template not found" },
        { status: 404 }
      )
    }

    // SECURITY: Verify template belongs to user's organization
    if (template.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Template not found" },
        { status: 404 }
      )
    }

    // Check workspace access if template is workspace-specific
    if (template.workspaceId && !isAdmin(auth)) {
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, template.workspaceId)
      if (!hasAccess) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "You don't have access to this workspace" },
          { status: 403 }
        )
      }
    }

    if (template.createdBy !== auth.user.id && !isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You can only delete your own templates" },
        { status: 403 }
      )
    }

    await db.taskTemplates.delete(id)

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
    })
  } catch (error) {
    logError(logger, "Delete task template error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete task template" },
      { status: 500 }
    )
  }
})
