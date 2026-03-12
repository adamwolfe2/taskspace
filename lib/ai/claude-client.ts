/**
 * Claude API Client
 * Handles all interactions with the Anthropic Claude API
 */

import {
  PROMPTS,
  WEEKLY_BRIEF_PROMPT,
  SMART_ROCKS_PROMPT,
  MEETING_INTELLIGENCE_PROMPT,
  ONE_ON_ONE_PREP_PROMPT,
  ROCK_RETROSPECTIVE_PROMPT,
  EOS_HEALTH_REPORT_PROMPT,
  COMPANY_DIGEST_PROMPT,
} from "./prompts"
import { logger } from "@/lib/logger"
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
  WeeklyBrief,
  SmartRockSuggestion,
  MeetingIntelligence,
  OneOnOnePrep,
  RockRetrospectiveAnalysis,
  EOSHealthScores,
  CompanyDigestContent,
} from "../types"

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const MODEL_SONNET = "claude-sonnet-4-20250514"
const MODEL_HAIKU = "claude-haiku-4-5-20251001"
const MAX_TOKENS = 2048

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
 * Standardized usage info returned by all AI functions
 */
export interface AIUsageInfo {
  inputTokens: number
  outputTokens: number
  model: string
}

/**
 * Wrapper type for AI function results with usage tracking
 */
export interface AIResultWithUsage<T> {
  result: T
  usage: AIUsageInfo
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
    model?: string
  }
): Promise<ClaudeCallResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured")
  }

  // 60-second timeout for Claude API calls
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)

  let response: Response
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: options?.model || MODEL_HAIKU,
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
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const error = await response.text()
    logger.error({ status: response.status, error }, "Claude API error")
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
 * Make a request to the Claude API and return both parsed result and usage
 * Used by all AI functions that need credit tracking
 */
async function callClaudeJSONWithUsage<T>(
  systemPrompt: string,
  userMessage: string,
  options?: {
    maxTokens?: number
    temperature?: number
    model?: string
  }
): Promise<{ result: T; usage: { inputTokens: number; outputTokens: number }; model: string }> {
  const callResult = await callClaudeWithUsage(systemPrompt, userMessage, options)
  const parsed = parseClaudeJSON<T>(callResult.text)
  return { result: parsed, usage: callResult.usage, model: callResult.model }
}

/**
 * Attempt to repair truncated JSON by closing unclosed brackets/braces.
 * Claude can be cut off mid-output when max_tokens is hit.
 */
function repairTruncatedJSON(text: string): string {
  const stack: string[] = []
  let inString = false
  let escape = false

  for (const ch of text) {
    if (escape) {
      escape = false
      continue
    }
    if (ch === "\\" && inString) {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (ch === "{") stack.push("}")
    else if (ch === "[") stack.push("]")
    else if (ch === "}" || ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop()
      }
    }
  }

  // Close any unclosed string first, then close containers in reverse
  return text + (inString ? '"' : "") + stack.reverse().join("")
}

/**
 * Parse JSON from Claude's response
 * Handles cases where Claude wraps JSON in markdown code blocks
 * and attempts to repair truncated responses.
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

  // First try direct parse
  try {
    return JSON.parse(cleaned) as T
  } catch {
    // Try extracting a JSON object or array from anywhere in the text
    const objMatch = cleaned.match(/\{[\s\S]*\}/)
    const arrMatch = cleaned.match(/\[[\s\S]*\]/)
    const match = objMatch || arrMatch
    if (match) {
      try {
        return JSON.parse(match[0]) as T
      } catch {
        // fall through to repair attempt
      }
    }

    // Response may be truncated — attempt to repair by closing unclosed brackets
    const candidate = match ? match[0] : cleaned
    if (candidate.trim().startsWith("{") || candidate.trim().startsWith("[")) {
      try {
        const repaired = repairTruncatedJSON(candidate)
        const result = JSON.parse(repaired) as T
        logger.warn({ responseText: text.slice(0, 200) }, "Parsed truncated Claude response after repair")
        return result
      } catch {
        // fall through to error
      }
    }

    logger.error({ responseText: text.slice(0, 500) }, "Failed to parse Claude response")
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
): Promise<AIResultWithUsage<AITaskGenerationResponse>> {
  const context = buildContext({ teamMembers, currentTasks, rocks })

  const userMessage = `
BRAIN DUMP FROM ADAM:
${brainDump}

CURRENT CONTEXT:
${context}

Parse this brain dump into specific task assignments. Return JSON only.`

  const { result, usage, model } = await callClaudeJSONWithUsage<AITaskGenerationResponse>(PROMPTS.brainDumpParser, userMessage, {
    temperature: 0.5,
    model: MODEL_HAIKU,
  })

  return { result, usage: { ...usage, model } }
}

/**
 * Parse an EOD report into structured insights
 */
