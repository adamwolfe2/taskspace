/**
 * EOD Check-in Question & Message Builder
 *
 * Builds Slack Block Kit messages for each stage of the EOD check-in conversation:
 * initial prompt, confirmation, success, error, and account linking.
 */

import type { SlackBlock } from "@/lib/integrations/slack-bot"
import type { UserCheckinContext } from "./context-builder"

// ============================================
// TYPES
// ============================================

interface MessageResult {
  blocks: SlackBlock[]
  text: string // Fallback text for notifications
}

interface ParsedReport {
  tasks: Array<{ text: string; rockTitle?: string | null }>
  challenges: string
  tomorrowPriorities: Array<{ text: string; rockTitle?: string | null }>
  needsEscalation: boolean
  escalationNote?: string | null
  metricValue?: number | null
}

// ============================================
// CHECK-IN MESSAGE
// ============================================

/**
 * Build the initial check-in DM sent to the user.
 * Includes personalized greeting, rock context, Asana context, and action buttons.
 */
export function buildCheckinMessage(
  userName: string,
  context: UserCheckinContext
): MessageResult {
  const blocks: SlackBlock[] = []

  // Header greeting
  blocks.push({
    type: "header",
    text: { type: "plain_text", text: `Hey ${userName}! Time for your end-of-day check-in.` },
  })

  // Rocks section
  if (context.rocks.length > 0) {
    const rockLines = context.rocks
      .map((rock, i) => {
        const statusIcon = rockStatusIcon(rock.status)
        return `${i + 1}. ${statusIcon} "${rock.title}" (${rock.progress}% complete)`
      })
      .join("\n")

    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Your current rocks:*\n${rockLines}` },
    })
  }

  // Asana context
  if (context.asanaTasks) {
    const { completedToday, inProgress, blocked } = context.asanaTasks

    if (completedToday.length > 0) {
      const lines = completedToday.map((t) => `- ${t.name}`).join("\n")
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*From Asana today, I see you completed:*\n${lines}`,
        },
      })
    }

    if (inProgress.length > 0) {
      const lines = inProgress.map((t) => `- ${t.name}`).join("\n")
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `*In progress:*\n${lines}` },
      })
    }

    if (blocked.length > 0) {
      const lines = blocked.map((t) => `- ${t.name}`).join("\n")
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `*Blocked:*\n${lines}` },
      })
    }
  }

  // Open tasks reminder (up to 5 shown)
  if (context.openTasks.length > 0) {
    const taskLines = context.openTasks.slice(0, 5).map((t) => {
      const due = t.dueDate ? ` (due ${t.dueDate})` : ""
      const rock = t.rockTitle ? ` [${t.rockTitle}]` : ""
      return `- ${t.title}${rock}${due}`
    })
    const remaining = context.openTasks.length > 5 ? `\n_...and ${context.openTasks.length - 5} more_` : ""
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Open tasks:*\n${taskLines.join("\n")}${remaining}`,
      },
    })
  }

  // Weekly measurable
  if (context.weeklyMeasurable) {
    const { metricName, weeklyGoal } = context.weeklyMeasurable
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Your weekly measurable: *${metricName}* (goal: ${weeklyGoal})`,
        },
      ],
    })
  }

  blocks.push({ type: "divider" })

  // Instructions
  let instructions =
    "Just tell me about your day \u2014 what you accomplished, any challenges, and what's planned for tomorrow. I'll organize it into your EOD report."
  if (context.weeklyMeasurable) {
    instructions += `\n\nAlso, what's your *${context.weeklyMeasurable.metricName}* number for today?`
  }
  blocks.push({
    type: "section",
    text: { type: "mrkdwn", text: instructions },
  })

  // Action buttons
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "Skip Today", emoji: true },
        action_id: "eod_skip",
        style: "danger",
      },
      {
        type: "button",
        text: { type: "plain_text", text: "Snooze 1hr", emoji: true },
        action_id: "eod_snooze",
      },
    ],
  })

  return {
    blocks,
    text: `Hey ${userName}! Time for your end-of-day check-in.`,
  }
}

// ============================================
// CONFIRMATION MESSAGE
// ============================================

/**
 * Build the confirmation message shown after the AI parses the user's free-text response.
 * Displays the structured report for review before submission.
 */
