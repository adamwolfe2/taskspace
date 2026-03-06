/**
 * Email Integration using Resend
 * Handles all email notifications for Taskspace
 */

import { Resend } from "resend"
import { createHmac } from "crypto"
import type { EODReport, DailyDigest, TeamMember, AIGeneratedTask } from "../types"
import { logger, logError } from "../logger"

// Initialize Resend client
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }
  return new Resend(apiKey)
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

const FROM_EMAIL = process.env.EMAIL_FROM || "Taskspace <team@trytaskspace.com>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.trytaskspace.com"

/**
 * Generate a signed HMAC token for one-click unsubscribe links.
 * Prevents anyone who knows a user's email from unsubscribing them.
 */
function generateUnsubscribeToken(email: string): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) return ""
  return createHmac("sha256", secret).update(email.toLowerCase()).digest("hex").slice(0, 32)
}

/**
 * Build a signed unsubscribe URL for email footers.
 */
function buildUnsubscribeUrl(email: string): string {
  const token = generateUnsubscribeToken(email)
  const params = new URLSearchParams({ email })
  if (token) params.set("token", token)
  return `${APP_URL}/api/unsubscribe?${params.toString()}`
}

/**
 * Verify a token from an unsubscribe link. Exported for use in the unsubscribe route.
 * Returns true if the token is valid, or if AUTH_SECRET is not configured (graceful degradation).
 */
export function verifyUnsubscribeToken(email: string, token: string | null): boolean {
  const secret = process.env.AUTH_SECRET
  if (!secret) return false // Fail closed: no secret means no valid tokens
  if (!token) return false
  const expected = createHmac("sha256", secret).update(email.toLowerCase()).digest("hex").slice(0, 32)
  return token === expected
}

interface EmailResult {
  success: boolean
  id?: string
  error?: string
}

/**
 * Escape HTML special characters to prevent XSS attacks
 * Must be used on all user-generated content in email templates
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * Send an escalation notification to admins
 */
