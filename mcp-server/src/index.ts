#!/usr/bin/env node
/**
 * AIMS EOD Tracker MCP Server
 *
 * This MCP server enables Claude to interact with the AIMS platform:
 * - Query team members and their status
 * - Check who has/hasn't submitted EOD reports
 * - Assign tasks to team members
 * - View rocks and progress
 * - Get AI insights and digests
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

// Configuration
const AIMS_API_URL = process.env.AIMS_API_URL || "http://localhost:3000"
const AIMS_API_KEY = process.env.AIMS_API_KEY || ""

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

async function callAimsApi<T>(
  endpoint: string,
  method: string = "GET",
  body?: object
): Promise<ApiResponse<T>> {
  const url = `${AIMS_API_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AIMS_API_KEY}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    return await response.json()
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "API call failed",
    }
  }
}

// Create MCP server
const server = new Server(
  {
    name: "aims-eod-tracker",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
)

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_team_members",
      description: "Get a list of all team members in the organization",
      inputSchema: {
        type: "object",
        properties: {
          department: {
            type: "string",
            description: "Filter by department (optional)",
          },
        },
      },
    },
    {
      name: "check_eod_status",
      description: "Check who has and hasn't submitted their EOD report for today",
      inputSchema: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date to check (YYYY-MM-DD format, defaults to today)",
          },
        },
      },
    },
    {
      name: "assign_task",
      description: "Assign a task to a team member",
      inputSchema: {
        type: "object",
        properties: {
          assigneeId: {
            type: "string",
            description: "ID of the team member to assign the task to",
          },
          title: {
            type: "string",
            description: "Title of the task",
          },
          description: {
            type: "string",
            description: "Detailed description of the task",
          },
          priority: {
            type: "string",
            enum: ["high", "medium", "normal"],
            description: "Task priority",
          },
          dueDate: {
            type: "string",
            description: "Due date (YYYY-MM-DD format)",
          },
          rockId: {
            type: "string",
            description: "ID of the rock this task is related to (optional)",
          },
        },
        required: ["assigneeId", "title", "priority", "dueDate"],
      },
    },
    {
      name: "get_rocks",
      description: "Get all rocks (quarterly goals) and their progress",
      inputSchema: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "Filter by team member ID (optional)",
          },
          status: {
            type: "string",
            enum: ["on-track", "at-risk", "blocked", "completed"],
            description: "Filter by status (optional)",
          },
        },
      },
    },
    {
      name: "get_pending_tasks",
      description: "Get pending tasks for a team member or the whole team",
      inputSchema: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "Filter by team member ID (optional)",
          },
        },
      },
    },
    {
      name: "get_eod_reports",
      description: "Get EOD reports for a date range",
      inputSchema: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date (YYYY-MM-DD)",
          },
          endDate: {
            type: "string",
            description: "End date (YYYY-MM-DD)",
          },
          userId: {
            type: "string",
            description: "Filter by team member ID (optional)",
          },
        },
      },
    },
    {
      name: "get_daily_digest",
      description: "Get the AI-generated daily digest summary",
      inputSchema: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date to get digest for (YYYY-MM-DD, defaults to today)",
          },
        },
      },
    },
    {
      name: "get_blockers",
      description: "Get all current blockers reported by team members",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get_escalations",
      description: "Get all active escalations that need attention",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "send_eod_reminder",
      description: "Send EOD reminder to team members who haven't submitted",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ],
}))

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case "get_team_members": {
        const result = await callAimsApi<any[]>("/api/members")
        if (!result.success) {
          return { content: [{ type: "text", text: `Error: ${result.error}` }] }
        }

        let members = result.data || []
        if (args?.department) {
          members = members.filter((m: any) =>
            m.department?.toLowerCase() === (args.department as string).toLowerCase()
          )
        }

        const summary = members.map((m: any) =>
          `- ${m.name} (${m.department}) - ${m.role}`
        ).join("\n")

        return {
          content: [{
            type: "text",
            text: `Team Members (${members.length}):\n${summary}`,
          }],
        }
      }

      case "check_eod_status": {
        const date = (args?.date as string) || new Date().toISOString().split("T")[0]

        const [membersResult, reportsResult] = await Promise.all([
          callAimsApi<any[]>("/api/members"),
          callAimsApi<any[]>(`/api/eod-reports?date=${date}`),
        ])

        if (!membersResult.success || !reportsResult.success) {
          return { content: [{ type: "text", text: `Error fetching data` }] }
        }

        const members = membersResult.data || []
        const reports = reportsResult.data || []
        const submittedIds = new Set(reports.map((r: any) => r.userId))

        const activeMembers = members.filter((m: any) =>
          m.status === "active" && m.role === "member"
        )

        const submitted = activeMembers.filter((m: any) => submittedIds.has(m.id))
        const missing = activeMembers.filter((m: any) => !submittedIds.has(m.id))

        let response = `EOD Status for ${date}:\n\n`
        response += `✅ Submitted (${submitted.length}):\n`
        response += submitted.map((m: any) => `  - ${m.name}`).join("\n") || "  None"
        response += `\n\n❌ Missing (${missing.length}):\n`
        response += missing.map((m: any) => `  - ${m.name} (${m.email})`).join("\n") || "  None - everyone submitted!"

        return { content: [{ type: "text", text: response }] }
      }

      case "assign_task": {
        const result = await callAimsApi<any>("/api/tasks", "POST", {
          title: args?.title,
          description: args?.description || "",
          assigneeId: args?.assigneeId,
          priority: args?.priority || "normal",
          dueDate: args?.dueDate,
          rockId: args?.rockId || null,
        })

        if (!result.success) {
          return { content: [{ type: "text", text: `Error: ${result.error}` }] }
        }

        return {
          content: [{
            type: "text",
            text: `✅ Task assigned successfully!\n\nTitle: ${args?.title}\nAssignee: ${result.data?.assigneeName}\nPriority: ${args?.priority}\nDue: ${args?.dueDate}`,
          }],
        }
      }

      case "get_rocks": {
        const params = new URLSearchParams()
        if (args?.userId) params.set("userId", args.userId as string)

        const result = await callAimsApi<any[]>(`/api/rocks?${params}`)
        if (!result.success) {
          return { content: [{ type: "text", text: `Error: ${result.error}` }] }
        }

        let rocks = result.data || []
        if (args?.status) {
          rocks = rocks.filter((r: any) => r.status === args.status)
        }

        const summary = rocks.map((r: any) => {
          const statusEmojiMap: Record<string, string> = {
            "on-track": "🟢",
            "at-risk": "🟡",
            "blocked": "🔴",
            "completed": "✅",
          }
          const statusEmoji = statusEmojiMap[r.status] || "⚪"
          return `${statusEmoji} ${r.title} (${r.progress}%) - ${r.quarter}`
        }).join("\n")

        return {
          content: [{
            type: "text",
            text: `Rocks (${rocks.length}):\n${summary || "No rocks found"}`,
          }],
        }
      }

      case "get_pending_tasks": {
        const params = new URLSearchParams()
        if (args?.userId) params.set("userId", args.userId as string)
        params.set("status", "pending")

        const result = await callAimsApi<any[]>(`/api/tasks?${params}`)
        if (!result.success) {
          return { content: [{ type: "text", text: `Error: ${result.error}` }] }
        }

        const tasks = result.data || []
        const summary = tasks.map((t: any) => {
          const priorityEmojiMap: Record<string, string> = { high: "🔴", medium: "🟡", normal: "🟢" }
          const priorityEmoji = priorityEmojiMap[t.priority] || "⚪"
          return `${priorityEmoji} ${t.title} → ${t.assigneeName} (due: ${t.dueDate})`
        }).join("\n")

        return {
          content: [{
            type: "text",
            text: `Pending Tasks (${tasks.length}):\n${summary || "No pending tasks"}`,
          }],
        }
      }

      case "get_eod_reports": {
        const params = new URLSearchParams()
        if (args?.startDate) params.set("startDate", args.startDate as string)
        if (args?.endDate) params.set("endDate", args.endDate as string)
        if (args?.userId) params.set("userId", args.userId as string)

        const result = await callAimsApi<any[]>(`/api/eod-reports?${params}`)
        if (!result.success) {
          return { content: [{ type: "text", text: `Error: ${result.error}` }] }
        }

        const reports = result.data || []
        const summary = reports.slice(0, 10).map((r: any) => {
          const escalation = r.needsEscalation ? "⚠️ ESCALATION" : ""
          return `📋 ${r.date} - Tasks: ${r.tasks?.length || 0} ${escalation}`
        }).join("\n")

        return {
          content: [{
            type: "text",
            text: `EOD Reports (${reports.length}):\n${summary || "No reports found"}`,
          }],
        }
      }

      case "get_daily_digest": {
        const date = (args?.date as string) || new Date().toISOString().split("T")[0]
        const result = await callAimsApi<any>(`/api/ai/digest?date=${date}`)

        if (!result.success) {
          return { content: [{ type: "text", text: `Error: ${result.error}` }] }
        }

        const digest = result.data
        if (!digest) {
          return { content: [{ type: "text", text: `No digest available for ${date}` }] }
        }

        let response = `📊 Daily Digest for ${digest.digestDate}\n\n`
        response += `Reports Analyzed: ${digest.reportsAnalyzed}\n`
        response += `Team Sentiment: ${digest.teamSentiment}\n\n`
        response += `Summary: ${digest.summary}\n\n`

        if (digest.wins?.length) {
          response += `✅ Wins:\n${digest.wins.map((w: any) => `  - ${w.memberName}: ${w.text}`).join("\n")}\n\n`
        }

        if (digest.blockers?.length) {
          response += `🚧 Blockers:\n${digest.blockers.map((b: any) => `  - ${b.memberName}: ${b.text} [${b.severity}]`).join("\n")}\n\n`
        }

        return { content: [{ type: "text", text: response }] }
      }

      case "get_blockers": {
        const result = await callAimsApi<any[]>("/api/ai/parse-eod?days=7")
        if (!result.success) {
          return { content: [{ type: "text", text: `Error: ${result.error}` }] }
        }

        const insights = result.data || []
        const blockers = insights
          .filter((i: any) => i.blockers?.length > 0)
          .flatMap((i: any) => i.blockers.map((b: any) => ({ ...b, insightId: i.id })))

        if (blockers.length === 0) {
          return { content: [{ type: "text", text: "No blockers reported in the last 7 days" }] }
        }

        const summary = blockers.map((b: any) => {
          const severityEmojiMap: Record<string, string> = { high: "🔴", medium: "🟡", low: "🟢" }
          const severityEmoji = severityEmojiMap[b.severity] || "⚪"
          return `${severityEmoji} ${b.text}`
        }).join("\n")

        return {
          content: [{
            type: "text",
            text: `Current Blockers (${blockers.length}):\n${summary}`,
          }],
        }
      }

      case "get_escalations": {
        const result = await callAimsApi<any[]>("/api/eod-reports")
        if (!result.success) {
          return { content: [{ type: "text", text: `Error: ${result.error}` }] }
        }

        const reports = result.data || []
        const escalations = reports.filter((r: any) => r.needsEscalation)

        if (escalations.length === 0) {
          return { content: [{ type: "text", text: "No active escalations" }] }
        }

        const summary = escalations.slice(0, 10).map((r: any) =>
          `⚠️ ${r.date}: ${r.escalationNote || "No details provided"}`
        ).join("\n\n")

        return {
          content: [{
            type: "text",
            text: `Active Escalations (${escalations.length}):\n\n${summary}`,
          }],
        }
      }

      case "send_eod_reminder": {
        const result = await callAimsApi<any>("/api/cron/eod-reminder")
        if (!result.success) {
          return { content: [{ type: "text", text: `Error: ${result.error}` }] }
        }

        return {
          content: [{
            type: "text",
            text: `${result.message}`,
          }],
        }
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        }
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }],
      isError: true,
    }
  }
})

// Define resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "aims://team/overview",
      name: "Team Overview",
      description: "Current team status, EOD submissions, and key metrics",
      mimeType: "text/plain",
    },
  ],
}))

// Handle resource reads
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params

  if (uri === "aims://team/overview") {
    const today = new Date().toISOString().split("T")[0]

    const [membersResult, reportsResult, rocksResult] = await Promise.all([
      callAimsApi<any[]>("/api/members"),
      callAimsApi<any[]>(`/api/eod-reports?date=${today}`),
      callAimsApi<any[]>("/api/rocks"),
    ])

    const members = membersResult.data || []
    const reports = reportsResult.data || []
    const rocks = rocksResult.data || []

    const activeMembers = members.filter((m: any) => m.status === "active" && m.role === "member")
    const submittedIds = new Set(reports.map((r: any) => r.userId))
    const submissionRate = activeMembers.length > 0
      ? Math.round((submittedIds.size / activeMembers.length) * 100)
      : 0

    const atRiskRocks = rocks.filter((r: any) => r.status === "at-risk" || r.status === "blocked")
    const avgProgress = rocks.length > 0
      ? Math.round(rocks.reduce((sum: number, r: any) => sum + r.progress, 0) / rocks.length)
      : 0

    const overview = `
AIMS Team Overview - ${today}
==============================

📊 EOD Submissions: ${submissionRate}% (${submittedIds.size}/${activeMembers.length})
🎯 Rocks: ${rocks.length} total, ${atRiskRocks.length} at risk
📈 Average Rock Progress: ${avgProgress}%

Team Members (${members.length}):
${members.map((m: any) => `  - ${m.name} (${m.department})`).join("\n")}
    `.trim()

    return {
      contents: [{
        uri,
        mimeType: "text/plain",
        text: overview,
      }],
    }
  }

  throw new Error(`Unknown resource: ${uri}`)
})

// Start the server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("AIMS MCP Server running on stdio")
}

main().catch(console.error)