export async function parseEODReport(
  eodReport: EODReport,
  memberName: string,
  memberDepartment: string,
  rocks?: Rock[]
): Promise<AIResultWithUsage<EODParseResponse>> {
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

  const { result, usage, model } = await callClaudeJSONWithUsage<EODParseResponse>(PROMPTS.eodParser, userMessage, {
    temperature: 0.3,
    model: MODEL_HAIKU,
  })

  return { result, usage: { ...usage, model } }
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
): Promise<AIResultWithUsage<Omit<DailyDigest, "id" | "organizationId" | "digestDate" | "generatedAt">>> {
  // Map by userId (users.id) which is what eodReport.userId references
  const memberMap = new Map(teamMembers.filter(m => m.userId).map(m => [m.userId!, m]))

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

  const { result: parsed, usage, model } = await callClaudeJSONWithUsage<Omit<DailyDigest, "id" | "organizationId" | "digestDate" | "generatedAt">>(PROMPTS.digestGenerator, userMessage, {
    maxTokens: 2048,
    temperature: 0.6,
    model: MODEL_HAIKU,
  })

  return {
    result: {
      ...parsed,
      reportsAnalyzed: eodReports.length,
    },
    usage: { ...usage, model },
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
    scorecardData?: Array<{ memberName: string; metricName: string; weeklyGoal: number; actualValue: number | null; weekEnding: string }>
  }
): Promise<AIResultWithUsage<AIQueryResponse>> {
  const contextStr = buildContext({ ...context, currentTasks: context.tasks })

  const userMessage = `
ADAM'S QUESTION:
${query}

AVAILABLE DATA:
${contextStr}

Answer the question based on the data provided. Return JSON only.`

  const { result, usage, model } = await callClaudeJSONWithUsage<AIQueryResponse>(PROMPTS.queryHandler, userMessage, {
    temperature: 0.5,
    model: MODEL_HAIKU,
  })

  return { result, usage: { ...usage, model } }
}

/**
 * Build context string from available data
 */
function buildContext(context: {
  teamMembers?: TeamMember[]
  currentTasks?: AssignedTask[]
  rocks?: Rock[]
  eodReports?: EODReport[]
  scorecardData?: Array<{ memberName: string; metricName: string; weeklyGoal: number; actualValue: number | null; weekEnding: string }>
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
    // Build per-member grouped reports with full content
    const memberReports = new Map<string, string[]>()
    for (const r of context.eodReports) {
      const name = (r as EODReport & { userName?: string }).userName || r.userId || "Unknown"
      if (!memberReports.has(name)) memberReports.set(name, [])
      const tasks = (r.tasks as Array<{ text: string }> | undefined) || []
      const taskList = tasks.map(t => t.text).filter(Boolean).join("; ")
      const challenges = typeof r.challenges === "string" ? r.challenges : ""
      const priorities = (r.tomorrowPriorities as Array<{ text: string }> | undefined) || []
      const priorityList = priorities.map(p => p.text).filter(Boolean).join("; ")
      const dateStr = r.date instanceof Date
        ? `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}-${String(r.date.getDate()).padStart(2, '0')}`
        : String(r.date).split("T")[0]
      let line = `  ${dateStr}: Tasks: ${taskList || "none"}`
      if (challenges) line += ` | Challenges: ${challenges}`
      if (priorityList) line += ` | Priorities: ${priorityList}`
      memberReports.get(name)!.push(line)
    }
    const reportLines: string[] = []
    for (const [name, lines] of memberReports) {
      reportLines.push(`${name}:\n${lines.slice(0, 7).join("\n")}`)
    }
    parts.push(`RECENT EOD REPORTS (${context.eodReports.length} total):\n${reportLines.join("\n")}`)
  }

  if (context.scorecardData && context.scorecardData.length > 0) {
    parts.push(`WEEKLY SCORECARD METRICS:\n${context.scorecardData.map(s => {
      const status = s.actualValue === null ? "not reported" : s.actualValue >= s.weeklyGoal ? "ON TRACK" : "BELOW GOAL"
      return `- ${s.memberName}: ${s.metricName} — goal: ${s.weeklyGoal}, actual: ${s.actualValue ?? "N/A"} (${status}) [week ending ${s.weekEnding}]`
    }).join("\n")}`)
  }

  return parts.join("\n\n") || "No data available"
}

