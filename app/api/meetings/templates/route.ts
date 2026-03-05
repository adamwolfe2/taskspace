import { NextRequest, NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { sql } from "@/lib/db/sql"
import { generateId } from "@/lib/auth/password"
import { sanitizeText } from "@/lib/utils/sanitize"
import { isFeatureEnabled, getFeatureGateError } from "@/lib/auth/feature-gate"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"
import type { MeetingTemplate, MeetingTemplateSection } from "@/lib/types"

// ============================================
// PARSERS
// ============================================

function parseSections(value: unknown): MeetingTemplateSection[] {
  if (!value) return []
  if (Array.isArray(value)) return value as MeetingTemplateSection[]
  if (typeof value === "string") {
    try {
      return JSON.parse(value)
    } catch {
      return []
    }
  }
  return []
}

function parseTemplate(row: Record<string, unknown>): MeetingTemplate {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    sections: parseSections(row.sections),
    isDefault: Boolean(row.is_default),
    createdBy: row.created_by as string | undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

// ============================================
// GET /api/meetings/templates — List templates for workspace
// ============================================

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    if (!isFeatureEnabled(auth.organization, "l10_meetings")) {
      return getFeatureGateError("l10_meetings")
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // SECURITY: Verify workspace belongs to user's organization
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

    const { rows } = await sql`
      SELECT * FROM meeting_templates
      WHERE workspace_id = ${workspaceId}
      ORDER BY is_default DESC, created_at DESC
    `

    const templates = rows.map(parseTemplate)

    return NextResponse.json<ApiResponse<MeetingTemplate[]>>({
      success: true,
      data: templates,
    })
  } catch (error) {
    logger.error({ error }, "Get meeting templates error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get meeting templates" },
      { status: 500 }
    )
  }
})

// ============================================
// POST /api/meetings/templates — Create template
// ============================================

export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    if (!isFeatureEnabled(auth.organization, "l10_meetings")) {
      return getFeatureGateError("l10_meetings")
    }

    const body = await request.json()
    const { name, description, sections, workspaceId, isDefault } = body as {
      name: string
      description?: string
      sections: MeetingTemplateSection[]
      workspaceId: string
      isDefault?: boolean
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Template name is required" },
        { status: 400 }
      )
    }

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    if (!Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "At least one section is required" },
        { status: 400 }
      )
    }

    // SECURITY: Verify workspace belongs to user's organization
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

    const id = "mtpl_" + generateId()
    const sanitizedName = sanitizeText(name.trim())
    const sanitizedDescription = description ? sanitizeText(description.trim()) : null
    const sanitizedSections = sections.map((s) => ({
      sectionType: s.sectionType,
      durationTarget: Number(s.durationTarget) || 5,
      data: s.data || {},
    }))

    // If marking this template as default, clear any existing defaults for this workspace
    if (isDefault) {
      await sql`
        UPDATE meeting_templates
        SET is_default = FALSE
        WHERE workspace_id = ${workspaceId}
      `
    }

    const { rows } = await sql`
      INSERT INTO meeting_templates (id, workspace_id, name, description, sections, is_default, created_by)
      VALUES (
        ${id},
        ${workspaceId},
        ${sanitizedName},
        ${sanitizedDescription},
        ${JSON.stringify(sanitizedSections)}::jsonb,
        ${isDefault ? true : false},
        ${auth.user.id}
      )
      RETURNING *
    `

    const template = parseTemplate(rows[0])

    logger.info(`Meeting template created: ${template.id} in workspace ${workspaceId}`)

    return NextResponse.json<ApiResponse<MeetingTemplate>>(
      {
        success: true,
        data: template,
        message: "Template created successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error({ error }, "Create meeting template error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create meeting template" },
      { status: 500 }
    )
  }
})
