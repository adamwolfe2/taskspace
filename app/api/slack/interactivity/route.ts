import { NextRequest, NextResponse } from "next/server"
import { slackDb } from "@/lib/db/slack"
import { verifySlackRequest } from "@/lib/integrations/slack-bot"

import { handleAction } from "@/lib/slack/conversation-manager"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/slack/interactivity
 * Slack Interactivity handler for button actions
 *
 * No auth middleware - verified via Slack request signature.
 * Body is form-encoded: payload=JSON.stringify({...})
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text()

    // Verify Slack signature
    const signature = request.headers.get("x-slack-signature") || ""
    const timestamp = request.headers.get("x-slack-request-timestamp") || ""

    const signingSecret = process.env.SLACK_SIGNING_SECRET || ""
    const isValid = verifySlackRequest(signingSecret, timestamp, rawBody, signature)
    if (!isValid) {
      logger.warn("Slack interactivity: invalid request signature")
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      )
    }

    // Parse the form-encoded payload
    const params = new URLSearchParams(rawBody)
    const payloadStr = params.get("payload")

    if (!payloadStr) {
      logger.warn("Slack interactivity: missing payload")
      return NextResponse.json(
        { error: "Missing payload" },
        { status: 400 }
      )
    }

    const payload = JSON.parse(payloadStr)

    // Extract the action
    const actions = payload.actions
    if (!actions || actions.length === 0) {
      logger.warn("Slack interactivity: no actions in payload")
      return NextResponse.json({ ok: true })
    }

    const action = actions[0]
    const actionId = action.action_id
    const conversationId = action.value // conversation ID is stored in the button value

    if (!actionId || !conversationId) {
      logger.warn(
        { actionId, conversationId },
        "Slack interactivity: missing action_id or value"
      )
      return NextResponse.json({ ok: true })
    }

    // Look up installation from team ID
    const teamId = payload.team?.id
    if (!teamId) {
      logger.warn("Slack interactivity: missing team.id in payload")
      return NextResponse.json({ ok: true })
    }

    const installation = await slackDb.installations.findByTeamId(teamId)
    if (!installation) {
      logger.warn({ teamId }, "Slack interactivity: no installation found for team")
      return NextResponse.json({ ok: true })
    }

    if (!installation.enabled) {
      logger.info({ teamId }, "Slack interactivity: installation is disabled")
      return NextResponse.json({ ok: true })
    }

    // Bot token is already decrypted by the DB layer
    const botToken = installation.botToken

    // Handle the action
    await handleAction(
      actionId,
      conversationId,
      botToken,
      payload.channel?.id,
      payload.message?.ts,
      payload.user?.id
    )

    logger.info(
      { actionId, conversationId, teamId, slackUserId: payload.user?.id },
      "Slack interactivity action processed"
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    logError(logger, "Slack interactivity webhook error", error)
    // Return 200 to prevent Slack from showing an error to the user
    return NextResponse.json({ ok: true })
  }
}
