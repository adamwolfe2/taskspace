import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { parseWorkspaceSetup, isClaudeConfigured } from "@/lib/ai/claude-client"
import { aiRateLimit } from "@/lib/api/rate-limit"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import { z } from "zod"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import type { ApiResponse } from "@/lib/types"
import type { WorkspaceBuilderPayload } from "@/lib/ai/claude-client"
import { logger, logError } from "@/lib/logger"

const parseWorkspaceSchema = z.object({
  text: z.string().min(10, "Please provide at least some text to parse").max(50000, "Text is too long (max 50,000 characters)"),
})

// POST /api/ai/parse-workspace - Parse a text dump into structured workspace data
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Rate limit: 10 parses per user per hour (expensive Sonnet call)
    const rateCheck = aiRateLimit(auth.user.id, "workspace-setup")
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } }
      )
    }

    if (!isClaudeConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "AI features are not configured. Please add ANTHROPIC_API_KEY to environment." },
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

    const { text } = await validateBody(request, parseWorkspaceSchema)

    // Parse with Claude Sonnet (best at structured extraction)
    const { result, usage } = await parseWorkspaceSetup(text.trim())

    // Record AI usage
    await recordUsage({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "workspace-setup",
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      reservationId: creditCheck.reservationId,
    })

    const totalItems =
      (result.members?.length || 0) +
      (result.clients?.length || 0) +
      (result.projects?.length || 0) +
      (result.rocks?.length || 0) +
      (result.tasks?.length || 0)

    logger.info(
      { orgId: auth.organization.id, totalItems, usage },
      "Workspace setup parsed successfully"
    )

    return NextResponse.json<ApiResponse<WorkspaceBuilderPayload>>({
      success: true,
      data: result,
      message: `Parsed ${totalItems} items from your text`,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Parse workspace error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to parse workspace data. Please try again." },
      { status: 500 }
    )
  }
})
