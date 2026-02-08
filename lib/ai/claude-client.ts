/**
 * Claude API Client
 * Handles all interactions with the Anthropic Claude API
 */

import { PROMPTS } from "./prompts"
import { logger, logError } from "@/lib/logger"
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
 * Make a request to the Claude API (returns text only, usage discarded)
 * @deprecated Use callClaudeWithUsage instead for proper credit tracking
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
 * Make a request to the Claude API and return both parsed result and usage
 * Used by all AI functions that need credit tracking
 */
async function callClaudeJSONWithUsage<T>(
  systemPrompt: string,
  userMessage: string,
  options?: {
    maxTokens?: number
    temperature?: number
  }
): Promise<{ result: T; usage: { inputTokens: number; outputTokens: number }; model: string }> {
  const callResult = await callClaudeWithUsage(systemPrompt, userMessage, options)
  const parsed = parseClaudeJSON<T>(callResult.text)
  return { result: parsed, usage: callResult.usage, model: callResult.model }
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
    logger.error({ responseText: text }, "Failed to parse Claude response")
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

  const { result: parsed, usage, model } = await callClaudeJSONWithUsage<Omit<DailyDigest, "id" | "organizationId" | "digestDate" | "generatedAt">>(PROMPTS.digestGenerator, userMessage, {
    maxTokens: 6000,
    temperature: 0.6,
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
  }
): Promise<AIResultWithUsage<AIQueryResponse>> {
  const contextStr = buildContext(context)

  const userMessage = `
ADAM'S QUESTION:
${query}

AVAILABLE DATA:
${contextStr}

Answer the question based on the data provided. Return JSON only.`

  const { result, usage, model } = await callClaudeJSONWithUsage<AIQueryResponse>(PROMPTS.queryHandler, userMessage, {
    temperature: 0.5,
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

  const { result, usage, model } = await callClaudeJSONWithUsage<ScorecardInsightsResult>(PROMPTS.scorecardInsights, userMessage, { temperature: 0.4 })
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
  const { result, usage, model } = await callClaudeJSONWithUsage<MeetingPrepResult>(PROMPTS.meetingPrep, userMessage, { temperature: 0.4 })
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
  const { result, usage, model } = await callClaudeJSONWithUsage<PrioritizeResult>(PROMPTS.taskPrioritizer, userMessage, { temperature: 0.3 })
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
  const { result, usage, model } = await callClaudeJSONWithUsage<ManagerInsightsResult>(PROMPTS.managerInsights, userMessage, { temperature: 0.5 })
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
  const { result, usage, model } = await callClaudeJSONWithUsage<MeetingNotesResult>(PROMPTS.meetingNotesSummary, userMessage, { temperature: 0.4 })
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