export async function sendEscalationNotification(
  report: EODReport,
  member: TeamMember,
  admins: TeamMember[]
): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    logger.debug("Email not configured, skipping escalation notification")
    return { success: false, error: "Email not configured" }
  }

  const adminEmails = admins.map(a => a.email)
  if (adminEmails.length === 0) {
    return { success: false, error: "No admin emails found" }
  }

  const subject = `🚨 Escalation Required: ${escapeHtml(member.name)} - ${report.date}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Escalation Required</h1>
  </div>

  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 20px; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0;"><strong>${escapeHtml(member.name)}</strong> (${escapeHtml(member.department)}) has flagged their EOD report for escalation.</p>

    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <h3 style="margin: 0 0 8px 0; color: #dc2626;">Escalation Note:</h3>
      <p style="margin: 0; color: #991b1b;">${escapeHtml(report.escalationNote || "No specific details provided")}</p>
    </div>

    <h3 style="margin: 20px 0 10px 0;">Today's Tasks:</h3>
    <ul style="margin: 0; padding-left: 20px;">
      ${report.tasks?.map(t => `<li>${escapeHtml(t.text)}</li>`).join("") || "<li>No tasks listed</li>"}
    </ul>

    ${report.challenges ? `
    <h3 style="margin: 20px 0 10px 0;">Challenges:</h3>
    <p style="margin: 0; color: #666;">${escapeHtml(report.challenges)}</p>
    ` : ""}

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <a href="${APP_URL}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">View in Dashboard</a>
    </div>

    <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
      Sent from Taskspace • ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
    </p>
  </div>
</body>
</html>
`

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmails,
      subject,
      html,
    })

    if (result.error) {
      logger.error({ error: result.error.message }, "Escalation notification failed")
      return { success: false, error: result.error.message }
    }

    logger.info({ emailId: result.data?.id }, "Escalation notification sent")
    return { success: true, id: result.data?.id }
  } catch (error) {
    logError(logger, "Escalation notification error", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * Send a daily EOD summary email to admins
 */
export async function sendDailySummaryEmail(
  digest: DailyDigest,
  teamMembers: TeamMember[],
  admins: TeamMember[],
  missingMembers: TeamMember[]
): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    logger.debug("Email not configured, skipping daily summary")
    return { success: false, error: "Email not configured" }
  }

  const adminEmails = admins.map(a => a.email)
  if (adminEmails.length === 0) {
    return { success: false, error: "No admin emails found" }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
  }

  const sentimentEmoji = {
    positive: "😊",
    neutral: "😐",
    negative: "😟",
    mixed: "🤔",
  }

  const subject = `📊 Daily Team Summary: ${formatDate(digest.digestDate)} (${digest.reportsAnalyzed} reports)`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    Daily team accountability digest for ${formatDate(digest.digestDate)}
  </div>
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📊 Daily Team Summary</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${formatDate(digest.digestDate)}</p>
  </div>

  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 20px; border-radius: 0 0 8px 8px;">
    <!-- Stats Bar -->
    <div style="display: flex; gap: 20px; margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 8px;">
      <div style="text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${digest.reportsAnalyzed}</div>
        <div style="font-size: 12px; color: #64748b;">Reports</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 24px;">${sentimentEmoji[digest.teamSentiment]}</div>
        <div style="font-size: 12px; color: #64748b;">Mood: ${digest.teamSentiment}</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: ${digest.blockers?.length > 0 ? "#dc2626" : "#22c55e"};">${digest.blockers?.length || 0}</div>
        <div style="font-size: 12px; color: #64748b;">Blockers</div>
      </div>
    </div>

    <!-- Summary -->
    <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0;">${escapeHtml(digest.summary)}</p>
    </div>

    ${digest.wins && digest.wins.length > 0 ? `
    <!-- Wins -->
    <h3 style="margin: 20px 0 10px 0; color: #22c55e;">✅ Wins (${digest.wins.length})</h3>
    <ul style="margin: 0; padding-left: 20px;">
      ${digest.wins.map(w => `<li><strong>${escapeHtml(w.memberName)}:</strong> ${escapeHtml(w.text)}</li>`).join("")}
    </ul>
    ` : ""}

    ${digest.blockers && digest.blockers.length > 0 ? `
    <!-- Blockers -->
    <h3 style="margin: 20px 0 10px 0; color: #dc2626;">🚧 Blockers (${digest.blockers.length})</h3>
    <ul style="margin: 0; padding-left: 20px;">
      ${digest.blockers.map(b => `<li><strong>${escapeHtml(b.memberName)}:</strong> ${escapeHtml(b.text)} <span style="color: ${b.severity === "high" ? "#dc2626" : b.severity === "medium" ? "#f59e0b" : "#6b7280"};">[${b.severity}]</span></li>`).join("")}
    </ul>
    ` : ""}

    ${digest.concerns && digest.concerns.length > 0 ? `
    <!-- Concerns -->
    <h3 style="margin: 20px 0 10px 0; color: #f59e0b;">⚠️ Concerns</h3>
    <ul style="margin: 0; padding-left: 20px;">
      ${digest.concerns.map(c => `<li>${escapeHtml(c.text)} <span style="color: #9ca3af;">(${escapeHtml(c.type)})</span></li>`).join("")}
    </ul>
    ` : ""}

    ${digest.followUps && digest.followUps.length > 0 ? `
    <!-- Follow-ups -->
    <h3 style="margin: 20px 0 10px 0; color: #3b82f6;">💬 Suggested Follow-ups</h3>
    <ul style="margin: 0; padding-left: 20px;">
      ${digest.followUps.map(f => `<li><strong>${escapeHtml(f.targetMemberName)}:</strong> ${escapeHtml(f.text)}</li>`).join("")}
    </ul>
    ` : ""}

    ${missingMembers.length > 0 ? `
    <!-- Missing Reports -->
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <h4 style="margin: 0 0 8px 0; color: #92400e;">📝 Missing EOD Reports</h4>
      <p style="margin: 0; color: #78350f;">${missingMembers.map(m => escapeHtml(m.name)).join(", ")}</p>
    </div>
    ` : ""}

    ${digest.challengeQuestions && digest.challengeQuestions.length > 0 ? `
    <!-- Challenge Questions -->
    <div style="background: #faf5ff; border-left: 4px solid #9333ea; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <h4 style="margin: 0 0 8px 0; color: #7c3aed;">🤔 Questions to Consider</h4>
      <ul style="margin: 0; padding-left: 20px; color: #6b21a8;">
        ${digest.challengeQuestions.map(q => `<li>${escapeHtml(q)}</li>`).join("")}
      </ul>
    </div>
    ` : ""}

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <a href="${APP_URL}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">View Full Dashboard</a>
    </div>

    <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
      Sent from Taskspace • Generated at ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
    </p>
  </div>
</body>
</html>
`

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmails,
      subject,
      html,
    })

    if (result.error) {
      logger.error({ error: result.error.message }, "Daily summary email failed")
      return { success: false, error: result.error.message }
    }

    logger.info({ emailId: result.data?.id }, "Daily summary email sent")
    return { success: true, id: result.data?.id }
  } catch (error) {
    logError(logger, "Daily summary email error", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * Send an alert email to admins about AI-detected concerns
 */
export async function sendAIAlertEmail(
  alertType: "sentiment" | "blocker" | "pattern",
  memberName: string,
  memberDepartment: string,
  alertMessage: string,
  details: string,
  admins: TeamMember[]
): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    logger.debug("Email not configured, skipping AI alert")
    return { success: false, error: "Email not configured" }
  }

  const adminEmails = admins.map(a => a.email)
  if (adminEmails.length === 0) {
    return { success: false, error: "No admin emails found" }
  }

  const alertColors = {
    sentiment: { bg: "#fef2f2", border: "#ef4444", emoji: "😟" },
    blocker: { bg: "#fef3c7", border: "#f59e0b", emoji: "🚧" },
    pattern: { bg: "#f0f9ff", border: "#3b82f6", emoji: "📊" },
  }

  const color = alertColors[alertType]
  const subject = `${color.emoji} AI Alert: ${alertType.charAt(0).toUpperCase() + alertType.slice(1)} detected for ${escapeHtml(memberName)}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: ${color.border}; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${color.emoji} AI Alert: ${alertType.charAt(0).toUpperCase() + alertType.slice(1)}</h1>
  </div>

  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 20px; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0;"><strong>${escapeHtml(memberName)}</strong> (${escapeHtml(memberDepartment)})</p>

    <div style="background: ${color.bg}; border-left: 4px solid ${color.border}; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <h3 style="margin: 0 0 8px 0;">Alert:</h3>
      <p style="margin: 0;">${escapeHtml(alertMessage)}</p>
    </div>

    <h3 style="margin: 20px 0 10px 0;">Details:</h3>
    <p style="margin: 0; color: #666;">${escapeHtml(details)}</p>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <a href="${APP_URL}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">View in Dashboard</a>
    </div>

    <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
      AI-generated alert from Taskspace • ${new Date().toLocaleString("en-US")}
    </p>
  </div>
</body>
</html>
`

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmails,
      subject,
      html,
    })

    if (result.error) {
      logger.error({ error: result.error.message }, "AI alert email failed")
      return { success: false, error: result.error.message }
    }

    logger.info({ emailId: result.data?.id }, "AI alert email sent")
    return { success: true, id: result.data?.id }
  } catch (error) {
    logError(logger, "AI alert email error", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * Send a task assignment notification
 */
export async function sendTaskAssignmentEmail(
  task: AIGeneratedTask,
  assignee: TeamMember,
  assignedBy: TeamMember
): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    logger.debug("Email not configured, skipping task notification")
    return { success: false, error: "Email not configured" }
  }

  const subject = `📋 New Task Assigned: ${escapeHtml(task.title)}`

  const priorityColors = {
    low: "#22c55e",
    medium: "#f59e0b",
    high: "#ef4444",
    urgent: "#dc2626",
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📋 New Task Assigned</h1>
  </div>

  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 20px; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0;">Hi ${escapeHtml(assignee.name)},</p>
    <p>${escapeHtml(assignedBy.name)} has assigned you a new task:</p>

    <div style="background: #f8fafc; border: 1px solid #e5e7eb; padding: 16px; margin: 20px 0; border-radius: 8px;">
      <h2 style="margin: 0 0 8px 0;">${escapeHtml(task.title)}</h2>
      ${task.description ? `<p style="margin: 0 0 12px 0; color: #666;">${escapeHtml(task.description)}</p>` : ""}
      <div style="display: flex; gap: 16px; margin-top: 12px;">
        <span style="background: ${priorityColors[task.priority]}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 500;">${task.priority.toUpperCase()}</span>
        ${task.dueDate ? `<span style="color: #666; font-size: 14px;">Due: ${escapeHtml(task.dueDate)}</span>` : ""}
      </div>
    </div>

    ${task.context ? `
    <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0; font-size: 14px; color: #0369a1;"><strong>Context:</strong> ${escapeHtml(task.context)}</p>
    </div>
    ` : ""}

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <a href="${APP_URL}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">View My Tasks</a>
    </div>

    <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
      Sent from Taskspace
    </p>
  </div>
</body>
</html>
`

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: assignee.email,
      subject,
      html,
    })

    if (result.error) {
      logger.error({ error: result.error.message }, "Task notification email failed")
      return { success: false, error: result.error.message }
    }

    logger.info({ emailId: result.data?.id }, "Task notification email sent")
    return { success: true, id: result.data?.id }
  } catch (error) {
    logError(logger, "Task notification email error", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * Send the daily EOD team link email to all team members at 7pm PST
 * Includes link to view team progress and submit their own report if needed
 */
export async function sendDailyEODLinkEmail(
  member: TeamMember,
  organizationName: string,
  organizationSlug: string,
  dateStr: string, // YYYY-MM-DD format
  hasSubmittedToday: boolean
): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    logger.debug("Email not configured, skipping daily EOD link email")
    return { success: false, error: "Email not configured" }
  }

  // Format date for display
  const displayDate = new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  // Build the public EOD report URL
  const publicReportUrl = `${APP_URL}/public/eod/${organizationSlug}/${dateStr}`

  const subject = `Great work today! View your team's EOD report for ${displayDate}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Great work today!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${displayDate}</p>
  </div>

  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 20px; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0;">Hi ${escapeHtml(member.name)},</p>

    <p>Here's the end of day report to view the entire team's progress:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${publicReportUrl}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Team EOD Report</a>
    </div>

    ${!hasSubmittedToday ? `
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0 0 12px 0; color: #92400e; font-weight: 500;">Haven't submitted your EOD report yet?</p>
      <p style="margin: 0;">
        <a href="${APP_URL}" style="color: #d97706; font-weight: 500;">Submit your report here</a>
      </p>
    </div>
    ` : `
    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0; color: #166534;">
        <strong>You're all set!</strong> Your EOD report for today has been submitted.
      </p>
    </div>
    `}

    <p style="color: #666; font-size: 14px;">
      See what the whole team accomplished today and stay aligned on progress across the workspace.
    </p>

    <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
      Sent from Taskspace • ${escapeHtml(organizationName)}<br>
      <a href="${buildUnsubscribeUrl(member.email)}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from email notifications</a> &nbsp;·&nbsp;
      <a href="${APP_URL}/app?p=settings" style="color: #9ca3af; text-decoration: underline;">Manage preferences</a>
    </p>
  </div>
</body>
</html>
`

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: member.email,
      subject,
      html,
    })

    if (result.error) {
      logger.error({ error: result.error.message }, "Daily EOD link email failed")
      return { success: false, error: result.error.message }
    }

    logger.info({ memberName: member.name, emailId: result.data?.id }, "Daily EOD link email sent")
    return { success: true, id: result.data?.id }
  } catch (error) {
    logError(logger, "Daily EOD link email error", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * Send a reminder email to team members who haven't submitted their EOD
 */
export async function sendMissingEODReminder(
  member: TeamMember,
  organizationName: string,
  admins: TeamMember[]
): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    logger.debug("Email not configured, skipping EOD reminder")
    return { success: false, error: "Email not configured" }
  }

  const subject = `📝 Reminder: Submit your EOD report for today`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📝 EOD Report Reminder</h1>
  </div>

  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 20px; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0;">Hi ${escapeHtml(member.name)},</p>

    <p>This is a friendly reminder that you haven't submitted your End of Day (EOD) report for today.</p>

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0; color: #92400e;">
        <strong>Why it matters:</strong> Your EOD report helps the team stay aligned, track progress on rocks, and identify blockers early.
      </p>
    </div>

    <p>It only takes a few minutes! Include:</p>
    <ul style="color: #666;">
      <li>What you accomplished today</li>
      <li>Any challenges or blockers</li>
      <li>Your priorities for tomorrow</li>
    </ul>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <a href="${APP_URL}" style="display: inline-block; background: #f59e0b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Submit EOD Now</a>
    </div>

    <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
      Sent from Taskspace • ${escapeHtml(organizationName)}<br>
      <a href="${buildUnsubscribeUrl(member.email)}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from email notifications</a> &nbsp;·&nbsp;
      <a href="${APP_URL}/app?p=settings" style="color: #9ca3af; text-decoration: underline;">Manage preferences</a>
    </p>
  </div>
</body>
</html>
`

  try {
    // CC admins so they know reminders were sent
    const adminEmails = admins.map(a => a.email).filter(e => e !== member.email)

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: member.email,
      cc: adminEmails.length > 0 ? adminEmails : undefined,
      subject,
      html,
    })

    if (result.error) {
      logger.error({ error: result.error.message }, "EOD reminder email failed")
      return { success: false, error: result.error.message }
    }

    logger.info({ memberName: member.name, emailId: result.data?.id }, "EOD reminder email sent")
    return { success: true, id: result.data?.id }
  } catch (error) {
    logError(logger, "EOD reminder email error", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

interface BillingAlertParams {
  to: string[]
  subject: string
  alertType: "payment_failed" | "payment_failed_urgent" | "payment_failed_final" | "subscription_canceled" | "subscription_updated" | "trial_ending" | "invoice_paid"
  organizationName: string
  message: string
  details: string
  invoiceUrl?: string
}

/**
 * Send a billing alert email to organization admins
 */
/**
 * Send a welcome email to a new user who joined via workspace invite link.
 */
export async function sendWelcomeEmail(params: {
  to: string
  name: string
  organizationName: string
  workspaceName: string
}): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    logger.debug("Email not configured, skipping welcome email")
    return { success: false, error: "Email not configured" }
  }

  const loginUrl = `${APP_URL}/app`
  const unsubscribeUrl = buildUnsubscribeUrl(params.to)
  const safeName = escapeHtml(params.name)
  const safeOrg = escapeHtml(params.organizationName)
  const safeWorkspace = escapeHtml(params.workspaceName)

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Taskspace</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #0f172a; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Welcome to Taskspace</h1>
    <p style="color: rgba(255,255,255,0.75); margin: 6px 0 0 0; font-size: 14px;">${safeOrg} · ${safeWorkspace}</p>
  </div>

  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 28px; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 16px 0; font-size: 16px;">Hi ${safeName},</p>
    <p style="margin: 0 0 16px 0;">Your account is ready. You've been added to the <strong>${safeWorkspace}</strong> workspace at <strong>${safeOrg}</strong>.</p>
    <p style="margin: 0 0 24px 0;">You can now log EOD reports, track rocks and tasks, and collaborate with your team.</p>

    <div style="margin: 28px 0;">
      <a href="${loginUrl}" style="display: inline-block; background: #0f172a; color: white; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 500; font-size: 15px;">Go to Taskspace →</a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 13px; color: #6b7280;">
      Sent from Taskspace · <a href="${unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>
`

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Welcome to ${params.organizationName} on Taskspace`,
      html,
    })

    if (result.error) {
      logger.error({ error: result.error.message }, "Welcome email failed")
      return { success: false, error: result.error.message }
    }

    logger.info({ emailId: result.data?.id, to: params.to }, "Welcome email sent")
    return { success: true, id: result.data?.id }
  } catch (error) {
    logError(logger, "Welcome email error", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function sendBillingAlertEmail(params: BillingAlertParams): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    logger.debug("Email not configured, skipping billing alert")
    return { success: false, error: "Email not configured" }
  }

  const alertColors: Record<string, { bg: string; border: string; emoji: string }> = {
    payment_failed: { bg: "#fef2f2", border: "#ef4444", emoji: "💳" },
    payment_failed_urgent: { bg: "#fef2f2", border: "#dc2626", emoji: "🚨" },
    payment_failed_final: { bg: "#fef2f2", border: "#991b1b", emoji: "⛔" },
    subscription_canceled: { bg: "#fef3c7", border: "#f59e0b", emoji: "⚠️" },
    subscription_updated: { bg: "#f0f9ff", border: "#3b82f6", emoji: "ℹ️" },
    trial_ending: { bg: "#eff6ff", border: "#3b82f6", emoji: "⏰" },
    invoice_paid: { bg: "#f0fdf4", border: "#22c55e", emoji: "✅" },
  }

  const color = alertColors[params.alertType]

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(params.subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: ${color.border}; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${color.emoji} Billing Alert</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${escapeHtml(params.organizationName)}</p>
  </div>

  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 20px; border-radius: 0 0 8px 8px;">
    <div style="background: ${color.bg}; border-left: 4px solid ${color.border}; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <h3 style="margin: 0 0 8px 0;">${escapeHtml(params.message)}</h3>
      <p style="margin: 0;">${escapeHtml(params.details)}</p>
    </div>

    ${params.invoiceUrl ? `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <a href="${params.invoiceUrl}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">View Invoice</a>
    </div>
    ` : ""}

    <div style="margin-top: ${params.invoiceUrl ? "20px" : "30px"}; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <a href="${APP_URL}/app?p=settings" style="display: inline-block; background: ${color.border}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Manage Billing</a>
    </div>

    <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
      Sent from Taskspace • ${new Date().toLocaleString("en-US")}
    </p>
  </div>
</body>
</html>
`

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html,
    })

    if (result.error) {
      logger.error({ error: result.error.message }, "Billing alert email failed")
      return { success: false, error: result.error.message }
    }

    logger.info({ emailId: result.data?.id }, "Billing alert email sent")
    return { success: true, id: result.data?.id }
  } catch (error) {
    logError(logger, "Billing alert email error", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * Send a trial-started confirmation email to a new user
 */
export async function sendTrialStartedEmail(params: {
  to: string
  name: string
  organizationName: string
  trialEndDate: string
}): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    logger.debug("Email not configured, skipping trial started email")
    return { success: false, error: "Email not configured" }
  }

  const loginUrl = `${APP_URL}/app`
  const billingUrl = `${APP_URL}/app?p=settings`
  const unsubscribeUrl = buildUnsubscribeUrl(params.to)
  const safeName = escapeHtml(params.name.split(" ")[0] || params.name)
  const safeOrg = escapeHtml(params.organizationName)
  const trialEnd = new Date(params.trialEndDate).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  })

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your 14-day Taskspace trial has started</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #0f172a; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Your 14-day trial has started</h1>
    <p style="color: rgba(255,255,255,0.75); margin: 6px 0 0 0; font-size: 14px;">${safeOrg}</p>
  </div>

  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 28px; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 16px 0; font-size: 16px;">Hi ${safeName},</p>
    <p style="margin: 0 0 16px 0;">Your free trial is active until <strong>${trialEnd}</strong>. Here's what's included:</p>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #374151;">
        <li style="margin: 6px 0;">EOD reports &amp; daily team accountability</li>
        <li style="margin: 6px 0;">Quarterly Rocks &amp; goal tracking</li>
        <li style="margin: 6px 0;">Tasks, scorecards &amp; IDS board</li>
        <li style="margin: 6px 0;">AI-powered insights &amp; summaries</li>
      </ul>
    </div>

    <p style="margin: 0 0 24px 0;">Start by setting your first quarterly Rock — it takes less than 2 minutes.</p>

    <div style="margin: 28px 0;">
      <a href="${loginUrl}?p=rocks" style="display: inline-block; background: #0f172a; color: white; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 500; font-size: 15px;">Set up your first Rock &rarr;</a>
    </div>

    <p style="margin: 20px 0 0 0; font-size: 13px; color: #6b7280;">
      No credit card required during your trial. <a href="${billingUrl}" style="color: #6b7280;">Manage billing</a> &middot;
      <a href="${unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>
`

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: "Your 14-day Taskspace trial has started",
      html,
    })

    if (result.error) {
      logger.error({ error: result.error.message }, "Trial started email failed")
      return { success: false, error: result.error.message }
    }

    logger.info({ emailId: result.data?.id, to: params.to }, "Trial started email sent")
    return { success: true, id: result.data?.id }
  } catch (error) {
    logError(logger, "Trial started email error", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * Send an onboarding drip email for day 1, 3, or 7 after signup
 */
export async function sendOnboardingDripEmail(params: {
  to: string
  name: string
  orgName: string
  day: 1 | 3 | 7
}): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    logger.debug("Email not configured, skipping onboarding drip email")
    return { success: false, error: "Email not configured" }
  }

  const loginUrl = `${APP_URL}/app`
  const unsubscribeUrl = buildUnsubscribeUrl(params.to)
  const safeName = escapeHtml(params.name.split(" ")[0] || params.name)
  const safeOrg = escapeHtml(params.orgName)

  const drips = {
    1: {
      subject: `${params.name.split(" ")[0]}, submit your first EOD report today`,
      headline: "Day 1 — Submit your first EOD report",
      body: `Running a great team starts with daily visibility. Your EOD report takes 2 minutes and gives your team (and you) a clear picture of what's getting done.`,
      ctaUrl: `${loginUrl}?p=dashboard`,
      ctaText: "Submit today's EOD report &rarr;",
    },
    3: {
      subject: "Invite your team to Taskspace",
      headline: "Day 3 — Better together",
      body: `Accountability works best as a team sport. Invite your team members so everyone can submit reports, track rocks, and stay aligned.`,
      ctaUrl: `${loginUrl}?p=admin-team`,
      ctaText: "Invite team members &rarr;",
    },
    7: {
      subject: "Set your first quarterly Rock",
      headline: "Day 7 — Set your Q-goal",
      body: `Rocks are the 3–5 most important things your team needs to accomplish this quarter. Setting them takes 5 minutes and dramatically improves focus and follow-through.`,
      ctaUrl: `${loginUrl}?p=rocks`,
      ctaText: "Set your first Rock &rarr;",
    },
  } as const

  const drip = drips[params.day]

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(drip.subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #0f172a; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">${escapeHtml(drip.headline)}</h1>
    <p style="color: rgba(255,255,255,0.65); margin: 6px 0 0 0; font-size: 13px;">${safeOrg}</p>
  </div>

  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 28px; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 16px 0; font-size: 16px;">Hi ${safeName},</p>
    <p style="margin: 0 0 24px 0;">${escapeHtml(drip.body)}</p>

    <div style="margin: 28px 0;">
      <a href="${drip.ctaUrl}" style="display: inline-block; background: #0f172a; color: white; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 500; font-size: 15px;">${drip.ctaText}</a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 13px; color: #6b7280;">
      Sent from Taskspace &middot; <a href="${unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>
`

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: drip.subject,
      html,
    })

    if (result.error) {
      logger.error({ error: result.error.message, day: params.day }, "Onboarding drip email failed")
      return { success: false, error: result.error.message }
    }

    logger.info({ emailId: result.data?.id, to: params.to, day: params.day }, "Onboarding drip email sent")
    return { success: true, id: result.data?.id }
  } catch (error) {
    logError(logger, "Onboarding drip email error", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
