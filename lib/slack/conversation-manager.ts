/**
 * EOD Check-in Conversation Manager
 *
 * Core state machine that manages the lifecycle of Slack-based EOD check-in
 * conversations. Handles state transitions, message parsing, and report submission.
 *
 * State Machine:
 *   initiated -> awaiting_response -> parsing -> confirming -> submitted
 *                                                confirming -> awaiting_response (edit)
 *                awaiting_response -> snoozed (deleted, re-triggered by cron)
 *                awaiting_response -> cancelled (skip)
 *                any -> cancelled (cancel)
 *                any -> expired (4hr timeout)
 */

import { sql } from "@/lib/db/sql"
import { logger, logError } from "@/lib/logger"
import db from "@/lib/db"
import { parseEODTextDump, type ParsedEODReport } from "@/lib/ai/claude-client"
import { getCurrentQuarter } from "@/lib/utils/date-utils"
import { sendBotDM, updateBotMessage } from "@/lib/integrations/slack-bot"
import { buildUserContext } from "@/lib/slack/context-builder"
import {
  buildCheckinMessage,
  buildConfirmationMessage,
  buildSubmittedMessage,
  buildErrorMessage,
  buildLinkAccountMessage,
  buildAlreadySubmittedMessage,
} from "@/lib/slack/question-builder"
import { slackDb } from "@/lib/db/slack"
import type { EODReport } from "@/lib/types"

// ============================================
// CONSTANTS
// ============================================

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.trytaskspace.com"
const MAX_TEXT_LENGTH = 4000

// ============================================
// PUBLIC API
// ============================================

/**
 * Start a new check-in conversation with a user.
 * Called by the cron job when it's time for someone's reminder.
 *
 * Idempotent: if the user already has an active conversation today or
 * has already submitted a report, no new conversation is created.
 */
export async function startConversation(
  orgId: string,
  userId: string,
  slackUserId: string,
  botToken: string
): Promise<void> {
  const reportDate = getTodayDateString()

  try {
    // 1. Check if user already has an active conversation today (idempotent)
    const existingConversation = await slackDb.conversations.findActive(userId, reportDate)
    if (existingConversation) {
      logger.debug(
        { orgId, userId, conversationId: existingConversation.id },
        "startConversation: Active conversation already exists, skipping"
      )
      return
    }

    // 2. Check if user already submitted an EOD report today
    const alreadySubmitted = await hasSubmittedToday(orgId, userId, reportDate)
    if (alreadySubmitted) {
      logger.info({ orgId, userId }, "startConversation: User already submitted today")
      const { blocks, text } = buildAlreadySubmittedMessage(reportDate)
      await sendBotDM(botToken, slackUserId, blocks, text)
      return
    }

    // 3. Get user's default workspace
    const workspaceId = await getUserDefaultWorkspace(orgId, userId)

    // 4. Get org settings for context source config
    const org = await db.organizations.findById(orgId)
    const includeAsana = org?.settings?.slackBotIntegration?.contextSource === "taskspace_and_asana"

    // 5. Build user context (rocks, tasks, measurables)
    const context = await buildUserContext(orgId, userId, { includeAsana })

    // 6. Build and send the check-in message
    const { blocks, text } = buildCheckinMessage(context.userName, context)
    const message = await sendBotDM(botToken, slackUserId, blocks, text)

    // 7. Create conversation record in DB
    const conv = await slackDb.conversations.create({
      organizationId: orgId,
      userId,
      slackUserId,
      slackChannelId: message.channel,
      reportDate,
      rocksContext: context.rocks,
      workspaceId: workspaceId || undefined,
    })

    // Store the message timestamp for later updates
    await slackDb.conversations.updateState(conv.id, "awaiting_response", {
      messageTs: message.ts,
    })

    logger.info(
      { orgId, userId, slackUserId },
      "startConversation: Check-in conversation started"
    )
  } catch (error) {
    logError(logger, "startConversation: Failed to start conversation", error)
  }
}

/**
 * Handle an incoming DM message from a user.
 * Called by the events endpoint when a message.im event arrives.
 */
