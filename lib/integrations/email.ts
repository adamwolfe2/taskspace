/**
 * Email Integration using Resend
 * Handles all email notifications for the AIMS EOD Tracker
 */

import { Resend } from "resend"
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

const FROM_EMAIL = process.env.EMAIL_FROM || "AIMS EOD <noreply@aims.app>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://aims.app"

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
      Sent from AIMS EOD Tracker • ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
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
      Sent from AIMS EOD Tracker • Generated at ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
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
      AI-generated alert from AIMS EOD Tracker • ${new Date().toLocaleString("en-US")}
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
      Sent from AIMS EOD Tracker
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
      Sent from AIMS EOD Tracker • ${escapeHtml(organizationName)}
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
      Sent from AIMS EOD Tracker • ${escapeHtml(organizationName)}
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