/**
 * Generate a 1-3 sentence plain-language summary of what a team member worked on
 * Intended for admins who want a quick digest without reading every task line
 */
export async function summarizePersonEOD(
  memberName: string,
  tasks: Array<{ text: string; rockTitle?: string | null }>,
  challenges: string,
  tomorrowPriorities: Array<{ text: string }>
): Promise<AIResultWithUsage<{ summary: string }>> {
  const taskLines = tasks.map(t => t.rockTitle ? `- ${t.text} (${t.rockTitle})` : `- ${t.text}`).join("\n")
  const priorityLines = tomorrowPriorities.map(p => `- ${p.text}`).join("\n")

  const userMessage = `Team member: ${memberName}

Tasks completed today:
${taskLines || "None listed"}

Challenges: ${challenges || "None"}

Tomorrow's priorities:
${priorityLines || "None listed"}

Write 1-3 sentences summarizing what ${memberName} worked on today. Plain language, past tense, no bullet points. Focus on what they accomplished and any blockers. Return JSON only.`

  const { result, usage, model } = await callClaudeJSONWithUsage<{ summary: string }>(
    `You are a concise executive summarizer. Given an employee's end-of-day report, write 1-3 plain-language sentences summarizing what they accomplished. Be specific but brief. Return JSON: { "summary": "..." }`,
    userMessage,
    { maxTokens: 256, temperature: 0.3, model: MODEL_HAIKU }
  )

  return { result: { summary: result.summary || "" }, usage: { ...usage, model } }
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
): Promise<AIResultWithUsage<ParsedEODReport>> {
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

  const { result: parsed, usage, model } = await callClaudeJSONWithUsage<ParsedEODReport>(PROMPTS.eodTextParser, userMessage, {
    temperature: 0.3,
    model: MODEL_HAIKU,
    maxTokens: 8192,
  })

  return {
    result: {
      tasks: parsed.tasks || [],
      challenges: parsed.challenges || "No challenges mentioned",
      tomorrowPriorities: parsed.tomorrowPriorities || [],
      needsEscalation: parsed.needsEscalation || false,
      escalationNote: parsed.escalationNote || null,
      metricValue: typeof parsed.metricValue === "number" ? parsed.metricValue : null,
      summary: parsed.summary || "Daily tasks completed",
      warnings: parsed.warnings || [],
    },
    usage: { ...usage, model },
  }
}

/**
 * Generate scorecard insights from trend data
 */
export async function generateScorecardInsights(
  trends: {
    weeks: string[]
    metrics: Array<{
      metric: { id: string; name: string; targetValue?: number; targetDirection: string; unit: string; ownerName?: string }
      entries: Record<string, { value: number; status: string } | null>
    }>
  }
): Promise<AIResultWithUsage<{
  insights: Array<{ metricName: string; trend: string; message: string; severity: "info" | "warning" | "critical" }>
  summary: string
  suggestedActions: string[]
}>> {
  type ScorecardInsightsResult = {
    insights: Array<{ metricName: string; trend: string; message: string; severity: "info" | "warning" | "critical" }>
    summary: string
    suggestedActions: string[]
  }

  const metricsContext = trends.metrics.map((m) => {
    const recentEntries = trends.weeks.slice(0, 4).map((w) => {
      const entry = m.entries[w]
      return entry ? `${w}: ${entry.value} (${entry.status})` : `${w}: no data`
    })
    return `${m.metric.name} (owner: ${m.metric.ownerName || "unassigned"}, target: ${m.metric.targetValue || "N/A"} ${m.metric.unit}): ${recentEntries.join(", ")}`
  }).join("\n")

  const userMessage = `SCORECARD METRICS (last 4 weeks):\n${metricsContext}\n\nAnalyze these scorecard trends. Identify declining metrics, patterns, and suggest actions. Return JSON only.`

  const { result, usage, model } = await callClaudeJSONWithUsage<ScorecardInsightsResult>(PROMPTS.scorecardInsights, userMessage, { temperature: 0.4, model: MODEL_HAIKU })
  return { result, usage: { ...usage, model } }
}

/**
 * Generate meeting preparation summary
 */
