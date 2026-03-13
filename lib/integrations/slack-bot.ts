/**
 * Slack Bot Web API Client
 *
 * Wraps the Slack Web API using raw fetch calls for bot operations.
 * Includes rate limiting with exponential backoff and structured error handling.
 */

import { createHmac, timingSafeEqual } from "crypto"
import { logger, logError } from "@/lib/logger"

// ============================================
// CONSTANTS
// ============================================

const SLACK_API_BASE = "https://slack.com/api/"
const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 1000
const TIMESTAMP_MAX_AGE_SECONDS = 60 * 5

// ============================================
// TYPES
// ============================================

export interface SlackUser {
  id: string
  name: string
  real_name: string
  profile: {
    email?: string
    display_name?: string
    image_48?: string
  }
  deleted: boolean
  is_bot: boolean
}

export interface SlackMessage {
  channel: string
  ts: string
}

// ============================================
// BLOCK KIT TYPES
// ============================================

export interface SlackButton {
  type: "button"
  text: { type: "plain_text"; text: string; emoji?: boolean }
  action_id: string
  value?: string
  style?: "primary" | "danger"
}

export type SlackBlockElement = SlackButton

export interface SlackSectionBlock {
  type: "section"
  text: { type: "mrkdwn" | "plain_text"; text: string }
  accessory?: SlackBlockElement
}

export interface SlackDividerBlock {
  type: "divider"
}

export interface SlackActionsBlock {
  type: "actions"
  elements: SlackBlockElement[]
}

export interface SlackContextBlock {
  type: "context"
  elements: Array<{ type: "mrkdwn" | "plain_text"; text: string }>
}

export interface SlackHeaderBlock {
  type: "header"
  text: { type: "plain_text"; text: string }
}

export type SlackBlock =
  | SlackSectionBlock
  | SlackDividerBlock
  | SlackActionsBlock
  | SlackContextBlock
  | SlackHeaderBlock

// ============================================
// INTERNAL: SLACK API RESPONSE TYPES
// ============================================

interface SlackApiResponse {
  ok: boolean
  error?: string
}

interface SlackConversationsOpenResponse extends SlackApiResponse {
  channel?: { id: string }
}

interface SlackChatPostMessageResponse extends SlackApiResponse {
  channel?: string
  ts?: string
}

interface SlackUsersLookupByEmailResponse extends SlackApiResponse {
  user?: SlackUser
}

interface SlackUsersInfoResponse extends SlackApiResponse {
  user?: SlackUser
}

interface SlackUsersListResponse extends SlackApiResponse {
  members?: SlackUser[]
  response_metadata?: {
    next_cursor?: string
  }
}

interface SlackOAuthResponse extends SlackApiResponse {
  access_token?: string
  bot_user_id?: string
  team?: { id: string; name: string }
}

// ============================================
// INTERNAL: HTTP HELPER WITH RATE LIMITING
// ============================================

/**
 * Make a Slack API request with automatic retry on 429 (rate limited).
 * Uses exponential backoff and respects the Retry-After header.
 */
