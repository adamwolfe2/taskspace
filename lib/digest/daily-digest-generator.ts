/**
 * Daily Digest Generator
 *
 * Generates consolidated natural language summaries of EOD reports
 * for all organization members, organized by Rocks and individual progress.
 */

import { db } from "@/lib/db"
import type { EODReport, Rock, TeamMember, AssignedTask } from "@/lib/types"
import { format } from "date-fns"

export interface MemberDigest {
  member: TeamMember
  rocks: {
    rock: Rock
    progress: number
    tasks: string[]
  }[]
  otherTasks: string[]
  blockers: string[]
  challenges: string
  tomorrowPriorities: string[]
  hasReport: boolean
}

export interface ConsolidatedDigest {
  date: string
  formattedDate: string
  organizationId: string
  organizationName: string
  adminDigest: MemberDigest | null
  teamDigests: MemberDigest[]
  missingMembers: TeamMember[]
  totalReports: number
  totalMembers: number
}

/**
 * Get the date string for today in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return format(new Date(), "yyyy-MM-dd")
}

/**
 * Generate a natural language summary of tasks completed for a rock
 */
function generateRockTaskSummary(tasks: string[], isAdmin: boolean): string {
  if (tasks.length === 0) {
    return "No specific tasks completed for this rock today."
  }

  if (isAdmin) {
    // For admin's own report, list all tasks
    return tasks.map(t => `• ${t}`).join("\n")
  }

  // For team members, generate a high-level summary
  if (tasks.length === 1) {
    return `• Worked on: ${tasks[0]}`
  }

  if (tasks.length <= 3) {
    return tasks.map(t => `• ${t}`).join("\n")
  }

  // Summarize if many tasks
  const firstTwo = tasks.slice(0, 2)
  const remaining = tasks.length - 2
  return `• ${firstTwo.join("\n• ")}\n• ...and ${remaining} more tasks`
}

/**
 * Generate a member's digest from their EOD report
 */
async function generateMemberDigest(
  member: TeamMember,
  report: EODReport | null,
  rocks: Rock[],
  tasks: AssignedTask[],
  isAdmin: boolean
): Promise<MemberDigest> {
  const memberRocks = rocks.filter(r => r.userId === member.id)
  const completedTasks = tasks.filter(
    t => t.assigneeId === member.id && t.status === "completed"
  )

  if (!report) {
    return {
      member,
      rocks: memberRocks.map(rock => ({
        rock,
        progress: rock.progress,
        tasks: [],
      })),
      otherTasks: [],
      blockers: [],
      challenges: "",
      tomorrowPriorities: [],
      hasReport: false,
    }
  }

  // Map tasks to rocks
  const rockTaskMap = new Map<string, string[]>()
  const otherTasks: string[] = []

  // Process report tasks
  for (const task of report.tasks || []) {
    if (task.rockId) {
      const existing = rockTaskMap.get(task.rockId) || []
      existing.push(task.text)
      rockTaskMap.set(task.rockId, existing)
    } else {
      otherTasks.push(task.text)
    }
  }

  // Build rock summaries
  const rockDigests = memberRocks.map(rock => ({
    rock,
    progress: rock.progress,
    tasks: rockTaskMap.get(rock.id) || [],
  }))

  // Extract blockers from challenges
  const blockers: string[] = []
  if (report.challenges) {
    const lines = report.challenges.split("\n").filter(l => l.trim())
    blockers.push(...lines)
  }

  return {
    member,
    rocks: rockDigests,
    otherTasks,
    blockers,
    challenges: report.challenges || "",
    tomorrowPriorities: report.tomorrowPriorities?.map(p => typeof p === 'string' ? p : p.text) || [],
    hasReport: true,
  }
}

/**
 * Format a member's digest as natural language text
 */
export function formatMemberDigestText(digest: MemberDigest, isAdmin: boolean): string {
  const lines: string[] = []

  lines.push(`## ${digest.member.name}`)
  if (digest.member.department) {
    lines.push(`*${digest.member.department}*`)
  }
  lines.push("")

  if (!digest.hasReport) {
    lines.push("⚠️ *No EOD report submitted*")
    lines.push("")
    return lines.join("\n")
  }

  // Rocks section
  if (digest.rocks.length > 0) {
    lines.push("### Quarterly Rocks Progress")
    lines.push("")

    for (const rockDigest of digest.rocks) {
      const progressBar = generateProgressBar(rockDigest.progress)
      lines.push(`**${rockDigest.rock.title}** - ${rockDigest.progress}% ${progressBar}`)

      if (rockDigest.tasks.length > 0) {
        lines.push(generateRockTaskSummary(rockDigest.tasks, isAdmin))
      } else {
        lines.push("_No tasks recorded for this rock today_")
      }
      lines.push("")
    }
  }

  // Other tasks
  if (digest.otherTasks.length > 0) {
    lines.push("### Other Completed Tasks")
    for (const task of digest.otherTasks) {
      lines.push(`• ${task}`)
    }
    lines.push("")
  }

  // Blockers
  if (digest.blockers.length > 0) {
    lines.push("### 🚧 Blockers")
    for (const blocker of digest.blockers) {
      lines.push(`• ${blocker}`)
    }
    lines.push("")
  }

  // Tomorrow's priorities
  if (digest.tomorrowPriorities.length > 0) {
    lines.push("### Tomorrow's Focus")
    for (const priority of digest.tomorrowPriorities) {
      lines.push(`• ${priority}`)
    }
    lines.push("")
  }

  return lines.join("\n")
}

