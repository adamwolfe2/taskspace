/**
 * Taskspace - Remote MCP Endpoint
 *
 * Connect via Claude Desktop:
 * Settings → Connectors → Add custom connector
 * - Name: Taskspace
 * - URL: https://trytaskspace.com/api/mcp
 * - OAuth Client Secret: Your Taskspace API key (aims_...)
 *
 * No local installation required!
 */

import { createMcpHandler } from "mcp-handler"
import { z } from "zod"
import { sql } from "@/lib/db/sql"
import { db } from "@/lib/db"
import { headers } from "next/headers"
import { logger, logError } from "@/lib/logger"

// Database row types for SQL query results
interface MemberRow {
  user_id: string
  name: string
  email: string
  department: string | null
  role: string
  status: string
  job_title: string | null
}

interface EodReportRow {
  id: string
  user_id: string
  user_name?: string
  report_date: string
  notes: string | null
  summary: string | null
  tasks: Array<string | { title?: string; description?: string }> | null
  blockers: Array<string | { text?: string }> | null
  wins: Array<string | { text?: string }> | null
  tomorrow_focus: string | null
  focus_tomorrow: string | null
  mood: string | null
  needs_escalation: boolean
  escalation_note: string | null
  email?: string
}

interface RockRow {
  id: string
  title: string
  status: string
  progress: number | null
  owner_name?: string
  owner_id: string
  created_at: string
}

interface TaskRow {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  due_date: string | null
  assignee_id: string
  assignee_name?: string
  assigned_by_name?: string | null
  completed_at: string | null
  created_at: string
  rock_id: string | null
  organization_id: string
  type: string | null
}

interface WorkloadRow {
  user_id: string
  name: string
  department: string | null
  email: string
  pending_tasks: number
  overdue_tasks: number
  high_priority_tasks: number
  active_rocks: number
  blocked_rocks: number
  recent_escalations: number
}

interface EscalationEntry {
  name: string
  note: string
}

interface AuthContext {
  organizationId: string
  workspaceId: string | null
}

// Get organization + workspace from API key in Authorization header
async function getAuthContext(): Promise<AuthContext | null> {
  try {
    const headersList = await headers()
    const authHeader = headersList.get("authorization")

    // Try Bearer token first (API key)
    if (authHeader?.startsWith("Bearer ")) {
      const apiKey = authHeader.substring(7)
      if (apiKey.startsWith("aims_")) {
        const key = await db.apiKeys.findByKey(apiKey)
        if (key) {
          // Reject expired API keys (same check as withAuth middleware)
          if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
            logger.warn({ apiKeyId: key.id }, "MCP: Rejected expired API key")
            return null
          }
          await db.apiKeys.updateLastUsed(key.id)
          return {
            organizationId: key.organizationId,
            workspaceId: key.workspaceId,
          }
        }
      }
    }

    // Fall back to environment variable for demo/development
    if (process.env.MCP_DEFAULT_ORG_ID) {
      return {
        organizationId: process.env.MCP_DEFAULT_ORG_ID,
        workspaceId: process.env.MCP_DEFAULT_WORKSPACE_ID || null,
      }
    }

    return null
  } catch (error) {
    logError(logger, "MCP auth error", error)
    return null
  }
}

// Database query helpers
async function queryMembers(orgId: string, workspaceId?: string | null): Promise<MemberRow[]> {
  if (workspaceId) {
    const result = await sql`
      SELECT om.*, u.name, u.email
      FROM organization_members om
      JOIN users u ON om.user_id = u.id
      JOIN workspace_members wm ON wm.user_id = om.user_id
      WHERE om.organization_id = ${orgId}
      AND wm.workspace_id = ${workspaceId}
      AND om.status = 'active'
    `
    return result.rows as unknown as MemberRow[]
  }
  const result = await sql`
    SELECT om.*, u.name, u.email
    FROM organization_members om
    JOIN users u ON om.user_id = u.id
    WHERE om.organization_id = ${orgId}
    AND om.status = 'active'
  `
  return result.rows as unknown as MemberRow[]
}

async function queryEodReports(orgId: string, date: string, workspaceId?: string | null): Promise<EodReportRow[]> {
  if (workspaceId) {
    const result = await sql`
      SELECT er.*, u.name as user_name
      FROM eod_reports er
      JOIN users u ON er.user_id = u.id
      JOIN organization_members om ON er.user_id = om.user_id AND om.organization_id = ${orgId}
      WHERE er.workspace_id = ${workspaceId}
      AND er.report_date = ${date}
    `
    return result.rows as unknown as EodReportRow[]
  }
  const result = await sql`
    SELECT er.*, u.name as user_name
    FROM eod_reports er
    JOIN users u ON er.user_id = u.id
    JOIN organization_members om ON er.user_id = om.user_id
    WHERE om.organization_id = ${orgId}
    AND er.report_date = ${date}
  `
  return result.rows as unknown as EodReportRow[]
}

