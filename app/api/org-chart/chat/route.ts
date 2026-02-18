import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { findRelevantEmployees } from "@/lib/org-chart/utils"
import type { OrgChartEmployee } from "@/lib/org-chart/types"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { orgChartChatSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { aiRateLimit } from "@/lib/api/rate-limit"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import type { ApiResponse } from "@/lib/types"

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const MODEL = "claude-sonnet-4-20250514"

const SYSTEM_PROMPT = `You are a helpful assistant for an organization chart application. Your job is to help employees find the right person to contact for various needs.

You have access to information about employees including their names, departments, job titles, and responsibilities.

When answering:
1. Be concise and helpful
2. If you mention an employee by name, format it as **Employee Name** so the UI can highlight it
3. Focus on providing actionable information
4. If you're not sure who to recommend, say so honestly
5. Do NOT use markdown formatting other than bold for names
6. Keep responses short - 2-3 sentences maximum

Be professional and friendly when representing the organization.`

async function callClaudeChat(context: string, userMessage: string): Promise<{
  text: string
  usage: { inputTokens: number; outputTokens: number }
  model: string
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured")
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0.7,
      system: SYSTEM_PROMPT + "\n\nHere is the organization context:\n" + context,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error({ status: response.status, error: errorText }, "Claude API error")
    throw new Error(`Claude API error: ${response.status}`)
  }

  const data = await response.json()

  if (!data.content || data.content.length === 0) {
    throw new Error("Empty response from Claude")
  }

  return {
    text: data.content[0].text,
    usage: {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    },
    model: data.model || MODEL,
  }
}

export const POST = withAuth(async (request, auth) => {
  try {
    // Rate limit: 20 org chart chats per user per hour
    const rateCheck = aiRateLimit(auth.user.id, 'org-chart-chat')
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
    }

    // Check AI credits before processing
    const creditCheck = await checkCreditsOrRespond({
      organizationId: auth.organization.id,
      userId: auth.user.id,
    })
    if (creditCheck instanceof NextResponse) {
      return creditCheck as NextResponse<ApiResponse<null>>
    }

    // SECURITY: Do not accept employee data in request body
    // Employee data should be fetched server-side based on authenticated user's organization
    const { message, workspaceId } = await validateBody(request, orgChartChatSchema)

    // Fetch employees from the database based on authenticated user's organization
    // Primary source: ma_employees database table with workspace filtering
    const dbEmployees = await db.maEmployees.findByWorkspace(workspaceId)

    let employees: OrgChartEmployee[] = []

    if (dbEmployees.length > 0) {
      // Transform to OrgChartEmployee format
      employees = dbEmployees.map(emp => ({
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
    } else {
      // Fallback: Try organization_members table with workspace filter
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
          employees = rows.map(row => {
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
              rocks: "",
            }
          })
        }
      } catch (error) {
        logError(logger, "Error fetching organization members", error)
        // Continue with empty array if fallback fails
      }
    }

    // Check if Claude is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      // Return a helpful fallback response
      const relevantEmployees = findRelevantEmployees(employees, message)

      if (relevantEmployees.length > 0) {
        const names = relevantEmployees.map(e => `**${e.fullName}**`).join(", ")
        return NextResponse.json({
          success: true,
          response: `Based on your query, you might want to contact: ${names}. They may be able to help with this topic.`,
          mentionedEmployees: relevantEmployees.map(e => e.fullName),
        })
      }

      return NextResponse.json({
        success: true,
        response: "I'm not sure who would be best to help with that. Try browsing the org chart to find someone in a relevant department.",
        mentionedEmployees: [],
      })
    }

    // Find relevant employees using RAG search
    const relevantEmployees = findRelevantEmployees(employees, message)

    // Build context from relevant employees
    let context = "Organization Members:\n\n"
    if (relevantEmployees.length > 0) {
      relevantEmployees.forEach(emp => {
        context += `**${emp.fullName}**\n`
        context += `- Title: ${emp.jobTitle}\n`
        context += `- Department: ${emp.department}\n`
        if (emp.notes) context += `- Responsibilities: ${emp.notes}\n`
        if (emp.extraInfo) context += `- Additional Info: ${emp.extraInfo}\n`
        context += "\n"
      })
    } else if (employees.length > 0) {
      // Include a summary of all employees if no specific match
      employees.slice(0, 10).forEach(emp => {
        context += `- **${emp.fullName}**: ${emp.jobTitle} (${emp.department})\n`
      })
    }

    const { text: responseText, usage, model } = await callClaudeChat(context, message)

    // Record AI usage
    await recordUsage({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "org-chart-chat",
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    })

    // Extract mentioned employee names from the response
    const mentionedEmployees: string[] = []
    const boldNameRegex = /\*\*([^*]+)\*\*/g
    let match
    while ((match = boldNameRegex.exec(responseText)) !== null) {
      const name = match[1]
      // Verify this is actually an employee name
      if (employees.some(e => e.fullName.toLowerCase() === name.toLowerCase())) {
        mentionedEmployees.push(name)
      }
    }

    return NextResponse.json({
      success: true,
      response: responseText,
      mentionedEmployees,
    })
  } catch (error) {
    logError(logger, "Chat error", error)
    return NextResponse.json(
      { success: false, error: "Failed to process chat message" },
      { status: 500 }
    )
  }
})
