/**
 * Claude API Client
 * Handles all interactions with the Anthropic Claude API
 */

import { PROMPTS } from "./prompts"
import type {
  EODReport,
  TeamMember,
  Rock,
  AssignedTask,
  AITaskGenerationResponse,
  EODParseResponse,
  DailyDigest,
  EODInsight,
  AIQueryResponse,
} from "../types"

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const MODEL = "claude-sonnet-4-20250514"
const MAX_TOKENS = 4096

interface ClaudeMessage {
  role: "user" | "assistant"
  content: string
}

interface ClaudeResponse {
  id: string
  type: string
  role: string
  content: Array<{
    type: string
    text: string
  }>
  model: string
  stop_reason: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

/**
 * Response from callClaudeWithUsage
 */
export interface ClaudeCallResult {
  text: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
  model: string
}

/**
 * Make a request to the Claude API (with usage tracking)
 */
async function callClaudeWithUsage(
  systemPrompt: string,
  userMessage: string,
  options?: {
    maxTokens?: number
    temperature?: number
  }
): Promise<ClaudeCallResult> {
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
      max_tokens: options?.maxTokens || MAX_TOKENS,
      temperature: options?.temperature ?? 0.7,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("Claude API error:", error)
    throw new Error(`Claude API error: ${response.status} - ${error}`)
  }

  const data: ClaudeResponse = await response.json()

  if (!data.content || data.content.length === 0) {
    throw new Error("Empty response from Claude")
  }

  return {
    text: data.content[0].text,
    usage: {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    },
    model: data.model,
  }
}

/**
 * Make a request to the Claude API (legacy - returns text only)
 */
async function callClaude(
  systemPrompt: string,
  userMessage: string,
  options?: {
    maxTokens?: number
    temperature?: number
  }
): Promise<string> {
  const result = await callClaudeWithUsage(systemPrompt, userMessage, options)
  return result.text
}

/**
 * Parse JSON from Claude's response
 * Handles cases where Claude wraps JSON in markdown code blocks
 */
function parseClaudeJSON<T>(text: string): T {
  // Remove markdown code blocks if present
  let cleaned = text.trim()

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3)
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3)
  }

  cleaned = cleaned.trim()

  try {
    return JSON.parse(cleaned) as T
  } catch (error) {
    console.error("Failed to parse Claude response:", text)
    throw new Error("Failed to parse AI response as JSON")
  }
}

/**
 * Parse a brain dump into task assignments
 */
export async function parseBrainDump(
  brainDump: string,
  teamMembers: TeamMember[],
  currentTasks?: AssignedTask[],
  rocks?: Rock[]
): Promise<AITaskGenerationResponse> {
  const context = buildContext({ teamMembers, currentTasks, rocks })

  const userMessage = `
BRAIN DUMP FROM ADAM:
${brainDump}

CURRENT CONTEXT:
${context}

Parse this brain dump into specific task assignments. Return JSON only.`

  const response = await callClaude(PROMPTS.brainDumpParser, userMessage, {
    temperature: 0.5, // Lower temperature for more consistent outputs
  })

  return parseClaudeJSON<AITaskGenerationResponse>(response)
}

/**
 * Parse an EOD report into structured insights
 */
export async function parseEODReport(
  eodReport: EODReport,
  memberName: string,
  memberDepartment: string,
  rocks?: Rock[]
): Promise<EODParseResponse> {
  const tasksText = eodReport.tasks
    ?.map(t => `- ${t.text}${t.rockTitle ? ` (Rock: ${t.rockTitle})` : ""}`)
    .join("\n") || "No tasks listed"

  const prioritiesText = eodReport.tomorrowPriorities
    ?.map(p => `- ${p.text}`)
    .join("\n") || "No priorities listed"

  const userMessage = `
EOD REPORT FROM: ${memberName} (${memberDepartment})
DATE: ${eodReport.date}

TODAY'S TASKS:
${tasksText}

CHALLENGES:
${eodReport.challenges || "None mentioned"}

TOMORROW'S PRIORITIES:
${prioritiesText}

ESCALATION NEEDED: ${eodReport.needsEscalation ? "YES" : "No"}
${eodReport.escalationNote ? `ESCALATION NOTE: ${eodReport.escalationNote}` : ""}

${rocks ? `THEIR ROCKS:\n${rocks.map(r => `- ${r.title} (${r.progress}% complete)`).join("\n")}` : ""}

Analyze this EOD report. Return JSON only.`

  const response = await callClaude(PROMPTS.eodParser, userMessage, {
    temperature: 0.3, // Very consistent for parsing
  })

  return parseClaudeJSON<EODParseResponse>(response)
}