async function queryRocks(orgId: string, workspaceId?: string | null, userId?: string): Promise<RockRow[]> {
  if (workspaceId && userId) {
    const result = await sql`
      SELECT r.*, u.name as owner_name
      FROM rocks r
      JOIN users u ON r.owner_id = u.id
      WHERE r.organization_id = ${orgId}
      AND r.workspace_id = ${workspaceId}
      AND r.owner_id = ${userId}
      ORDER BY r.created_at DESC
    `
    return result.rows as unknown as RockRow[]
  }
  if (workspaceId) {
    const result = await sql`
      SELECT r.*, u.name as owner_name
      FROM rocks r
      JOIN users u ON r.owner_id = u.id
      WHERE r.organization_id = ${orgId}
      AND r.workspace_id = ${workspaceId}
      ORDER BY r.created_at DESC
    `
    return result.rows as unknown as RockRow[]
  }
  if (userId) {
    const result = await sql`
      SELECT r.*, u.name as owner_name
      FROM rocks r
      JOIN users u ON r.owner_id = u.id
      WHERE r.organization_id = ${orgId}
      AND r.owner_id = ${userId}
      ORDER BY r.created_at DESC
    `
    return result.rows as unknown as RockRow[]
  }
  const result = await sql`
    SELECT r.*, u.name as owner_name
    FROM rocks r
    JOIN users u ON r.owner_id = u.id
    WHERE r.organization_id = ${orgId}
    ORDER BY r.created_at DESC
  `
  return result.rows as unknown as RockRow[]
}

async function queryTasks(orgId: string, workspaceId?: string | null, userId?: string, status?: string): Promise<TaskRow[]> {
  // Build query with Vercel postgres template literals
  // When workspace is set, filter assigned_tasks by workspace_id
  let result
  if (workspaceId && userId && status) {
    result = await sql`
      SELECT t.*,
             assignee.name as assignee_name,
             assigner.name as assigned_by_name
      FROM assigned_tasks t
      JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users assigner ON t.assigned_by_id = assigner.id
      WHERE t.organization_id = ${orgId}
        AND t.workspace_id = ${workspaceId}
        AND t.assignee_id = ${userId}
        AND t.status = ${status}
      ORDER BY t.due_date ASC
    `
  } else if (workspaceId && userId) {
    result = await sql`
      SELECT t.*,
             assignee.name as assignee_name,
             assigner.name as assigned_by_name
      FROM assigned_tasks t
      JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users assigner ON t.assigned_by_id = assigner.id
      WHERE t.organization_id = ${orgId}
        AND t.workspace_id = ${workspaceId}
        AND t.assignee_id = ${userId}
      ORDER BY t.due_date ASC
    `
  } else if (workspaceId && status) {
    result = await sql`
      SELECT t.*,
             assignee.name as assignee_name,
             assigner.name as assigned_by_name
      FROM assigned_tasks t
      JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users assigner ON t.assigned_by_id = assigner.id
      WHERE t.organization_id = ${orgId}
        AND t.workspace_id = ${workspaceId}
        AND t.status = ${status}
      ORDER BY t.due_date ASC
    `
  } else if (workspaceId) {
    result = await sql`
      SELECT t.*,
             assignee.name as assignee_name,
             assigner.name as assigned_by_name
      FROM assigned_tasks t
      JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users assigner ON t.assigned_by_id = assigner.id
      WHERE t.organization_id = ${orgId}
        AND t.workspace_id = ${workspaceId}
      ORDER BY t.due_date ASC
    `
  } else if (userId && status) {
    result = await sql`
      SELECT t.*,
             assignee.name as assignee_name,
             assigner.name as assigned_by_name
      FROM assigned_tasks t
      JOIN organization_members om ON t.assignee_id = om.user_id
      JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users assigner ON t.assigned_by_id = assigner.id
      WHERE om.organization_id = ${orgId}
        AND t.assignee_id = ${userId}
        AND t.status = ${status}
      ORDER BY t.due_date ASC
    `
  } else if (userId) {
    result = await sql`
      SELECT t.*,
             assignee.name as assignee_name,
             assigner.name as assigned_by_name
      FROM assigned_tasks t
      JOIN organization_members om ON t.assignee_id = om.user_id
      JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users assigner ON t.assigned_by_id = assigner.id
      WHERE om.organization_id = ${orgId}
        AND t.assignee_id = ${userId}
      ORDER BY t.due_date ASC
    `
  } else if (status) {
    result = await sql`
      SELECT t.*,
             assignee.name as assignee_name,
             assigner.name as assigned_by_name
      FROM assigned_tasks t
      JOIN organization_members om ON t.assignee_id = om.user_id
      JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users assigner ON t.assigned_by_id = assigner.id
      WHERE om.organization_id = ${orgId}
        AND t.status = ${status}
      ORDER BY t.due_date ASC
    `
  } else {
    result = await sql`
      SELECT t.*,
             assignee.name as assignee_name,
             assigner.name as assigned_by_name
      FROM assigned_tasks t
      JOIN organization_members om ON t.assignee_id = om.user_id
      JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users assigner ON t.assigned_by_id = assigner.id
      WHERE om.organization_id = ${orgId}
      ORDER BY t.due_date ASC
    `
  }
  return result.rows as unknown as TaskRow[]
}

