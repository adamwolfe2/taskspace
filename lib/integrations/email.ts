/**
 * Email Integration using Resend
 * Handles all email notifications for the AIMS EOD Tracker
 */

import { Resend } from "resend"
import type { EODReport, DailyDigest, TeamMember, AIGeneratedTask } from "../types"

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
 * Send an escalation notification to admins
 */
export async function sendEscalationNotification(
  report: EODReport,
  member: TeamMember,
  admins: TeamMember[]
): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    console.log("[Email] Resend not configured, skipping escalation notification")
    return { success: false, error: "Email not configured" }
  }

  const adminEmails = admins.map(a => a.email)
  if (adminEmails.length === 0) {
    return { success: false, error: "No admin emails found" }
  }

  const subject = `🚨 Escalation Required: ${member.name} - ${report.date}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Escalation Required</h1>
  </div>

  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 20px; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0;"><strong>${member.name}</strong> (${member.department}) has flagged their EOD report for escalation.</p>

    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <h3 style="margin: 0 0 8px 0; color: #dc2626;">Escalation Note:</h3>
      <p style="margin: 0; color: #991b1b;">${report.escalationNote || "No specific details provided"}</p>
    </div>

    <h3 style="margin: 20px 0 10px 0;">Today's Tasks:</h3>
    <ul style="margin: 0; padding-left: 20px;">
      ${report.tasks?.map(t => `<li>${t.text}</li>`).join("") || "<li>No tasks listed</li>"}
    </ul>

    ${report.challenges ? `
    <h3 style="margin: 20px 0 10px 0;">Challenges:</h3>
    <p style="margin: 0; color: #666;">${report.challenges}</p>
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
      console.error("[Email] Escalation notification failed:", result.error)
      return { success: false, error: result.error.message }
    }

    console.log(`[Email] Escalation notification sent: ${result.data?.id}`)
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error("[Email] Escalation notification error:", error)
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
    console.log("[Email] Resend not configured, skipping daily summary")
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
      <p style="margin: 0;">${digest.summary}</p>
    </div>

    ${digest.wins && digest.wins.length > 0 ? `
    <!-- Wins -->
    <h3 style="margin: 20px 0 10px 0; color: #22c55e;">✅ Wins (${digest.wins.length})</h3>
    <ul style="margin: 0; padding-left: 20px;">
      ${digest.wins.map(w => `<li><strong>${w.memberName}:</strong> ${w.text}</li>`).join("")}
    </ul>
    ` : ""}

    ${digest.blockers && digest.blockers.length > 0 ? `
    <!-- Blockers -->
    <h3 style="margin: 20px 0 10px 0; color: #dc2626;">🚧 Blockers (${digest.blockers.length})</h3>
    <ul style="margin: 0; padding-left: 20px;">
      ${digest.blockers.map(b => `<li><strong>${b.memberName}:</strong> ${b.text} <span style="color: ${b.severity === "high" ? "#dc2626" : b.severity === "medium" ? "#f59e0b" : "#6b7280"};">[${b.severity}]</span></li>`).join("")}
    </ul>
    ` : ""}

    ${digest.concerns && digest.concerns.length > 0 ? `
    <!-- Concerns -->
    <h3 style="margin: 20px 0 10px 0; color: #f59e0b;">⚠️ Concerns</h3>
    <ul style="margin: 0; padding-left: 20px;">
      ${digest.concerns.map(c => `<li>${c.text} <span style="color: #9ca3af;">(${c.type})</span></li>`).join("")}
    </ul>
    ` : ""}

    ${digest.followUps && digest.followUps.length > 0 ? `
    <!-- Follow-ups -->
    <h3 style="margin: 20px 0 10px 0; color: #3b82f6;">💬 Suggested Follow-ups</h3>
    <ul style="margin: 0; padding-left: 20px;">
      ${digest.followUps.map(f => `<li><strong>${f.targetMemberName}:</strong> ${f.text}</li>`).join("")}
    </ul>
    ` : ""}

    ${missingMembers.length > 0 ? `
    <!-- Missing Reports -->
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <h4 style="margin: 0 0 8px 0; color: #92400e;">📝 Missing EOD Reports</h4>
      <p style="margin: 0; color: #78350f;">${missingMembers.map(m => m.name).join(", ")}</p>
    </div>
    ` : ""}

    ${digest.challengeQuestions && digest.challengeQuestions.length > 0 ? `
    <!-- Challenge Questions -->
    <div style="background: #faf5ff; border-left: 4px solid #9333ea; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <h4 style="margin: 0 0 8px 0; color: #7c3aed;">🤔 Questions to Consider</h4>
      <ul style="margin: 0; padding-left: 20px; color: #6b21a8;">
        ${digest.challengeQuestions.map(q => `<li>${q}</li>`).join("")}
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
      console.error("[Email] Daily summary failed:", result.error)
      return { success: false, error: result.error.message }
    }

    console.log(`[Email] Daily summary sent: ${result.data?.id}`)
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error("[Email] Daily summary error:", error)
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
    console.log("[Email] Resend not configured, skipping AI alert")
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
  const subject = `${color.emoji} AI Alert: ${alertType.charAt(0).toUpperCase() + alertType.slice(1)} detected for ${memberName}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: ${color.border}; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${color.emoji} AI Alert: ${alertType.charAt(0).toUpperCase() + alertType.slice(1)}</h1>
  </div>

  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 20px; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0;"><strong>${memberName}</strong> (${memberDepartment})</p>

    <div style="background: ${color.bg}; border-left: 4px solid ${color.border}; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <h3 style="margin: 0 0 8px 0;">Alert:</h3>
      <p style="margin: 0;">${alertMessage}</p>
    </div>

    <h3 style="margin: 20px 0 10px 0;">Details:</h3>
    <p style="margin: 0; color: #666;">${details}</p>

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
      console.error("[Email] AI alert failed:", result.error)
      return { success: false, error: result.error.message }
    }

    console.log(`[Email] AI alert sent: ${result.data?.id}`)
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error("[Email] AI alert error:", error)
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
    console.log("[Email] Resend not configured, skipping task notification")
    return { success: false, error: "Email not configured" }
  }

  const subject = `📋 New Task Assigned: ${task.title}`

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
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📋 New Task Assigned</h1>
  </div>

  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 20px; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0;">Hi ${assignee.name},</p>
    <p>${assignedBy.name} has assigned you a new task:</p>

    <div style="background: #f8fafc; border: 1px solid #e5e7eb; padding: 16px; margin: 20px 0; border-radius: 8px;">
      <h2 style="margin: 0 0 8px 0;">${task.title}</h2>
      ${task.description ? `<p style="margin: 0 0 12px 0; color: #666;">${task.description}</p>` : ""}
      <div style="display: flex; gap: 16px; margin-top: 12px;">
        <span style="background: ${priorityColors[task.priority]}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 500;">${task.priority.toUpperCase()}</span>
        ${task.dueDate ? `<span style="color: #666; font-size: 14px;">Due: ${task.dueDate}</span>` : ""}
      </div>
    </div>

    ${task.context ? `
    <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0; font-size: 14px; color: #0369a1;"><strong>Context:</strong> ${task.context}</p>
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
      console.error("[Email] Task notification failed:", result.error)
      return { success: false, error: result.error.message }
    }

    console.log(`[Email] Task notification sent: ${result.data?.id}`)
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error("[Email] Task notification error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
