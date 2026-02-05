import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/middleware"
import { logger, logError } from "@/lib/logger"

// GET - Fetch a single MA employee by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const employee = await db.maEmployees.findById(id)

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      )
    }

    // Note: Additional workspace validation could be added here if needed
    // by checking if employee.workspace_id matches user's workspace access

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
}

// PATCH - Update an MA employee
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Check if employee exists first
    const existing = await db.maEmployees.findById(id)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      )
    }

    const { firstName, lastName, supervisor, department, jobTitle, responsibilities, notes, email, isActive } = body

    const updated = await db.maEmployees.update(id, {
      firstName,
      lastName,
      supervisor,
      department,
      jobTitle,
      responsibilities,
      notes,
      email,
      isActive,
    })

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
}

// DELETE - Soft delete an MA employee (set is_active = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
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
}
