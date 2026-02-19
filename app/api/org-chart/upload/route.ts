import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { generateId } from "@/lib/auth/password"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

interface CSVRow {
  firstName: string
  lastName: string
  email: string
  jobTitle: string
  department: string
  supervisorEmail: string
  notes?: string
}

interface UploadResult {
  success: boolean
  created: number
  errors: string[]
  preview?: Array<{
    name: string
    email: string
    jobTitle: string
    department: string
    supervisor: string | null
  }>
}

// Parse CSV content
function parseCSV(content: string): CSVRow[] {
  const lines = content.split("\n").filter((line) => line.trim())
  if (lines.length < 2) {
    throw new Error("CSV file is empty or has no data rows")
  }

  const headers = lines[0].split(",").map((h) => h.trim())
  const requiredHeaders = ["firstName", "lastName", "email", "jobTitle", "department", "supervisorEmail"]

  // Validate headers
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      throw new Error(`Missing required column: ${required}`)
    }
  }

  const rows: CSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ""
    })

    rows.push(row as unknown as CSVRow)
  }

  return rows
}

// Validate CSV data
function validateCSVData(rows: CSVRow[]): string[] {
  const errors: string[] = []
  const emails = new Set<string>()

  rows.forEach((row, index) => {
    const rowNum = index + 2 // +2 because row 1 is headers, and we start from 0

    // Check required fields
    if (!row.firstName) errors.push(`Row ${rowNum}: firstName is required`)
    if (!row.lastName) errors.push(`Row ${rowNum}: lastName is required`)
    if (!row.email) errors.push(`Row ${rowNum}: email is required`)
    if (!row.jobTitle) errors.push(`Row ${rowNum}: jobTitle is required`)
    if (!row.department) errors.push(`Row ${rowNum}: department is required`)

    // Validate email format
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push(`Row ${rowNum}: Invalid email format: ${row.email}`)
    }

    // Check for duplicate emails
    if (row.email) {
      if (emails.has(row.email.toLowerCase())) {
        errors.push(`Row ${rowNum}: Duplicate email: ${row.email}`)
      }
      emails.add(row.email.toLowerCase())
    }
  })

  // Validate supervisor emails reference existing employees
  const emailSet = new Set(rows.map((r) => r.email.toLowerCase()))
  rows.forEach((row, index) => {
    if (row.supervisorEmail && !emailSet.has(row.supervisorEmail.toLowerCase())) {
      errors.push(
        `Row ${index + 2}: supervisorEmail "${row.supervisorEmail}" does not match any employee email`
      )
    }
  })

  // Ensure at least one employee has no supervisor (CEO/top level)
  const hasTopLevel = rows.some((row) => !row.supervisorEmail || row.supervisorEmail.trim() === "")
  if (!hasTopLevel) {
    errors.push("At least one employee must have no supervisor (CEO/top executive)")
  }

  return errors
}

// POST /api/org-chart/upload - Upload org chart CSV
export const POST = withAdmin(async (request, auth) => {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const workspaceId = formData.get("workspaceId") as string

    if (!file) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No file provided" },
        { status: 400 }
      )
    }

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // Check file size (5MB max)
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<UploadResult>(
        {
          success: false,
          created: 0,
          errors: [`File size exceeds maximum limit of 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`],
        },
        { status: 400 }
      )
    }

    // Check file type (must be CSV)
    const fileName = file.name.toLowerCase()
    const fileType = file.type.toLowerCase()
    if (!fileName.endsWith('.csv') && fileType !== 'text/csv' && fileType !== 'application/csv') {
      return NextResponse.json<UploadResult>(
        {
          success: false,
          created: 0,
          errors: ['Invalid file type. Please upload a CSV file'],
        },
        { status: 400 }
      )
    }

    // Read file content
    const content = await file.text()

    // Parse CSV
    let rows: CSVRow[]
    try {
      rows = parseCSV(content)
    } catch (error) {
      return NextResponse.json<UploadResult>({
        success: false,
        created: 0,
        errors: ["Failed to parse CSV"],
      })
    }

    // Validate data
    const validationErrors = validateCSVData(rows)
    if (validationErrors.length > 0) {
      return NextResponse.json<UploadResult>({
        success: false,
        created: 0,
        errors: validationErrors,
      })
    }

    // Create organization members
    const emailToMemberId = new Map<string, string>()
    const memberRecords: Array<{
      id: string
      email: string
      name: string
      firstName: string
      lastName: string
      jobTitle: string
      department: string
      notes: string
      supervisorEmail: string | null
    }> = []

    // First pass: Create all members without manager_id
    for (const row of rows) {
      const memberId = "om_" + generateId()
      const fullName = `${row.firstName} ${row.lastName}`

      emailToMemberId.set(row.email.toLowerCase(), memberId)

      memberRecords.push({
        id: memberId,
        email: row.email,
        name: fullName,
        firstName: row.firstName,
        lastName: row.lastName,
        jobTitle: row.jobTitle,
        department: row.department,
        notes: row.notes || "",
        supervisorEmail: row.supervisorEmail || null,
      })
    }

    // Insert all members
    for (const member of memberRecords) {
      // Find manager_id based on supervisor email
      const managerId = member.supervisorEmail
        ? emailToMemberId.get(member.supervisorEmail.toLowerCase()) || null
        : null

      await sql`
        INSERT INTO organization_members (
          id, organization_id, name, email, job_title, department,
          manager_id, status, join_date, notes
        )
        VALUES (
          ${member.id},
          ${auth.organization.id},
          ${member.name},
          ${member.email},
          ${member.jobTitle},
          ${member.department},
          ${managerId},
          'active',
          NOW(),
          ${member.notes}
        )
      `

      // Associate member with workspace
      await sql`
        INSERT INTO workspace_members (workspace_id, member_id)
        VALUES (${workspaceId}, ${member.id})
        ON CONFLICT (workspace_id, member_id) DO NOTHING
      `
    }

    logger.info({
      organizationId: auth.organization.id,
      workspaceId,
      employeeCount: memberRecords.length,
    }, `Org chart uploaded: ${memberRecords.length} employees created`)

    return NextResponse.json<UploadResult>({
      success: true,
      created: memberRecords.length,
      errors: [],
      preview: memberRecords.map((m) => ({
        name: m.name,
        email: m.email,
        jobTitle: m.jobTitle,
        department: m.department,
        supervisor: m.supervisorEmail,
      })),
    })
  } catch (error) {
    logError(logger, "Org chart upload error", error)
    return NextResponse.json<UploadResult>(
      {
        success: false,
        created: 0,
        errors: ["Failed to upload org chart"],
      },
      { status: 500 }
    )
  }
})
