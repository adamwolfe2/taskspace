import { NextResponse } from "next/server"
import { fetchEmployeesFromAirtable } from "@/lib/org-chart/airtable"
import type { OrgChartEmployee } from "@/lib/org-chart/types"

// Fallback data in case Airtable is not configured
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

export async function GET() {
  try {
    // Check if Airtable is configured
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      console.warn("Airtable not configured, using fallback data")
      return NextResponse.json({
        success: true,
        employees: FALLBACK_EMPLOYEES,
        source: "fallback",
      })
    }

    const employees = await fetchEmployeesFromAirtable()

    return NextResponse.json({
      success: true,
      employees,
      source: "airtable",
    })
  } catch (error) {
    console.error("Error fetching employees:", error)

    // Return fallback data on error
    return NextResponse.json({
      success: true,
      employees: FALLBACK_EMPLOYEES,
      source: "fallback",
      warning: "Failed to fetch from Airtable, using fallback data",
    })
  }
}
