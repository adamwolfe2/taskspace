/**
 * AIMS EOD Tracker - Remote MCP Endpoint
 *
 * Connect via Claude Desktop:
 * Settings → Connectors → Add custom connector
 * - Name: AIMS EOD Tracker
 * - URL: https://your-aims-app.vercel.app/api/mcp
 * - OAuth Client Secret: Your AIMS API key (aims_...)
 *
 * No local installation required!
 */

import { createMcpHandler } from "mcp-handler"
import { z } from "zod"
import { sql } from "@vercel/postgres"
import { db } from "@/lib/db"
import { headers } from "next/headers"

// Get organization from API key in Authorization header
async function getOrgIdFromAuth(): Promise<string | null> {
  try {
    const headersList = await headers()
    const authHeader = headersList.get("authorization")

    // Try Bearer token first (API key)
    if (authHeader?.startsWith("Bearer ")) {
      const apiKey = authHeader.substring(7)
      if (apiKey.startsWith("aims_")) {
        const key = await db.apiKeys.findByKey(apiKey)
        if (key) {
          await db.apiKeys.updateLastUsed(key.id)
          return key.organizationId
        }
      }
    }

    // Fall back to environment variable for demo/development
    if (process.env.MCP_DEFAULT_ORG_ID) {
      return process.env.MCP_DEFAULT_ORG_ID
    }

    return null
  } catch (error) {
    console.error("MCP auth error:", error)
    return null
  }
}

// Database query helpers
async function queryMembers(orgId: string) {
  const result = await sql`
    SELECT om.*, u.name, u.email
    FROM organization_members om
    JOIN users u ON om.user_id = u.id
    WHERE om.organization_id = ${orgId}
    AND om.status = 'active'
  `
  return result.rows
}

async function queryEodReports(orgId: string, date: string) {
  const result = await sql`
    SELECT er.*, u.name as user_name
    FROM eod_reports er
    JOIN users u ON er.user_id = u.id
    JOIN organization_members om ON er.user_id = om.user_id
    WHERE om.organization_id = ${orgId}
    AND er.report_date = ${date}
  `
  return result.rows
}

async function queryRocks(orgId: string, userId?: string) {
  if (userId) {
    const result = await sql`
      SELECT r.*, u.name as owner_name
      FROM rocks r
      JOIN users u ON r.owner_id = u.id
      WHERE r.organization_id = ${orgId}
      AND r.owner_id = ${userId}
      ORDER BY r.created_at DESC
    `
    return result.rows
  }

  const result = await sql`
    SELECT r.*, u.name as owner_name
    FROM rocks r
    JOIN users u ON r.owner_id = u.id
    WHERE r.organization_id = ${orgId}
    ORDER BY r.created_at DESC
  `
  return result.rows
}

async function queryTasks(orgId: string, userId?: string, status?: string) {
  let baseQuery = `
    SELECT t.*,
           assignee.name as assignee_name,
           assigner.name as assigned_by_name
    FROM tasks t
    JOIN organization_members om ON t.assignee_id = om.user_id
    JOIN users assignee ON t.assignee_id = assignee.id
    LEFT JOIN users assigner ON t.assigned_by = assigner.id
    WHERE om.organization_id = $1
  `
  const params: (string | undefined)[] = [orgId]
  let paramIndex = 2

  if (userId) {
    baseQuery += ` AND t.assignee_id = $${paramIndex}`
    params.push(userId)
    paramIndex++
  }

  if (status) {
    baseQuery += ` AND t.status = $${paramIndex}`
    params.push(status)
  }

  baseQuery += ` ORDER BY t.due_date ASC`

  const result = await sql.query(baseQuery, params)
  return result.rows
}

