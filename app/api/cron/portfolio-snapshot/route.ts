import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/sql"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// Vercel Cron: runs nightly at midnight UTC
// Configure in vercel.json: { "path": "/api/cron/portfolio-snapshot", "schedule": "0 0 * * *" }

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const isProduction = process.env.NODE_ENV === "production"

  if (!cronSecret) {
    if (isProduction) {
      logger.error("CRON_SECRET not configured in production - denying request")
      return false
    }
    return true
  }

  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${cronSecret}`
}

interface OrgSnapshot {
  orgId: string
  orgName: string
  memberCount: number
  eodSubmissionCount: number
  eodSubmissionRate: number
  activeTaskCount: number
  completedTaskCount: number
  openEscalationCount: number
  avgRockProgress: number
  rocksOnTrack: number
  rocksAtRisk: number
  rocksBlocked: number
  rocksCompleted: number
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const today = new Date().toISOString().split("T")[0]

    // Get all organizations
    const { rows: orgs } = await sql`SELECT id, name FROM organizations`

    const snapshots: OrgSnapshot[] = []
    const failedOrgNames: string[] = []

    for (const org of orgs) {
      const orgId = org.id as string

      try {
      // Member count
      const { rows: memberRows } = await sql`
        SELECT COUNT(*) as count FROM organization_members
        WHERE organization_id = ${orgId} AND status = 'active'
      `
      const memberCount = parseInt(memberRows[0]?.count as string || "0", 10)

      // EOD submissions today
      const { rows: eodRows } = await sql`
        SELECT COUNT(DISTINCT user_id) as count FROM eod_reports
        WHERE organization_id = ${orgId}
          AND created_at >= ${today}::date
          AND created_at < (${today}::date + INTERVAL '1 day')
      `
      const eodSubmissionCount = parseInt(eodRows[0]?.count as string || "0", 10)
      const eodSubmissionRate = memberCount > 0 ? Math.round((eodSubmissionCount / memberCount) * 10000) / 100 : 0

      // Active and completed tasks
      const { rows: taskRows } = await sql`
        SELECT
          COUNT(*) FILTER (WHERE t.status = 'in_progress') as active_count,
          COUNT(*) FILTER (WHERE t.status = 'completed' AND t.completed_at >= ${today}::date) as completed_count
        FROM tasks t
        JOIN workspaces w ON t.workspace_id = w.id
        WHERE w.organization_id = ${orgId}
      `
      const activeTaskCount = parseInt(taskRows[0]?.active_count as string || "0", 10)
      const completedTaskCount = parseInt(taskRows[0]?.completed_count as string || "0", 10)

      // Open escalations
      const { rows: escalationRows } = await sql`
        SELECT COUNT(*) as count FROM eod_reports
        WHERE organization_id = ${orgId}
          AND needs_escalation = TRUE
          AND created_at >= NOW() - INTERVAL '7 days'
      `
      const openEscalationCount = parseInt(escalationRows[0]?.count as string || "0", 10)

      // Rock stats
      const { rows: rockRows } = await sql`
        SELECT
          COALESCE(AVG(r.progress), 0) as avg_progress,
          COUNT(*) FILTER (WHERE r.status = 'on-track') as on_track,
          COUNT(*) FILTER (WHERE r.status = 'at-risk') as at_risk,
          COUNT(*) FILTER (WHERE r.status = 'blocked') as blocked,
          COUNT(*) FILTER (WHERE r.status = 'completed') as completed
        FROM rocks r
        JOIN workspaces w ON r.workspace_id = w.id
        WHERE w.organization_id = ${orgId}
      `
      const avgRockProgress = Math.round(parseFloat(rockRows[0]?.avg_progress as string || "0") * 100) / 100
      const rocksOnTrack = parseInt(rockRows[0]?.on_track as string || "0", 10)
      const rocksAtRisk = parseInt(rockRows[0]?.at_risk as string || "0", 10)
      const rocksBlocked = parseInt(rockRows[0]?.blocked as string || "0", 10)
      const rocksCompleted = parseInt(rockRows[0]?.completed as string || "0", 10)

      // Insert or update snapshot
      const snapshotId = generateId()
      await sql`
        INSERT INTO portfolio_snapshots (
          id, organization_id, snapshot_date,
          member_count, eod_submission_count, eod_submission_rate,
          active_task_count, completed_task_count, open_escalation_count,
          avg_rock_progress, rocks_on_track, rocks_at_risk, rocks_blocked, rocks_completed,
          created_at
        )
        VALUES (
          ${snapshotId}, ${orgId}, ${today}::date,
          ${memberCount}, ${eodSubmissionCount}, ${eodSubmissionRate},
          ${activeTaskCount}, ${completedTaskCount}, ${openEscalationCount},
          ${avgRockProgress}, ${rocksOnTrack}, ${rocksAtRisk}, ${rocksBlocked}, ${rocksCompleted},
          NOW()
        )
        ON CONFLICT (organization_id, snapshot_date)
        DO UPDATE SET
          member_count = EXCLUDED.member_count,
          eod_submission_count = EXCLUDED.eod_submission_count,
          eod_submission_rate = EXCLUDED.eod_submission_rate,
          active_task_count = EXCLUDED.active_task_count,
          completed_task_count = EXCLUDED.completed_task_count,
          open_escalation_count = EXCLUDED.open_escalation_count,
          avg_rock_progress = EXCLUDED.avg_rock_progress,
          rocks_on_track = EXCLUDED.rocks_on_track,
          rocks_at_risk = EXCLUDED.rocks_at_risk,
          rocks_blocked = EXCLUDED.rocks_blocked,
          rocks_completed = EXCLUDED.rocks_completed
      `

      snapshots.push({
        orgId,
        orgName: org.name as string,
        memberCount,
        eodSubmissionCount,
        eodSubmissionRate,
        activeTaskCount,
        completedTaskCount,
        openEscalationCount,
        avgRockProgress,
        rocksOnTrack,
        rocksAtRisk,
        rocksBlocked,
        rocksCompleted,
      })
      } catch (orgError) {
        const orgName = org.name as string
        failedOrgNames.push(orgName)
        logError(logger, `Snapshot failed for org ${orgName} (${orgId})`, orgError)
      }
    }

    const failedOrgs = failedOrgNames
    const successCount = snapshots.length
    const totalOrgs = orgs.length

    if (failedOrgs.length > 0) {
      logger.warn(`Portfolio snapshots: ${successCount}/${totalOrgs} succeeded, failed: ${failedOrgs.join(", ")}`)
    } else {
      logger.info(`Portfolio snapshots captured for ${successCount} organizations on ${today}`)
    }

    return NextResponse.json<ApiResponse<{ date: string; snapshotCount: number; totalOrgs: number; failedOrgs: string[]; snapshots: OrgSnapshot[] }>>({
      success: true,
      data: { date: today, snapshotCount: successCount, totalOrgs, failedOrgs, snapshots },
    })
  } catch (error) {
    logError(logger, "Portfolio snapshot cron error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to capture portfolio snapshots" },
      { status: 500 }
    )
  }
}