/**
 * Generate a daily digest from all EOD reports
 */
export async function generateDailyDigest(
  eodReports: EODReport[],
  insights: EODInsight[],
  teamMembers: TeamMember[],
  rocks: Rock[],
  previousDigest?: DailyDigest
): Promise<Omit<DailyDigest, "id" | "organizationId" | "digestDate" | "generatedAt">> {
  const memberMap = new Map(teamMembers.map(m => [m.id, m]))

  const reportsWithNames = eodReports.map(report => {
    const member = memberMap.get(report.userId)
    return {
      ...report,
      memberName: member?.name || "Unknown",
      memberDepartment: member?.department || "Unknown",
    }
  })

  const insightsWithNames = insights.map(insight => {
    const report = eodReports.find(r => r.id === insight.eodReportId)
    const member = report ? memberMap.get(report.userId) : undefined
    return {
      ...insight,
      memberName: member?.name || "Unknown",
    }
  })

  const userMessage = `
TODAY'S EOD REPORTS (${reportsWithNames.length} total):
${reportsWithNames.map(r => `
--- ${r.memberName} (${r.memberDepartment}) ---
Tasks: ${r.tasks?.map(t => t.text).join("; ") || "None"}
Challenges: ${r.challenges || "None"}
Escalation: ${r.needsEscalation ? `YES - ${r.escalationNote}` : "No"}
`).join("\n")}

AI INSIGHTS FROM REPORTS:
${insightsWithNames.map(i => `
${i.memberName}: Sentiment ${i.sentiment} (${i.sentimentScore}/100)
Blockers: ${i.blockers?.map(b => b.text).join("; ") || "None"}
Summary: ${i.aiSummary}
`).join("\n")}

TEAM ROCKS (Goals):
${rocks.map(r => {
  const member = r.userId ? memberMap.get(r.userId) : null
  return `- ${member?.name || r.ownerEmail || "Unknown"}: ${r.title} (${r.progress}%)`
}).join("\n")}

${previousDigest ? `
YESTERDAY'S DIGEST:
- Team Sentiment: ${previousDigest.teamSentiment}
- Blockers mentioned: ${previousDigest.blockers?.length || 0}
- Key concerns: ${previousDigest.concerns?.map(c => c.text).join("; ") || "None"}
` : ""}

Generate the daily digest. Focus on what actually matters. Challenge my thinking. Return JSON only.`

  const response = await callClaude(PROMPTS.digestGenerator, userMessage, {
    maxTokens: 6000,
    temperature: 0.6,
  })

  const parsed = parseClaudeJSON<Omit<DailyDigest, "id" | "organizationId" | "digestDate" | "generatedAt">>(response)
  return {
    ...parsed,
    reportsAnalyzed: eodReports.length,
  }
}

/**
 * Answer a natural language query about team data
 */
export async function answerQuery(
  query: string,
  context: {
    eodReports?: EODReport[]
    tasks?: AssignedTask[]
    rocks?: Rock[]
    teamMembers?: TeamMember[]
  }
): Promise<AIQueryResponse & { usage?: { inputTokens: number; outputTokens: number; model: string } }> {
  const contextStr = buildContext(context)

  const userMessage = `
ADAM'S QUESTION:
${query}

AVAILABLE DATA:
${contextStr}

Answer the question based on the data provided. Return JSON only.`

  const result = await callClaudeWithUsage(PROMPTS.queryHandler, userMessage, {
    temperature: 0.5,
  })

  const parsed = parseClaudeJSON<AIQueryResponse>(result.text)
  return {
    ...parsed,
    usage: {
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      model: result.model,
    },
  }
}

