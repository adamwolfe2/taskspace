import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { isClaudeConfigured } from "@/lib/ai/claude-client"
import { aiRateLimit } from "@/lib/api/rate-limit"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import { validateBody } from "@/lib/validation/middleware"
import { rockParseSchema } from "@/lib/validation/schemas"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

interface ParsedRock {
  title: string
  description: string
  milestones: string[]
  suggestedQuarter?: string
  assigneeName?: string
}

interface ParsedMetric {
  assigneeName: string
  metricName: string
  weeklyGoal: number
}

interface ParseRocksResponse {
  rocks: ParsedRock[]
  metrics: ParsedMetric[]
  rawResponse: string
}

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const MODEL = "claude-sonnet-4-20250514"

/**
 * POST /api/rocks/parse
 * Parse unstructured text into structured rocks using AI
 */
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Rate limit: 20 rock parse requests per user per hour
    const rateCheck = aiRateLimit(auth.user.id, 'rocks-parse')
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
    }

    if (!isClaudeConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "AI parsing not configured. Please add ANTHROPIC_API_KEY to environment variables." },
        { status: 503 }
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

    const { text } = await validateBody(request, rockParseSchema)

    const apiKey = process.env.ANTHROPIC_API_KEY!

    const systemPrompt = `You are a helpful assistant that parses quarterly rock/goal descriptions and weekly scorecard metrics into structured data.

A "Rock" is a quarterly goal with:
- A clear title (the main goal)
- A description (1-2 sentence summary of what success looks like)
- Milestones (specific deliverables or "done when" criteria - the sub-items under each rock)
- Optional assignee (the person responsible)

A "Metric" is a weekly scorecard measurable with:
- An assignee name
- A metric name (what they're measuring, e.g., "Calls Made", "Pages Optimized")
- A weekly goal (numeric target per week)

Your job is to extract both rocks AND metrics from unstructured text and return them as JSON.

IMPORTANT: Return ONLY valid JSON, no markdown code blocks or extra text.`

    const userPrompt = `Parse the following text into structured quarterly rocks AND weekly scorecard metrics.

TEXT TO PARSE:
${text}

Return a JSON object in this exact format:
{
  "rocks": [
    {
      "title": "Brief rock title",
      "description": "1-2 sentence description of what success looks like",
      "milestones": ["Milestone 1", "Milestone 2", "Milestone 3"],
      "suggestedQuarter": "Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}",
      "assigneeName": "Person's name if mentioned"
    }
  ],
  "metrics": [
    {
      "assigneeName": "Person's name",
      "metricName": "Calls Made",
      "weeklyGoal": 20
    }
  ]
}

Rules:
1. The rock title should be concise but descriptive
2. The description should summarize the overall goal
3. Milestones should be the specific deliverables or sub-tasks listed under each rock
4. If a quarter is mentioned, include it in suggestedQuarter
5. If a person is mentioned with the rock, include their name in assigneeName
6. Look for weekly measurables, KPIs, metrics, or goals like "20 calls per week", "10 pages weekly"
7. Extract metrics separately - they are for the WEEKLY SCORECARD tracking
8. Return ONLY the JSON object, no additional text`

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        temperature: 0.5,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error({ status: response.status, error: errorText }, "Claude API error")
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `AI service error: ${response.status}` },
        { status: 500 }
      )
    }

    const data = await response.json()
    const responseText = data.content?.[0]?.text || ""
    const inputTokens = data.usage?.input_tokens || 0
    const outputTokens = data.usage?.output_tokens || 0

    // Record AI usage
    await recordUsage({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "rocks-parse",
      model: data.model || MODEL,
      inputTokens,
      outputTokens,
    })

    // Parse the JSON response
    let parsedRocks: ParsedRock[] = []
    let parsedMetrics: ParsedMetric[] = []
    try {
      // Try to extract JSON from the response (handle potential markdown code blocks)
      let jsonStr = responseText.trim()
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7)
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3)
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3)
      }
      jsonStr = jsonStr.trim()

      const parsed = JSON.parse(jsonStr)

      // Handle both old format (array) and new format (object with rocks and metrics)
      const rocksArray = Array.isArray(parsed) ? parsed : (parsed.rocks || [])
      const metricsArray = Array.isArray(parsed) ? [] : (parsed.metrics || [])

      // Validate rocks structure
      parsedRocks = rocksArray.map((rock: Record<string, unknown>) => ({
        title: String(rock.title || "Untitled Rock"),
        description: String(rock.description || ""),
        milestones: Array.isArray(rock.milestones)
          ? (rock.milestones as unknown[]).map((m) => String(m))
          : [],
        suggestedQuarter: rock.suggestedQuarter ? String(rock.suggestedQuarter) : undefined,
        assigneeName: rock.assigneeName ? String(rock.assigneeName) : undefined,
      }))

      // Validate metrics structure
      parsedMetrics = metricsArray
        .filter((m: Record<string, unknown>) => m.assigneeName && m.metricName && typeof m.weeklyGoal === "number")
        .map((metric: Record<string, unknown>) => ({
          assigneeName: String(metric.assigneeName),
          metricName: String(metric.metricName),
          weeklyGoal: Number(metric.weeklyGoal),
        }))
    } catch (parseError) {
      logError(logger, "Failed to parse AI response", parseError, { responseText })
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "Failed to parse AI response. Please try again with clearer formatting.",
        },
        { status: 500 }
      )
    }

    const metricsMessage = parsedMetrics.length > 0
      ? ` and ${parsedMetrics.length} metric(s)`
      : ""

    return NextResponse.json<ApiResponse<ParseRocksResponse>>({
      success: true,
      data: {
        rocks: parsedRocks,
        metrics: parsedMetrics,
        rawResponse: responseText,
      },
      message: `Successfully parsed ${parsedRocks.length} rock(s)${metricsMessage}`,
    })
  } catch (error) {
    logError(logger, "Rock parse error", error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "Failed to parse rocks",
      },
      { status: 500 }
    )
  }
})