export function buildConfirmationMessage(
  userName: string,
  parsedReport: ParsedReport
): MessageResult {
  const blocks: SlackBlock[] = []

  blocks.push({
    type: "header",
    text: { type: "plain_text", text: "Here's what I captured from your update:" },
  })

  // Today's accomplishments
  if (parsedReport.tasks.length > 0) {
    const taskLines = parsedReport.tasks
      .map((t) => {
        const rock = t.rockTitle ? ` [${t.rockTitle}]` : ""
        return `- ${t.text}${rock}`
      })
      .join("\n")
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Today's Accomplishments:*\n${taskLines}` },
    })
  }

  // Challenges
  if (parsedReport.challenges) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Challenges:*\n${parsedReport.challenges}` },
    })
  }

  // Tomorrow's priorities
  if (parsedReport.tomorrowPriorities.length > 0) {
    const priorityLines = parsedReport.tomorrowPriorities
      .map((p, i) => {
        const rock = p.rockTitle ? ` [${p.rockTitle}]` : ""
        return `${i + 1}. ${p.text}${rock}`
      })
      .join("\n")
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Tomorrow's Priorities:*\n${priorityLines}` },
    })
  }

  // Escalation
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: parsedReport.needsEscalation
        ? `*Escalation Needed:* Yes\n${parsedReport.escalationNote || ""}`
        : "*Escalation Needed:* No",
    },
  })

  // Metric value
  if (parsedReport.metricValue !== undefined && parsedReport.metricValue !== null) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `*Metric value:* ${parsedReport.metricValue}` }],
    })
  }

  blocks.push({ type: "divider" })

  blocks.push({
    type: "section",
    text: { type: "mrkdwn", text: "Does this look right?" },
  })

  // Action buttons
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "Submit \u2713", emoji: true },
        action_id: "eod_submit",
        style: "primary",
      },
      {
        type: "button",
        text: { type: "plain_text", text: "Edit \u270f\ufe0f", emoji: true },
        action_id: "eod_edit",
      },
      {
        type: "button",
        text: { type: "plain_text", text: "Cancel \u2717", emoji: true },
        action_id: "eod_cancel",
        style: "danger",
      },
    ],
  })

  return {
    blocks,
    text: `${userName}, here's your EOD report for review.`,
  }
}

// ============================================
// SUBMITTED MESSAGE
// ============================================

/**
 * Build the success message shown after the report has been submitted.
 */
export function buildSubmittedMessage(reportDate: string): MessageResult {
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `\u2705 *EOD report submitted for ${reportDate}.* Great work today! Have a good evening.`,
      },
    },
  ]

  return {
    blocks,
    text: `EOD report submitted for ${reportDate}.`,
  }
}

// ============================================
// ERROR MESSAGE
// ============================================

/**
 * Build an error message with red-tinted formatting and a retry suggestion.
 */
export function buildErrorMessage(error: string): MessageResult {
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `\u26a0\ufe0f *Something went wrong:*\n${error}\n\nPlease try again or type "help" if you need assistance.`,
      },
    },
  ]

  return {
    blocks,
    text: `Error: ${error}`,
  }
}

// ============================================
// LINK ACCOUNT MESSAGE
// ============================================

/**
 * Build a message prompting the user to link their Slack account to Taskspace.
 */
export function buildLinkAccountMessage(appUrl: string): MessageResult {
  const settingsUrl = `${appUrl}/settings/integrations`

  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "It looks like your Slack account isn't linked to Taskspace yet. To receive EOD check-ins, please link your account in your organization settings.",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Steps:*\n1. Go to <${settingsUrl}|Taskspace Integrations Settings>\n2. Find the *Slack Bot* section\n3. Click *Link Account* and authorize access\n\nOnce linked, I'll be able to send you daily check-in prompts.`,
      },
    },
  ]

  return {
    blocks,
    text: "Please link your Slack account to Taskspace to receive EOD check-ins.",
  }
}

// ============================================
// ALREADY SUBMITTED MESSAGE
// ============================================

/**
 * Build a message for users who have already submitted an EOD report for the given date.
 */
export function buildAlreadySubmittedMessage(reportDate: string): MessageResult {
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `\ud83d\udc4d You've already submitted your EOD report for *${reportDate}*. If you need to make changes, you can update it from the Taskspace dashboard.`,
      },
    },
  ]

  return {
    blocks,
    text: `You've already submitted your EOD report for ${reportDate}.`,
  }
}

// ============================================
// HELPERS
// ============================================

function rockStatusIcon(status: string): string {
  switch (status) {
    case "on-track":
      return "\ud83d\udfe2"
    case "at-risk":
      return "\ud83d\udfe1"
    case "blocked":
      return "\ud83d\udd34"
    case "completed":
      return "\u2705"
    default:
      return "\u26aa"
  }
}