export async function generateMeetingPrep(context: {
  rocks?: Array<{ title: string; progress: number; status: string; ownerName?: string }>
  tasks?: Array<{ title: string; status: string; priority: string; assigneeName?: string; dueDate?: string }>
  issues?: Array<{ title: string; status: string; priority: number }>
  scorecardTrends?: { weeks: string[]; metrics: Array<{ metric: { name: string }; entries: Record<string, { value: number; status: string } | null> }> }
}): Promise<AIResultWithUsage<{
  summary: string
  talkingPoints: string[]
  atRiskRocks: string[]
  decliningMetrics: string[]
  overdueTasks: string[]
  openIssues: string[]
}>> {
  type MeetingPrepResult = {
    summary: string
    talkingPoints: string[]
    atRiskRocks: string[]
    decliningMetrics: string[]
    overdueTasks: string[]
    openIssues: string[]
  }

  const parts: string[] = []

  if (context.rocks) {
    parts.push(`ROCKS:\n${context.rocks.map((r) => `- ${r.title}: ${r.progress}% (${r.status}) - ${r.ownerName || "unassigned"}`).join("\n")}`)
  }
  if (context.tasks) {
    const overdue = context.tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed")
    parts.push(`OVERDUE TASKS (${overdue.length}):\n${overdue.slice(0, 10).map((t) => `- ${t.title} (${t.assigneeName || "unassigned"}, due: ${t.dueDate})`).join("\n")}`)
  }
  if (context.issues) {
    const open = context.issues.filter((i) => i.status === "open")
    parts.push(`OPEN ISSUES (${open.length}):\n${open.slice(0, 10).map((i) => `- ${i.title} (priority: ${i.priority})`).join("\n")}`)
  }

  const userMessage = `${parts.join("\n\n")}\n\nPrepare a concise L10 meeting prep summary. Return JSON only.`
  const { result, usage, model } = await callClaudeJSONWithUsage<MeetingPrepResult>(PROMPTS.meetingPrep, userMessage, { temperature: 0.4, model: MODEL_HAIKU })
  return { result, usage: { ...usage, model } }
}

/**
 * Prioritize a list of tasks using AI
 */
export async function prioritizeTasks(
  tasks: Array<{ id: string; title: string; priority: string; status: string; dueDate?: string; assigneeName?: string; rockTitle?: string }>,
  rocks?: Array<{ title: string; progress: number; status: string }>
): Promise<AIResultWithUsage<{
  prioritizedTasks: Array<{ taskId: string; rank: number; reasoning: string }>
  summary: string
}>> {
  type PrioritizeResult = {
    prioritizedTasks: Array<{ taskId: string; rank: number; reasoning: string }>
    summary: string
  }

  const tasksContext = tasks.map((t) => `- ID: ${t.id} | "${t.title}" | Priority: ${t.priority} | Status: ${t.status} | Due: ${t.dueDate || "none"} | Rock: ${t.rockTitle || "none"}`).join("\n")
  const rocksContext = rocks ? rocks.map((r) => `- ${r.title}: ${r.progress}% (${r.status})`).join("\n") : "No rocks data"

  const userMessage = `TASKS TO PRIORITIZE:\n${tasksContext}\n\nROCKS CONTEXT:\n${rocksContext}\n\nPrioritize these tasks by impact and urgency. Return JSON only.`
  const { result, usage, model } = await callClaudeJSONWithUsage<PrioritizeResult>(PROMPTS.taskPrioritizer, userMessage, { temperature: 0.3, model: MODEL_HAIKU })
  return { result, usage: { ...usage, model } }
}

/**
 * Generate manager insights from team data
 */
export async function generateManagerInsights(context: {
  directReports?: Array<{ name: string; tasksCompleted: number; rocksOnTrack: number; eodRate: number }>
  rocks?: Array<{ title: string; progress: number; status: string; ownerName?: string }>
  tasks?: Array<{ title: string; status: string; assigneeName?: string }>
  eodReports?: Array<{ userId: string; date: string; sentiment?: string }>
}): Promise<AIResultWithUsage<{
  summary: string
  teamHealth: "good" | "warning" | "critical"
  insights: Array<{ title: string; description: string; type: "positive" | "warning" | "action" }>
  suggestedActions: string[]
}>> {
  type ManagerInsightsResult = {
    summary: string
    teamHealth: "good" | "warning" | "critical"
    insights: Array<{ title: string; description: string; type: "positive" | "warning" | "action" }>
    suggestedActions: string[]
  }

  const parts: string[] = []

  if (context.directReports) {
    parts.push(`DIRECT REPORTS:\n${context.directReports.map((r) => `- ${r.name}: ${r.tasksCompleted} tasks done, ${r.rocksOnTrack} rocks on track, ${r.eodRate}% EOD rate`).join("\n")}`)
  }
  if (context.rocks) {
    parts.push(`TEAM ROCKS:\n${context.rocks.map((r) => `- ${r.title}: ${r.progress}% (${r.status}) - ${r.ownerName || "unassigned"}`).join("\n")}`)
  }

  const userMessage = `${parts.join("\n\n")}\n\nGenerate manager insights for the team. Return JSON only.`
  const { result, usage, model } = await callClaudeJSONWithUsage<ManagerInsightsResult>(PROMPTS.managerInsights, userMessage, { temperature: 0.5, model: MODEL_HAIKU })
  return { result, usage: { ...usage, model } }
}

