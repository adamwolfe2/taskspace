import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/middleware"
import { generateId } from "@/lib/auth/password"
import type { TaskTemplate, ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// GET /api/task-templates - Get all templates for the user
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const templates = await db.taskTemplates.findByOrganizationId(
      auth.organization.id,
      auth.user.id
    )

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
}

// POST /api/task-templates - Create a new template
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
    const { name, title, description, priority, defaultRockId, recurrence, isShared } = body

    if (!name || !title) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Template name and title are required" },
        { status: 400 }
      )
    }

    const template: TaskTemplate = {
      id: generateId(),
      organizationId: auth.organization.id,
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
}

// DELETE /api/task-templates?id=xxx - Delete a template
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
        { success: false, error: "Template ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const template = await db.taskTemplates.findById(id)
    if (!template) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Template not found" },
        { status: 404 }
      )
    }

    if (template.createdBy !== auth.user.id) {
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
}