export async function handleUserMessage(
  orgId: string,
  slackUserId: string,
  channelId: string,
  text: string,
  botToken: string
): Promise<void> {
  try {
    // 1. Look up active conversation for this slack user
    const conversation = await slackDb.conversations.findBySlackUser(slackUserId)

    // 2. No active conversation
    if (!conversation) {
      await handleNoActiveConversation(orgId, slackUserId, botToken)
      return
    }

    // 3. Check for expired conversation
    if (isExpired(conversation.createdAt)) {
      await slackDb.conversations.updateState(conversation.id, "expired")
      await sendSimpleMessage(
        botToken,
        slackUserId,
        `This check-in has expired. You can submit your EOD report directly at ${APP_URL}`
      )
      return
    }

    // 4. Validate the message content
    const trimmedText = text.trim()
    if (!trimmedText || isEmojiOnly(trimmedText)) {
      await sendSimpleMessage(
        botToken,
        slackUserId,
        "Could you provide a bit more detail about what you worked on today? Even a few bullet points is great."
      )
      return
    }

    // 5. Truncate very long messages
    const safeText = trimmedText.length > MAX_TEXT_LENGTH
      ? trimmedText.slice(0, MAX_TEXT_LENGTH)
      : trimmedText

    // 6. Handle based on current state
    switch (conversation.state) {
      case "awaiting_response": {
        // Append text and trigger parsing
        const collectedText = conversation.collectedText
          ? `${conversation.collectedText}\n${safeText}`
          : safeText

        await slackDb.conversations.updateState(conversation.id, "parsing", {
          collectedText,
        })

        await parseAndConfirm(conversation.id, botToken, slackUserId)
        break
      }

      case "parsing": {
        // Bot is currently parsing; queue this message by appending to collected text
        const appendedText = conversation.collectedText
          ? `${conversation.collectedText}\n${safeText}`
          : safeText

        await slackDb.conversations.updateState(conversation.id, "parsing", {
          collectedText: appendedText,
        })

        logger.debug(
          { conversationId: conversation.id },
          "handleUserMessage: Message queued while parsing"
        )
        break
      }

      case "confirming": {
        // User sent additional text while in confirmation — treat as an edit
        const updatedText = conversation.collectedText
          ? `${conversation.collectedText}\n${safeText}`
          : safeText

        await slackDb.conversations.updateState(conversation.id, "parsing", {
          collectedText: updatedText,
        })

        await parseAndConfirm(conversation.id, botToken, slackUserId)
        break
      }

      default: {
        // submitted, cancelled, expired, snoozed — tell user
        await sendSimpleMessage(
          botToken,
          slackUserId,
          `This check-in is no longer active. You can submit your EOD report at ${APP_URL}`
        )
        break
      }
    }
  } catch (error) {
    logError(logger, "handleUserMessage: Failed to handle message", error)
    try {
      await sendSimpleMessage(
        botToken,
        slackUserId,
        "Sorry, something went wrong processing your message. Please try again or submit directly at " + APP_URL
      )
    } catch {
      // Best-effort error message — don't crash
    }
  }
}

/**
 * Handle a button action (Submit, Edit, Cancel, Skip, Snooze).
 * Called by the interactivity endpoint.
 */
export async function handleAction(
  actionId: string,
  conversationId: string,
  botToken: string,
  channelId: string,
  messageTs: string,
  slackUserId: string
): Promise<void> {
  try {
    const conversation = await slackDb.conversations.findBySlackUser(slackUserId)

    // Validate conversation exists and matches
    if (!conversation || conversation.id !== conversationId) {
      logger.warn(
        { actionId, conversationId, slackUserId },
        "handleAction: Conversation not found or mismatch"
      )
      return
    }

    // Check for expiration on any action
    if (isExpired(conversation.createdAt)) {
      await slackDb.conversations.updateState(conversation.id, "expired")
      const { blocks, text } = buildErrorMessage(
        `This check-in has expired. Submit directly at ${APP_URL}`
      )
      await updateBotMessage(botToken, channelId, messageTs, blocks, text)
      return
    }

    switch (actionId) {
      case "eod_submit":
        await handleSubmit(conversation, botToken, channelId, messageTs)
        break

      case "eod_edit":
        await handleEdit(conversation, botToken, channelId, messageTs)
        break

      case "eod_cancel":
        await handleCancel(conversation, botToken, channelId, messageTs)
        break

      case "eod_skip":
        await handleSkip(conversation, botToken, channelId, messageTs)
        break

      case "eod_snooze":
        await handleSnooze(conversation, botToken, channelId, messageTs)
        break

      default:
        logger.warn({ actionId, conversationId }, "handleAction: Unknown action")
        break
    }
  } catch (error) {
    logError(logger, "handleAction: Failed to handle action", error)
    try {
      const { blocks, text } = buildErrorMessage(
        "Something went wrong. Please try again or submit directly at " + APP_URL
      )
      await updateBotMessage(botToken, channelId, messageTs, blocks, text)
    } catch {
      // Best-effort error message
    }
  }
}