/**
 * Generate a summary of meeting notes
 */
export async function generateMeetingNotesSummary(meetingData: {
  title: string
  sections?: Array<{ sectionType: string; data: Record<string, unknown> }>
  todos?: Array<{ title: string; assigneeName?: string; completed: boolean }>
  issues?: Array<{ title: string; status: string; resolution?: string }>
  notes?: string
  duration?: number
}): Promise<AIResultWithUsage<{
  summary: string
  keyDecisions: string[]
  actionItems: string[]
  unresolvedIssues: string[]
}>> {
  type MeetingNotesResult = {
    summary: string
    keyDecisions: string[]
    actionItems: string[]
    unresolvedIssues: string[]
  }

  const parts: string[] = [`MEETING: ${meetingData.title}`]

  if (meetingData.duration) parts.push(`Duration: ${meetingData.duration} minutes`)
  if (meetingData.notes) parts.push(`Notes: ${meetingData.notes}`)

  if (meetingData.todos) {
    parts.push(`TODOS (${meetingData.todos.length}):\n${meetingData.todos.map((t) => `- [${t.completed ? "x" : " "}] ${t.title} (${t.assigneeName || "unassigned"})`).join("\n")}`)
  }

  if (meetingData.issues) {
    parts.push(`ISSUES (${meetingData.issues.length}):\n${meetingData.issues.map((i) => `- ${i.title} [${i.status}]${i.resolution ? `: ${i.resolution}` : ""}`).join("\n")}`)
  }

  const userMessage = `${parts.join("\n\n")}\n\nSummarize this meeting. Return JSON only.`
  const { result, usage, model } = await callClaudeJSONWithUsage<MeetingNotesResult>(PROMPTS.meetingNotesSummary, userMessage, { temperature: 0.4, model: MODEL_HAIKU })
  return { result, usage: { ...usage, model } }
}

/**
 * Extract brand colors from website content using AI
 * Much more reliable than regex-based CSS parsing for modern sites
 */
export async function extractBrandColors(
  markdown: string,
  url: string,
  companyName?: string | null
): Promise<{ primary: string; secondary: string; accent: string; logoUrl?: string | null; confidence: string } | null> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return null
    }

    // Truncate markdown to save tokens (first 3000 chars is enough for brand signals)
    const truncated = markdown.length > 3000 ? markdown.substring(0, 3000) + "\n...[truncated]" : markdown

    const userMessage = `Website URL: ${url}
${companyName ? `Company Name: ${companyName}` : ""}

Website content:
${truncated}

Identify the brand colors for this company. Return JSON only.`

    const { result } = await callClaudeJSONWithUsage<{
      primary: string
      secondary: string
      accent: string
      logoUrl?: string | null
      confidence: string
    }>(PROMPTS.brandExtractor, userMessage, {
      maxTokens: 300,
      temperature: 0.2,
      model: MODEL_HAIKU,
    })

    // Validate hex codes
    const hexPattern = /^#[0-9a-fA-F]{6}$/
    if (
      hexPattern.test(result.primary) &&
      hexPattern.test(result.secondary) &&
      hexPattern.test(result.accent)
    ) {
      return result
    }

    logger.warn({ url, result }, "AI brand extraction returned invalid hex codes")
    return null
  } catch (error) {
    logger.warn(
      { url, error: error instanceof Error ? error.message : String(error) },
      "AI brand extraction failed, falling back to regex"
    )
    return null
  }
}

/**
 * Check if Claude API is configured
 */
export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

// ============================================================
// WORKSPACE BUILDER
// ============================================================

export interface WorkspaceBuilderPayload {
  members?: Array<{
    name: string
    email: string
    role?: "admin" | "member"
    department?: string
    jobTitle?: string
  }>
  clients?: Array<{
    name: string
    industry?: string
    website?: string
    notes?: string
  }>
  projects?: Array<{
    name: string
    description?: string
    clientName?: string
    status?: string
  }>
  rocks?: Array<{
    title: string
    description?: string
    ownerEmail?: string
    quarter?: string
    dueDate?: string
    milestones?: string[]
  }>
  tasks?: Array<{
    title: string
    description?: string
    assigneeEmail?: string
    priority?: "low" | "normal" | "high" | "urgent"
    dueDate?: string
    rockTitle?: string
  }>
}