/**
 * Build context string from available data
 */
function buildContext(context: {
  teamMembers?: TeamMember[]
  currentTasks?: AssignedTask[]
  rocks?: Rock[]
  eodReports?: EODReport[]
}): string {
  const parts: string[] = []

  if (context.teamMembers && context.teamMembers.length > 0) {
    parts.push(`TEAM MEMBERS (${context.teamMembers.length}):
${context.teamMembers.map(m => `- ${m.name} (${m.department}) - ${m.role}`).join("\n")}`)
  }

  if (context.currentTasks && context.currentTasks.length > 0) {
    const pending = context.currentTasks.filter(t => t.status !== "completed")
    parts.push(`PENDING TASKS (${pending.length}):
${pending.slice(0, 20).map(t => `- ${t.assigneeName}: ${t.title} [${t.priority}]`).join("\n")}
${pending.length > 20 ? `... and ${pending.length - 20} more` : ""}`)
  }

  if (context.rocks && context.rocks.length > 0) {
    parts.push(`ROCKS (${context.rocks.length}):
${context.rocks.map(r => `- ${r.title}: ${r.progress}% (${r.status})`).join("\n")}`)
  }

  if (context.eodReports && context.eodReports.length > 0) {
    parts.push(`RECENT EOD REPORTS (${context.eodReports.length}):
${context.eodReports.slice(0, 10).map(r => `- ${r.date}: ${r.tasks?.length || 0} tasks reported`).join("\n")}`)
  }

  return parts.join("\n\n") || "No data available"
}

/**
 * Parse response type for EOD text dump
 */
export interface ParsedEODReport {
  tasks: Array<{
    text: string
    rockId: string | null
    rockTitle: string | null
  }>
  challenges: string
  tomorrowPriorities: Array<{
    text: string
    rockId: string | null
    rockTitle: string | null
  }>
  needsEscalation: boolean
  escalationNote: string | null
  metricValue: number | null
  summary: string
  warnings: string[]
}

/**
 * Parse an EOD text dump into a structured report
 * Used by admins to quickly generate EOD reports from unstructured text
 */
export async function parseEODTextDump(
  textDump: string,
  rocks: Rock[],
  currentQuarter: string
): Promise<ParsedEODReport> {
  // Filter to current quarter rocks for better matching
  const quarterRocks = rocks.filter(r => r.quarter === currentQuarter)

  const rocksContext = quarterRocks.length > 0
    ? quarterRocks.map(r => `- ID: ${r.id} | Title: "${r.title}" | Description: ${r.description || "N/A"}`).join("\n")
    : "No rocks for this quarter"

  const userMessage = `
MY ROCKS FOR ${currentQuarter}:
${rocksContext}

MY DAILY TEXT DUMP:
${textDump}

Parse this into a structured EOD report. Match tasks to my rocks where possible. Return JSON only.`

  const response = await callClaude(PROMPTS.eodTextParser, userMessage, {
    temperature: 0.3, // Low temperature for consistent parsing
  })

  const parsed = parseClaudeJSON<ParsedEODReport>(response)

  // Validate and clean up the response
  return {
    tasks: parsed.tasks || [],
    challenges: parsed.challenges || "No challenges mentioned",
    tomorrowPriorities: parsed.tomorrowPriorities || [],
    needsEscalation: parsed.needsEscalation || false,
    escalationNote: parsed.escalationNote || null,
    metricValue: typeof parsed.metricValue === "number" ? parsed.metricValue : null,
    summary: parsed.summary || "Daily tasks completed",
    warnings: parsed.warnings || [],
  }
}

/**
 * Check if Claude API is configured
 */
export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}