const handler = createMcpHandler(
  (server) => {
    // Tool: Get Team Members
    server.tool(
      "get_team_members",
      "Get all team members in your AIMS organization",
      {
        department: z.string().optional().describe("Filter by department"),
      },
      async ({ department }) => {
        const orgId = await getOrgIdFromAuth()
        if (!orgId) {
          return {
            content: [{ type: "text", text: "Authentication required. Add your AIMS API key (aims_...) to the connector's OAuth Client Secret field." }],
          }
        }

        let members = await queryMembers(orgId)

        if (department) {
          members = members.filter((m: any) =>
            m.department?.toLowerCase().includes(department.toLowerCase())
          )
        }

        const summary = members.map((m: any) =>
          `- ${m.name} (${m.department || "No dept"}) - ${m.role}`
        ).join("\n")

        return {
          content: [{
            type: "text",
            text: `Team Members (${members.length}):\n${summary || "No members found"}`,
          }],
        }
      }
    )

    // Tool: Check EOD Status
    server.tool(
      "check_eod_status",
      "Check who has/hasn't submitted their EOD report today",
      {
        date: z.string().optional().describe("Date (YYYY-MM-DD), defaults to today"),
      },
      async ({ date }) => {
        const orgId = await getOrgIdFromAuth()
        if (!orgId) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        const checkDate = date || new Date().toISOString().split("T")[0]

        const [members, reports] = await Promise.all([
          queryMembers(orgId),
          queryEodReports(orgId, checkDate),
        ])

        const submittedIds = new Set(reports.map((r: any) => r.user_id))
        const activeMembers = members.filter((m: any) => m.role === "member")
        const submitted = activeMembers.filter((m: any) => submittedIds.has(m.user_id))
        const missing = activeMembers.filter((m: any) => !submittedIds.has(m.user_id))

        let response = `EOD Status for ${checkDate}:\n\n`
        response += `✅ Submitted (${submitted.length}):\n`
        response += submitted.map((m: any) => `  - ${m.name}`).join("\n") || "  None"
        response += `\n\n❌ Missing (${missing.length}):\n`
        response += missing.map((m: any) => `  - ${m.name}`).join("\n") || "  Everyone submitted!"

        return { content: [{ type: "text", text: response }] }
      }
    )

    // Tool: Get Rocks
    server.tool(
      "get_rocks",
      "View quarterly rocks (goals) and their progress",
      {
        status: z.enum(["on-track", "at-risk", "blocked", "completed"]).optional(),
      },
      async ({ status }) => {
        const orgId = await getOrgIdFromAuth()
        if (!orgId) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        let rocks = await queryRocks(orgId)

        if (status) {
          rocks = rocks.filter((r: any) => r.status === status)
        }

        const emoji: Record<string, string> = {
          "on-track": "🟢", "at-risk": "🟡", "blocked": "🔴", "completed": "✅",
        }

        const summary = rocks.map((r: any) =>
          `${emoji[r.status] || "⚪"} ${r.title} (${r.progress || 0}%) - ${r.owner_name}`
        ).join("\n")

        return {
          content: [{ type: "text", text: `Rocks (${rocks.length}):\n${summary || "No rocks"}` }],
        }
      }
    )

    // Tool: Get Pending Tasks
    server.tool(
      "get_pending_tasks",
      "Get pending tasks for the team",
      {},
      async () => {
        const orgId = await getOrgIdFromAuth()
        if (!orgId) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        const tasks = await queryTasks(orgId, undefined, "pending")

        const emoji: Record<string, string> = { high: "🔴", medium: "🟡", normal: "🟢" }

        const summary = tasks.slice(0, 20).map((t: any) => {
          const dueDate = t.due_date ? new Date(t.due_date).toLocaleDateString() : "No date"
          return `${emoji[t.priority] || "⚪"} ${t.title} → ${t.assignee_name} (due: ${dueDate})`
        }).join("\n")

        return {
          content: [{ type: "text", text: `Pending Tasks (${tasks.length}):\n${summary || "None"}` }],
        }
      }
    )

    // Tool: Get Team Overview
    server.tool(
      "get_team_overview",
      "Get a quick overview of team status, EOD submissions, and key metrics",
      {},
      async () => {
        const orgId = await getOrgIdFromAuth()
        if (!orgId) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        const today = new Date().toISOString().split("T")[0]

        const [members, reports, rocks, tasks] = await Promise.all([
          queryMembers(orgId),
          queryEodReports(orgId, today),
          queryRocks(orgId),
          queryTasks(orgId),
        ])

        const activeMembers = members.filter((m: any) => m.role === "member")
        const submittedIds = new Set(reports.map((r: any) => r.user_id))
        const submissionRate = activeMembers.length > 0
          ? Math.round((submittedIds.size / activeMembers.length) * 100) : 0

        const atRiskRocks = rocks.filter((r: any) => r.status === "at-risk" || r.status === "blocked")
        const avgProgress = rocks.length > 0
          ? Math.round(rocks.reduce((s: number, r: any) => s + (r.progress || 0), 0) / rocks.length) : 0

        const pendingTasks = tasks.filter((t: any) => t.status === "pending")
        const overdueTasks = pendingTasks.filter((t: any) =>
          t.due_date && new Date(t.due_date) < new Date()
        )

        return {
          content: [{
            type: "text",
            text: `📊 AIMS Team Overview - ${today}
================================
👥 Team: ${members.length} members
📝 EOD: ${submissionRate}% (${submittedIds.size}/${activeMembers.length})
🎯 Rocks: ${rocks.length} total, ${atRiskRocks.length} at risk
📈 Progress: ${avgProgress}%
📋 Tasks: ${pendingTasks.length} pending (${overdueTasks.length} overdue)`,
          }],
        }
      }
    )

    // Tool: Get Blockers
    server.tool(
      "get_blockers",
      "Get current blockers and escalations from team",
      {},
      async () => {
        const orgId = await getOrgIdFromAuth()
        if (!orgId) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        const result = await sql`
          SELECT er.*, u.name as user_name
          FROM eod_reports er
          JOIN users u ON er.user_id = u.id
          JOIN organization_members om ON er.user_id = om.user_id
          WHERE om.organization_id = ${orgId}
          AND er.needs_escalation = true
          AND er.report_date >= CURRENT_DATE - INTERVAL '7 days'
          ORDER BY er.report_date DESC
        `

        if (result.rows.length === 0) {
          return { content: [{ type: "text", text: "No blockers reported in the last 7 days" }] }
        }

        const summary = result.rows.map((b: any) => {
          const date = new Date(b.report_date).toLocaleDateString()
          return `⚠️ ${date} - ${b.user_name}: ${b.escalation_note || "No details"}`
        }).join("\n\n")

        return { content: [{ type: "text", text: `Blockers (${result.rows.length}):\n\n${summary}` }] }
      }
    )

    // ============================================
    // ADVANCED TOOLS FOR TEAM MANAGEMENT & AUTOMATION
    // ============================================

    // Tool: Get Member Analysis - Deep dive on a single team member
    server.tool(
      "get_member_analysis",
      "Get comprehensive analysis of a team member including EOD history, task completion, rocks, blockers, and performance metrics",
      {
        memberName: z.string().describe("Name or partial name of the team member"),
        days: z.number().optional().describe("Number of days of history to analyze (default 30)"),
      },
      async ({ memberName, days = 30 }) => {
        const orgId = await getOrgIdFromAuth()
        if (!orgId) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        // Find the member
        const members = await queryMembers(orgId)
        const member = members.find((m: any) =>
          m.name.toLowerCase().includes(memberName.toLowerCase())
        )

        if (!member) {
          return { content: [{ type: "text", text: `No member found matching "${memberName}"` }] }
        }

        // Get comprehensive data for this member
        const [eodReports, tasks, rocks] = await Promise.all([
          sql`
            SELECT er.*
            FROM eod_reports er
            WHERE er.user_id = ${member.user_id}
            AND er.report_date >= CURRENT_DATE - INTERVAL '${days} days'
            ORDER BY er.report_date DESC
          `,
          sql`
            SELECT t.*
            FROM tasks t
            WHERE t.assignee_id = ${member.user_id}
            ORDER BY t.created_at DESC
          `,
          sql`
            SELECT r.*
            FROM rocks r
            WHERE r.owner_id = ${member.user_id}
            ORDER BY r.created_at DESC
          `,
        ])

        const eods = eodReports.rows
        const allTasks = tasks.rows
        const memberRocks = rocks.rows

        // Calculate metrics
        const completedTasks = allTasks.filter((t: any) => t.status === "completed")
        const pendingTasks = allTasks.filter((t: any) => t.status === "pending")
        const overdueTasks = pendingTasks.filter((t: any) =>
          t.due_date && new Date(t.due_date) < new Date()
        )
        const completionRate = allTasks.length > 0
          ? Math.round((completedTasks.length / allTasks.length) * 100) : 0

        const eodSubmissionRate = days > 0
          ? Math.round((eods.length / Math.min(days, 30)) * 100) : 0

        const escalationCount = eods.filter((e: any) => e.needs_escalation).length

        // Mood/sentiment analysis from EODs
        const moods = eods.map((e: any) => e.mood).filter(Boolean)
        const moodBreakdown = moods.reduce((acc: any, m: string) => {
          acc[m] = (acc[m] || 0) + 1
          return acc
        }, {})

        // Rock status
        const rocksOnTrack = memberRocks.filter((r: any) => r.status === "on-track").length
        const rocksAtRisk = memberRocks.filter((r: any) => r.status === "at-risk" || r.status === "blocked").length
        const avgRockProgress = memberRocks.length > 0
          ? Math.round(memberRocks.reduce((s: number, r: any) => s + (r.progress || 0), 0) / memberRocks.length) : 0

        // Recent blockers
        const recentBlockers = eods
          .filter((e: any) => e.needs_escalation && e.escalation_note)
          .slice(0, 3)
          .map((e: any) => `  - ${new Date(e.report_date).toLocaleDateString()}: ${e.escalation_note}`)

        const analysis = `
👤 MEMBER ANALYSIS: ${member.name}
=====================================
📧 ${member.email}
🏢 ${member.department || "No department"} | ${member.job_title || member.role}

📊 PERFORMANCE METRICS (Last ${days} Days)
----------------------------------------
📝 EOD Submission Rate: ${eodSubmissionRate}% (${eods.length} reports)
✅ Task Completion Rate: ${completionRate}% (${completedTasks.length}/${allTasks.length})
📋 Current Pending Tasks: ${pendingTasks.length}
⚠️ Overdue Tasks: ${overdueTasks.length}
🚨 Escalations Reported: ${escalationCount}

🎯 ROCKS
----------------------------------------
Total: ${memberRocks.length} | On Track: ${rocksOnTrack} | At Risk: ${rocksAtRisk}
Average Progress: ${avgRockProgress}%
${memberRocks.slice(0, 5).map((r: any) => {
  const emoji = r.status === "on-track" ? "🟢" : r.status === "at-risk" ? "🟡" : r.status === "blocked" ? "🔴" : "✅"
  return `  ${emoji} ${r.title} (${r.progress || 0}%)`
}).join("\n")}

😊 MOOD TRENDS
----------------------------------------
${Object.entries(moodBreakdown).map(([mood, count]) => `  ${mood}: ${count}`).join("\n") || "  No mood data"}

🚧 RECENT BLOCKERS
----------------------------------------
${recentBlockers.join("\n") || "  No blockers reported"}

📈 WORKLOAD ASSESSMENT
----------------------------------------
${overdueTasks.length > 2 ? "⚠️ HIGH - Multiple overdue tasks" :
  pendingTasks.length > 10 ? "⚠️ HIGH - Many pending tasks" :
  pendingTasks.length > 5 ? "📊 MODERATE - Normal workload" :
  "✅ LOW - Has capacity for new work"}
        `.trim()

        return { content: [{ type: "text", text: analysis }] }
      }
    )

    // Tool: Get Full EOD Report Details
    server.tool(
      "get_eod_report_details",
      "Get the complete EOD report for a specific user and date, including all tasks, notes, blockers, and progress",
      {
        memberName: z.string().describe("Name or partial name of the team member"),
        date: z.string().optional().describe("Date (YYYY-MM-DD), defaults to today"),
      },
      async ({ memberName, date }) => {
        const orgId = await getOrgIdFromAuth()
        if (!orgId) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        const reportDate = date || new Date().toISOString().split("T")[0]

        // Find the member
        const members = await queryMembers(orgId)
        const member = members.find((m: any) =>
          m.name.toLowerCase().includes(memberName.toLowerCase())
        )

        if (!member) {
          return { content: [{ type: "text", text: `No member found matching "${memberName}"` }] }
        }

        // Get the EOD report
        const reportResult = await sql`
          SELECT er.*
          FROM eod_reports er
          WHERE er.user_id = ${member.user_id}
          AND er.report_date = ${reportDate}
        `

        if (reportResult.rows.length === 0) {
          return { content: [{ type: "text", text: `No EOD report found for ${member.name} on ${reportDate}` }] }
        }

        const report = reportResult.rows[0]

        // Get tasks completed that day
        const tasksResult = await sql`
          SELECT t.*
          FROM tasks t
          WHERE t.assignee_id = ${member.user_id}
          AND t.status = 'completed'
          AND DATE(t.completed_at) = ${reportDate}
        `

        const completedTasks = tasksResult.rows

        // Parse EOD data (stored as JSON in some cases)
        const eodData = {
          tasks: report.tasks || [],
          notes: report.notes || report.summary || "",
          blockers: report.blockers || [],
          wins: report.wins || [],
          tomorrowFocus: report.tomorrow_focus || report.focus_tomorrow || "",
          mood: report.mood || "neutral",
          needsEscalation: report.needs_escalation || false,
          escalationNote: report.escalation_note || "",
        }

        const details = `
📋 EOD REPORT: ${member.name}
=====================================
📅 Date: ${reportDate}
😊 Mood: ${eodData.mood}
${eodData.needsEscalation ? "🚨 ESCALATION NEEDED" : ""}

📝 SUMMARY
----------------------------------------
${eodData.notes || "No summary provided"}

✅ TASKS COMPLETED (${completedTasks.length})
----------------------------------------
${completedTasks.length > 0
  ? completedTasks.map((t: any) => `  ✓ ${t.title}`).join("\n")
  : "  No tasks completed"}

${Array.isArray(eodData.tasks) && eodData.tasks.length > 0 ? `
📋 REPORTED TASKS
----------------------------------------
${eodData.tasks.map((t: any) => `  - ${typeof t === 'string' ? t : t.title || t.description || JSON.stringify(t)}`).join("\n")}
` : ""}

🏆 WINS
----------------------------------------
${Array.isArray(eodData.wins) && eodData.wins.length > 0
  ? eodData.wins.map((w: any) => `  🎉 ${typeof w === 'string' ? w : w.text || JSON.stringify(w)}`).join("\n")
  : "  No wins reported"}

🚧 BLOCKERS
----------------------------------------
${Array.isArray(eodData.blockers) && eodData.blockers.length > 0
  ? eodData.blockers.map((b: any) => `  ⚠️ ${typeof b === 'string' ? b : b.text || JSON.stringify(b)}`).join("\n")
  : "  No blockers reported"}

${eodData.escalationNote ? `
🚨 ESCALATION
----------------------------------------
${eodData.escalationNote}
` : ""}

🔮 TOMORROW'S FOCUS
----------------------------------------
${eodData.tomorrowFocus || "Not specified"}
        `.trim()

        return { content: [{ type: "text", text: details }] }
      }
    )

    // Tool: Get All EOD Reports for a Date
    server.tool(
      "get_all_eod_reports",
      "Get ALL EOD reports from the entire team for a specific date - complete with tasks, blockers, and notes from each person",
      {
        date: z.string().optional().describe("Date (YYYY-MM-DD), defaults to today"),
      },
      async ({ date }) => {
        const orgId = await getOrgIdFromAuth()
        if (!orgId) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        const reportDate = date || new Date().toISOString().split("T")[0]

        // Get all members and their EOD reports
        const [members, reportsResult] = await Promise.all([
          queryMembers(orgId),
          sql`
            SELECT er.*, u.name as user_name, u.email
            FROM eod_reports er
            JOIN users u ON er.user_id = u.id
            JOIN organization_members om ON er.user_id = om.user_id
            WHERE om.organization_id = ${orgId}
            AND er.report_date = ${reportDate}
            ORDER BY u.name
          `,
        ])

        const reports = reportsResult.rows
        const activeMembers = members.filter((m: any) => m.role === "member")
        const submittedIds = new Set(reports.map((r: any) => r.user_id))
        const missingMembers = activeMembers.filter((m: any) => !submittedIds.has(m.user_id))

        let fullDigest = `
📊 COMPLETE TEAM EOD DIGEST
=====================================
📅 Date: ${reportDate}
👥 Submitted: ${reports.length}/${activeMembers.length} (${Math.round(reports.length/activeMembers.length*100)}%)

`

        // Add each person's report
        for (const report of reports) {
          const escalationFlag = report.needs_escalation ? " 🚨 ESCALATION" : ""
          const moodEmoji = {
            positive: "😊", neutral: "😐", stressed: "😰", negative: "😞"
          }[report.mood as string] || "😐"

          fullDigest += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 ${report.user_name} ${moodEmoji}${escalationFlag}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Summary: ${report.notes || report.summary || "No summary"}

${report.tasks && Array.isArray(report.tasks) && report.tasks.length > 0 ? `✅ Tasks:
${report.tasks.map((t: any) => `   - ${typeof t === 'string' ? t : t.title || JSON.stringify(t)}`).join("\n")}
` : ""}
${report.wins && Array.isArray(report.wins) && report.wins.length > 0 ? `🏆 Wins:
${report.wins.map((w: any) => `   - ${typeof w === 'string' ? w : w.text || JSON.stringify(w)}`).join("\n")}
` : ""}
${report.blockers && Array.isArray(report.blockers) && report.blockers.length > 0 ? `🚧 Blockers:
${report.blockers.map((b: any) => `   - ${typeof b === 'string' ? b : b.text || JSON.stringify(b)}`).join("\n")}
` : ""}
${report.needs_escalation && report.escalation_note ? `🚨 Escalation: ${report.escalation_note}
` : ""}
${report.tomorrow_focus || report.focus_tomorrow ? `🔮 Tomorrow: ${report.tomorrow_focus || report.focus_tomorrow}
` : ""}`
        }

        // Add missing members section
        if (missingMembers.length > 0) {
          fullDigest += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ DID NOT SUBMIT (${missingMembers.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${missingMembers.map((m: any) => `   - ${m.name} (${m.email})`).join("\n")}
`
        }

        return { content: [{ type: "text", text: fullDigest.trim() }] }
      }
    )

    // Tool: Assign Task
    server.tool(
      "assign_task",
      "Create and assign a task to a team member in AIMS",
      {
        assigneeName: z.string().describe("Name or partial name of the team member to assign to"),
        title: z.string().describe("Task title"),
        description: z.string().optional().describe("Task description"),
        priority: z.enum(["high", "medium", "normal"]).optional().describe("Task priority (default: normal)"),
        dueDate: z.string().describe("Due date (YYYY-MM-DD)"),
        rockTitle: z.string().optional().describe("Optional: Link to a rock by title"),
      },
      async ({ assigneeName, title, description, priority = "normal", dueDate, rockTitle }) => {
        const orgId = await getOrgIdFromAuth()
        if (!orgId) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        // Find the assignee
        const members = await queryMembers(orgId)
        const assignee = members.find((m: any) =>
          m.name.toLowerCase().includes(assigneeName.toLowerCase())
        )

        if (!assignee) {
          return { content: [{ type: "text", text: `No member found matching "${assigneeName}". Available: ${members.map((m: any) => m.name).join(", ")}` }] }
        }

        // Find rock if specified
        let rockId = null
        if (rockTitle) {
          const rocks = await queryRocks(orgId)
          const rock = rocks.find((r: any) =>
            r.title.toLowerCase().includes(rockTitle.toLowerCase())
          )
          if (rock) {
            rockId = rock.id
          }
        }

        // Generate task ID
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Create the task
        await sql`
          INSERT INTO tasks (
            id, title, description, priority, status, due_date,
            assignee_id, rock_id, organization_id, created_at, type
          ) VALUES (
            ${taskId},
            ${title},
            ${description || ""},
            ${priority},
            'pending',
            ${dueDate},
            ${assignee.user_id},
            ${rockId},
            ${orgId},
            NOW(),
            'assigned'
          )
        `

        const priorityEmoji = { high: "🔴", medium: "🟡", normal: "🟢" }[priority]

        return {
          content: [{
            type: "text",
            text: `✅ Task Created Successfully!

📋 ${title}
${description ? `📝 ${description}\n` : ""}
${priorityEmoji} Priority: ${priority}
👤 Assigned to: ${assignee.name}
📅 Due: ${dueDate}
${rockId ? `🎯 Linked to rock` : ""}

Task ID: ${taskId}`,
          }],
        }
      }
    )

    // Tool: Get Workload Analysis - Who has capacity
    server.tool(
      "get_workload_analysis",
      "Analyze team workload and get recommendations for who has capacity for new tasks",
      {
        taskType: z.string().optional().describe("Optional: Type of task to find best assignee for"),
      },
      async ({ taskType }) => {
        const orgId = await getOrgIdFromAuth()
        if (!orgId) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        const members = await queryMembers(orgId)
        const activeMembers = members.filter((m: any) => m.role === "member")

        // Get workload data for each member
        const workloadData = await Promise.all(
          activeMembers.map(async (member: any) => {
            const [tasksResult, rocksResult, eodResult] = await Promise.all([
              sql`
                SELECT t.*,
                       CASE WHEN t.due_date < CURRENT_DATE AND t.status = 'pending' THEN true ELSE false END as is_overdue
                FROM tasks t
                WHERE t.assignee_id = ${member.user_id}
                AND t.status = 'pending'
              `,
              sql`
                SELECT r.*
                FROM rocks r
                WHERE r.owner_id = ${member.user_id}
                AND r.status IN ('on-track', 'at-risk', 'blocked')
              `,
              sql`
                SELECT COUNT(*) as escalation_count
                FROM eod_reports er
                WHERE er.user_id = ${member.user_id}
                AND er.needs_escalation = true
                AND er.report_date >= CURRENT_DATE - INTERVAL '7 days'
              `,
            ])

            const pendingTasks = tasksResult.rows
            const overdueTasks = pendingTasks.filter((t: any) => t.is_overdue)
            const highPriorityTasks = pendingTasks.filter((t: any) => t.priority === "high")
            const activeRocks = rocksResult.rows
            const blockedRocks = activeRocks.filter((r: any) => r.status === "blocked")
            const escalations = parseInt(eodResult.rows[0]?.escalation_count || "0")

            // Calculate workload score (lower = more capacity)
            const workloadScore =
              pendingTasks.length * 1 +
              overdueTasks.length * 3 +
              highPriorityTasks.length * 2 +
              blockedRocks.length * 5 +
              escalations * 2

            return {
              name: member.name,
              department: member.department,
              email: member.email,
              pendingTasks: pendingTasks.length,
              overdueTasks: overdueTasks.length,
              highPriorityTasks: highPriorityTasks.length,
              activeRocks: activeRocks.length,
              blockedRocks: blockedRocks.length,
              recentEscalations: escalations,
              workloadScore,
              capacity: workloadScore < 5 ? "HIGH" : workloadScore < 10 ? "MEDIUM" : "LOW",
            }
          })
        )

        // Sort by workload score (lowest first = most capacity)
        workloadData.sort((a, b) => a.workloadScore - b.workloadScore)

        let analysis = `
📊 TEAM WORKLOAD ANALYSIS
=====================================

`

        // Capacity summary
        const highCapacity = workloadData.filter((w) => w.capacity === "HIGH")
        const mediumCapacity = workloadData.filter((w) => w.capacity === "MEDIUM")
        const lowCapacity = workloadData.filter((w) => w.capacity === "LOW")

        analysis += `📈 CAPACITY OVERVIEW
----------------------------------------
✅ High Capacity (${highCapacity.length}): ${highCapacity.map((w) => w.name).join(", ") || "None"}
📊 Medium Capacity (${mediumCapacity.length}): ${mediumCapacity.map((w) => w.name).join(", ") || "None"}
⚠️ Low Capacity (${lowCapacity.length}): ${lowCapacity.map((w) => w.name).join(", ") || "None"}

`

        // Detailed breakdown
        analysis += `📋 DETAILED BREAKDOWN
----------------------------------------
`
        for (const member of workloadData) {
          const capacityIcon = member.capacity === "HIGH" ? "✅" : member.capacity === "MEDIUM" ? "📊" : "⚠️"
          analysis += `
${capacityIcon} ${member.name} (${member.department || "No dept"})
   Capacity: ${member.capacity} | Score: ${member.workloadScore}
   📋 ${member.pendingTasks} pending (${member.overdueTasks} overdue, ${member.highPriorityTasks} high-pri)
   🎯 ${member.activeRocks} active rocks (${member.blockedRocks} blocked)
   🚨 ${member.recentEscalations} recent escalations
`
        }

        // Recommendations
        if (highCapacity.length > 0) {
          analysis += `
🎯 RECOMMENDATIONS FOR NEW TASKS
----------------------------------------
Best candidates (highest capacity):
${highCapacity.slice(0, 3).map((w, i) => `  ${i + 1}. ${w.name} - ${w.pendingTasks} pending tasks, ${w.activeRocks} rocks`).join("\n")}
`
        }

        return { content: [{ type: "text", text: analysis.trim() }] }
      }
    )

    // Tool: Generate Daily Digest
    server.tool(
      "generate_daily_digest",
      "Generate a comprehensive AI-ready daily digest summarizing all team EOD reports, wins, blockers, and key metrics",
      {
        date: z.string().optional().describe("Date (YYYY-MM-DD), defaults to today"),
        format: z.enum(["summary", "detailed", "executive"]).optional().describe("Format: summary (default), detailed, or executive"),
      },
      async ({ date, format = "summary" }) => {
        const orgId = await getOrgIdFromAuth()
        if (!orgId) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        const reportDate = date || new Date().toISOString().split("T")[0]

        // Get all data
        const [members, reportsResult, tasksResult, rocksResult] = await Promise.all([
          queryMembers(orgId),
          sql`
            SELECT er.*, u.name as user_name
            FROM eod_reports er
            JOIN users u ON er.user_id = u.id
            JOIN organization_members om ON er.user_id = om.user_id
            WHERE om.organization_id = ${orgId}
            AND er.report_date = ${reportDate}
          `,
          sql`
            SELECT t.*, u.name as assignee_name
            FROM tasks t
            JOIN users u ON t.assignee_id = u.id
            JOIN organization_members om ON t.assignee_id = om.user_id
            WHERE om.organization_id = ${orgId}
            AND t.status = 'completed'
            AND DATE(t.completed_at) = ${reportDate}
          `,
          queryRocks(orgId),
        ])

        const reports = reportsResult.rows
        const completedTasks = tasksResult.rows
        const rocks = rocksResult

        const activeMembers = members.filter((m: any) => m.role === "member")
        const submissionRate = Math.round((reports.length / activeMembers.length) * 100)

        // Aggregate data
        const allWins: string[] = []
        const allBlockers: string[] = []
        const escalations: any[] = []
        const moodCounts: Record<string, number> = {}

        for (const report of reports) {
          if (report.wins && Array.isArray(report.wins)) {
            report.wins.forEach((w: any) => {
              const winText = typeof w === 'string' ? w : w.text || ""
              if (winText) allWins.push(`${report.user_name}: ${winText}`)
            })
          }
          if (report.blockers && Array.isArray(report.blockers)) {
            report.blockers.forEach((b: any) => {
              const blockerText = typeof b === 'string' ? b : b.text || ""
              if (blockerText) allBlockers.push(`${report.user_name}: ${blockerText}`)
            })
          }
          if (report.needs_escalation) {
            escalations.push({
              name: report.user_name,
              note: report.escalation_note || "No details",
            })
          }
          const mood = report.mood || "neutral"
          moodCounts[mood] = (moodCounts[mood] || 0) + 1
        }

        // Rock status summary
        const rocksOnTrack = rocks.filter((r: any) => r.status === "on-track").length
        const rocksAtRisk = rocks.filter((r: any) => r.status === "at-risk").length
        const rocksBlocked = rocks.filter((r: any) => r.status === "blocked").length
        const avgRockProgress = rocks.length > 0
          ? Math.round(rocks.reduce((s: number, r: any) => s + (r.progress || 0), 0) / rocks.length) : 0

        // Team sentiment
        const positiveCount = moodCounts.positive || 0
        const negativeCount = (moodCounts.negative || 0) + (moodCounts.stressed || 0)
        const sentiment = positiveCount > negativeCount ? "Positive" :
          positiveCount < negativeCount ? "Needs Attention" : "Neutral"

        let digest = ""

        if (format === "executive") {
          digest = `
📊 EXECUTIVE SUMMARY - ${reportDate}
=====================================

🎯 KEY METRICS
• EOD Completion: ${submissionRate}% (${reports.length}/${activeMembers.length})
• Tasks Completed: ${completedTasks.length}
• Team Sentiment: ${sentiment}
• Rocks: ${avgRockProgress}% avg progress (${rocksAtRisk + rocksBlocked} need attention)

${escalations.length > 0 ? `
⚠️ ESCALATIONS (${escalations.length})
${escalations.map((e) => `• ${e.name}: ${e.note}`).join("\n")}
` : "✅ No escalations"}

${allBlockers.length > 0 ? `
🚧 KEY BLOCKERS (${allBlockers.length})
${allBlockers.slice(0, 5).map((b) => `• ${b}`).join("\n")}
` : ""}

${allWins.length > 0 ? `
🏆 TOP WINS
${allWins.slice(0, 5).map((w) => `• ${w}`).join("\n")}
` : ""}
          `.trim()

        } else if (format === "detailed") {
          // Use the full report format from get_all_eod_reports
          digest = `[Use get_all_eod_reports for the full detailed breakdown]`

        } else {
          // Summary format (default)
          digest = `
📊 DAILY DIGEST - ${reportDate}
=====================================

📈 SUBMISSION STATUS
• ${submissionRate}% of team submitted (${reports.length}/${activeMembers.length})
• Sentiment: ${sentiment}
• Mood breakdown: ${Object.entries(moodCounts).map(([k, v]) => `${k}: ${v}`).join(", ")}

✅ COMPLETED TODAY
• ${completedTasks.length} tasks completed across the team
${completedTasks.slice(0, 5).map((t: any) => `  - ${t.title} (${t.assignee_name})`).join("\n")}
${completedTasks.length > 5 ? `  ... and ${completedTasks.length - 5} more` : ""}

🎯 ROCK STATUS
• Total: ${rocks.length} | On Track: ${rocksOnTrack} | At Risk: ${rocksAtRisk} | Blocked: ${rocksBlocked}
• Average Progress: ${avgRockProgress}%

${escalations.length > 0 ? `
🚨 ESCALATIONS (${escalations.length})
${escalations.map((e) => `  ⚠️ ${e.name}: ${e.note}`).join("\n")}
` : "✅ No escalations today"}

${allBlockers.length > 0 ? `
🚧 BLOCKERS REPORTED (${allBlockers.length})
${allBlockers.slice(0, 8).map((b) => `  - ${b}`).join("\n")}
${allBlockers.length > 8 ? `  ... and ${allBlockers.length - 8} more` : ""}
` : "✅ No blockers reported"}

${allWins.length > 0 ? `
🏆 WINS (${allWins.length})
${allWins.slice(0, 8).map((w) => `  🎉 ${w}`).join("\n")}
${allWins.length > 8 ? `  ... and ${allWins.length - 8} more` : ""}
` : ""}
          `.trim()
        }

        return { content: [{ type: "text", text: digest }] }
      }
    )
  },
  {
    name: "aims-eod-tracker",
    version: "2.0.0",
  },
  {
    basePath: "/api/mcp",
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV === "development",
  }
)

export { handler as GET, handler as POST }