const WORKSPACE_BUILDER_SYSTEM_PROMPT = `You are an expert organizational setup assistant that parses unstructured text and extracts structured workspace data for a team management platform called TaskSpace.

Given a text dump of organizational information (org charts, goals, team roles, projects, clients, tasks, quarterly rocks, etc.), extract all relevant data into the structured format below.

Return ONLY valid JSON with this exact structure (omit any key where you have no data):
{
  "members": [{ "name": "Full Name", "email": "email@company.com", "role": "member|admin", "department": "Sales", "jobTitle": "Account Executive" }],
  "clients": [{ "name": "Acme Corp", "industry": "Technology", "website": "https://acme.com", "notes": "Notes about client..." }],
  "projects": [{ "name": "Q1 Launch", "description": "...", "clientName": "Acme Corp", "status": "active|planning|on-hold|completed" }],
  "rocks": [{ "title": "Increase MRR by 20%", "description": "...", "ownerEmail": "owner@co.com", "quarter": "Q1 2025", "dueDate": "2025-03-31", "milestones": ["Close 5 deals", "Launch referral program"] }],
  "tasks": [{ "title": "Send proposal to Acme", "description": "...", "assigneeEmail": "john@co.com", "priority": "high", "dueDate": "2025-01-31", "rockTitle": "Increase MRR by 20%" }]
}

Extraction rules:
- email: if not provided, generate "firstname.lastname@company.com" if company domain is known, otherwise omit
- role: only use "admin" for managers/directors/VPs/C-suite
- dueDate: YYYY-MM-DD format only (e.g., 2025-03-31)
- quarter: "Q1 2025", "Q2 2025", "Q3 2025", or "Q4 2025" format only
- milestones: extract only specific, actionable milestones from rocks
- rockTitle in tasks: match EXACTLY to a rock title in the rocks array if task clearly belongs to a rock
- priority: default to "normal" unless urgency is clearly indicated
- Omit entire categories (members/clients/etc.) if no data exists for them
- Be thorough - extract everything clearly mentioned or strongly implied`

/**
 * Parse an unstructured text dump into a structured WorkspaceBuilderPayload
 * Used by the Master Builder onboarding flow
 */
export async function parseWorkspaceSetup(
  text: string
): Promise<AIResultWithUsage<WorkspaceBuilderPayload>> {
  const userMessage = `Parse this organizational text and extract structured workspace data. Return JSON only.

TEXT TO PARSE:
${text}`

  const { result, usage, model } = await callClaudeJSONWithUsage<WorkspaceBuilderPayload>(
    WORKSPACE_BUILDER_SYSTEM_PROMPT,
    userMessage,
    { maxTokens: 8192, temperature: 0.2, model: MODEL_HAIKU }
  )

  return {
    result: {
      members: result.members || [],
      clients: result.clients || [],
      projects: result.projects || [],
      rocks: result.rocks || [],
      tasks: result.tasks || [],
    },
    usage: { ...usage, model },
  }
}

// ============================================
// V2 AI FUNCTIONS
// ============================================

/**
 * F1: Generate Monday morning personal brief
 */
export async function generateWeeklyBrief(context: {
  rocks: Pick<Rock, "title" | "progress" | "status">[]
  tasks: Pick<AssignedTask, "title" | "dueDate" | "status">[]
  meetings: { title: string; scheduledAt: string }[]
  lastWeekEODs: { date: string; summary?: string }[]
  scorecardData?: Record<string, unknown>
}): Promise<AIResultWithUsage<WeeklyBrief>> {
  const userMessage = `Generate a Monday morning weekly brief for this team member.

OPEN ROCKS: ${JSON.stringify(context.rocks)}
TASKS (including overdue): ${JSON.stringify(context.tasks)}
UPCOMING MEETINGS: ${JSON.stringify(context.meetings)}
LAST WEEK'S EOD SUMMARIES: ${JSON.stringify(context.lastWeekEODs)}
${context.scorecardData ? `SCORECARD DATA: ${JSON.stringify(context.scorecardData)}` : ""}

Return JSON only.`

  const { result, usage, model } = await callClaudeJSONWithUsage<WeeklyBrief>(
    WEEKLY_BRIEF_PROMPT,
    userMessage,
    { maxTokens: 2048, temperature: 0.5, model: MODEL_HAIKU }
  )

  return {
    result: {
      greeting: result.greeting || "Good morning! Here's your week ahead.",
      weekAtAGlance: result.weekAtAGlance || "",
      topPriorities: result.topPriorities || [],
      openRocks: result.openRocks || [],
      overdueItems: result.overdueItems || [],
      meetingPreview: result.meetingPreview || [],
      focusSuggestion: result.focusSuggestion || "",
    },
    usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, model },
  }
}

