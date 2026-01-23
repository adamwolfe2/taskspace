import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { logger, logError } from "@/lib/logger"

// GET - Fetch all MA employees
export async function GET() {
  try {
    const employees = await db.maEmployees.findAll()

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
}

// POST - Create a new MA employee
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { firstName, lastName, supervisor, department, jobTitle, responsibilities, notes, email } = body

    if (!firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: "First name and last name are required" },
        { status: 400 }
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
}
