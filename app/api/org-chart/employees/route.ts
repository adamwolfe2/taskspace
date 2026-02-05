import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { fetchEmployeesFromAirtable } from "@/lib/org-chart/airtable"
import type { OrgChartEmployee } from "@/lib/org-chart/types"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// Fallback data in case database and Airtable are not available
const FALLBACK_EMPLOYEES: OrgChartEmployee[] = [
  {
    id: "fallback-1",
    firstName: "John",
    lastName: "Smith",
    fullName: "John Smith",
    supervisor: null,
    department: "Executive",
    jobTitle: "CEO",
    notes: "Chief Executive Officer responsible for overall company strategy and operations.",
    rocks: "Rock 1: Q1 Company Growth\n* Achieve 20% revenue growth\n* Expand to 2 new markets\n* Hire 10 new team members",
  },
  {
    id: "fallback-2",
    firstName: "Sarah",
    lastName: "Johnson",
    fullName: "Sarah Johnson",
    supervisor: "John Smith",
    department: "Operations",
    jobTitle: "COO",
    notes: "Chief Operating Officer managing day-to-day operations.",
    rocks: "Rock 1: Operational Excellence\n* Reduce costs by 15%\n* Improve delivery times\n* Implement new CRM system",
  },
  {
    id: "fallback-3",
    firstName: "Mike",
    lastName: "Williams",
    fullName: "Mike Williams",
    supervisor: "Sarah Johnson",
    department: "Operations",
    jobTitle: "Operations Manager",
    notes: "Manages operational teams and processes.",
    rocks: "Rock 1: Team Efficiency\n* Train all staff on new systems\n* Reduce error rate by 25%",
  },
]

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    // CRITICAL: workspaceId is REQUIRED for data isolation
    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // Validate workspace access (unless org admin)
    if (!isAdmin(auth)) {
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
      if (!hasAccess) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "You don't have access to this workspace" },
          { status: 403 }
        )
      }
    }

    // Primary source: ma_employees database table with workspace filtering
    const dbEmployees = await db.maEmployees.findByWorkspace(workspaceId)

    if (dbEmployees.length > 0) {
      // Transform to OrgChartEmployee format
      const employees: OrgChartEmployee[] = dbEmployees.map(emp => ({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        fullName: emp.fullName,
        supervisor: emp.supervisor,
        department: emp.department || "",
        jobTitle: emp.jobTitle || "",
        notes: emp.notes || "",
        extraInfo: emp.responsibilities || "",
        email: emp.email || undefined,
        rocks: emp.rocks || "",
      }))

      return NextResponse.json({
        success: true,
        employees,
        source: "database",
        count: employees.length,
      })
    }

    // Secondary source: organization_members table with workspace filter
    try {
      const { rows } = await sql`
        SELECT
          om.id,
          om.name,
          om.email,
          om.job_title,
          om.department,
          om.manager_id,
          om.notes,
          manager.name as manager_name
        FROM organization_members om
        INNER JOIN workspace_members wm ON wm.member_id = om.id
        LEFT JOIN organization_members manager ON manager.id = om.manager_id
        WHERE wm.workspace_id = ${workspaceId}
          AND om.organization_id = ${auth.organization.id}
          AND om.status = 'active'
        ORDER BY om.name ASC
      `

      if (rows.length > 0) {
        // Transform to OrgChartEmployee format
        const employees: OrgChartEmployee[] = rows.map(row => {
          // Split name into first and last
          const nameParts = (row.name as string).split(" ")
          const firstName = nameParts[0] || ""
          const lastName = nameParts.slice(1).join(" ") || ""

          return {
            id: row.id as string,
            firstName,
            lastName,
            fullName: row.name as string,
            supervisor: row.manager_name as string | null,
            department: (row.department as string) || "",
            jobTitle: (row.job_title as string) || "",
            notes: (row.notes as string) || "",
            email: row.email as string | undefined,
            rocks: "", // Rocks will be synced separately
          }
        })

        return NextResponse.json({
          success: true,
          employees,
          source: "organization_members",
          count: employees.length,
        })
      }
    } catch (error) {
      logError(logger, "Error fetching organization members", error)
      // Continue to fallbacks if this fails
    }

    // Fallback #1: Try Airtable if database is empty
    if (process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID) {
      logger.warn({}, "Database empty, trying Airtable")
      try {
        const airtableEmployees = await fetchEmployeesFromAirtable()
        return NextResponse.json({
          success: true,
          employees: airtableEmployees,
          source: "airtable",
          count: airtableEmployees.length,
        })
      } catch (airtableError) {
        logError(logger, "Airtable fallback failed", airtableError)
      }
    }

    // Fallback #2: Return static demo data
    logger.warn({}, "Using fallback data - run seed API to populate database")
    return NextResponse.json({
      success: true,
      employees: FALLBACK_EMPLOYEES,
      source: "fallback",
      count: FALLBACK_EMPLOYEES.length,
      warning: "Database is empty. Run POST /api/ma-employees/seed to populate with MA employee data.",
    })
  } catch (error) {
    logError(logger, "Error fetching employees", error)

    // Return fallback data on error
    return NextResponse.json({
      success: true,
      employees: FALLBACK_EMPLOYEES,
      source: "fallback",
      count: FALLBACK_EMPLOYEES.length,
      warning: "Failed to fetch employees, using fallback data",
    })
  }
}