// ============================================
// INTERNAL: PARSE AND CONFIRM
// ============================================

/**
 * Parse the user's collected text with Claude and present a confirmation message.
 * The slackUserId is passed so we can send DMs back to the user.
 */
async function parseAndConfirm(
  conversationId: string,
  botToken: string,
  slackUserId: string
): Promise<void> {
  try {
    // Re-fetch conversation by ID to get the latest collected text
    const { rows } = await sql`
      SELECT * FROM slack_conversations WHERE id = ${conversationId} LIMIT 1
    `
    if (!rows[0]) {
      logger.error({ conversationId }, "parseAndConfirm: Conversation not found")
      return
    }

    const conv = rows[0]
    const collectedText = (conv.collected_text as string) || ""
    const userId = conv.user_id as string
    const orgId = conv.organization_id as string

    if (!collectedText.trim()) {
      await slackDb.conversations.updateState(conversationId, "awaiting_response")
      await sendSimpleMessage(
        botToken,
        slackUserId,
        "I didn't get any text to parse. Could you tell me what you worked on today?"
      )
      return
    }

    // Fetch rocks for the AI parser
    const rocks = await db.rocks.findByUserId(userId, orgId)
    const currentQuarter = getCurrentQuarter()

    // Parse with Claude
    const { result: parsedReport } = await parseEODTextDump(
      collectedText,
      rocks,
      currentQuarter
    )

    // Store parsed report
    await slackDb.conversations.updateState(conversationId, "confirming", {
      parsedReport: parsedReport as unknown as Record<string, unknown>,
    })

    // Build and send confirmation message
    const userName = await getUserName(userId)
    const { blocks, text } = buildConfirmationMessage(userName, {
      tasks: parsedReport.tasks,
      challenges: parsedReport.challenges,
      tomorrowPriorities: parsedReport.tomorrowPriorities,
      needsEscalation: parsedReport.needsEscalation,
      escalationNote: parsedReport.escalationNote,
      metricValue: parsedReport.metricValue,
    })

    await sendBotDM(botToken, slackUserId, blocks, text)

    logger.info(
      { conversationId, taskCount: parsedReport.tasks.length },
      "parseAndConfirm: Confirmation sent"
    )
  } catch (error) {
    logError(logger, "parseAndConfirm: Failed to parse", error)

    // Revert to awaiting_response so user can try again
    await slackDb.conversations.updateState(conversationId, "awaiting_response")

    try {
      await sendSimpleMessage(
        botToken,
        slackUserId,
        `Sorry, I had trouble parsing your update. Could you try rephrasing it? Or submit directly at ${APP_URL}`
      )
    } catch {
      // Best-effort
    }
  }
}

// ============================================
// INTERNAL: ACTION HANDLERS
// ============================================

interface ConversationRecord {
  id: string
  organizationId: string
  userId: string
  slackUserId: string
  slackChannelId: string
  messageTs?: string
  state: string
  reportDate: string
  collectedText?: string
  parsedReport?: Record<string, unknown>
  rocksContext?: unknown
  workspaceId?: string
  createdAt: string
}

