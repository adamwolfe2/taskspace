import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { isAdmin } from "@/lib/auth/middleware"
import { verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess, getWorkspaceById } from "@/lib/db/workspaces"
import { isWorkspaceFeatureEnabled } from "@/lib/auth/workspace-features"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createProjectSchema, updateProjectSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import { parsePaginationParams, buildPaginatedResponse, decodeCursor } from "@/lib/utils/pagination"
import type { PaginatedResponse } from "@/lib/utils/pagination"
import type { ApiResponse, Project } from "@/lib/types"

// GET /api/projects?workspaceId=xxx&status=xxx&clientId=xxx&ownerId=xxx
export const GET = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const status = searchParams.get("status") || undefined
    const clientId = searchParams.get("clientId") || undefined
    const ownerId = searchParams.get("ownerId") || undefined

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace ID is required" },
        { status: 400 }
      )
    }

    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      )
    }

    // Feature gate check — return empty list (not 403) so background fetches don't pollute the console
    const workspace = await getWorkspaceById(workspaceId)
    if (workspace && !isWorkspaceFeatureEnabled(auth.organization, workspace, "core.projects")) {
      return NextResponse.json<ApiResponse<Project[]>>({ success: true, data: [] })
    }

    // Check if pagination params are provided
    const cursor = searchParams.get("cursor")
    const limitParam = searchParams.get("limit")
    const usePagination = cursor !== null || limitParam !== null

    if (usePagination) {
      const pagination = parsePaginationParams(searchParams)
      const decoded = pagination.cursor ? decodeCursor(pagination.cursor) : null

      const { data, totalCount } = await db.projects.findByWorkspacePaginated(
        auth.organization.id, workspaceId, {
          status,
          clientId,
          ownerId,
          limit: pagination.limit,
          cursorTimestamp: decoded?.timestamp,
          cursorId: decoded?.id,
          direction: pagination.direction,
        }
      )

      const response = buildPaginatedResponse(
        data,
        pagination.limit,
        totalCount,
        (p) => p.createdAt,
        (p) => p.id
      )

      return NextResponse.json<ApiResponse<PaginatedResponse<Project>>>({
        success: true,
        data: response,
      })
    }

    // Legacy non-paginated path (backward compatible)
    const projects = await db.projects.findByWorkspace(auth.organization.id, workspaceId, {
      status, clientId, ownerId,
    })
    return NextResponse.json<ApiResponse<Project[]>>({
      success: true,
      data: projects,
    })
  } catch (error) {
    logger.error({ error }, "Get projects error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get projects" },
      { status: 500 }
    )
  }
})

// POST /api/projects - Create a new project
export const POST = withAuth(async (request, auth) => {
  try {
    const data = await validateBody(request, createProjectSchema)

    const isValidWorkspace = await verifyWorkspaceOrgBoundary(data.workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    const hasAccess = await userHasWorkspaceAccess(auth.user.id, data.workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      )
    }

    // Feature gate check
    const workspace = await getWorkspaceById(data.workspaceId)
    if (workspace && !isWorkspaceFeatureEnabled(auth.organization, workspace, "core.projects")) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Projects feature is not enabled for this workspace" },
        { status: 403 }
      )
    }

    // Validate client belongs to same workspace if provided
    if (data.clientId) {
      const client = await db.clients.findById(auth.organization.id, data.clientId)
      if (!client || client.workspaceId !== data.workspaceId) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Client not found in this workspace" },
          { status: 400 }
        )
      }
    }

    const project = await db.projects.create(auth.organization.id, data.workspaceId, {
      name: data.name,
      clientId: data.clientId,
      description: data.description,
      status: data.status,
      priority: data.priority,
      startDate: data.startDate,
      dueDate: data.dueDate,
      ownerId: data.ownerId,
      tags: data.tags,
      createdBy: auth.user.id,
    })

    // Auto-add creator as project owner
    await db.projects.addMember(project.id, auth.user.id, "owner")

    logger.info(`Project created: ${project.id} in workspace ${data.workspaceId}`)

    return NextResponse.json<ApiResponse<Project>>({
      success: true,
      data: project,
      message: "Project created successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Create project error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create project" },
      { status: 500 }
    )
  }
})

// PATCH /api/projects - Update a project
export const PATCH = withAuth(async (request, auth) => {
  try {
    const data = await validateBody(request, updateProjectSchema)

    const existing = await db.projects.findById(auth.organization.id, data.id)
    if (!existing) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Project not found" },
        { status: 404 }
      )
    }

    // Feature gate check
    const workspace = await getWorkspaceById(existing.workspaceId)
    if (workspace && !isWorkspaceFeatureEnabled(auth.organization, workspace, "core.projects")) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Projects feature is not enabled for this workspace" },
        { status: 403 }
      )
    }

    // Validate client belongs to same workspace if changing client
    if (data.clientId !== undefined && data.clientId !== null) {
      const client = await db.clients.findById(auth.organization.id, data.clientId)
      if (!client || client.workspaceId !== existing.workspaceId) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Client not found in this workspace" },
          { status: 400 }
        )
      }
    }

    const { id, ...updates } = data
    const updated = await db.projects.update(auth.organization.id, id, updates)

    if (!updated) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Project not found" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<Project>>({
      success: true,
      data: updated,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Update project error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update project" },
      { status: 500 }
    )
  }
})

// DELETE /api/projects?id=xxx
export const DELETE = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Project ID is required" },
        { status: 400 }
      )
    }

    const existing = await db.projects.findById(auth.organization.id, id)
    if (!existing) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Project not found" },
        { status: 404 }
      )
    }

    // Only admins, project owners, and project creators may delete
    const canDelete = isAdmin(auth)
      || existing.ownerId === auth.user.id
      || existing.createdBy === auth.user.id
    if (!canDelete) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only project owners and admins can delete projects" },
        { status: 403 }
      )
    }

    // Unlink tasks that reference this project before deleting
    const { rowCount: unlinkedTasks } = await sql`UPDATE assigned_tasks SET project_id = NULL WHERE project_id = ${id} AND organization_id = ${auth.organization.id}`
    logger.info(`Unlinked ${unlinkedTasks ?? 0} tasks from project ${id} before deletion`)

    const deleted = await db.projects.delete(auth.organization.id, id)

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to delete project" },
        { status: 500 }
      )
    }

    logger.info(`Project deleted: ${id}`)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Project deleted successfully",
    })
  } catch (error) {
    logger.error({ error }, "Delete project error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete project" },
      { status: 500 }
    )
  }
})