const handler = createMcpHandler(
  (server) => {
    // Tool: Get Team Members
    server.tool(
      "get_team_members",
      "Get all team members in your Taskspace organization",
      {
        department: z.string().optional().describe("Filter by department"),
      },
      async ({ department }) => {
        const auth = await getAuthContext()
        if (!auth) {
          return {
            content: [{ type: "text", text: "Authentication required. Add your Taskspace API key (aims_...) to the connector's OAuth Client Secret field." }],
          }
        }

        let members = await queryMembers(auth.organizationId, auth.workspaceId)

        if (department) {
          members = members.filter((m) =>
            m.department?.toLowerCase().includes(department.toLowerCase())
          )
        }

        const summary = members.map((m) =>
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
        const auth = await getAuthContext()
        if (!auth) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        const checkDate = date || new Date().toISOString().split("T")[0]

        const [members, reports] = await Promise.all([
          queryMembers(auth.organizationId, auth.workspaceId),
          queryEodReports(auth.organizationId, checkDate, auth.workspaceId),
        ])

        const submittedIds = new Set(reports.map((r) => r.user_id))
        const activeMembers = members.filter((m) => m.role === "member")
        const submitted = activeMembers.filter((m) => submittedIds.has(m.user_id))
        const missing = activeMembers.filter((m) => !submittedIds.has(m.user_id))

        let response = `EOD Status for ${checkDate}:\n\n`
        response += `✅ Submitted (${submitted.length}):\n`
        response += submitted.map((m) => `  - ${m.name}`).join("\n") || "  None"
        response += `\n\n❌ Missing (${missing.length}):\n`
        response += missing.map((m) => `  - ${m.name}`).join("\n") || "  Everyone submitted!"

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
        const auth = await getAuthContext()
        if (!auth) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        let rocks = await queryRocks(auth.organizationId, auth.workspaceId)

        if (status) {
          rocks = rocks.filter((r) => r.status === status)
        }

        const emoji: Record<string, string> = {
          "on-track": "🟢", "at-risk": "🟡", "blocked": "🔴", "completed": "✅",
        }

        const summary = rocks.map((r) =>
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
        const auth = await getAuthContext()
        if (!auth) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        const tasks = await queryTasks(auth.organizationId, auth.workspaceId, undefined, "pending")

        const emoji: Record<string, string> = { high: "🔴", medium: "🟡", normal: "🟢" }

        const summary = tasks.slice(0, 20).map((t) => {
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
        const auth = await getAuthContext()
        if (!auth) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        const today = new Date().toISOString().split("T")[0]

        const [members, reports, rocks, tasks] = await Promise.all([
          queryMembers(auth.organizationId, auth.workspaceId),
          queryEodReports(auth.organizationId, today, auth.workspaceId),
          queryRocks(auth.organizationId, auth.workspaceId),
          queryTasks(auth.organizationId, auth.workspaceId),
        ])

        const activeMembers = members.filter((m) => m.role === "member")
        const submittedIds = new Set(reports.map((r) => r.user_id))
        const submissionRate = activeMembers.length > 0
          ? Math.round((submittedIds.size / activeMembers.length) * 100) : 0

        const atRiskRocks = rocks.filter((r) => r.status === "at-risk" || r.status === "blocked")
        const avgProgress = rocks.length > 0
          ? Math.round(rocks.reduce((s: number, r) => s + (r.progress || 0), 0) / rocks.length) : 0

        const pendingTasks = tasks.filter((t) => t.status === "pending")
        const overdueTasks = pendingTasks.filter((t) =>
          t.due_date && new Date(t.due_date) < new Date()
        )

        return {
          content: [{
            type: "text",
            text: `📊 Taskspace Team Overview - ${today}
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
        const auth = await getAuthContext()
        if (!auth) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        const result = auth.workspaceId
          ? await sql`
            SELECT er.*, u.name as user_name
            FROM eod_reports er
            JOIN users u ON er.user_id = u.id
            WHERE er.workspace_id = ${auth.workspaceId}
            AND er.needs_escalation = true
            AND er.report_date >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY er.report_date DESC
          `
          : await sql`
            SELECT er.*, u.name as user_name
            FROM eod_reports er
            JOIN users u ON er.user_id = u.id
            JOIN organization_members om ON er.user_id = om.user_id
            WHERE om.organization_id = ${auth.organizationId}
            AND er.needs_escalation = true
            AND er.report_date >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY er.report_date DESC
          `

        if (result.rows.length === 0) {
          return { content: [{ type: "text", text: "No blockers reported in the last 7 days" }] }
        }

        const blockerRows = result.rows as unknown as EodReportRow[]
        const summary = blockerRows.map((b) => {
          const date = new Date(b.report_date).toLocaleDateString()
          return `⚠️ ${date} - ${b.user_name}: ${b.escalation_note || "No details"}`
        }).join("\n\n")

        return { content: [{ type: "text", text: `Blockers (${blockerRows.length}):\n\n${summary}` }] }
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
        const auth = await getAuthContext()
        if (!auth) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        // Find the member
        const members = await queryMembers(auth.organizationId, auth.workspaceId)
        const member = members.find((m) =>
          m.name.toLowerCase().includes(memberName.toLowerCase())
        )

        if (!member) {
          return { content: [{ type: "text", text: `No member found matching "${memberName}"` }] }
        }

        // Get comprehensive data for this member (workspace-scoped when available)
        const wsId = auth.workspaceId
        const [eodReports, tasks, rocks] = await Promise.all([
          wsId
            ? sql`
              SELECT er.*
              FROM eod_reports er
              WHERE er.user_id = ${member.user_id}
              AND er.workspace_id = ${wsId}
              AND er.report_date >= CURRENT_DATE - ${days} * INTERVAL '1 day'
              ORDER BY er.report_date DESC
            `
            : sql`
              SELECT er.*
              FROM eod_reports er
              JOIN organization_members om ON er.user_id = om.user_id AND om.organization_id = ${auth.organizationId}
              WHERE er.user_id = ${member.user_id}
              AND er.report_date >= CURRENT_DATE - ${days} * INTERVAL '1 day'
              ORDER BY er.report_date DESC
            `,
          wsId
            ? sql`
              SELECT t.*
              FROM assigned_tasks t
              WHERE t.assignee_id = ${member.user_id}
              AND t.workspace_id = ${wsId}
              ORDER BY t.created_at DESC
            `
            : sql`
              SELECT t.*
              FROM assigned_tasks t
              WHERE t.assignee_id = ${member.user_id}
              AND t.organization_id = ${auth.organizationId}
              ORDER BY t.created_at DESC
            `,
          wsId
            ? sql`
              SELECT r.*
              FROM rocks r
              WHERE r.owner_id = ${member.user_id}
              AND r.workspace_id = ${wsId}
              ORDER BY r.created_at DESC
            `
            : sql`
              SELECT r.*
              FROM rocks r
              WHERE r.owner_id = ${member.user_id}
              AND r.organization_id = ${auth.organizationId}
              ORDER BY r.created_at DESC
            `,
        ])

        const eods = eodReports.rows as unknown as EodReportRow[]
        const allTasks = tasks.rows as unknown as TaskRow[]
        const memberRocks = rocks.rows as unknown as RockRow[]

        // Calculate metrics
        const completedTasks = allTasks.filter((t) => t.status === "completed")
        const pendingTasks = allTasks.filter((t) => t.status === "pending")
        const overdueTasks = pendingTasks.filter((t) =>
          t.due_date && new Date(t.due_date) < new Date()
        )
        const completionRate = allTasks.length > 0
          ? Math.round((completedTasks.length / allTasks.length) * 100) : 0

        const eodSubmissionRate = days > 0
          ? Math.round((eods.length / Math.min(days, 30)) * 100) : 0

        const escalationCount = eods.filter((e) => e.needs_escalation).length

        // Mood/sentiment analysis from EODs
        const moods = eods.map((e) => e.mood).filter(Boolean) as string[]
        const moodBreakdown = moods.reduce<Record<string, number>>((acc, m) => {
          acc[m] = (acc[m] || 0) + 1
          return acc
        }, {})

        // Rock status
        const rocksOnTrack = memberRocks.filter((r) => r.status === "on-track").length
        const rocksAtRisk = memberRocks.filter((r) => r.status === "at-risk" || r.status === "blocked").length
        const avgRockProgress = memberRocks.length > 0
          ? Math.round(memberRocks.reduce((s: number, r) => s + (r.progress || 0), 0) / memberRocks.length) : 0

        // Recent blockers
        const recentBlockers = eods
          .filter((e) => e.needs_escalation && e.escalation_note)
          .slice(0, 3)
          .map((e) => `  - ${new Date(e.report_date).toLocaleDateString()}: ${e.escalation_note}`)

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
${memberRocks.slice(0, 5).map((r) => {
  const statusEmoji = r.status === "on-track" ? "🟢" : r.status === "at-risk" ? "🟡" : r.status === "blocked" ? "🔴" : "✅"
  return `  ${statusEmoji} ${r.title} (${r.progress || 0}%)`
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
        const auth = await getAuthContext()
        if (!auth) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        const reportDate = date || new Date().toISOString().split("T")[0]

        // Find the member
        const members = await queryMembers(auth.organizationId, auth.workspaceId)
        const member = members.find((m) =>
          m.name.toLowerCase().includes(memberName.toLowerCase())
        )

        if (!member) {
          return { content: [{ type: "text", text: `No member found matching "${memberName}"` }] }
        }

        // Get the EOD report (workspace-scoped when available)
        const reportResult = auth.workspaceId
          ? await sql`
            SELECT er.*
            FROM eod_reports er
            WHERE er.user_id = ${member.user_id}
            AND er.workspace_id = ${auth.workspaceId}
            AND er.report_date = ${reportDate}
          `
          : await sql`
            SELECT er.*
            FROM eod_reports er
            JOIN organization_members om ON er.user_id = om.user_id AND om.organization_id = ${auth.organizationId}
            WHERE er.user_id = ${member.user_id}
            AND er.report_date = ${reportDate}
          `

        if (reportResult.rows.length === 0) {
          return { content: [{ type: "text", text: `No EOD report found for ${member.name} on ${reportDate}` }] }
        }

        const report = reportResult.rows[0] as unknown as EodReportRow

        // Get tasks completed that day
        const tasksResult = auth.workspaceId
          ? await sql`
            SELECT t.*
            FROM assigned_tasks t
            WHERE t.assignee_id = ${member.user_id}
            AND t.workspace_id = ${auth.workspaceId}
            AND t.status = 'completed'
            AND DATE(t.completed_at) = ${reportDate}
          `
          : await sql`
            SELECT t.*
            FROM assigned_tasks t
            WHERE t.assignee_id = ${member.user_id}
            AND t.organization_id = ${auth.organizationId}
            AND t.status = 'completed'
            AND DATE(t.completed_at) = ${reportDate}
          `

        const completedTasks = tasksResult.rows as unknown as TaskRow[]

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
  ? completedTasks.map((t) => `  ✓ ${t.title}`).join("\n")
  : "  No tasks completed"}

${Array.isArray(eodData.tasks) && eodData.tasks.length > 0 ? `
📋 REPORTED TASKS
----------------------------------------
${eodData.tasks.map((t) => `  - ${typeof t === 'string' ? t : t.title || t.description || JSON.stringify(t)}`).join("\n")}
` : ""}

🏆 WINS
----------------------------------------
${Array.isArray(eodData.wins) && eodData.wins.length > 0
  ? eodData.wins.map((w) => `  🎉 ${typeof w === 'string' ? w : w.text || JSON.stringify(w)}`).join("\n")
  : "  No wins reported"}

🚧 BLOCKERS
----------------------------------------
${Array.isArray(eodData.blockers) && eodData.blockers.length > 0
  ? eodData.blockers.map((b) => `  ⚠️ ${typeof b === 'string' ? b : b.text || JSON.stringify(b)}`).join("\n")
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
        const auth = await getAuthContext()
        if (!auth) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        const reportDate = date || new Date().toISOString().split("T")[0]

        // Get all members and their EOD reports (workspace-scoped when available)
        const [members, reportsResult] = await Promise.all([
          queryMembers(auth.organizationId, auth.workspaceId),
          auth.workspaceId
            ? sql`
              SELECT er.*, u.name as user_name, u.email
              FROM eod_reports er
              JOIN users u ON er.user_id = u.id
              WHERE er.workspace_id = ${auth.workspaceId}
              AND er.report_date = ${reportDate}
              ORDER BY u.name
            `
            : sql`
              SELECT er.*, u.name as user_name, u.email
              FROM eod_reports er
              JOIN users u ON er.user_id = u.id
              JOIN organization_members om ON er.user_id = om.user_id
              WHERE om.organization_id = ${auth.organizationId}
              AND er.report_date = ${reportDate}
              ORDER BY u.name
            `,
        ])

        const reports = reportsResult.rows as unknown as EodReportRow[]
        const activeMembers = members.filter((m) => m.role === "member")
        const submittedIds = new Set(reports.map((r) => r.user_id))
        const missingMembers = activeMembers.filter((m) => !submittedIds.has(m.user_id))

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
${report.tasks.map((t) => `   - ${typeof t === 'string' ? t : t.title || JSON.stringify(t)}`).join("\n")}
` : ""}
${report.wins && Array.isArray(report.wins) && report.wins.length > 0 ? `🏆 Wins:
${report.wins.map((w) => `   - ${typeof w === 'string' ? w : w.text || JSON.stringify(w)}`).join("\n")}
` : ""}
${report.blockers && Array.isArray(report.blockers) && report.blockers.length > 0 ? `🚧 Blockers:
${report.blockers.map((b) => `   - ${typeof b === 'string' ? b : b.text || JSON.stringify(b)}`).join("\n")}
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
${missingMembers.map((m) => `   - ${m.name} (${m.email})`).join("\n")}
`
        }

        return { content: [{ type: "text", text: fullDigest.trim() }] }
      }
    )

    // Tool: Assign Task
    server.tool(
      "assign_task",
      "Create and assign a task to a team member in Taskspace",
      {
        assigneeName: z.string().describe("Name or partial name of the team member to assign to"),
        title: z.string().describe("Task title"),
        description: z.string().optional().describe("Task description"),
        priority: z.enum(["high", "medium", "normal"]).optional().describe("Task priority (default: normal)"),
        dueDate: z.string().describe("Due date (YYYY-MM-DD)"),
        rockTitle: z.string().optional().describe("Optional: Link to a rock by title"),
      },
      async ({ assigneeName, title, description, priority = "normal", dueDate, rockTitle }) => {
        const auth = await getAuthContext()
        if (!auth) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        // Find the assignee
        const members = await queryMembers(auth.organizationId, auth.workspaceId)
        const assignee = members.find((m) =>
          m.name.toLowerCase().includes(assigneeName.toLowerCase())
        )

        if (!assignee) {
          return { content: [{ type: "text", text: `No member found matching "${assigneeName}". Available: ${members.map((m) => m.name).join(", ")}` }] }
        }

        // Find rock if specified
        let rockId = null
        if (rockTitle) {
          const rocks = await queryRocks(auth.organizationId, auth.workspaceId)
          const rock = rocks.find((r) =>
            r.title.toLowerCase().includes(rockTitle.toLowerCase())
          )
          if (rock) {
            rockId = rock.id
          }
        }

        // Generate task ID
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Create the task (workspace-scoped when available)
        await sql`
          INSERT INTO assigned_tasks (
            id, title, description, priority, status, due_date,
            assignee_id, rock_id, organization_id, workspace_id, created_at, type
          ) VALUES (
            ${taskId},
            ${title},
            ${description || ""},
            ${priority},
            'pending',
            ${dueDate},
            ${assignee.user_id},
            ${rockId},
            ${auth.organizationId},
            ${auth.workspaceId},
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
      async ({ taskType: _taskType }) => {
        const auth = await getAuthContext()
        if (!auth) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        const members = await queryMembers(auth.organizationId, auth.workspaceId)
        const activeMembers = members.filter((m) => m.role === "member")

        // OPTIMIZED: Single query with CTEs instead of 3*N queries (one per member)
        const memberUserIds = activeMembers
          .filter((m) => m.user_id)
          .map((m) => m.user_id)
        const userIdArray = memberUserIds.length > 0 ? `{${memberUserIds.join(',')}}` : '{}'

        const wId = auth.workspaceId
        const oId = auth.organizationId

        const { rows: workloadRows } = wId
          ? await sql`
            WITH member_tasks AS (
              SELECT
                assignee_id,
                COUNT(*) as pending_count,
                COUNT(*) FILTER (WHERE due_date < CURRENT_DATE) as overdue_count,
                COUNT(*) FILTER (WHERE priority = 'high') as high_priority_count
              FROM assigned_tasks
              WHERE assignee_id = ANY(${userIdArray}::text[])
                AND workspace_id = ${wId}
                AND status = 'pending'
              GROUP BY assignee_id
            ),
            member_rocks AS (
              SELECT
                user_id,
                COUNT(*) as active_count,
                COUNT(*) FILTER (WHERE status = 'blocked') as blocked_count
              FROM rocks
              WHERE user_id = ANY(${userIdArray}::text[])
                AND workspace_id = ${wId}
                AND status IN ('on-track', 'at-risk', 'blocked')
              GROUP BY user_id
            ),
            member_escalations AS (
              SELECT
                user_id,
                COUNT(*) as escalation_count
              FROM eod_reports
              WHERE user_id = ANY(${userIdArray}::text[])
                AND workspace_id = ${wId}
                AND needs_escalation = true
                AND date >= CURRENT_DATE - INTERVAL '7 days'
              GROUP BY user_id
            )
            SELECT
              om.user_id,
              om.name,
              om.department,
              om.email,
              COALESCE(mt.pending_count, 0)::int as pending_tasks,
              COALESCE(mt.overdue_count, 0)::int as overdue_tasks,
              COALESCE(mt.high_priority_count, 0)::int as high_priority_tasks,
              COALESCE(mr.active_count, 0)::int as active_rocks,
              COALESCE(mr.blocked_count, 0)::int as blocked_rocks,
              COALESCE(me.escalation_count, 0)::int as recent_escalations
            FROM organization_members om
            JOIN workspace_members wm ON wm.user_id = om.user_id AND wm.workspace_id = ${wId}
            LEFT JOIN member_tasks mt ON mt.assignee_id = om.user_id
            LEFT JOIN member_rocks mr ON mr.user_id = om.user_id
            LEFT JOIN member_escalations me ON me.user_id = om.user_id
            WHERE om.organization_id = ${oId}
              AND om.role = 'member'
              AND om.user_id IS NOT NULL
          `
          : await sql`
            WITH member_tasks AS (
              SELECT
                assignee_id,
                COUNT(*) as pending_count,
                COUNT(*) FILTER (WHERE due_date < CURRENT_DATE) as overdue_count,
                COUNT(*) FILTER (WHERE priority = 'high') as high_priority_count
              FROM assigned_tasks
              WHERE assignee_id = ANY(${userIdArray}::text[])
                AND organization_id = ${oId}
                AND status = 'pending'
              GROUP BY assignee_id
            ),
            member_rocks AS (
              SELECT
                user_id,
                COUNT(*) as active_count,
                COUNT(*) FILTER (WHERE status = 'blocked') as blocked_count
              FROM rocks
              WHERE user_id = ANY(${userIdArray}::text[])
                AND organization_id = ${oId}
                AND status IN ('on-track', 'at-risk', 'blocked')
              GROUP BY user_id
            ),
            member_escalations AS (
              SELECT
                user_id,
                COUNT(*) as escalation_count
              FROM eod_reports
              WHERE user_id = ANY(${userIdArray}::text[])
                AND organization_id = ${oId}
                AND needs_escalation = true
                AND date >= CURRENT_DATE - INTERVAL '7 days'
              GROUP BY user_id
            )
            SELECT
              om.user_id,
              om.name,
              om.department,
              om.email,
              COALESCE(mt.pending_count, 0)::int as pending_tasks,
              COALESCE(mt.overdue_count, 0)::int as overdue_tasks,
              COALESCE(mt.high_priority_count, 0)::int as high_priority_tasks,
              COALESCE(mr.active_count, 0)::int as active_rocks,
              COALESCE(mr.blocked_count, 0)::int as blocked_rocks,
              COALESCE(me.escalation_count, 0)::int as recent_escalations
            FROM organization_members om
            LEFT JOIN member_tasks mt ON mt.assignee_id = om.user_id
            LEFT JOIN member_rocks mr ON mr.user_id = om.user_id
            LEFT JOIN member_escalations me ON me.user_id = om.user_id
            WHERE om.organization_id = ${oId}
              AND om.role = 'member'
              AND om.user_id IS NOT NULL
          `

        const typedWorkloadRows = workloadRows as unknown as WorkloadRow[]
        const workloadData = typedWorkloadRows.map((row) => {
          const pendingTasks = row.pending_tasks
          const overdueTasks = row.overdue_tasks
          const highPriorityTasks = row.high_priority_tasks
          const blockedRocks = row.blocked_rocks
          const escalations = row.recent_escalations

          const workloadScore =
            pendingTasks * 1 +
            overdueTasks * 3 +
            highPriorityTasks * 2 +
            blockedRocks * 5 +
            escalations * 2

          return {
            name: row.name,
            department: row.department,
            email: row.email,
            pendingTasks,
            overdueTasks,
            highPriorityTasks,
            activeRocks: row.active_rocks,
            blockedRocks,
            recentEscalations: escalations,
            workloadScore,
            capacity: workloadScore < 5 ? "HIGH" as const : workloadScore < 10 ? "MEDIUM" as const : "LOW" as const,
          }
        })

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
        const auth = await getAuthContext()
        if (!auth) {
          return { content: [{ type: "text", text: "Authentication required" }] }
        }

        const reportDate = date || new Date().toISOString().split("T")[0]

        // Get all data (workspace-scoped when available)
        const [members, reportsResult, tasksResult, rocksResult] = await Promise.all([
          queryMembers(auth.organizationId, auth.workspaceId),
          auth.workspaceId
            ? sql`
              SELECT er.*, u.name as user_name
              FROM eod_reports er
              JOIN users u ON er.user_id = u.id
              WHERE er.workspace_id = ${auth.workspaceId}
              AND er.report_date = ${reportDate}
            `
            : sql`
              SELECT er.*, u.name as user_name
              FROM eod_reports er
              JOIN users u ON er.user_id = u.id
              JOIN organization_members om ON er.user_id = om.user_id
              WHERE om.organization_id = ${auth.organizationId}
              AND er.report_date = ${reportDate}
            `,
          auth.workspaceId
            ? sql`
              SELECT t.*, u.name as assignee_name
              FROM assigned_tasks t
              JOIN users u ON t.assignee_id = u.id
              WHERE t.workspace_id = ${auth.workspaceId}
              AND t.status = 'completed'
              AND DATE(t.completed_at) = ${reportDate}
            `
            : sql`
              SELECT t.*, u.name as assignee_name
              FROM assigned_tasks t
              JOIN users u ON t.assignee_id = u.id
              JOIN organization_members om ON t.assignee_id = om.user_id
              WHERE om.organization_id = ${auth.organizationId}
              AND t.status = 'completed'
              AND DATE(t.completed_at) = ${reportDate}
            `,
          queryRocks(auth.organizationId, auth.workspaceId),
        ])

        const reports = reportsResult.rows as unknown as EodReportRow[]
        const completedTasks = tasksResult.rows as unknown as TaskRow[]
        const rocks = rocksResult

        const activeMembers = members.filter((m) => m.role === "member")
        const submissionRate = Math.round((reports.length / activeMembers.length) * 100)

        // Aggregate data
        const allWins: string[] = []
        const allBlockers: string[] = []
        const escalations: EscalationEntry[] = []
        const moodCounts: Record<string, number> = {}

        for (const report of reports) {
          if (report.wins && Array.isArray(report.wins)) {
            report.wins.forEach((w) => {
              const winText = typeof w === 'string' ? w : w.text || ""
              if (winText) allWins.push(`${report.user_name}: ${winText}`)
            })
          }
          if (report.blockers && Array.isArray(report.blockers)) {
            report.blockers.forEach((b) => {
              const blockerText = typeof b === 'string' ? b : b.text || ""
              if (blockerText) allBlockers.push(`${report.user_name}: ${blockerText}`)
            })
          }
          if (report.needs_escalation) {
            escalations.push({
              name: report.user_name || "Unknown",
              note: report.escalation_note || "No details",
            })
          }
          const mood = report.mood || "neutral"
          moodCounts[mood] = (moodCounts[mood] || 0) + 1
        }

        // Rock status summary
        const rocksOnTrack = rocks.filter((r) => r.status === "on-track").length
        const rocksAtRisk = rocks.filter((r) => r.status === "at-risk").length
        const rocksBlocked = rocks.filter((r) => r.status === "blocked").length
        const avgRockProgress = rocks.length > 0
          ? Math.round(rocks.reduce((s: number, r) => s + (r.progress || 0), 0) / rocks.length) : 0

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
${completedTasks.slice(0, 5).map((t) => `  - ${t.title} (${t.assignee_name})`).join("\n")}
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
    serverInfo: {
      name: "align-tracker",
      version: "2.0.0",
    },
  },
  {
    basePath: "/api/mcp",
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV === "development",
  }
)

export { handler as GET, handler as POST }
