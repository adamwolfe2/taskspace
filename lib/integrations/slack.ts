/**
 * Slack Integration
 * Handles sending messages and notifications to Slack
 * Includes webhook signature verification for incoming requests
 */

import { createHmac, timingSafeEqual } from "crypto"
import { logger, logError } from "@/lib/logger"

// ============================================
// SLACK WEBHOOK SIGNATURE VERIFICATION
// ============================================

/**
 * Verify Slack webhook signature
 *
 * Implements Slack's request verification:
 * https://api.slack.com/authentication/verifying-requests-from-slack
 *
 * @param signature - x-slack-signature header value
 * @param timestamp - x-slack-request-timestamp header value
 * @param body - Raw request body string
 * @param signingSecret - Slack signing secret from app config
 * @returns true if signature is valid
 */
export function verifySlackSignature(
  signature: string,
  timestamp: string,
  body: string,
  signingSecret: string
): boolean {
  if (!signature || !timestamp || !body || !signingSecret) {
    return false
  }

  // Verify timestamp is within 5 minutes to prevent replay attacks
  const timestampSeconds = parseInt(timestamp, 10)
  const nowSeconds = Math.floor(Date.now() / 1000)
  const fiveMinutesAgo = nowSeconds - 60 * 5

  if (timestampSeconds < fiveMinutesAgo) {
    logger.warn({}, "Slack webhook: Request timestamp too old, possible replay attack")
    return false
  }

  // Create the signature base string
  const sigBaseString = `v0:${timestamp}:${body}`

  // Compute expected signature
  const expectedSignature = `v0=${createHmac("sha256", signingSecret)
    .update(sigBaseString)
    .digest("hex")}`

  // Use timing-safe comparison to prevent timing attacks
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

/**
 * Validate incoming Slack request headers
 *
 * @param request - Incoming request
 * @returns Validation result with extracted data
 */
export async function validateSlackRequest(
  request: Request
): Promise<{
  valid: boolean
  error?: string
  timestamp?: string
  body?: string
}> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) {
    return { valid: false, error: "SLACK_SIGNING_SECRET not configured" }
  }

  const signature = request.headers.get("x-slack-signature")
  const timestamp = request.headers.get("x-slack-request-timestamp")

  if (!signature) {
    return { valid: false, error: "Missing x-slack-signature header" }
  }

  if (!timestamp) {
    return { valid: false, error: "Missing x-slack-request-timestamp header" }
  }

  const body = await request.text()

  if (!verifySlackSignature(signature, timestamp, body, signingSecret)) {
    return { valid: false, error: "Invalid signature" }
  }

  return { valid: true, timestamp, body }
}

interface SlackMessage {
  text: string
  blocks?: SlackBlock[]
  channel?: string
  username?: string
  icon_emoji?: string
}

interface SlackTextObject {
  type: "mrkdwn" | "plain_text"
  text: string
  emoji?: boolean
}

interface SlackContextElement {
  type: "mrkdwn" | "plain_text" | "image"
  text?: string
  image_url?: string
  alt_text?: string
}

interface SlackButtonElement {
  type: "button"
  text: {
    type: "plain_text"
    text: string
    emoji?: boolean
  }
  action_id?: string
  url?: string
  value?: string
  style?: "primary" | "danger"
}

interface SlackBlock {
  type: "section" | "divider" | "header" | "actions" | "context"
  text?: SlackTextObject
  fields?: SlackTextObject[]
  elements?: SlackContextElement[] | SlackButtonElement[]
  accessory?: SlackButtonElement
}

/**
 * Send a message to Slack via webhook
 */
export async function sendSlackMessage(
  webhookUrl: string,
  message: SlackMessage
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      logger.error({ status: response.status, body: await response.text() }, "Slack webhook error")
      return false
    }

    return true
  } catch (error) {
    logError(logger, "Slack webhook error", error)
    return false
  }
}

/**
 * Build a task assignment notification for Slack
 */
export function buildTaskAssignmentMessage(
  assigneeName: string,
  taskTitle: string,
  taskDescription: string | undefined,
  priority: string,
  dueDate: string | null,
  assignedByName: string,
  context?: string
): SlackMessage {
  const priorityEmoji = {
    urgent: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🟢",
  }[priority] || "⚪"

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📋 New Task Assigned`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${taskTitle}*`,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Assigned To:*\n${assigneeName}`,
        },
        {
          type: "mrkdwn",
          text: `*Priority:*\n${priorityEmoji} ${priority.charAt(0).toUpperCase() + priority.slice(1)}`,
        },
        {
          type: "mrkdwn",
          text: `*Due Date:*\n${dueDate || "No due date"}`,
        },
        {
          type: "mrkdwn",
          text: `*Assigned By:*\n${assignedByName}`,
        },
      ],
    },
  ]

  if (taskDescription) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Description:*\n${taskDescription}`,
      },
    })
  }

  if (context) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `💡 _${context}_`,
        },
      ],
    })
  }

  return {
    text: `New task assigned to ${assigneeName}: ${taskTitle}`,
    blocks,
  }
}

