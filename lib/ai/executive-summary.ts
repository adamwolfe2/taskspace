/**
 * AI Executive Summary Generator
 *
 * Generates a daily briefing summarizing all orgs' health across the portfolio.
 * Uses Claude to synthesize cross-org data into actionable insights.
 */

import { logger, logError } from "@/lib/logger"

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const MODEL = "claude-sonnet-4-20250514"

interface OrgContext {
  orgName: string
  memberCount: number
  eodsToday: number
  eodRate: number
  escalations: Array<{ userName: string; note: string }>
  activeTasks: number
  completedThisWeek: number
  rocks: Array<{ title: string; progress: number; status: string; owner: string }>
  recentEodSummaries: Array<{
    userName: string
    text: string
    hasEscalation: boolean
    escalationNote: string | null
  }>
}

interface ExecutiveSummaryResult {
  summary: string
  orgHighlights: Array<{
    orgName: string
    status: "healthy" | "needs-attention" | "critical"
    headline: string
  }>
  topConcerns: string[]
  topWins: string[]
  recommendations: string[]
}

const SYSTEM_PROMPT = `You are an executive briefing AI for a portfolio of organizations.
You analyze cross-org data and produce a concise, actionable daily briefing.

Your tone is direct, professional, and focused on what matters. No fluff.
Flag risks early. Celebrate wins briefly. Focus on patterns across orgs.

Return JSON with this exact structure:
{
  "summary": "2-3 sentence executive summary of the portfolio's state today",
  "orgHighlights": [
    { "orgName": "Org Name", "status": "healthy|needs-attention|critical", "headline": "One line about this org" }
  ],
  "topConcerns": ["Up to 3 concerns requiring attention"],
  "topWins": ["Up to 3 positive signals across the portfolio"],
  "recommendations": ["Up to 3 specific actions the executive should take"]
}

Status definitions:
- healthy: EOD rate >70%, no open escalations, rocks on track
- needs-attention: EOD rate 40-70%, or escalations, or rocks at-risk
- critical: EOD rate <40%, or multiple escalations, or rocks blocked`

export async function generateExecutiveSummary(
  orgData: OrgContext[]
): Promise<ExecutiveSummaryResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured")
  }

  const userMessage = orgData.map(org => `
=== ${org.orgName} (${org.memberCount} members) ===
EOD Rate Today: ${org.eodRate}% (${org.eodsToday}/${org.memberCount})
Active Tasks: ${org.activeTasks} | Completed This Week: ${org.completedThisWeek}

Escalations (last 7 days):
${org.escalations.length === 0 ? "None" : org.escalations.map(e => `- ${e.userName}: ${e.note}`).join("\n")}

Rocks:
${org.rocks.length === 0 ? "No active rocks" : org.rocks.map(r => `- ${r.title} (${r.owner}): ${r.progress}% [${r.status}]`).join("\n")}

Recent EOD Highlights:
${org.recentEodSummaries.length === 0 ? "No EODs today" : org.recentEodSummaries.slice(0, 5).map(e =>
  `- ${e.userName}: ${e.text}${e.hasEscalation ? ` [ESCALATION: ${e.escalationNote}]` : ""}`
).join("\n")}
`).join("\n")

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      temperature: 0.5,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    logger.error({ status: response.status, error }, "Claude API error in executive summary")
    throw new Error(`Claude API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || ""

  // Parse JSON from response (handle markdown code blocks)
  let cleaned = text.trim()
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3)
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3)

  try {
    const parsed = JSON.parse(cleaned.trim()) as ExecutiveSummaryResult
    return parsed
  } catch (parseError) {
    logError(logger, "Failed to parse executive summary JSON", parseError)
    return {
      summary: text.slice(0, 500),
      orgHighlights: orgData.map(org => ({
        orgName: org.orgName,
        status: org.eodRate >= 70 ? "healthy" as const : org.eodRate >= 40 ? "needs-attention" as const : "critical" as const,
        headline: `${org.eodRate}% EOD rate, ${org.activeTasks} active tasks`,
      })),
      topConcerns: [],
      topWins: [],
      recommendations: [],
    }
  }
}
