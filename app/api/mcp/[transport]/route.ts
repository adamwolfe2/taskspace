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
  },
  {
    name: "aims-eod-tracker",
    version: "1.0.0",
  },
  {
    basePath: "/api/mcp",
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV === "development",
  }
)

export { handler as GET, handler as POST }
