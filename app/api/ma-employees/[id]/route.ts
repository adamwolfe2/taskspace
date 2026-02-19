import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { validateBody } from "@/lib/validation/middleware"
import { maEmployeeUpdateSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

// Helper to verify employee belongs to the authenticated user's organization via workspace
async function verifyEmployeeOrgAccess(employee: { workspaceId: string | null }, orgId: string): Promise<boolean> {
  if (!employee.workspaceId) {
    // Employee has no workspace_id - legacy data, allow access (no way to verify org)
    return true
  }
  return verifyWorkspaceOrgBoundary(employee.workspaceId, orgId)
}

// GET - Fetch a single MA employee by ID
export const GET = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params
    const employee = await db.maEmployees.findById(id)

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      )
    }

    // Verify employee belongs to user's organization via workspace
    const hasAccess = await verifyEmployeeOrgAccess(employee, auth.organization.id)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      employee,
    })
  } catch (error) {
    logError(logger, "Error fetching MA employee", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch employee" },
      { status: 500 }
    )
  }
})

// PATCH - Update an MA employee
export const PATCH = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params
    const body = await validateBody(request, maEmployeeUpdateSchema)

    // Check if employee exists first
    const existing = await db.maEmployees.findById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      )
    }

    // Verify employee belongs to user's organization via workspace
    const hasAccess = await verifyEmployeeOrgAccess(existing, auth.organization.id)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      )
    }

    const updated = await db.maEmployees.update(id, body)

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Failed to update employee" },
        { status: 500 }
      )
    }

    // Fetch the updated employee
    const updatedEmployee = await db.maEmployees.findById(id)

    return NextResponse.json({
      success: true,
      employee: updatedEmployee,
      message: "Employee updated successfully",
    })
  } catch (error) {
    logError(logger, "Error updating MA employee", error)
    return NextResponse.json(
      { success: false, error: "Failed to update employee" },
      { status: 500 }
    )
  }
})

// DELETE - Soft delete an MA employee (set is_active = false)
export const DELETE = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const hard = searchParams.get("hard") === "true"

    // Check if employee exists first
    const existing = await db.maEmployees.findById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      )
    }

    // Verify employee belongs to user's organization via workspace
    const hasAccess = await verifyEmployeeOrgAccess(existing, auth.organization.id)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      )
    }

    let deleted: boolean
    if (hard) {
      // Hard delete - permanently remove from database
      deleted = await db.maEmployees.hardDelete(id)
    } else {
      // Soft delete - set is_active = false
      deleted = await db.maEmployees.delete(id)
    }

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Failed to delete employee" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: hard ? "Employee permanently deleted" : "Employee deactivated successfully",
    })
  } catch (error) {
    logError(logger, "Error deleting MA employee", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete employee" },
      { status: 500 }
    )
  }
})
