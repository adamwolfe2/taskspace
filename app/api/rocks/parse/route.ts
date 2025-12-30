import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import type { ApiResponse } from "@/lib/types"

interface ParsedRock {
  title: string
  description: string
  milestones: string[]
  suggestedQuarter?: string
}

interface ParseRocksResponse {
  rocks: ParsedRock[]
  rawResponse: string
}

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const MODEL = "claude-sonnet-4-20250514"

/**
 * POST /api/rocks/parse
 * Parse unstructured text into structured rocks using AI
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can import rocks" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Please provide rock text to parse (at least 10 characters)" },
        { status: 400 }
      )
    }

    // Check for Anthropic API key
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "AI parsing not configured. Please add ANTHROPIC_API_KEY to environment variables." },
        { status: 500 }
      )
    }

    const systemPrompt = `You are a helpful assistant that parses quarterly rock/goal descriptions into structured data.

A "Rock" is a quarterly goal with:
- A clear title (the main goal)
- A description (1-2 sentence summary of what success looks like)
- Milestones (specific deliverables or "done when" criteria - the sub-items under each rock)

Your job is to extract rocks from unstructured text and return them as JSON.

IMPORTANT: Return ONLY valid JSON, no markdown code blocks or extra text.`

    const userPrompt = `Parse the following text into structured quarterly rocks. Extract each rock with its title, description, and milestones (the sub-items/bullet points).

TEXT TO PARSE:
${text}

Return a JSON array in this exact format:
[
  {
    "title": "Brief rock title",
    "description": "1-2 sentence description of what success looks like",
    "milestones": ["Milestone 1", "Milestone 2", "Milestone 3"],
    "suggestedQuarter": "Q1 2025"
  }
]

Rules:
1. The title should be concise but descriptive
2. The description should summarize the overall goal
3. Milestones should be the specific deliverables or sub-tasks listed under each rock
4. If a quarter is mentioned, include it in suggestedQuarter
5. Return ONLY the JSON array, no additional text`

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
      const error = await response.text()
      console.error("Claude API error:", error)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `AI service error: ${response.status}` },
        { status: 500 }
      )
    }

    const data = await response.json()
    const responseText = data.content?.[0]?.text || ""

    // Parse the JSON response
    let parsedRocks: ParsedRock[]
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

      parsedRocks = JSON.parse(jsonStr)

      if (!Array.isArray(parsedRocks)) {
        throw new Error("Response is not an array")
      }

      // Validate structure
      parsedRocks = parsedRocks.map((rock) => ({
        title: String(rock.title || "Untitled Rock"),
        description: String(rock.description || ""),
        milestones: Array.isArray(rock.milestones)
          ? rock.milestones.map((m: any) => String(m))
          : [],
        suggestedQuarter: rock.suggestedQuarter ? String(rock.suggestedQuarter) : undefined,
      }))
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, responseText)
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "Failed to parse AI response. Please try again with clearer formatting.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<ParseRocksResponse>>({
      success: true,
      data: {
        rocks: parsedRocks,
        rawResponse: responseText,
      },
      message: `Successfully parsed ${parsedRocks.length} rock(s)`,
    })
  } catch (error) {
    console.error("Rock parse error:", error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to parse rocks",
      },
      { status: 500 }
    )
  }
}
