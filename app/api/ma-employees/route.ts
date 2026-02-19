import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { validateBody } from "@/lib/validation/middleware"
import { maEmployeeCreateSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"

// GET - Fetch all MA employees for a workspace
export const GET = withAuth(async (request, auth) => {
  try {
    // Get workspaceId from query params
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    const employees = await db.maEmployees.findByWorkspace(workspaceId)

    return NextResponse.json({
      success: true,
      employees,
      count: employees.length,
    })
  } catch (error) {
    logError(logger, "Error fetching MA employees", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch employees" },
      { status: 500 }
    )
  }
})

// POST - Create a new MA employee
export const POST = withAuth(async (request, auth) => {
  try {
    const { firstName, lastName, supervisor, department, jobTitle, responsibilities, notes, email, workspaceId } = await validateBody(request, maEmployeeCreateSchema)

    // Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    const result = await db.maEmployees.create({
      firstName,
      lastName,
      supervisor: supervisor || null,
      department: department || null,
      jobTitle: jobTitle || null,
      responsibilities: responsibilities || null,
      notes: notes || null,
      email: email || null,
      workspaceId,
    })

    return NextResponse.json({
      success: true,
      employee: result,
      message: "Employee created successfully",
    })
  } catch (error) {
    logError(logger, "Error creating MA employee", error)
    return NextResponse.json(
      { success: false, error: "Failed to create employee" },
      { status: 500 }
    )
  }
})