/**
 * F11: Generate SMART rocks from a high-level goal
 */
export async function generateSmartRocks(
  goal: string,
  context: {
    teamMembers: Pick<TeamMember, "name" | "email" | "role">[]
    existingRocks: Pick<Rock, "title" | "status">[]
    quarter: string
  }
): Promise<AIResultWithUsage<SmartRockSuggestion[]>> {
  const userMessage = `Generate SMART rocks from this goal.

GOAL: ${goal}
QUARTER: ${context.quarter}
TEAM MEMBERS: ${JSON.stringify(context.teamMembers)}
EXISTING ROCKS THIS QUARTER: ${JSON.stringify(context.existingRocks)}

Return JSON only.`

  const { result, usage, model } = await callClaudeJSONWithUsage<{ rocks: SmartRockSuggestion[] }>(
    SMART_ROCKS_PROMPT,
    userMessage,
    { maxTokens: 4096, temperature: 0.6, model: MODEL_HAIKU }
  )

  return {
    result: result.rocks || [],
    usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, model },
  }
}

/**
 * F3: Generate meeting intelligence from completed L10 meeting
 */
export async function generateMeetingIntelligence(meeting: {
  sections: { sectionType: string; data: Record<string, unknown> }[]
  issues: { title: string; status: string; resolution?: string }[]
  todos: { title: string; assigneeName?: string; completed: boolean }[]
  attendees: string[]
  notes?: string
}): Promise<AIResultWithUsage<MeetingIntelligence>> {
  const userMessage = `Analyze this completed L10 meeting and generate an intelligence report.

MEETING SECTIONS: ${JSON.stringify(meeting.sections)}
ISSUES DISCUSSED: ${JSON.stringify(meeting.issues)}
TODOS CREATED: ${JSON.stringify(meeting.todos)}
ATTENDEES: ${JSON.stringify(meeting.attendees)}
${meeting.notes ? `NOTES: ${meeting.notes}` : ""}

Return JSON only.`

  const { result, usage, model } = await callClaudeJSONWithUsage<MeetingIntelligence>(
    MEETING_INTELLIGENCE_PROMPT,
    userMessage,
    { maxTokens: 4096, temperature: 0.4, model: MODEL_HAIKU }
  )

  return {
    result: {
      summary: result.summary || "",
      actionItems: result.actionItems || [],
      keyDecisions: result.keyDecisions || [],
      unresolvedIssues: result.unresolvedIssues || [],
      followUpSuggestions: result.followUpSuggestions || [],
    },
    usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, model },
  }
}

/**
 * F4: Generate 1-on-1 meeting prep for manager
 */
export async function generateOneOnOnePrep(context: {
  reportEODs: { date: string; summary?: string; sentiment?: string }[]
  reportRocks: Pick<Rock, "title" | "progress" | "status">[]
  reportTasks: { completed: number; total: number; overdue: number }
  reportMood: { date: string; mood?: string; score?: number }[]
}): Promise<AIResultWithUsage<OneOnOnePrep>> {
  const userMessage = `Generate 1-on-1 meeting preparation notes for this direct report.

RECENT EOD REPORTS: ${JSON.stringify(context.reportEODs)}
ROCK PROGRESS: ${JSON.stringify(context.reportRocks)}
TASK METRICS: ${JSON.stringify(context.reportTasks)}
MOOD TRENDS: ${JSON.stringify(context.reportMood)}

Return JSON only.`

  const { result, usage, model } = await callClaudeJSONWithUsage<OneOnOnePrep>(
    ONE_ON_ONE_PREP_PROMPT,
    userMessage,
    { maxTokens: 2048, temperature: 0.5, model: MODEL_HAIKU }
  )

  return {
    result: {
      performanceSummary: result.performanceSummary || "",
      talkingPoints: result.talkingPoints || [],
      recognitionOpportunities: result.recognitionOpportunities || [],
      concernAreas: result.concernAreas || [],
      suggestedQuestions: result.suggestedQuestions || [],
    },
    usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, model },
  }
}