/**
 * Build a daily digest notification for Slack
 */
export function buildDailyDigestMessage(
  date: string,
  summary: string,
  winsCount: number,
  blockersCount: number,
  teamSentiment: string,
  reportsAnalyzed: number
): SlackMessage {
  const sentimentEmoji = {
    positive: "😊",
    neutral: "😐",
    negative: "😟",
    mixed: "🤔",
  }[teamSentiment] || "❓"

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📊 Daily Team Digest - ${date}`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: summary,
      },
    },
    {
      type: "divider",
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Reports Analyzed:*\n${reportsAnalyzed}`,
        },
        {
          type: "mrkdwn",
          text: `*Team Sentiment:*\n${sentimentEmoji} ${teamSentiment}`,
        },
        {
          type: "mrkdwn",
          text: `*Wins:*\n✅ ${winsCount}`,
        },
        {
          type: "mrkdwn",
          text: `*Blockers:*\n🚫 ${blockersCount}`,
        },
      ],
    },
  ]

  return {
    text: `Daily Team Digest for ${date}`,
    blocks,
  }
}

/**
 * Build an escalation alert for Slack
 */
export function buildEscalationMessage(
  memberName: string,
  escalationNote: string,
  date: string
): SlackMessage {
  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🚨 Escalation Alert`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*From:* ${memberName}\n*Date:* ${date}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `> ${escalationNote}`,
      },
    },
  ]

  return {
    text: `Escalation from ${memberName}: ${escalationNote}`,
    blocks,
  }
}

/**
 * Build a blocker alert for Slack
 */
export function buildBlockerAlertMessage(
  memberName: string,
  blockerText: string,
  severity: string,
  daysOpen?: number
): SlackMessage {
  const severityEmoji = {
    high: "🔴",
    medium: "🟠",
    low: "🟡",
  }[severity] || "⚪"

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `⚠️ Blocker Detected`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Team Member:*\n${memberName}`,
        },
        {
          type: "mrkdwn",
          text: `*Severity:*\n${severityEmoji} ${severity}`,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Blocker:*\n${blockerText}`,
      },
    },
  ]

  if (daysOpen && daysOpen > 1) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `⏰ Open for ${daysOpen} days`,
        },
      ],
    })
  }

  return {
    text: `Blocker from ${memberName}: ${blockerText}`,
    blocks,
  }
}

/**
 * Build a full EOD report message for Slack
 * Includes the entire report content verbatim
 */
export function buildFullEODReportMessage(
  memberName: string,
  department: string,
  date: string,
  tasks: { id: string; text: string; rockId?: string | null; rockTitle?: string }[],
  challenges: string,
  tomorrowPriorities: { id: string; text: string; rockId?: string | null; rockTitle?: string }[],
  needsEscalation: boolean,
  escalationNote?: string | null
): SlackMessage {
  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📝 EOD Report - ${date}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Team Member:*\n${memberName}`,
        },
        {
          type: "mrkdwn",
          text: `*Department:*\n${department}`,
        },
      ],
    },
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*📋 Today's Accomplishments:*",
      },
    },
  ]

  // Group tasks by rock
  const tasksByRock: Record<string, typeof tasks> = {}
  for (const task of tasks) {
    const key = task.rockTitle || "General"
    if (!tasksByRock[key]) tasksByRock[key] = []
    tasksByRock[key].push(task)
  }

  for (const [rockTitle, rockTasks] of Object.entries(tasksByRock)) {
    let taskText = rockTitle !== "General" ? `*${rockTitle}:*\n` : ""
    taskText += rockTasks.map(t => `• ${t.text}`).join("\n")
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: taskText,
      },
    })
  }

  // Challenges
  if (challenges && challenges.trim()) {
    blocks.push(
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*⚠️ Challenges:*\n${challenges}`,
        },
      }
    )
  }

  // Tomorrow's Priorities
  if (tomorrowPriorities.length > 0) {
    blocks.push(
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*🎯 Tomorrow's Priorities:*",
        },
      }
    )

    // Group by rock
    const prioritiesByRock: Record<string, typeof tomorrowPriorities> = {}
    for (const priority of tomorrowPriorities) {
      const key = priority.rockTitle || "General"
      if (!prioritiesByRock[key]) prioritiesByRock[key] = []
      prioritiesByRock[key].push(priority)
    }

    for (const [rockTitle, rockPriorities] of Object.entries(prioritiesByRock)) {
      let priorityText = rockTitle !== "General" ? `*${rockTitle}:*\n` : ""
      priorityText += rockPriorities.map(p => `• ${p.text}`).join("\n")
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: priorityText,
        },
      })
    }
  }

  // Escalation
  if (needsEscalation && escalationNote) {
    blocks.push(
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🚨 ESCALATION:*\n> ${escalationNote}`,
        },
      }
    )
  }

  return {
    text: `EOD Report from ${memberName} (${date})`,
    blocks,
  }
}

