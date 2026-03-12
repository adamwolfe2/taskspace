import { NextRequest, NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { sql } from "@/lib/db/sql"
import { sanitizeText } from "@/lib/utils/sanitize"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateMeetingTemplateSchema } from "@/lib/validation/schemas"
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
// GET /api/meetings/templates/[id]
// ============================================

export const GET = withAuth(async (request: NextRequest, auth, context?) => {
  try {
    if (!isFeatureEnabled(auth.organization, "l10_meetings")) {
      return getFeatureGateError("l10_meetings")
    }

    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }

    const { id } = await context.params

    const { rows } = await sql`
      SELECT * FROM meeting_templates WHERE id = ${id}
    `

    if (rows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Template not found" },
        { status: 404 }
      )
    }

    const template = parseTemplate(rows[0])

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(template.workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Template not found" },
        { status: 404 }
      )
    }

    const hasAccess = await userHasWorkspaceAccess(auth.user.id, template.workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    return NextResponse.json<ApiResponse<MeetingTemplate>>({
      success: true,
      data: template,
    })
  } catch (error) {
    logger.error({ error }, "Get meeting template error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get meeting template" },
      { status: 500 }
    )
  }
})

// ============================================
// PUT /api/meetings/templates/[id]
// ============================================

export const PUT = withAuth(async (request: NextRequest, auth, context?) => {
  try {
    if (!isFeatureEnabled(auth.organization, "l10_meetings")) {
      return getFeatureGateError("l10_meetings")
    }

    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }

    const { id } = await context.params

    const { rows: existingRows } = await sql`
      SELECT * FROM meeting_templates WHERE id = ${id}
    `

    if (existingRows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Template not found" },
        { status: 404 }
      )
    }

    const existing = parseTemplate(existingRows[0])

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(existing.workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Template not found" },
        { status: 404 }
      )
    }

    const hasAccess = await userHasWorkspaceAccess(auth.user.id, existing.workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    const { name, description, sections, isDefault } = await validateBody(request, updateMeetingTemplateSchema)

    const sanitizedName = name ? sanitizeText(name.trim()) : existing.name
    const sanitizedDescription =
      description !== undefined
        ? description
          ? sanitizeText(description.trim())
          : null
        : (existing.description ?? null)
    const sanitizedSections = sections
      ? sections.map((s) => ({
          sectionType: s.sectionType,
          durationTarget: Number(s.durationTarget) || 5,
          data: s.data || {},
        }))
      : existing.sections
    const newIsDefault = isDefault !== undefined ? isDefault : existing.isDefault

    // If marking as default, clear existing defaults in this workspace
    if (newIsDefault && !existing.isDefault) {
      await sql`
        UPDATE meeting_templates
        SET is_default = FALSE
        WHERE workspace_id = ${existing.workspaceId} AND id != ${id}
      `
    }

    const { rows } = await sql`
      UPDATE meeting_templates
      SET
        name = ${sanitizedName},
        description = ${sanitizedDescription},
        sections = ${JSON.stringify(sanitizedSections)}::jsonb,
        is_default = ${newIsDefault},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (rows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Template not found" },
        { status: 404 }
      )
    }

    const updated = parseTemplate(rows[0])

    logger.info(`Meeting template updated: ${id}`)

    return NextResponse.json<ApiResponse<MeetingTemplate>>({
      success: true,
      data: updated,
      message: "Template updated successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    logger.error({ error }, "Update meeting template error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update meeting template" },
      { status: 500 }
    )
  }
})

// ============================================
// DELETE /api/meetings/templates/[id]
// ============================================

export const DELETE = withAuth(async (request: NextRequest, auth, context?) => {
  try {
    if (!isFeatureEnabled(auth.organization, "l10_meetings")) {
      return getFeatureGateError("l10_meetings")
    }

    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }

    const { id } = await context.params

    const { rows: existingRows } = await sql`
      SELECT * FROM meeting_templates WHERE id = ${id}
    `

    if (existingRows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Template not found" },
        { status: 404 }
      )
    }

    const existing = parseTemplate(existingRows[0])

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(existing.workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Template not found" },
        { status: 404 }
      )
    }

    const hasAccess = await userHasWorkspaceAccess(auth.user.id, existing.workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    await sql`
      DELETE FROM meeting_templates WHERE id = ${id}
    `

    logger.info(`Meeting template deleted: ${id}`)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Template deleted successfully",
    })
  } catch (error) {
    logger.error({ error }, "Delete meeting template error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete meeting template" },
      { status: 500 }
    )
  }
})