/**
 * Generate a simple text progress bar
 */
function generateProgressBar(progress: number): string {
  const filled = Math.round(progress / 10)
  const empty = 10 - filled
  return `[${"█".repeat(filled)}${"░".repeat(empty)}]`
}

/**
 * Generate the full consolidated digest
 */
export async function generateConsolidatedDigest(
  organizationId: string,
  adminUserId: string,
  date?: string
): Promise<ConsolidatedDigest> {
  const targetDate = date || getTodayDateString()

  // Get organization
  const org = await db.organizations.findById(organizationId)

  // Get all active team members
  const members = await db.members.findWithUsersByOrganizationId(organizationId)
  const activeMembers = members.filter(m => m.status === "active")

  // Get all EOD reports for the date
  const allReports = await db.eodReports.findByOrganizationId(organizationId)
  const todayReports = allReports.filter(r => r.date === targetDate)
  const reportsByUser = new Map(todayReports.map(r => [r.userId, r]))

  // Get all rocks
  const rocks = await db.rocks.findByOrganizationId(organizationId)

  // Get all tasks
  const tasks = await db.assignedTasks.findByOrganizationId(organizationId)

  // Find admin member
  const adminMember = activeMembers.find(m => m.id === adminUserId)

  // Generate admin's digest (detailed)
  const adminDigest = adminMember
    ? await generateMemberDigest(
        adminMember as TeamMember,
        reportsByUser.get(adminUserId) || null,
        rocks,
        tasks,
        true
      )
    : null

  // Generate team digests (high-level summaries)
  const teamDigests: MemberDigest[] = []
  for (const member of activeMembers) {
    if (member.id === adminUserId) continue
    const digest = await generateMemberDigest(
      member as TeamMember,
      reportsByUser.get(member.id) || null,
      rocks,
      tasks,
      false
    )
    teamDigests.push(digest)
  }

  // Find members who haven't submitted
  const missingMembers = activeMembers.filter(
    m => !reportsByUser.has(m.id)
  ) as TeamMember[]

  return {
    date: targetDate,
    formattedDate: format(new Date(targetDate), "EEEE, MMMM d, yyyy"),
    organizationId,
    organizationName: org?.name || "Organization",
    adminDigest,
    teamDigests,
    missingMembers,
    totalReports: todayReports.length,
    totalMembers: activeMembers.length,
  }
}

/**
 * Format the consolidated digest as a complete text document
 */
export function formatConsolidatedDigestText(digest: ConsolidatedDigest): string {
  const lines: string[] = []

  // Header
  lines.push("# Daily Team Summary")
  lines.push(`**${digest.formattedDate}**`)
  lines.push("")
  lines.push(`📊 **${digest.totalReports}/${digest.totalMembers}** team members submitted EOD reports`)
  lines.push("")
  lines.push("---")
  lines.push("")

  // Admin's report first (most detailed)
  if (digest.adminDigest) {
    lines.push("# 👤 YOUR END OF DAY REPORT")
    lines.push("")
    lines.push(formatMemberDigestText(digest.adminDigest, true))
    lines.push("---")
    lines.push("")
  }

  // Team reports
  if (digest.teamDigests.length > 0) {
    lines.push("# 👥 TEAM MEMBER UPDATES")
    lines.push("")

    for (const memberDigest of digest.teamDigests) {
      lines.push(formatMemberDigestText(memberDigest, false))
      lines.push("---")
      lines.push("")
    }
  }

  // Missing reports
  if (digest.missingMembers.length > 0) {
    lines.push("# ⚠️ MISSING EOD REPORTS")
    lines.push("")
    lines.push("The following team members have not yet submitted their EOD report:")
    lines.push("")
    for (const member of digest.missingMembers) {
      lines.push(`• ${member.name}${member.department ? ` (${member.department})` : ""}`)
    }
    lines.push("")
  }

  return lines.join("\n")
}

/**
 * Format the digest as HTML for email
 */