/**
 * Check if Slack is configured for an organization
 */
export function isSlackConfigured(webhookUrl?: string): boolean {
  return !!webhookUrl && webhookUrl.startsWith("https://hooks.slack.com/")
}

/**
 * Build a consolidated daily digest message for Slack
 * Organized by rocks with progress bars and task summaries
 */
export function buildConsolidatedDigestMessage(
  date: string,
  formattedDate: string,
  totalReports: number,
  totalMembers: number,
  adminDigest: {
    memberName: string
    rocks: { title: string; progress: number; taskCount: number }[]
    blockerCount: number
    hasReport: boolean
  } | null,
  teamDigests: {
    memberName: string
    department?: string
    rocks: { title: string; progress: number; taskCount: number }[]
    blockerCount: number
    hasReport: boolean
  }[],
  missingMembers: string[]
): SlackMessage {
  const completionRate = Math.round((totalReports / totalMembers) * 100)

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📊 Daily Team Summary - ${formattedDate}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Reports Submitted:*\n${totalReports}/${totalMembers} (${completionRate}%)`,
        },
        {
          type: "mrkdwn",
          text: `*Missing Reports:*\n${missingMembers.length > 0 ? missingMembers.length : "None! 🎉"}`,
        },
      ],
    },
    {
      type: "divider",
    },
  ]

  // Admin's detailed report
  if (adminDigest && adminDigest.hasReport) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*👤 ${adminDigest.memberName}* (Your Report)`,
      },
    })

    if (adminDigest.rocks.length > 0) {
      let rockText = ""
      for (const rock of adminDigest.rocks) {
        const filledBlocks = Math.round(rock.progress / 10)
        const emptyBlocks = 10 - filledBlocks
        const progressBar = `${"█".repeat(filledBlocks)}${"░".repeat(emptyBlocks)}`
        rockText += `• *${rock.title}* - ${rock.progress}% \`${progressBar}\`\n`
        if (rock.taskCount > 0) {
          rockText += `  _${rock.taskCount} task${rock.taskCount > 1 ? "s" : ""} completed_\n`
        }
      }
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: rockText,
        },
      })
    }

    if (adminDigest.blockerCount > 0) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `🚧 ${adminDigest.blockerCount} blocker${adminDigest.blockerCount > 1 ? "s" : ""} reported`,
          },
        ],
      })
    }

    blocks.push({ type: "divider" })
  }

  // Team member summaries
  if (teamDigests.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*👥 Team Member Updates*",
      },
    })

    for (const member of teamDigests) {
      if (!member.hasReport) {
        continue // Skip members without reports in the team summary
      }

      let memberText = `*${member.memberName}*${member.department ? ` (${member.department})` : ""}\n`

      if (member.rocks.length > 0) {
        for (const rock of member.rocks.slice(0, 2)) { // Show top 2 rocks
          const emoji = rock.progress >= 75 ? "🟢" : rock.progress >= 50 ? "🟡" : rock.progress >= 25 ? "🟠" : "🔴"
          memberText += `${emoji} ${rock.title}: ${rock.progress}%`
          if (rock.taskCount > 0) {
            memberText += ` (${rock.taskCount} tasks)`
          }
          memberText += "\n"
        }
        if (member.rocks.length > 2) {
          memberText += `_...and ${member.rocks.length - 2} more rock${member.rocks.length > 3 ? "s" : ""}_\n`
        }
      }

      if (member.blockerCount > 0) {
        memberText += `🚧 ${member.blockerCount} blocker${member.blockerCount > 1 ? "s" : ""}\n`
      }

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: memberText,
        },
      })
    }
  }

  // Missing reports warning
  if (missingMembers.length > 0) {
    blocks.push({ type: "divider" })
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*⚠️ Missing EOD Reports*\n${missingMembers.join(", ")}`,
      },
    })
  }

  return {
    text: `Daily Team Summary for ${formattedDate}: ${totalReports}/${totalMembers} reports submitted`,
    blocks,
  }
}

/**
 * Build an EOD reminder message for Slack
 */
export function buildEODReminderMessage(
  missingMemberNames: string[],
  _organizationName: string
): SlackMessage {
  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📝 EOD Report Reminder",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Hey team! The following members haven't submitted their EOD report yet:`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: missingMemberNames.map(name => `• ${name}`).join("\n"),
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `⏰ Please submit your EOD report before end of day!`,
        },
      ],
    },
  ]

  return {
    text: `EOD Reminder: ${missingMemberNames.length} team member${missingMemberNames.length > 1 ? "s haven't" : " hasn't"} submitted their report`,
    blocks,
  }
}