async function handleSubmit(
  conversation: ConversationRecord,
  botToken: string,
  channelId: string,
  messageTs: string
): Promise<void> {
  if (conversation.state !== "confirming") {
    logger.warn(
      { conversationId: conversation.id, state: conversation.state },
      "handleSubmit: Not in confirming state"
    )
    return
  }

  const parsedReport = conversation.parsedReport as ParsedEODReport | undefined
  if (!parsedReport) {
    logger.error({ conversationId: conversation.id }, "handleSubmit: No parsed report")
    const { blocks, text } = buildErrorMessage("No report data found. Please try again.")
    await updateBotMessage(botToken, channelId, messageTs, blocks, text)
    return
  }

  // Create the EOD report
  const now = new Date().toISOString()
  const report: EODReport = {
    id: crypto.randomUUID(),
    organizationId: conversation.organizationId,
    workspaceId: conversation.workspaceId,
    userId: conversation.userId,
    date: conversation.reportDate,
    tasks: parsedReport.tasks.map((t) => ({
      id: crypto.randomUUID(),
      text: t.text,
      rockId: t.rockId || null,
      rockTitle: t.rockTitle || null,
    })),
    challenges: parsedReport.challenges,
    tomorrowPriorities: parsedReport.tomorrowPriorities.map((p) => ({
      id: crypto.randomUUID(),
      text: p.text,
      rockId: p.rockId || null,
      rockTitle: p.rockTitle || null,
    })),
    needsEscalation: parsedReport.needsEscalation,
    escalationNote: parsedReport.escalationNote,
    metricValueToday: parsedReport.metricValue,
    submittedAt: now,
    createdAt: now,
  }

  await db.eodReports.create(report)

  // Update conversation state
  await slackDb.conversations.updateState(conversation.id, "submitted")

  // Update Slack message with success
  const { blocks, text } = buildSubmittedMessage(conversation.reportDate)
  await updateBotMessage(botToken, channelId, messageTs, blocks, text)

  logger.info(
    { conversationId: conversation.id, reportId: report.id },
    "handleSubmit: EOD report submitted via Slack"
  )

  // If metric value was captured, try to upsert weekly metric entry
  if (parsedReport.metricValue !== null && parsedReport.metricValue !== undefined) {
    try {
      await upsertMetricFromEod(
        conversation.organizationId,
        conversation.userId,
        parsedReport.metricValue
      )
    } catch (error) {
      // Non-critical — log but don't fail the submission
      logError(logger, "handleSubmit: Failed to upsert metric", error)
    }
  }
}

async function handleEdit(
  conversation: ConversationRecord,
  botToken: string,
  channelId: string,
  messageTs: string
): Promise<void> {
  await slackDb.conversations.updateState(conversation.id, "awaiting_response")

  await updateBotMessage(
    botToken,
    channelId,
    messageTs,
    [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Got it, send me your updated info and I'll re-parse it.",
        },
      },
    ],
    "Send your updated EOD info"
  )
}

async function handleCancel(
  conversation: ConversationRecord,
  botToken: string,
  channelId: string,
  messageTs: string
): Promise<void> {
  await slackDb.conversations.updateState(conversation.id, "cancelled")

  await updateBotMessage(
    botToken,
    channelId,
    messageTs,
    [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `No worries! You can submit your EOD report anytime at ${APP_URL}`,
        },
      },
    ],
    "Check-in cancelled"
  )
}

async function handleSkip(
  conversation: ConversationRecord,
  botToken: string,
  channelId: string,
  messageTs: string
): Promise<void> {
  await slackDb.conversations.updateState(conversation.id, "cancelled")

  await updateBotMessage(
    botToken,
    channelId,
    messageTs,
    [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Skipped for today. See you tomorrow!",
        },
      },
    ],
    "Skipped for today"
  )
}

async function handleSnooze(
  conversation: ConversationRecord,
  botToken: string,
  channelId: string,
  messageTs: string
): Promise<void> {
  // Delete/cancel the conversation — the next cron run will re-trigger
  await slackDb.conversations.updateState(conversation.id, "snoozed")

  await updateBotMessage(
    botToken,
    channelId,
    messageTs,
    [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "I'll check back in an hour.",
        },
      },
    ],
    "Snoozed"
  )
}

// ============================================
// INTERNAL: HELPERS
// ============================================

/**
 * Handle the case when a user DMs the bot but has no active conversation.
 */
async function handleNoActiveConversation(
  orgId: string,
  slackUserId: string,
  botToken: string
): Promise<void> {
  // Check if this slack user is mapped to a Taskspace account
  const mapping = await slackDb.userMappings.findBySlackUserId(orgId, slackUserId)

  if (!mapping) {
    // User hasn't linked their account
    const { blocks, text } = buildLinkAccountMessage(APP_URL)
    await sendBotDM(botToken, slackUserId, blocks, text)
    return
  }

  // User is mapped but no active conversation
  await sendSimpleMessage(
    botToken,
    slackUserId,
    `No active check-in right now. Your next reminder will come at your scheduled time, or you can submit directly at ${APP_URL}`
  )
}

