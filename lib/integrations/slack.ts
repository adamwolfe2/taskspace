/**
 * Slack Integration
 * Handles sending messages and notifications to Slack
 */

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
      console.error("Slack webhook error:", response.status, await response.text())
      return false
    }

    return true
  } catch (error) {
    console.error("Slack webhook error:", error)
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
  dueDate: string,
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
          text: `*Due Date:*\n${dueDate}`,
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
 * Check if Slack is configured for an organization
 */
export function isSlackConfigured(webhookUrl?: string): boolean {
  return !!webhookUrl && webhookUrl.startsWith("https://hooks.slack.com/")
}