async function slackApiRequest<T extends SlackApiResponse>(
  method: string,
  endpoint: string,
  options: {
    token?: string
    body?: Record<string, unknown>
    formData?: URLSearchParams
  } = {}
): Promise<T> {
  const url = `${SLACK_API_BASE}${endpoint}`
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const headers: Record<string, string> = {}

      if (options.token) {
        headers["Authorization"] = `Bearer ${options.token}`
      }

      let bodyStr: string | undefined
      if (options.formData) {
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        bodyStr = options.formData.toString()
      } else if (options.body) {
        headers["Content-Type"] = "application/json; charset=utf-8"
        bodyStr = JSON.stringify(options.body)
      }

      const response = await fetch(url, {
        method,
        headers,
        body: bodyStr,
      })

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After")
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : INITIAL_BACKOFF_MS * Math.pow(2, attempt)

        logger.warn(
          { endpoint, attempt, waitMs },
          "Slack API rate limited, retrying"
        )

        if (attempt < MAX_RETRIES) {
          await sleep(waitMs)
          continue
        }
      }

      const data = (await response.json()) as T

      if (!data.ok) {
        logger.error(
          { endpoint, error: data.error },
          "Slack API returned error"
        )
      }

      return data
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      logError(logger, `Slack API request failed: ${endpoint}`, error, {
        attempt,
      })

      if (attempt < MAX_RETRIES) {
        await sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt))
        continue
      }
    }
  }

  throw lastError || new Error(`Slack API request failed after ${MAX_RETRIES} retries`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Open a DM conversation with a user, returns the channel ID.
 */
export async function openConversation(
  botToken: string,
  slackUserId: string
): Promise<string> {
  const response = await slackApiRequest<SlackConversationsOpenResponse>(
    "POST",
    "conversations.open",
    {
      token: botToken,
      body: { users: slackUserId },
    }
  )

  if (!response.ok || !response.channel?.id) {
    throw new Error(
      `Failed to open conversation with ${slackUserId}: ${response.error || "unknown error"}`
    )
  }

  return response.channel.id
}

/**
 * Send a DM to a user. Opens a conversation first if needed.
 */
export async function sendBotDM(
  botToken: string,
  slackUserId: string,
  blocks: SlackBlock[],
  text?: string
): Promise<SlackMessage> {
  const channelId = await openConversation(botToken, slackUserId)

  const response = await slackApiRequest<SlackChatPostMessageResponse>(
    "POST",
    "chat.postMessage",
    {
      token: botToken,
      body: {
        channel: channelId,
        blocks,
        text: text || "You have a new message",
      },
    }
  )

  if (!response.ok || !response.channel || !response.ts) {
    throw new Error(
      `Failed to send DM to ${slackUserId}: ${response.error || "unknown error"}`
    )
  }

  return {
    channel: response.channel,
    ts: response.ts,
  }
}

/**
 * Update an existing message (e.g. for changing confirmation buttons).
 */
export async function updateBotMessage(
  botToken: string,
  channel: string,
  ts: string,
  blocks: SlackBlock[],
  text?: string
): Promise<void> {
  const response = await slackApiRequest<SlackApiResponse>(
    "POST",
    "chat.update",
    {
      token: botToken,
      body: {
        channel,
        ts,
        blocks,
        text: text || "",
      },
    }
  )

  if (!response.ok) {
    throw new Error(
      `Failed to update message in ${channel}: ${response.error || "unknown error"}`
    )
  }
}

/**
 * Look up a Slack user by email (for auto-linking).
 * Returns null if the user is not found.
 */
export async function findSlackUserByEmail(
  botToken: string,
  email: string
): Promise<SlackUser | null> {
  const response = await slackApiRequest<SlackUsersLookupByEmailResponse>(
    "GET",
    `users.lookupByEmail?email=${encodeURIComponent(email)}`,
    { token: botToken }
  )

  if (!response.ok) {
    if (response.error === "users_not_found") {
      return null
    }
    logger.warn({ email, error: response.error }, "Failed to look up Slack user by email")
    return null
  }

  return response.user || null
}

/**
 * List all non-bot, non-deleted users in the workspace.
 * Handles cursor-based pagination.
 */
export async function listWorkspaceUsers(
  botToken: string
): Promise<SlackUser[]> {
  const allUsers: SlackUser[] = []
  let cursor: string | undefined

  do {
    const params = new URLSearchParams({ limit: "200" })
    if (cursor) {
      params.set("cursor", cursor)
    }

    const response = await slackApiRequest<SlackUsersListResponse>(
      "GET",
      `users.list?${params.toString()}`,
      { token: botToken }
    )

    if (!response.ok) {
      throw new Error(
        `Failed to list workspace users: ${response.error || "unknown error"}`
      )
    }

    if (response.members) {
      const activeHumans = response.members.filter(
        (user) => !user.is_bot && !user.deleted && user.id !== "USLACKBOT"
      )
      allUsers.push(...activeHumans)
    }

    cursor = response.response_metadata?.next_cursor || undefined
  } while (cursor)

  return allUsers
}

/**
 * Get a single user's info.
 * Returns null if not found.
 */
export async function getSlackUserInfo(
  botToken: string,
  slackUserId: string
): Promise<SlackUser | null> {
  const response = await slackApiRequest<SlackUsersInfoResponse>(
    "GET",
    `users.info?user=${encodeURIComponent(slackUserId)}`,
    { token: botToken }
  )

  if (!response.ok) {
    if (response.error === "user_not_found") {
      return null
    }
    logger.warn(
      { slackUserId, error: response.error },
      "Failed to get Slack user info"
    )
    return null
  }

  return response.user || null
}

/**
 * Exchange an OAuth code for a bot token.
 * Uses SLACK_CLIENT_ID and SLACK_CLIENT_SECRET from environment variables.
 */
export async function exchangeOAuthCode(
  code: string,
  redirectUri: string
): Promise<{
  ok: boolean
  access_token?: string
  bot_user_id?: string
  team?: { id: string; name: string }
  error?: string
}> {
  const clientId = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    logger.error(
      {},
      "SLACK_CLIENT_ID or SLACK_CLIENT_SECRET not configured"
    )
    return { ok: false, error: "missing_client_credentials" }
  }

  const formData = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  })

  const response = await slackApiRequest<SlackOAuthResponse>(
    "POST",
    "oauth.v2.access",
    { formData }
  )

  return {
    ok: response.ok,
    access_token: response.access_token,
    bot_user_id: response.bot_user_id,
    team: response.team,
    error: response.error,
  }
}

// ============================================
// REQUEST SIGNATURE VERIFICATION
// ============================================

/**
 * Verify an incoming Slack request signature.
 *
 * Implements Slack's request verification:
 * https://api.slack.com/authentication/verifying-requests-from-slack
 *
 * HMAC-SHA256 of `v0:{timestamp}:{body}` with the signing secret.
 * Rejects requests with timestamps older than 5 minutes.
 */
export function verifySlackRequest(
  signingSecret: string,
  timestamp: string,
  body: string,
  signature: string
): boolean {
  if (!signingSecret || !timestamp || !body || !signature) {
    return false
  }

  // Reject timestamps older than 5 minutes to prevent replay attacks
  const timestampSeconds = parseInt(timestamp, 10)
  const nowSeconds = Math.floor(Date.now() / 1000)

  if (timestampSeconds < nowSeconds - TIMESTAMP_MAX_AGE_SECONDS) {
    logger.warn({}, "Slack request: Timestamp too old, possible replay attack")
    return false
  }

  // Compute expected signature
  const sigBaseString = `v0:${timestamp}:${body}`
  const expectedSignature = `v0=${createHmac("sha256", signingSecret)
    .update(sigBaseString)
    .digest("hex")}`

  // Timing-safe comparison
  try {
    return timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expectedSignature, "utf8")
    )
  } catch {
    // Buffer lengths don't match
    return false
  }
}