/**
 * Check if a user has already submitted an EOD report today.
 */
async function hasSubmittedToday(
  orgId: string,
  userId: string,
  reportDate: string
): Promise<boolean> {
  const { rows } = await sql`
    SELECT id FROM eod_reports
    WHERE organization_id = ${orgId}
      AND user_id = ${userId}
      AND date = ${reportDate}
    LIMIT 1
  `
  return rows.length > 0
}

/**
 * Get the user's first workspace in this org.
 */
async function getUserDefaultWorkspace(
  orgId: string,
  userId: string
): Promise<string | null> {
  const { rows } = await sql`
    SELECT wm.workspace_id
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE w.organization_id = ${orgId}
      AND wm.user_id = ${userId}
    ORDER BY wm.joined_at ASC
    LIMIT 1
  `
  return rows[0]?.workspace_id as string | null
}

/**
 * Get a user's display name.
 */
async function getUserName(userId: string): Promise<string> {
  const user = await db.users.findById(userId)
  return user?.name || "there"
}

/**
 * Get today's date as YYYY-MM-DD string.
 */
function getTodayDateString(): string {
  const now = new Date()
  return now.toISOString().split("T")[0]
}

/**
 * Check if a conversation has expired (4 hours since creation).
 */
function isExpired(createdAt: string): boolean {
  const created = new Date(createdAt).getTime()
  const fourHoursMs = 4 * 60 * 60 * 1000
  return Date.now() - created > fourHoursMs
}

/**
 * Check if a string is only emoji (no real text content).
 * Simple heuristic: if after removing emoji-like characters and whitespace, nothing remains.
 */
function isEmojiOnly(text: string): boolean {
  // Strip common emoji patterns, skin tone modifiers, ZWJ sequences, and whitespace
  const stripped = text
    .replace(/\p{Emoji_Presentation}|\p{Emoji}|\u200d|\ufe0f|\u20e3/gu, "")
    .replace(/\s/g, "")
  return stripped.length === 0
}

/**
 * Send a simple text-only message to a Slack user via DM.
 */
async function sendSimpleMessage(
  botToken: string,
  slackUserId: string,
  text: string
): Promise<void> {
  await sendBotDM(botToken, slackUserId, [
    {
      type: "section",
      text: { type: "mrkdwn", text },
    },
  ], text)
}

/**
 * Try to upsert a metric entry from the EOD report's metric value.
 * This updates the user's weekly scorecard metric for the current week.
 */
async function upsertMetricFromEod(
  orgId: string,
  userId: string,
  metricValue: number
): Promise<void> {
  // Find the user's active metric
  const { rows: metricRows } = await sql`
    SELECT tmm.id as metric_id
    FROM team_member_metrics tmm
    JOIN team_members tm ON tm.id = tmm.team_member_id
    WHERE tm.user_id = ${userId}
      AND tm.organization_id = ${orgId}
      AND tmm.is_active = true
    LIMIT 1
  `

  if (metricRows.length === 0) {
    logger.debug({ orgId, userId }, "upsertMetricFromEod: No active metric found")
    return
  }

  const metricId = metricRows[0].metric_id as string

  // Calculate the current week start (Monday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + mondayOffset)
  const weekStartStr = weekStart.toISOString().split("T")[0]

  // Upsert the metric entry for this week
  await sql`
    INSERT INTO metric_entries (id, metric_id, week_start, value, created_at, updated_at)
    VALUES (
      ${crypto.randomUUID()},
      ${metricId},
      ${weekStartStr},
      ${metricValue},
      ${now.toISOString()},
      ${now.toISOString()}
    )
    ON CONFLICT (metric_id, week_start)
    DO UPDATE SET value = ${metricValue}, updated_at = ${now.toISOString()}
  `

  logger.info(
    { orgId, userId, metricId, metricValue, weekStart: weekStartStr },
    "upsertMetricFromEod: Metric entry upserted"
  )
}