/**
 * F5: Generate quarterly rock retrospective
 */
export async function generateRockRetrospective(rocks: {
  title: string
  owner?: string
  status: string
  progress: number
  milestones?: string[]
  completedAt?: string
}[]): Promise<AIResultWithUsage<RockRetrospectiveAnalysis>> {
  const userMessage = `Generate a quarterly rock retrospective analysis.

ROCKS THIS QUARTER: ${JSON.stringify(rocks)}

Return JSON only.`

  const { result, usage, model } = await callClaudeJSONWithUsage<RockRetrospectiveAnalysis>(
    ROCK_RETROSPECTIVE_PROMPT,
    userMessage,
    { maxTokens: 4096, temperature: 0.4, model: MODEL_HAIKU }
  )

  return {
    result: {
      completionRate: result.completionRate || 0,
      summary: result.summary || "",
      patterns: result.patterns || [],
      topPerformers: result.topPerformers || [],
      missedRockAnalysis: result.missedRockAnalysis || [],
      recommendations: result.recommendations || [],
    },
    usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, model },
  }
}

/**
 * F9: Generate EOS Health Report Card
 */
export async function generateEOSHealthReport(context: {
  vtoData?: Record<string, unknown>
  orgChart?: Record<string, unknown>
  scorecardMetrics?: Record<string, unknown>
  idsIssues?: { total: number; resolved: number; open: number }
  rocks?: { total: number; completed: number; onTrack: number }
  meetings?: { total: number; avgRating?: number; attendanceRate?: number }
  eodReports?: { totalMembers: number; avgCompletionRate: number }
}): Promise<AIResultWithUsage<{ scores: { vision: number; people: number; data: number; issues: number; process: number; traction: number }; overallGrade: string; analysis: string; recommendations: string[] }>> {
  const userMessage = `Score this organization on the 6 EOS components.

V/TO DATA: ${JSON.stringify(context.vtoData || {})}
ORG CHART: ${JSON.stringify(context.orgChart || {})}
SCORECARD METRICS: ${JSON.stringify(context.scorecardMetrics || {})}
IDS ISSUES: ${JSON.stringify(context.idsIssues || {})}
ROCKS: ${JSON.stringify(context.rocks || {})}
MEETINGS: ${JSON.stringify(context.meetings || {})}
EOD REPORTS: ${JSON.stringify(context.eodReports || {})}

Return JSON only.`

  const { result, usage, model } = await callClaudeJSONWithUsage<{
    scores: { vision: number; people: number; data: number; issues: number; process: number; traction: number }
    overallGrade: string
    analysis: string
    recommendations: string[]
  }>(
    EOS_HEALTH_REPORT_PROMPT,
    userMessage,
    { maxTokens: 4096, temperature: 0.3, model: MODEL_HAIKU }
  )

  return {
    result: {
      scores: result.scores || { vision: 0, people: 0, data: 0, issues: 0, process: 0, traction: 0 },
      overallGrade: result.overallGrade || "C",
      analysis: result.analysis || "",
      recommendations: result.recommendations || [],
    },
    usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, model },
  }
}

/**
 * F10: Generate company digest / board update
 */
export async function generateCompanyDigest(context: {
  periodType: string
  periodStart: string
  periodEnd: string
  rocks?: { title: string; status: string; progress: number }[]
  metrics?: { name: string; value: string }[]
  teamHighlights?: string[]
  challenges?: string[]
}): Promise<AIResultWithUsage<CompanyDigestContent>> {
  const userMessage = `Generate a company update digest for this period.

PERIOD: ${context.periodType} (${context.periodStart} to ${context.periodEnd})
ROCKS: ${JSON.stringify(context.rocks || [])}
KEY METRICS: ${JSON.stringify(context.metrics || [])}
TEAM HIGHLIGHTS: ${JSON.stringify(context.teamHighlights || [])}
CHALLENGES: ${JSON.stringify(context.challenges || [])}

Return JSON only.`

  const { result, usage, model } = await callClaudeJSONWithUsage<CompanyDigestContent>(
    COMPANY_DIGEST_PROMPT,
    userMessage,
    { maxTokens: 4096, temperature: 0.5, model: MODEL_HAIKU }
  )

  return {
    result: {
      title: result.title || "Company Update",
      executiveSummary: result.executiveSummary || "",
      rockUpdate: result.rockUpdate || "",
      keyMetrics: result.keyMetrics || [],
      teamHighlights: result.teamHighlights || [],
      challenges: result.challenges || [],
      outlook: result.outlook || "",
    },
    usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, model },
  }
}
