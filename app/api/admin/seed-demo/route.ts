/**
 * POST /api/admin/seed-demo
 *
 * Seeds a realistic demo workspace with sample rocks, tasks, and EOD reports.
 * Protected by withAdmin() — only org admins/owners can trigger.
 * Idempotent: checks for marker data before inserting.
 */

import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { generateId } from "@/lib/auth/password"
import { db } from "@/lib/db"
import { getUserWorkspaces } from "@/lib/db/workspaces"
import type { Rock, AssignedTask, EODReport, EODTask, EODPriority, ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// ────────────────────────────────────────
// Date helpers (all relative to "now")
// ────────────────────────────────────────

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

function daysAgo(days: number): string {
  return daysFromNow(-days)
}

function endOfQuarter(): string {
  const now = new Date()
  const quarter = Math.floor(now.getMonth() / 3)
  const endMonth = (quarter + 1) * 3
  const endDate = new Date(now.getFullYear(), endMonth, 0)
  return endDate.toISOString().split("T")[0]
}

function currentQuarterLabel(): string {
  const now = new Date()
  const quarter = Math.floor(now.getMonth() / 3) + 1
  return `Q${quarter} ${now.getFullYear()}`
}

/** Return the last N weekdays as YYYY-MM-DD strings, most recent first. */
function lastNWeekdays(n: number): string[] {
  const dates: string[] = []
  const d = new Date()
  while (dates.length < n) {
    d.setDate(d.getDate() - 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) {
      dates.push(d.toISOString().split("T")[0])
    }
  }
  return dates
}

// ────────────────────────────────────────
// Route handler
// ────────────────────────────────────────

export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    const orgId = auth.organization.id
    const userId = auth.user.id
    const now = new Date().toISOString()

    // Resolve workspace — prefer query param, fall back to first workspace
    const { searchParams } = new URL(request.url)
    let workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      const workspaces = await getUserWorkspaces(userId, orgId)
      if (workspaces.length === 0) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "No workspace found. Create a workspace first." },
          { status: 400 }
        )
      }
      workspaceId = workspaces[0].id
    }

    // Idempotency check — look for marker rock
    const existingRocks = await db.rocks.findByUserId(userId, orgId, workspaceId)
    const alreadySeeded = existingRocks.some(
      (r) => r.title === "Launch Q2 Marketing Campaign"
    )
    if (alreadySeeded) {
      return NextResponse.json<ApiResponse<{ message: string }>>({
        success: true,
        data: { message: "Demo data already exists. Delete the existing seed data first to re-seed." },
      })
    }

    const quarter = currentQuarterLabel()
    const quarterEnd = endOfQuarter()

    // ────────────────────────────────────
    // 1. Rocks (6 total)
    // ────────────────────────────────────

    const rockDefinitions: Array<{
      title: string
      description: string
      progress: number
      status: Rock["status"]
      dueDate: string
    }> = [
      {
        title: "Launch Q2 Marketing Campaign",
        description: "Plan and execute multi-channel marketing campaign including paid ads, content marketing, and email sequences.",
        progress: 75,
        status: "on-track",
        dueDate: quarterEnd,
      },
      {
        title: "Reduce Customer Churn to <5%",
        description: "Identify churn drivers, implement retention workflows, and improve onboarding experience to reduce monthly churn rate.",
        progress: 40,
        status: "at-risk",
        dueDate: quarterEnd,
      },
      {
        title: "Ship Mobile App v2.0",
        description: "Complete redesign of mobile app with new navigation, offline mode, and push notification improvements.",
        progress: 90,
        status: "on-track",
        dueDate: daysFromNow(14),
      },
      {
        title: "Hire 3 Senior Engineers",
        description: "Source, interview, and close 3 senior full-stack engineers to support product growth.",
        progress: 33,
        status: "at-risk",
        dueDate: quarterEnd,
      },
      {
        title: "Implement SOC 2 Compliance",
        description: "Complete SOC 2 Type II audit preparation including policy documentation, access controls, and monitoring.",
        progress: 60,
        status: "on-track",
        dueDate: quarterEnd,
      },
      {
        title: "Increase MRR to $100K",
        description: "Drive revenue growth through upsells, new customer acquisition, and annual plan conversions.",
        progress: 85,
        status: "on-track",
        dueDate: quarterEnd,
      },
    ]

    const rocks: Rock[] = rockDefinitions.map((def) => ({
      id: generateId(),
      organizationId: orgId,
      workspaceId,
      userId,
      title: def.title,
      description: def.description,
      progress: def.progress,
      dueDate: def.dueDate,
      status: def.status,
      createdAt: now,
      updatedAt: now,
      quarter,
      bucket: undefined,
      outcome: undefined,
      doneWhen: [],
      projectId: null,
      projectName: null,
    }))

    for (const rock of rocks) {
      await db.rocks.create(rock)
    }

    // ────────────────────────────────────
    // 2. Tasks (12 total)
    // ────────────────────────────────────

    const taskDefinitions: Array<{
      title: string
      description: string
      priority: AssignedTask["priority"]
      status: AssignedTask["status"]
      dueDate: string
      completedAt: string | null
      rockIndex: number | null
    }> = [
      // 4 completed (last 7 days)
      {
        title: "Review Q2 OKR dashboard mockups",
        description: "Review Figma designs for the new OKR tracking dashboard and provide feedback.",
        priority: "high",
        status: "completed",
        dueDate: daysAgo(3),
        completedAt: daysAgo(2) + "T16:30:00.000Z",
        rockIndex: 0,
      },
      {
        title: "Set up A/B testing for landing page",
        description: "Configure Optimizely experiment for new hero section and pricing page variants.",
        priority: "medium",
        status: "completed",
        dueDate: daysAgo(5),
        completedAt: daysAgo(4) + "T14:20:00.000Z",
        rockIndex: 0,
      },
      {
        title: "Update API documentation for v2 endpoints",
        description: "Document new REST endpoints for mobile app v2, including auth flow changes.",
        priority: "medium",
        status: "completed",
        dueDate: daysAgo(2),
        completedAt: daysAgo(1) + "T17:45:00.000Z",
        rockIndex: 2,
      },
      {
        title: "Complete SOC 2 access control review",
        description: "Audit all team member access levels and document in compliance tracker.",
        priority: "high",
        status: "completed",
        dueDate: daysAgo(1),
        completedAt: daysAgo(1) + "T15:00:00.000Z",
        rockIndex: 4,
      },
      // 4 pending due this week
      {
        title: "Schedule user interviews for churn analysis",
        description: "Reach out to 10 recently churned customers and schedule 30-min interviews.",
        priority: "high",
        status: "pending",
        dueDate: daysFromNow(2),
        completedAt: null,
        rockIndex: 1,
      },
      {
        title: "Draft engineering job descriptions",
        description: "Write JDs for 3 senior engineer roles covering backend, frontend, and platform.",
        priority: "medium",
        status: "pending",
        dueDate: daysFromNow(3),
        completedAt: null,
        rockIndex: 3,
      },
      {
        title: "Prepare monthly revenue report",
        description: "Pull MRR, churn, and expansion revenue numbers for the board update.",
        priority: "high",
        status: "pending",
        dueDate: daysFromNow(1),
        completedAt: null,
        rockIndex: 5,
      },
      {
        title: "Review mobile app beta feedback",
        description: "Analyze TestFlight feedback and prioritize critical bugs for v2 launch.",
        priority: "normal",
        status: "pending",
        dueDate: daysFromNow(4),
        completedAt: null,
        rockIndex: 2,
      },
      // 2 pending due next week
      {
        title: "Write blog post on product updates",
        description: "Draft 1500-word blog post covering Q2 feature releases for the company blog.",
        priority: "normal",
        status: "pending",
        dueDate: daysFromNow(8),
        completedAt: null,
        rockIndex: 0,
      },
      {
        title: "Set up monitoring dashboards for SOC 2",
        description: "Configure Datadog alerts and dashboards required for SOC 2 continuous monitoring.",
        priority: "medium",
        status: "pending",
        dueDate: daysFromNow(10),
        completedAt: null,
        rockIndex: 4,
      },
      // 2 overdue
      {
        title: "Send NPS survey to enterprise accounts",
        description: "Deploy NPS survey to top 50 enterprise accounts using Customer.io.",
        priority: "high",
        status: "pending",
        dueDate: daysAgo(3),
        completedAt: null,
        rockIndex: 1,
      },
      {
        title: "Finalize annual plan pricing tiers",
        description: "Complete pricing analysis and get sign-off on new annual plan discount structure.",
        priority: "medium",
        status: "pending",
        dueDate: daysAgo(5),
        completedAt: null,
        rockIndex: 5,
      },
    ]

    const tasks: AssignedTask[] = taskDefinitions.map((def) => {
      const linkedRock = def.rockIndex !== null ? rocks[def.rockIndex] : null
      return {
        id: generateId(),
        organizationId: orgId,
        workspaceId,
        title: def.title,
        description: def.description,
        assigneeId: userId,
        assigneeName: auth.user.name,
        assignedById: null,
        assignedByName: null,
        type: "personal" as const,
        rockId: linkedRock?.id || null,
        rockTitle: linkedRock?.title || null,
        priority: def.priority,
        dueDate: def.dueDate,
        status: def.status,
        completedAt: def.completedAt,
        createdAt: now,
        updatedAt: now,
        addedToEOD: false,
        eodReportId: null,
        source: "manual" as const,
        asanaGid: null,
        projectId: null,
        projectName: null,
      }
    })

    for (const task of tasks) {
      await db.assignedTasks.create(task)
    }

    // ────────────────────────────────────
    // 3. EOD Reports (5 reports, last 5 weekdays)
    // ────────────────────────────────────

    const weekdays = lastNWeekdays(5)

    const eodDefinitions: Array<{
      tasks: EODTask[]
      challenges: string
      tomorrowPriorities: EODPriority[]
      mood: "positive" | "neutral"
      metricValueToday: number
    }> = [
      {
        tasks: [
          { id: generateId(), text: "Finalized Q2 marketing campaign timeline and assigned channel owners", rockId: rocks[0].id, rockTitle: rocks[0].title },
          { id: generateId(), text: "Reviewed 3 engineering candidate profiles from recruiter pipeline", rockId: rocks[3].id, rockTitle: rocks[3].title },
          { id: generateId(), text: "Fixed critical bug in user onboarding flow causing 15% drop-off", rockId: null, rockTitle: null },
          { id: generateId(), text: "Updated SOC 2 evidence collection spreadsheet with Q1 data", rockId: rocks[4].id, rockTitle: rocks[4].title },
        ],
        challenges: "Recruiter pipeline is thin for senior backend roles. May need to expand to additional sourcing channels or consider contract-to-hire.",
        tomorrowPriorities: [
          { id: generateId(), text: "Review landing page A/B test results and decide on winner", rockId: rocks[0].id, rockTitle: rocks[0].title },
          { id: generateId(), text: "Prep for board meeting revenue discussion", rockId: rocks[5].id, rockTitle: rocks[5].title },
          { id: generateId(), text: "Phone screen 2 engineering candidates", rockId: rocks[3].id, rockTitle: rocks[3].title },
        ],
        mood: "positive",
        metricValueToday: 4,
      },
      {
        tasks: [
          { id: generateId(), text: "Analyzed churn cohort data — identified onboarding completion as top predictor", rockId: rocks[1].id, rockTitle: rocks[1].title },
          { id: generateId(), text: "Shipped mobile app push notification improvements to TestFlight", rockId: rocks[2].id, rockTitle: rocks[2].title },
          { id: generateId(), text: "Conducted 2 customer interviews on churn reasons", rockId: rocks[1].id, rockTitle: rocks[1].title },
        ],
        challenges: "Mobile app beta testers reporting intermittent sync issues on Android. Need to investigate before launch.",
        tomorrowPriorities: [
          { id: generateId(), text: "Debug Android sync issue reported by beta testers", rockId: rocks[2].id, rockTitle: rocks[2].title },
          { id: generateId(), text: "Draft retention email sequence for at-risk accounts", rockId: rocks[1].id, rockTitle: rocks[1].title },
        ],
        mood: "neutral",
        metricValueToday: 3,
      },
      {
        tasks: [
          { id: generateId(), text: "Resolved Android sync issue — was a race condition in the offline queue", rockId: rocks[2].id, rockTitle: rocks[2].title },
          { id: generateId(), text: "Closed 2 annual plan upgrades worth $4,200 ARR combined", rockId: rocks[5].id, rockTitle: rocks[5].title },
          { id: generateId(), text: "Reviewed and approved SOC 2 policy documents with legal", rockId: rocks[4].id, rockTitle: rocks[4].title },
          { id: generateId(), text: "Set up automated churn risk scoring in analytics dashboard", rockId: rocks[1].id, rockTitle: rocks[1].title },
          { id: generateId(), text: "Published engineering blog post on our migration to edge functions", rockId: null, rockTitle: null },
        ],
        challenges: "No major blockers today. Good momentum across all rocks.",
        tomorrowPriorities: [
          { id: generateId(), text: "Final QA pass on mobile app v2 before release candidate", rockId: rocks[2].id, rockTitle: rocks[2].title },
          { id: generateId(), text: "Review NPS survey responses from enterprise accounts", rockId: rocks[1].id, rockTitle: rocks[1].title },
          { id: generateId(), text: "Schedule SOC 2 auditor kickoff call", rockId: rocks[4].id, rockTitle: rocks[4].title },
        ],
        mood: "positive",
        metricValueToday: 5,
      },
      {
        tasks: [
          { id: generateId(), text: "Completed mobile app v2 release candidate build and submitted to App Store", rockId: rocks[2].id, rockTitle: rocks[2].title },
          { id: generateId(), text: "Ran quarterly revenue forecast — on track for $97K MRR by end of quarter", rockId: rocks[5].id, rockTitle: rocks[5].title },
          { id: generateId(), text: "Interviewed senior frontend candidate — strong fit, moving to final round", rockId: rocks[3].id, rockTitle: rocks[3].title },
        ],
        challenges: "App Store review taking longer than expected. Submitted expedited review request for the v2 release.",
        tomorrowPriorities: [
          { id: generateId(), text: "Follow up on App Store review status", rockId: rocks[2].id, rockTitle: rocks[2].title },
          { id: generateId(), text: "Prepare Q2 marketing campaign launch assets", rockId: rocks[0].id, rockTitle: rocks[0].title },
        ],
        mood: "positive",
        metricValueToday: 4,
      },
      {
        tasks: [
          { id: generateId(), text: "Launched email drip campaign targeting at-risk accounts", rockId: rocks[1].id, rockTitle: rocks[1].title },
          { id: generateId(), text: "Updated access control policies per SOC 2 auditor feedback", rockId: rocks[4].id, rockTitle: rocks[4].title },
          { id: generateId(), text: "Reviewed and merged 4 PRs for mobile app bug fixes", rockId: rocks[2].id, rockTitle: rocks[2].title },
          { id: generateId(), text: "Sent offer letter to senior backend engineer candidate", rockId: rocks[3].id, rockTitle: rocks[3].title },
        ],
        challenges: "One strong engineering candidate declined our offer citing comp. Need to revisit salary bands for senior roles.",
        tomorrowPriorities: [
          { id: generateId(), text: "Discuss revised comp bands with finance", rockId: rocks[3].id, rockTitle: rocks[3].title },
          { id: generateId(), text: "Analyze first 48 hours of retention email campaign metrics", rockId: rocks[1].id, rockTitle: rocks[1].title },
          { id: generateId(), text: "Prep marketing campaign launch checklist", rockId: rocks[0].id, rockTitle: rocks[0].title },
        ],
        mood: "neutral",
        metricValueToday: 3,
      },
    ]

    const reports: EODReport[] = weekdays.map((date, i) => ({
      id: generateId(),
      organizationId: orgId,
      workspaceId,
      userId,
      date,
      tasks: eodDefinitions[i].tasks,
      challenges: eodDefinitions[i].challenges,
      tomorrowPriorities: eodDefinitions[i].tomorrowPriorities,
      needsEscalation: false,
      escalationNote: null,
      metricValueToday: eodDefinitions[i].metricValueToday,
      mood: eodDefinitions[i].mood,
      submittedAt: date + "T17:30:00.000Z",
      createdAt: date + "T17:30:00.000Z",
    }))

    for (const report of reports) {
      await db.eodReports.create(report)
    }

    // ────────────────────────────────────
    // Summary
    // ────────────────────────────────────

    const summary = {
      rocks: rocks.length,
      tasks: tasks.length,
      eodReports: reports.length,
      workspaceId,
      quarter,
    }

    logger.info({ summary, orgId, userId }, "Demo data seeded successfully")

    return NextResponse.json<ApiResponse<typeof summary>>({
      success: true,
      data: summary,
      message: `Seeded ${summary.rocks} rocks, ${summary.tasks} tasks, and ${summary.eodReports} EOD reports.`,
    })
  } catch (error) {
    logError(logger, "Seed demo data error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to seed demo data" },
      { status: 500 }
    )
  }
})
