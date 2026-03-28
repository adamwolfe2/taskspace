/**
 * Email Integration using Resend
 * Handles all email notifications for Taskspace
 */

import { Resend } from "resend"
import { createHmac, timingSafeEqual } from "crypto"
import type { EODReport, DailyDigest, TeamMember, AIGeneratedTask, Invitation, Organization, EmailVerificationToken, PasswordResetToken, Rock } from "../types"
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

/** Wrap resend.emails.send with 1 retry on transient failures */
async function sendEmailWithRetry(
  resend: Resend,
  params: Parameters<Resend["emails"]["send"]>[0]
): Promise<ReturnType<Resend["emails"]["send"]>> {
  const result = await resend.emails.send(params)
  if (result.error) {
    // Retry once after a short delay for transient errors
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return resend.emails.send(params)
  }
  return result
}

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
  // Use timing-safe comparison to prevent token forgery via timing side-channel
  if (token.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
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

  const subject = `Escalation Required: ${member.name} - ${report.date}`

  const html = emailWrapper(`
    <h1>Escalation Required</h1>
    <p class="subtitle">${escapeHtml(member.name)} &mdash; ${escapeHtml(report.date)}</p>

    <p><strong>${escapeHtml(member.name)}</strong> (${escapeHtml(member.department)}) has flagged their EOD report for escalation.</p>

    <div class="callout-warning">
      <strong>Escalation Note</strong><br>
      ${escapeHtml(report.escalationNote || "No specific details provided")}
    </div>

    <p><strong>Today's Tasks:</strong></p>
    <ul>
      ${report.tasks?.map(t => `<li>${escapeHtml(t.text)}</li>`).join("") || "<li>No tasks listed</li>"}
    </ul>

    ${report.challenges ? `
    <p><strong>Challenges:</strong></p>
    <p>${escapeHtml(report.challenges)}</p>
    ` : ""}

    <div class="cta">
      <a href="${APP_URL}" class="btn" style="color: #ffffff !important; text-decoration: none !important;">View in Dashboard</a>
    </div>
  `, `Taskspace &bull; ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`)

  try {
    const result = await sendEmailWithRetry(resend, {
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

  const sentimentLabel = {
    positive: "Positive",
    neutral: "Neutral",
    negative: "Negative",
    mixed: "Mixed",
  }

  const subject = `Daily Team Summary: ${formatDate(digest.digestDate)} (${digest.reportsAnalyzed} reports)`

  const html = emailWrapper(`
    <h1>Daily Team Summary</h1>
    <p class="subtitle">${formatDate(digest.digestDate)}</p>

    <div style="display: flex; gap: 16px; margin-bottom: 20px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0;">
      <div style="flex: 1; text-align: center;">
        <div style="font-size: 22px; font-weight: 700; color: #0f172a;">${digest.reportsAnalyzed}</div>
        <div style="font-size: 12px; color: #64748b;">Reports</div>
      </div>
      <div style="flex: 1; text-align: center;">
        <div style="font-size: 14px; font-weight: 600; color: #0f172a;">${sentimentLabel[digest.teamSentiment]}</div>
        <div style="font-size: 12px; color: #64748b;">Team Mood</div>
      </div>
      <div style="flex: 1; text-align: center;">
        <div style="font-size: 22px; font-weight: 700; color: ${digest.blockers?.length > 0 ? "#dc2626" : "#0f172a"};">${digest.blockers?.length || 0}</div>
        <div style="font-size: 12px; color: #64748b;">Blockers</div>
      </div>
    </div>

    <div class="callout">${escapeHtml(digest.summary)}</div>

    ${digest.wins && digest.wins.length > 0 ? `
    <p><strong>Wins (${digest.wins.length})</strong></p>
    <ul>
      ${digest.wins.map(w => `<li><strong>${escapeHtml(w.memberName)}:</strong> ${escapeHtml(w.text)}</li>`).join("")}
    </ul>
    ` : ""}

    ${digest.blockers && digest.blockers.length > 0 ? `
    <p><strong>Blockers (${digest.blockers.length})</strong></p>
    <ul>
      ${digest.blockers.map(b => `<li><strong>${escapeHtml(b.memberName)}:</strong> ${escapeHtml(b.text)} <span class="tag">${b.severity}</span></li>`).join("")}
    </ul>
    ` : ""}

    ${digest.concerns && digest.concerns.length > 0 ? `
    <p><strong>Concerns</strong></p>
    <ul>
      ${digest.concerns.map(c => `<li>${escapeHtml(c.text)} <span class="tag">${escapeHtml(c.type)}</span></li>`).join("")}
    </ul>
    ` : ""}

    ${digest.followUps && digest.followUps.length > 0 ? `
    <p><strong>Suggested Follow-ups</strong></p>
    <ul>
      ${digest.followUps.map(f => `<li><strong>${escapeHtml(f.targetMemberName)}:</strong> ${escapeHtml(f.text)}</li>`).join("")}
    </ul>
    ` : ""}

    ${missingMembers.length > 0 ? `
    <div class="callout-amber">
      <strong>Missing EOD Reports</strong><br>
      ${missingMembers.map(m => escapeHtml(m.name)).join(", ")}
    </div>
    ` : ""}

    ${digest.challengeQuestions && digest.challengeQuestions.length > 0 ? `
    <p><strong>Questions to Consider</strong></p>
    <ul>
      ${digest.challengeQuestions.map(q => `<li>${escapeHtml(q)}</li>`).join("")}
    </ul>
    ` : ""}

    <div class="cta">
      <a href="${APP_URL}" class="btn" style="color: #ffffff !important; text-decoration: none !important;">View Full Dashboard</a>
    </div>
  `, `Taskspace &bull; Generated at ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`)

  try {
    const result = await sendEmailWithRetry(resend, {
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

  const alertTypeLabel = alertType.charAt(0).toUpperCase() + alertType.slice(1)
  const subject = `AI Alert: ${alertTypeLabel} detected for ${memberName}`

  const calloutClass = alertType === "blocker" ? "callout-amber" : alertType === "sentiment" ? "callout-warning" : "callout"

  const html = emailWrapper(`
    <h1>AI Alert: ${escapeHtml(alertTypeLabel)}</h1>
    <p class="subtitle">${escapeHtml(memberName)} &mdash; ${escapeHtml(memberDepartment)}</p>

    <div class="${calloutClass}">
      <strong>Alert</strong><br>
      ${escapeHtml(alertMessage)}
    </div>

    <p><strong>Details</strong></p>
    <p>${escapeHtml(details)}</p>

    <div class="cta">
      <a href="${APP_URL}" class="btn" style="color: #ffffff !important; text-decoration: none !important;">View in Dashboard</a>
    </div>
  `, `AI-generated alert from Taskspace &bull; ${new Date().toLocaleString("en-US")}`)

  try {
    const result = await sendEmailWithRetry(resend, {
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

  const priorityLabels: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
  }

  const html = emailWrapper(`
    <h1>New Task Assigned</h1>
    <p class="subtitle">${escapeHtml(assignedBy.name)} assigned you a task</p>

    <p>Hi ${escapeHtml(assignee.name)},</p>
    <p>${escapeHtml(assignedBy.name)} has assigned you a new task:</p>

    <div class="callout">
      <p style="font-weight: 600; font-size: 16px; margin: 0 0 8px 0;">${escapeHtml(task.title)}</p>
      ${task.description ? `<p style="margin: 0 0 8px 0; color: #64748b;">${escapeHtml(task.description)}</p>` : ""}
    </div>

    <div class="detail-row">
      <span class="detail-label">Priority</span>
      <span class="detail-value"><span class="tag">${priorityLabels[task.priority] || task.priority.toUpperCase()}</span></span>
    </div>
    ${task.dueDate ? `
    <div class="detail-row">
      <span class="detail-label">Due</span>
      <span class="detail-value">${escapeHtml(task.dueDate)}</span>
    </div>
    ` : ""}

    ${task.context ? `
    <div class="callout">
      <p style="margin: 0; font-size: 13px; color: #475569;"><strong>Context:</strong> ${escapeHtml(task.context)}</p>
    </div>
    ` : ""}

    <div class="cta">
      <a href="${APP_URL}" class="btn" style="color: #ffffff !important; text-decoration: none !important; border-radius: 6px;">View My Tasks</a>
    </div>
  `, "Taskspace")

  try {
    const result = await sendEmailWithRetry(resend, {
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

  const html = emailWrapper(`
    <h1>Great work today!</h1>
    <p class="subtitle">${displayDate}</p>

    <p>Hi ${escapeHtml(member.name)},</p>
    <p>Here's the end of day report to view the entire team's progress:</p>

    <div class="cta">
      <a href="${publicReportUrl}" class="btn" style="color: #ffffff !important; text-decoration: none !important; border-radius: 6px;">View Team EOD Report</a>
    </div>

    ${!hasSubmittedToday ? `
    <div class="callout-amber">
      <p style="margin: 0 0 8px 0; font-weight: 500;">Haven't submitted your EOD report yet?</p>
      <p style="margin: 0;">
        <a href="${APP_URL}" style="color: #d97706; font-weight: 500;">Submit your report here</a>
      </p>
    </div>
    ` : `
    <div class="callout">
      <p style="margin: 0;">
        <strong>You're all set!</strong> Your EOD report for today has been submitted.
      </p>
    </div>
    `}

    <p class="note">See what the whole team accomplished today and stay aligned on progress across the workspace.</p>
  `, `${escapeHtml(organizationName)} &middot; Taskspace<br><a href="${buildUnsubscribeUrl(member.email)}">Unsubscribe</a> &nbsp;&middot;&nbsp; <a href="${APP_URL}/app?p=settings">Manage preferences</a>`)

  try {
    const result = await sendEmailWithRetry(resend, {
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

  const html = emailWrapper(`
    <h1>EOD Report Reminder</h1>
    <p class="subtitle">You haven't submitted today's report yet</p>

    <p>Hi ${escapeHtml(member.name)},</p>
    <p>This is a friendly reminder that you haven't submitted your End of Day (EOD) report for today.</p>

    <div class="callout-amber">
      <p style="margin: 0;"><strong>Why it matters:</strong> Your EOD report helps the team stay aligned, track progress on rocks, and identify blockers early.</p>
    </div>

    <p>It only takes a few minutes! Include:</p>
    <p style="padding-left: 16px; color: #475569;">
      &bull; What you accomplished today<br>
      &bull; Any challenges or blockers<br>
      &bull; Your priorities for tomorrow
    </p>

    <div class="cta">
      <a href="${APP_URL}" class="btn" style="color: #ffffff !important; text-decoration: none !important; border-radius: 6px;">Submit EOD Now</a>
    </div>
  `, `${escapeHtml(organizationName)} &middot; Taskspace<br><a href="${buildUnsubscribeUrl(member.email)}">Unsubscribe</a> &nbsp;&middot;&nbsp; <a href="${APP_URL}/app?p=settings">Manage preferences</a>`)

  try {
    // CC admins so they know reminders were sent
    const adminEmails = admins.map(a => a.email).filter(e => e !== member.email)

    const result = await sendEmailWithRetry(resend, {
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

  const html = emailWrapper(`
    <h1>Welcome to Taskspace</h1>
    <p class="subtitle">${safeOrg} &middot; ${safeWorkspace}</p>

    <p>Hi ${safeName},</p>
    <p>Your account is ready. You've been added to the <strong>${safeWorkspace}</strong> workspace at <strong>${safeOrg}</strong>.</p>
    <p>You can now log EOD reports, track rocks and tasks, and collaborate with your team.</p>

    <div class="cta">
      <a href="${loginUrl}" class="btn" style="color: #ffffff !important; text-decoration: none !important; border-radius: 6px;">Go to Taskspace</a>
    </div>
  `, `Taskspace<br><a href="${unsubscribeUrl}">Unsubscribe</a>`)

  try {
    const result = await sendEmailWithRetry(resend, {
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

  const isPaymentFailure = params.alertType.startsWith("payment_failed")
  const calloutClass = isPaymentFailure ? "callout-warning" : "callout-amber"

  const html = emailWrapper(`
    <h1>Billing Alert</h1>
    <p class="subtitle">${escapeHtml(params.organizationName)}</p>

    <div class="${calloutClass}">
      <p style="font-weight: 600; margin: 0 0 8px 0;">${escapeHtml(params.message)}</p>
      <p style="margin: 0;">${escapeHtml(params.details)}</p>
    </div>

    ${params.invoiceUrl ? `
    <div class="cta">
      <a href="${params.invoiceUrl}" class="btn" style="color: #ffffff !important; text-decoration: none !important; border-radius: 6px;">View Invoice</a>
    </div>
    <hr class="divider">
    ` : ""}

    <div class="cta">
      <a href="${APP_URL}/app?p=settings" class="btn" style="color: #ffffff !important; text-decoration: none !important; border-radius: 6px;">Manage Billing</a>
    </div>
  `, `Taskspace &middot; ${new Date().toLocaleString("en-US")}`)

  try {
    const result = await sendEmailWithRetry(resend, {
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
    const result = await sendEmailWithRetry(resend, {
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
    const result = await sendEmailWithRetry(resend, {
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

// ========================================
// Migrated from lib/email.tsx
// ========================================

/** Shared email wrapper — clean, minimal layout with top accent border */
function emailWrapper(content: string, footerText?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; background: #f8fafc; margin: 0; padding: 0; }
    .wrapper { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-top: 3px solid #0f172a; }
    .card-body { padding: 32px; }
    .brand { font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: #64748b; margin-bottom: 24px; }
    h1 { font-size: 22px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0; line-height: 1.3; }
    .subtitle { font-size: 14px; color: #64748b; margin: 0 0 24px 0; }
    p { font-size: 15px; color: #374151; margin: 0 0 16px 0; }
    .btn { display: inline-block; background: #0f172a; padding: 12px 28px; text-decoration: none; font-weight: 500; font-size: 14px; }
    .cta { text-align: center; margin: 28px 0; }
    .detail-row { padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { display: inline-block; min-width: 110px; font-size: 13px; color: #64748b; }
    .detail-value { display: inline-block; font-size: 13px; font-weight: 600; color: #1f2937; }
    .note { font-size: 13px; color: #64748b; margin: 24px 0 0 0; }
    .divider { border: none; border-top: 1px solid #f1f5f9; margin: 24px 0; }
    .footer { text-align: center; padding: 20px 32px; font-size: 12px; color: #94a3b8; }
    .footer a { color: #94a3b8; text-decoration: underline; }
    .link-fallback { font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 8px; }
    .callout { background: #f8fafc; border-left: 3px solid #0f172a; padding: 14px 16px; margin: 20px 0; }
    .callout-warning { background: #fef2f2; border-left: 3px solid #dc2626; padding: 14px 16px; margin: 20px 0; }
    .callout-amber { background: #fffbeb; border-left: 3px solid #d97706; padding: 14px 16px; margin: 20px 0; }
    .tag { display: inline-block; font-size: 12px; font-weight: 500; padding: 2px 8px; background: #f1f5f9; color: #475569; }
    .expires { font-size: 13px; color: #94a3b8; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="card-body">
        <div class="brand">Taskspace</div>
        ${content}
      </div>
      <div class="footer">
        ${footerText || "Taskspace"}
      </div>
    </div>
  </div>
</body>
</html>`
}

/** Send invitation email */
export async function sendInvitationEmail(
  invitation: Invitation,
  organization: Organization,
  inviterName: string
): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    logger.debug("Email not configured, skipping invitation email")
    return { success: false, error: "Email not configured" }
  }

  const inviteLink = `${APP_URL}/join/${invitation.token}`

  const html = emailWrapper(`
    <h1>You&rsquo;re invited to join ${escapeHtml(organization.name)}</h1>
    <p class="subtitle">${escapeHtml(inviterName)} added you to the team</p>

    <p>Hi there,</p>
    <p>${escapeHtml(inviterName)} has invited you to join <strong>${escapeHtml(organization.name)}</strong> on Taskspace &mdash; your team&rsquo;s EOS operating system.</p>

    <div class="cta">
      <a href="${inviteLink}" class="btn" style="color: #ffffff !important; text-decoration: none !important;">Accept Invitation</a>
    </div>

    <hr class="divider">

    <div class="detail-row">
      <span class="detail-label">Organization</span>
      <span class="detail-value">${escapeHtml(organization.name)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Your role</span>
      <span class="detail-value">${invitation.role === "admin" ? "Administrator" : "Team Member"}</span>
    </div>
    ${invitation.department ? `
    <div class="detail-row">
      <span class="detail-label">Department</span>
      <span class="detail-value">${escapeHtml(invitation.department)}</span>
    </div>
    ` : ""}

    <hr class="divider">

    <p style="font-size: 13px; color: #64748b; margin-bottom: 8px;"><strong>What you&rsquo;ll have access to:</strong></p>
    <ul style="font-size: 13px; color: #64748b; margin: 0; padding-left: 20px; line-height: 1.8;">
      <li>EOD reports &mdash; share daily wins, blockers, and priorities</li>
      <li>Rocks &mdash; track your quarterly goals</li>
      <li>Tasks &mdash; manage your work in one place</li>
      <li>Meetings &mdash; run structured L10 meetings</li>
    </ul>

    <p class="expires">This invitation expires in 7 days.</p>

    <p class="note">If you weren&rsquo;t expecting this invitation, you can safely ignore this email.</p>
    <p class="link-fallback">Or copy this link: ${inviteLink}</p>
  `, `${escapeHtml(organization.name)} &middot; Powered by Taskspace<br><a href="${buildUnsubscribeUrl(invitation.email)}" style="color: #94a3b8;">Unsubscribe</a>`)

  try {
    const result = await sendEmailWithRetry(resend, {
      from: FROM_EMAIL,
      to: invitation.email,
      subject: `You're invited to join ${escapeHtml(organization.name)}`,
      html,
    })

    if (result.error) {
      logger.error({ error: result.error.message }, "Invitation email failed")
      return { success: false, error: result.error.message }
    }

    logger.info({ emailId: result.data?.id }, "Invitation email sent")
    return { success: true, id: result.data?.id }
  } catch (error) {
    logError(logger, "Invitation email error", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/** Send email verification email */
export async function sendVerificationEmail(
  verificationToken: EmailVerificationToken,
  userName: string
): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    logger.debug("Email not configured, skipping verification email")
    return { success: false, error: "Email not configured" }
  }

  const verifyLink = `${APP_URL}/app?verifyEmail=${verificationToken.token}`

  const html = emailWrapper(`
    <h1>Verify your email</h1>
    <p class="subtitle">One quick step to get started</p>

    <p>Hi ${escapeHtml((userName || "there").split(" ")[0])},</p>
    <p>Thanks for signing up. Please verify your email address to activate your account.</p>

    <div class="cta">
      <a href="${verifyLink}" class="btn" style="color: #ffffff !important; text-decoration: none !important;">Verify Email</a>
    </div>

    <p class="expires">This link expires in 24 hours</p>

    <p class="note">If you didn't create an account on Taskspace, you can safely ignore this email.</p>
    <p class="link-fallback">Or copy this link: ${verifyLink}</p>
  `)

  try {
    const result = await sendEmailWithRetry(resend, {
      from: FROM_EMAIL,
      to: verificationToken.email,
      subject: "Verify your email address - Taskspace",
      html,
    })

    if (result.error) {
      logger.error({ error: result.error.message }, "Verification email failed")
      return { success: false, error: result.error.message }
    }

    logger.info({ emailId: result.data?.id }, "Verification email sent")
    return { success: true, id: result.data?.id }
  } catch (error) {
    logError(logger, "Verification email error", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/** Send password reset email */
export async function sendPasswordResetEmail(
  resetToken: PasswordResetToken,
  userName: string
): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    logger.debug("Email not configured, skipping password reset email")
    return { success: false, error: "Email not configured" }
  }

  const resetLink = `${APP_URL}/app?resetToken=${resetToken.token}`

  const html = emailWrapper(`
    <h1>Reset your password</h1>
    <p class="subtitle">You requested a password change</p>

    <p>Hi ${escapeHtml((userName || "there").split(" ")[0])},</p>
    <p>We received a request to reset your password. Click the button below to create a new one.</p>

    <div class="cta">
      <a href="${resetLink}" class="btn" style="color: #ffffff !important; text-decoration: none !important;">Reset Password</a>
    </div>

    <div class="callout-amber">
      <p style="margin: 0; font-size: 13px; color: #92400e;"><strong>Security notice:</strong> If you didn't request this, ignore this email. Your password will remain unchanged.</p>
    </div>

    <p class="expires">This link expires in 1 hour and can only be used once</p>
    <p class="link-fallback">Or copy this link: ${resetLink}</p>
  `)

  try {
    const result = await sendEmailWithRetry(resend, {
      from: FROM_EMAIL,
      to: resetToken.email,
      subject: "Reset your Taskspace password",
      html,
    })

    if (result.error) {
      logger.error({ error: result.error.message }, "Password reset email failed")
      return { success: false, error: result.error.message }
    }

    logger.info({ emailId: result.data?.id }, "Password reset email sent")
    return { success: true, id: result.data?.id }
  } catch (error) {
    logError(logger, "Password reset email error", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/** Send EOD report notification to admin */
export async function sendEODNotification(
  eodReport: EODReport,
  submittedBy: TeamMember,
  rocks: Rock[],
  organization?: Organization
): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    logger.debug("Email not configured, skipping EOD notification")
    return { success: false, error: "Email not configured" }
  }

  const adminEmail = process.env.ADMIN_EMAIL || "team@trytaskspace.com"

  try {
    const tasksByRock = (eodReport.tasks || []).reduce(
      (acc, task) => {
        const key = task.rockId || "general"
        if (!acc[key]) {
          acc[key] = { title: task.rockTitle || "General Activities", tasks: [] }
        }
        acc[key].tasks.push(task.text)
        return acc
      },
      {} as Record<string, { title: string; tasks: string[] }>,
    )

    const rockSections = Object.entries(tasksByRock)
      .filter(([key]) => key !== "general")
      .map(([rockId, data]) => {
        const rock = rocks.find((r) => r.id === rockId)
        const rockPriorities = (eodReport.tomorrowPriorities || []).filter((p) => p.rockId === rockId)

        return `
          <div class="callout">
            <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #0f172a;">${escapeHtml(data.title)}</p>
            <span class="tag">${rock?.status === "completed" ? "Completed" : "On Track"}</span>
            <p style="margin: 12px 0 4px 0; font-size: 13px; font-weight: 600; color: #64748b;">Today's Activities</p>
            <ul style="margin: 4px 0 0 0; padding-left: 18px; font-size: 14px; color: #374151;">
              ${data.tasks.map((t) => `<li style="margin: 4px 0;">${escapeHtml(t)}</li>`).join("")}
            </ul>
            ${rockPriorities.length > 0 ? `
              <p style="margin: 12px 0 4px 0; font-size: 13px; font-weight: 600; color: #64748b;">Tomorrow's Priorities</p>
              <ul style="margin: 4px 0 0 0; padding-left: 18px; font-size: 14px; color: #374151;">
                ${rockPriorities.map((p) => `<li style="margin: 4px 0;">${escapeHtml(p.text)}</li>`).join("")}
              </ul>
            ` : ""}
          </div>
        `
      })
      .join("")

    const generalSection =
      tasksByRock.general && tasksByRock.general.tasks.length > 0
        ? `
      <div class="callout">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #0f172a;">General Activities</p>
        <ul style="margin: 0; padding-left: 18px; font-size: 14px; color: #374151;">
          ${tasksByRock.general.tasks.map((t) => `<li style="margin: 4px 0;">${escapeHtml(t)}</li>`).join("")}
        </ul>
      </div>
    `
        : ""

    const html = emailWrapper(`
      <h1>EOD Report</h1>
      <p class="subtitle">${escapeHtml(submittedBy.name)} &middot; ${new Date(eodReport.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>

      ${rockSections}
      ${generalSection}

      ${eodReport.challenges ? `
        <hr class="divider">
        <p style="font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 8px;">Challenges</p>
        <p style="font-size: 14px;">${escapeHtml(eodReport.challenges)}</p>
      ` : ""}

      ${eodReport.needsEscalation && eodReport.escalationNote ? `
        <div class="callout-warning">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #dc2626;">Escalation Needed</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #374151;">${escapeHtml(eodReport.escalationNote)}</p>
        </div>
      ` : ""}
    `, `${organization ? escapeHtml(organization.name) : "Taskspace"} &middot; Submitted at ${new Date(eodReport.submittedAt).toLocaleTimeString()}`)

    const result = await sendEmailWithRetry(resend, {
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `EOD Report: ${submittedBy.name} - ${new Date(eodReport.date).toLocaleDateString()}`,
      html,
    })

    if (result.error) {
      logger.error({ error: result.error.message }, "EOD notification failed")
      return { success: false, error: result.error.message }
    }

    logger.info({ emailId: result.data?.id }, "EOD notification sent")
    return { success: true, id: result.data?.id }
  } catch (error) {
    logError(logger, "EOD notification error", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/** Send daily EOD reminder */
export async function sendEODReminder(
  user: TeamMember,
  organization: Organization
): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    logger.debug("Email not configured, skipping EOD reminder")
    return { success: false, error: "Email not configured" }
  }

  const html = emailWrapper(`
    <h1>Time to submit your EOD</h1>
    <p class="subtitle">A quick reflection on your day</p>

    <p>Hi ${escapeHtml((user.name || "there").split(" ")[0])},</p>
    <p>Take a few minutes to share what you accomplished today and plan for tomorrow.</p>

    <div class="cta">
      <a href="${APP_URL}" class="btn" style="color: #ffffff !important; text-decoration: none !important;">Submit EOD Report</a>
    </div>
  `, `${escapeHtml(organization.name)}<br><a href="${buildUnsubscribeUrl(user.email)}" style="color: #94a3b8;">Unsubscribe</a>`)

  try {
    const result = await sendEmailWithRetry(resend, {
      from: FROM_EMAIL,
      to: user.email,
      subject: `Time to submit your EOD report - ${organization.name}`,
      html,
    })

    if (result.error) {
      logger.error({ error: result.error.message }, "EOD reminder failed")
      return { success: false, error: result.error.message }
    }

    logger.info({ emailId: result.data?.id }, "EOD reminder sent")
    return { success: true, id: result.data?.id }
  } catch (error) {
    logError(logger, "EOD reminder error", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// ========================================
// Weekly Manager Digest Email
// ========================================

export async function sendWeeklyDigestEmail(params: {
  to: string[]
  orgName: string
  weekLabel: string
  stats: {
    tasksCompleted: number
    rocksUpdated: number
    eodSubmissionRate: number
    totalMembers: number
    activeMembers: number
  }
  topPerformers: Array<{ name: string; tasksCompleted: number; eodCount: number }>
  atRiskRocks: Array<{ title: string; ownerName: string; status: string }>
}): Promise<EmailResult> {
  const resend = getResendClient()
  if (!resend) {
    logger.debug("Email not configured, skipping weekly digest email")
    return { success: false, error: "Email not configured" }
  }

  const safeOrg = escapeHtml(params.orgName)
  const dashboardUrl = `${APP_URL}/app?p=dashboard`

  const statusBadge = (status: string) => {
    const color = status === "blocked" ? "#dc2626" : "#d97706"
    const label = status === "blocked" ? "Blocked" : "At Risk"
    return `<span style="display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: ${color}; color: #fff;">${label}</span>`
  }

  const performersHtml = params.topPerformers.length > 0
    ? params.topPerformers.map((p, i) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #374151;">
          <strong style="color: #0f172a;">${i + 1}. ${escapeHtml(p.name)}</strong>
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #64748b; text-align: right;">
          ${p.tasksCompleted} task${p.tasksCompleted !== 1 ? "s" : ""} &middot; ${p.eodCount} EOD${p.eodCount !== 1 ? "s" : ""}
        </td>
      </tr>
    `).join("")
    : `<tr><td style="padding: 10px 0; font-size: 14px; color: #94a3b8;" colspan="2">No activity recorded this week</td></tr>`

  const atRiskHtml = params.atRiskRocks.length > 0
    ? `
      <div style="margin-top: 28px;">
        <h2 style="font-size: 16px; font-weight: 600; color: #0f172a; margin: 0 0 12px 0;">Rocks Needing Attention</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          ${params.atRiskRocks.map(r => `
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                <div style="font-size: 14px; font-weight: 500; color: #0f172a;">${escapeHtml(r.title)}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Owner: ${escapeHtml(r.ownerName)}</div>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; vertical-align: top;">
                ${statusBadge(r.status)}
              </td>
            </tr>
          `).join("")}
        </table>
      </div>
    `
    : ""

  const rateColor = params.stats.eodSubmissionRate >= 80
    ? "#16a34a"
    : params.stats.eodSubmissionRate >= 50
      ? "#d97706"
      : "#dc2626"

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Digest - ${safeOrg}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #0f172a; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">Weekly Digest</h1>
    <p style="color: rgba(255,255,255,0.65); margin: 6px 0 0 0; font-size: 13px;">${safeOrg} &middot; ${escapeHtml(params.weekLabel)}</p>
  </div>

  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 28px; border-radius: 0 0 8px 8px;">

    <!-- Stats Grid -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td width="50%" style="padding: 16px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px 0 0 0;">
          <div style="font-size: 28px; font-weight: 700; color: #0f172a;">${params.stats.tasksCompleted}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Tasks Completed</div>
        </td>
        <td width="50%" style="padding: 16px; background: #f8fafc; border: 1px solid #e5e7eb; border-left: 0; border-radius: 0 6px 0 0;">
          <div style="font-size: 28px; font-weight: 700; color: #0f172a;">${params.stats.rocksUpdated}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Rocks Updated</div>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding: 16px; background: #f8fafc; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 0 6px;">
          <div style="font-size: 28px; font-weight: 700; color: ${rateColor};">${params.stats.eodSubmissionRate}%</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">EOD Submission Rate</div>
        </td>
        <td width="50%" style="padding: 16px; background: #f8fafc; border: 1px solid #e5e7eb; border-top: 0; border-left: 0; border-radius: 0 0 6px 0;">
          <div style="font-size: 28px; font-weight: 700; color: #0f172a;">${params.stats.activeMembers}<span style="font-size: 16px; font-weight: 400; color: #94a3b8;">/${params.stats.totalMembers}</span></div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Active Members</div>
        </td>
      </tr>
    </table>

    <!-- Top Performers -->
    <div style="margin-top: 4px;">
      <h2 style="font-size: 16px; font-weight: 600; color: #0f172a; margin: 0 0 12px 0;">Top Performers</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        ${performersHtml}
      </table>
    </div>

    ${atRiskHtml}

    <!-- CTA Button -->
    <div style="margin: 28px 0; text-align: center;">
      <a href="${dashboardUrl}" style="display: inline-block; background: #0f172a; color: white; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 500; font-size: 15px;">View Dashboard</a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 13px; color: #6b7280; text-align: center;">
      Sent from Taskspace &middot; <a href="${buildUnsubscribeUrl(params.to[0] || "")}" style="color: #6b7280;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>
`

  try {
    const result = await sendEmailWithRetry(resend, {
      from: FROM_EMAIL,
      to: params.to,
      subject: `Weekly Digest: ${params.weekLabel} - ${params.orgName}`,
      html,
    })

    if (result.error) {
      logger.error({ error: result.error.message }, "Weekly digest email failed")
      return { success: false, error: result.error.message }
    }

    logger.info({ emailId: result.data?.id, to: params.to, weekLabel: params.weekLabel }, "Weekly digest email sent")
    return { success: true, id: result.data?.id }
  } catch (error) {
    logError(logger, "Weekly digest email error", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