export function formatConsolidatedDigestHTML(digest: ConsolidatedDigest): string {
  const css = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background: #f8fafc; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 24px; border-radius: 12px 12px 0 0; color: white; }
    .content { background: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: 0; }
    .stats { display: flex; gap: 20px; margin-bottom: 24px; padding: 16px; background: #f1f5f9; border-radius: 8px; }
    .stat { text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .stat-label { font-size: 12px; color: #64748b; }
    .member-section { margin: 24px 0; padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6; }
    .member-section.admin { border-left-color: #10b981; }
    .member-name { font-size: 18px; font-weight: 600; margin: 0 0 4px 0; }
    .member-dept { font-size: 14px; color: #64748b; margin: 0 0 16px 0; }
    .rock-item { margin: 12px 0; padding: 12px; background: white; border-radius: 6px; }
    .rock-title { font-weight: 600; }
    .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin: 8px 0; }
    .progress-fill { height: 100%; background: #3b82f6; border-radius: 4px; }
    .task-list { margin: 8px 0; padding-left: 20px; }
    .blockers { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 12px 0; border-radius: 0 6px 6px 0; }
    .missing { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 24px 0; border-radius: 0 6px 6px 0; }
    h2 { color: #1e40af; margin-top: 24px; }
    h3 { color: #374151; margin-top: 16px; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  `

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Team Summary - ${digest.formattedDate}</title>
  <style>${css}</style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">📊 Daily Team Summary</h1>
    <p style="margin: 8px 0 0 0; opacity: 0.9;">${digest.formattedDate}</p>
  </div>
  <div class="content">
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${digest.totalReports}</div>
        <div class="stat-label">Reports Submitted</div>
      </div>
      <div class="stat">
        <div class="stat-value">${digest.totalMembers}</div>
        <div class="stat-label">Team Members</div>
      </div>
      <div class="stat">
        <div class="stat-value">${Math.round((digest.totalReports / digest.totalMembers) * 100)}%</div>
        <div class="stat-label">Completion</div>
      </div>
    </div>`

  // Admin's report
  if (digest.adminDigest) {
    html += formatMemberDigestHTML(digest.adminDigest, true)
  }

  // Team reports
  for (const memberDigest of digest.teamDigests) {
    html += formatMemberDigestHTML(memberDigest, false)
  }

  // Missing reports
  if (digest.missingMembers.length > 0) {
    html += `
    <div class="missing">
      <h3 style="margin: 0 0 8px 0; color: #92400e;">⚠️ Missing EOD Reports</h3>
      <p style="margin: 0; color: #78350f;">${digest.missingMembers.map(m => m.name).join(", ")}</p>
    </div>`
  }

  html += `
  </div>
</body>
</html>`

  return html
}

/**
 * Format a single member's digest as HTML
 */
function formatMemberDigestHTML(digest: MemberDigest, isAdmin: boolean): string {
  let html = `
  <div class="member-section ${isAdmin ? 'admin' : ''}">
    <h2 class="member-name">${isAdmin ? '👤 ' : ''}${digest.member.name}</h2>
    ${digest.member.department ? `<p class="member-dept">${digest.member.department}</p>` : ''}`

  if (!digest.hasReport) {
    html += `<p style="color: #92400e;">⚠️ No EOD report submitted</p>`
    html += `</div>`
    return html
  }

  // Rocks
  if (digest.rocks.length > 0) {
    html += `<h3>Quarterly Rocks Progress</h3>`
    for (const rockDigest of digest.rocks) {
      html += `
      <div class="rock-item">
        <div class="rock-title">${rockDigest.rock.title}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${rockDigest.progress}%;"></div>
        </div>
        <div style="font-size: 14px; color: #64748b;">${rockDigest.progress}% complete</div>`

      if (rockDigest.tasks.length > 0) {
        html += `<ul class="task-list">`
        const tasksToShow = isAdmin ? rockDigest.tasks : rockDigest.tasks.slice(0, 3)
        for (const task of tasksToShow) {
          html += `<li>${task}</li>`
        }
        if (!isAdmin && rockDigest.tasks.length > 3) {
          html += `<li style="color: #64748b;">...and ${rockDigest.tasks.length - 3} more</li>`
        }
        html += `</ul>`
      }
      html += `</div>`
    }
  }

  // Other tasks
  if (digest.otherTasks.length > 0) {
    html += `<h3>Other Tasks</h3><ul class="task-list">`
    for (const task of digest.otherTasks) {
      html += `<li>${task}</li>`
    }
    html += `</ul>`
  }

  // Blockers
  if (digest.blockers.length > 0) {
    html += `
    <div class="blockers">
      <strong>🚧 Blockers:</strong>
      <ul style="margin: 8px 0 0 0; padding-left: 20px;">`
    for (const blocker of digest.blockers) {
      html += `<li>${blocker}</li>`
    }
    html += `</ul></div>`
  }

  html += `</div>`
  return html
}
