import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess, getWorkspaceById } from "@/lib/db/workspaces"
import { isWorkspaceFeatureEnabled } from "@/lib/auth/workspace-features"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createClientSchema, updateClientSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import { parsePaginationParams, buildPaginatedResponse, decodeCursor } from "@/lib/utils/pagination"
import type { PaginatedResponse } from "@/lib/utils/pagination"
import type { ApiResponse, Client } from "@/lib/types"

// GET /api/clients?workspaceId=xxx&status=xxx
export const GET = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const status = searchParams.get("status") || undefined

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

    // Feature gate check
    const workspace = await getWorkspaceById(workspaceId)
    if (workspace && !isWorkspaceFeatureEnabled(auth.organization, workspace, "core.clients")) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Clients feature is not enabled for this workspace" },
        { status: 403 }
      )
    }

    // Check if pagination params are provided
    const cursor = searchParams.get("cursor")
    const limitParam = searchParams.get("limit")
    const usePagination = cursor !== null || limitParam !== null

    if (usePagination) {
      const pagination = parsePaginationParams(searchParams)
      const decoded = pagination.cursor ? decodeCursor(pagination.cursor) : null

      const { data, totalCount } = await db.clients.findByWorkspacePaginated(
        auth.organization.id, workspaceId, {
          status,
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
        (c) => c.createdAt,
        (c) => c.id
      )

      return NextResponse.json<ApiResponse<PaginatedResponse<Client>>>({
        success: true,
        data: response,
      })
    }

    // Legacy non-paginated path (backward compatible)
    const clients = await db.clients.findByWorkspace(auth.organization.id, workspaceId, status)
    return NextResponse.json<ApiResponse<Client[]>>({
      success: true,
      data: clients,
    })
  } catch (error) {
    logger.error({ error }, "Get clients error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get clients" },
      { status: 500 }
    )
  }
})

// POST /api/clients - Create a new client
export const POST = withAuth(async (request, auth) => {
  try {
    const data = await validateBody(request, createClientSchema)

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
    if (workspace && !isWorkspaceFeatureEnabled(auth.organization, workspace, "core.clients")) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Clients feature is not enabled for this workspace" },
        { status: 403 }
      )
    }

    const client = await db.clients.create(auth.organization.id, data.workspaceId, {
      name: data.name,
      description: data.description,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      website: data.website,
      industry: data.industry,
      status: data.status,
      notes: data.notes,
      tags: data.tags,
      createdBy: auth.user.id,
    })

    logger.info(`Client created: ${client.id} in workspace ${data.workspaceId}`)

    return NextResponse.json<ApiResponse<Client>>({
      success: true,
      data: client,
      message: "Client created successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Create client error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create client" },
      { status: 500 }
    )
  }
})

// PATCH /api/clients - Update a client
export const PATCH = withAuth(async (request, auth) => {
  try {
    const data = await validateBody(request, updateClientSchema)

    const existing = await db.clients.findById(auth.organization.id, data.id)
    if (!existing) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Client not found" },
        { status: 404 }
      )
    }

    // Feature gate check
    const workspace = await getWorkspaceById(existing.workspaceId)
    if (workspace && !isWorkspaceFeatureEnabled(auth.organization, workspace, "core.clients")) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Clients feature is not enabled for this workspace" },
        { status: 403 }
      )
    }

    const { id, ...updates } = data
    const updated = await db.clients.update(auth.organization.id, id, updates)

    if (!updated) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Client not found" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<Client>>({
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
    logger.error({ error }, "Update client error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update client" },
      { status: 500 }
    )
  }
})

// DELETE /api/clients?id=xxx
export const DELETE = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Client ID is required" },
        { status: 400 }
      )
    }

    const existing = await db.clients.findById(auth.organization.id, id)
    if (!existing) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Client not found" },
        { status: 404 }
      )
    }

    // Unlink projects that reference this client before deleting
    const { rowCount: unlinkedProjects } = await sql`UPDATE projects SET client_id = NULL WHERE client_id = ${id} AND organization_id = ${auth.organization.id}`
    logger.info(`Unlinked ${unlinkedProjects ?? 0} projects from client ${id} before deletion`)

    const deleted = await db.clients.delete(auth.organization.id, id)

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to delete client" },
        { status: 500 }
      )
    }

    logger.info(`Client deleted: ${id}`)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Client deleted successfully",
    })
  } catch (error) {
    logger.error({ error }, "Delete client error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete client" },
      { status: 500 }
    )
  }
})
