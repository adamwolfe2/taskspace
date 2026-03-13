import { NextRequest, NextResponse } from "next/server"
import { slackDb } from "@/lib/db/slack"
import { verifySlackRequest } from "@/lib/integrations/slack-bot"
import { decryptToken } from "@/lib/crypto/token-encryption"
import { handleUserMessage } from "@/lib/slack/conversation-manager"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/slack/events
 * Slack Events API webhook handler
 *
 * No auth middleware - verified via Slack request signature.
 * Must respond within 3 seconds to avoid retries.
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text()

    // Parse the JSON body early so we can handle the challenge before signature check
    const body = JSON.parse(rawBody)

    // Handle URL verification challenge (used during Slack app setup).
    // This must run before signature verification so the challenge succeeds
    // even if SLACK_SIGNING_SECRET hasn't been configured yet.
    if (body.type === "url_verification") {
      logger.info("Slack URL verification challenge received")
      return NextResponse.json({ challenge: body.challenge })
    }

    // Check for retries - Slack sends X-Slack-Retry-Num on retries
    const retryNum = request.headers.get("x-slack-retry-num")
    const retryReason = request.headers.get("x-slack-retry-reason")
    if (retryNum) {
      logger.info(
        { retryNum, retryReason },
        "Slack event retry received, acknowledging"
      )
      // Acknowledge retries immediately to stop further retries
      return NextResponse.json({ ok: true })
    }

    // Verify Slack signature for all non-challenge requests
    const signature = request.headers.get("x-slack-signature") || ""
    const timestamp = request.headers.get("x-slack-request-timestamp") || ""

    const signingSecret = process.env.SLACK_SIGNING_SECRET || ""
    const isValid = verifySlackRequest(signingSecret, timestamp, rawBody, signature)
    if (!isValid) {
      logger.warn("Slack events: invalid request signature")
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      )
    }

    // Handle event callbacks
    if (body.type === "event_callback") {
      const event = body.event

      // Only handle direct messages
      if (event?.type === "message" && event?.channel_type === "im") {
        // Ignore bot messages
        if (event.bot_id || event.app_id) {
          return NextResponse.json({ ok: true })
        }

        // Ignore message subtypes (edits, deletes, etc.)
        if (event.subtype) {
          return NextResponse.json({ ok: true })
        }

        // Process the message - do this quickly to stay within 3 second window
        try {
          const teamId = body.team_id
          if (!teamId) {
            logger.warn("Slack event missing team_id")
            return NextResponse.json({ ok: true })
          }

          // Look up the installation for this team
          const installation = await slackDb.installations.findByTeamId(teamId)
          if (!installation) {
            logger.warn({ teamId }, "Slack event: no installation found for team")
            return NextResponse.json({ ok: true })
          }

          if (!installation.enabled) {
            logger.info({ teamId }, "Slack event: installation is disabled")
            return NextResponse.json({ ok: true })
          }

          // Ignore messages from our own bot
          if (event.user === installation.botUserId) {
            return NextResponse.json({ ok: true })
          }

          // Bot token is already decrypted by the DB layer
          const botToken = installation.botToken

          // Handle the user message
          await handleUserMessage(
            installation.organizationId,
            event.user,
            event.channel,
            event.text || "",
            botToken
          )
        } catch (messageError) {
          // Log but don't fail - we need to return 200 to Slack
          logError(logger, "Error processing Slack DM", messageError)
        }
      }

      return NextResponse.json({ ok: true })
    }

    // Unknown event type
    logger.warn({ type: body.type }, "Slack events: unknown event type")
    return NextResponse.json({ ok: true })
  } catch (error) {
    logError(logger, "Slack events webhook error", error)
    // Still return 200 to prevent Slack from retrying on our errors
    return NextResponse.json({ ok: true })
  }
}
