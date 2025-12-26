import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendMissingEODReminder, isEmailConfigured } from "@/lib/integrations/email"
import type { ApiResponse, TeamMember } from "@/lib/types"

// This endpoint is designed to be called by Vercel Cron
// Configure in vercel.json:
// {
//   "crons": [
//     { "path": "/api/cron/eod-reminder", "schedule": "0 17 * * 1-5" }
//   ]
// }

// Verify cron secret to prevent unauthorized calls
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.log("[Cron] CRON_SECRET not configured, allowing request")
    return true // Allow in development
  }

  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isEmailConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Email not configured" },
        { status: 503 }
      )
    }

    const today = new Date().toISOString().split("T")[0]
    console.log(`[Cron] Checking for missing EOD reports for ${today}`)

    // Get all organizations
    const organizations = await db.organizations.findAll()
    const results: { orgId: string; reminders: number; errors: string[] }[] = []

    for (const org of organizations) {
      try {
        // Get all active team members (not admins/owners - they might not need to submit)
        const teamMembersData = await db.members.findWithUsersByOrganizationId(org.id)
        const activeMembers = teamMembersData.filter(
          m => m.status === "active" && m.role === "member"
        )

        if (activeMembers.length === 0) {
          results.push({ orgId: org.id, reminders: 0, errors: [] })
          continue
        }

        // Get today's EOD reports
        const allReports = await db.eodReports.findByOrganizationId(org.id)
        const todayReports = allReports.filter(r => r.date === today)
        const submittedUserIds = new Set(todayReports.map(r => r.userId))

        // Find members who haven't submitted
        const missingMembers = activeMembers.filter(m => !submittedUserIds.has(m.id))

        if (missingMembers.length === 0) {
          console.log(`[Cron] All members submitted for org ${org.id}`)
          results.push({ orgId: org.id, reminders: 0, errors: [] })
          continue
        }

        // Get admins to CC
        const admins = teamMembersData.filter(m => m.role === "admin" || m.role === "owner")
        const adminMembers: TeamMember[] = admins.map(a => ({
          id: a.id,
          name: a.name,
          email: a.email,
          role: a.role,
          department: a.department,
          joinDate: a.joinDate,
        }))

        // Send reminder to each missing member
        const errors: string[] = []
        let remindersSent = 0

        for (const member of missingMembers) {
          const memberInfo: TeamMember = {
            id: member.id,
            name: member.name,
            email: member.email,
            role: member.role,
            department: member.department,
            joinDate: member.joinDate,
          }

          const result = await sendMissingEODReminder(memberInfo, org.name, adminMembers)
          if (result.success) {
            remindersSent++
          } else {
            errors.push(`${member.name}: ${result.error}`)
          }
        }

        console.log(`[Cron] Sent ${remindersSent} reminders for org ${org.id}`)
        results.push({ orgId: org.id, reminders: remindersSent, errors })
      } catch (error) {
        console.error(`[Cron] Failed for org ${org.id}:`, error)
        results.push({
          orgId: org.id,
          reminders: 0,
          errors: [error instanceof Error ? error.message : "Unknown error"],
        })
      }
    }

    const totalReminders = results.reduce((sum, r) => sum + r.reminders, 0)

    return NextResponse.json<ApiResponse<{ results: typeof results }>>({
      success: true,
      data: { results },
      message: `Sent ${totalReminders} EOD reminders across ${organizations.length} organizations`,
    })
  } catch (error) {
    console.error("[Cron] EOD reminder error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Failed to send reminders" },
      { status: 500 }
    )
  }
}
