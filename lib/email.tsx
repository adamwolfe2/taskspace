import type { EODReport, TeamMember, Rock, Invitation, Organization, PasswordResetToken, EmailVerificationToken } from "./types"
import { withRetry, isTransientError } from "./utils"
import { CONFIG } from "./config"
import { logger, logError } from "@/lib/logger"

// Use environment variables for sensitive data
const RESEND_API_KEY = process.env.RESEND_API_KEY || ""
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "team@trytaskspace.com"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.trytaskspace.com"
// Default to Taskspace domain - make sure this domain is verified in Resend
// For testing without domain, use "Taskspace <onboarding@resend.dev>"
const EMAIL_FROM = process.env.EMAIL_FROM || "Taskspace <team@trytaskspace.com>"

// Check if email is configured
function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY && RESEND_API_KEY.startsWith("re_")
}

// Generic email sending function with automatic retry
async function sendEmail(to: string[], subject: string, html: string) {
  if (!isEmailConfigured()) {
    logger.warn("Email not configured - RESEND_API_KEY not set")
    return { success: false, error: "Email not configured" }
  }

  try {
    const data = await withRetry(
      async () => {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to,
            subject,
            html,
          }),
        })

        const result = await response.json()

        // Throw error for non-OK responses to trigger retry
        if (!response.ok) {
          const error = new Error(result.message || result.error || "Resend API error")
          // Only retry on 5xx errors or rate limits
          if (response.status >= 500 || response.status === 429) {
            throw error
          }
          // Don't retry 4xx client errors (except 429)
          return { success: false, error: error.message, data: result, noRetry: true }
        }

        return result
      },
      {
        maxAttempts: CONFIG.api.retryAttempts,
        initialDelayMs: CONFIG.api.retryDelayMs,
        isRetryable: isTransientError,
        onRetry: (error, attempt) => {
          logger.warn({ attempt, error: error instanceof Error ? error.message : String(error) }, "Email send retry attempt")
        },
      }
    )

    // Check if we got a non-retried error
    if (data && 'noRetry' in data) {
      // Logged at caller level if needed
      return { success: false, error: data.error, data: data.data }
    }

    // Email sent successfully (logged at debug level for production)
    return { success: true, data }
  } catch (error) {
    // Error logged at caller level if needed
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Shared email wrapper — clean, minimal layout with top accent border
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
    .btn-outline { display: inline-block; background: transparent; color: #0f172a; padding: 11px 27px; text-decoration: none; font-weight: 500; font-size: 14px; border: 1px solid #0f172a; }
    .btn-danger { display: inline-block; background: #dc2626; padding: 12px 28px; text-decoration: none; font-weight: 500; font-size: 14px; }
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

// Send invitation email
export async function sendInvitationEmail(
  invitation: Invitation,
  organization: Organization,
  inviterName: string
) {
  const inviteLink = `${APP_URL}/join/${invitation.token}`

  const html = emailWrapper(`
    <h1>You're invited to ${escapeHtml(organization.name)}</h1>
    <p class="subtitle">${escapeHtml(inviterName)} wants you on the team</p>

    <p>${escapeHtml(inviterName)} has invited you to join <strong>${escapeHtml(organization.name)}</strong> on Taskspace.</p>

    <div class="cta">
      <a href="${inviteLink}" class="btn" style="color: #ffffff !important; text-decoration: none !important;">Accept Invitation</a>
    </div>

    <hr class="divider">

    <div class="detail-row">
      <span class="detail-label">Organization</span>
      <span class="detail-value">${escapeHtml(organization.name)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Role</span>
      <span class="detail-value">${invitation.role === "admin" ? "Administrator" : "Team Member"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Department</span>
      <span class="detail-value">${escapeHtml(invitation.department)}</span>
    </div>

    <p class="expires">This invitation expires in 7 days</p>

    <p class="note">If you didn't expect this invitation, you can safely ignore this email.</p>
    <p class="link-fallback">Or copy this link: ${inviteLink}</p>
  `, `${escapeHtml(organization.name)} &middot; Powered by Taskspace<br><a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(invitation.email)}" style="color: #94a3b8;">Unsubscribe</a>`)

  return sendEmail(
    [invitation.email],
    `You're invited to join ${escapeHtml(organization.name)}`,
    html
  )
}

// Send email verification email
export async function sendVerificationEmail(
  verificationToken: EmailVerificationToken,
  userName: string
) {
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

  return sendEmail(
    [verificationToken.email],
    "Verify your email address - Taskspace",
    html
  )
}

// Send EOD escalation notification to admin
export async function sendEscalationNotification(
  eodReport: EODReport,
  submittedBy: TeamMember,
  organization: Organization
) {
  const html = emailWrapper(`
    <h1>Escalation from ${escapeHtml(submittedBy.name)}</h1>
    <p class="subtitle">${new Date(eodReport.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>

    <div class="callout-warning">
      <p style="margin: 0; font-size: 14px; font-weight: 600; color: #dc2626;">Needs Attention</p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #374151;">${escapeHtml(eodReport.escalationNote || "No details provided")}</p>
    </div>

    <hr class="divider">

    <div class="detail-row">
      <span class="detail-label">Submitted by</span>
      <span class="detail-value">${escapeHtml(submittedBy.name)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Department</span>
      <span class="detail-value">${escapeHtml(submittedBy.department)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Submitted</span>
      <span class="detail-value">${new Date(eodReport.submittedAt).toLocaleString()}</span>
    </div>

    ${eodReport.challenges ? `
    <hr class="divider">
    <p style="font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 8px;">Challenges Mentioned</p>
    <p style="font-size: 14px;">${escapeHtml(eodReport.challenges)}</p>
    ` : ""}
  `, `${escapeHtml(organization.name)}`)

  return sendEmail(
    [ADMIN_EMAIL],
    `Escalation from ${escapeHtml(submittedBy.name)} - ${escapeHtml(organization.name)}`,
    html
  )
}

// Send EOD report notification
export async function sendEODNotification(
  eodReport: EODReport,
  submittedBy: TeamMember,
  rocks: Rock[],
  organization?: Organization
) {
  try {
    const tasksByRock = (eodReport.tasks || []).reduce(
      (acc, task) => {
        const key = task.rockId || "general"
        if (!acc[key]) {
          acc[key] = {
            title: task.rockTitle || "General Activities",
            tasks: [],
          }
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
            ${
              rockPriorities.length > 0
                ? `
              <p style="margin: 12px 0 4px 0; font-size: 13px; font-weight: 600; color: #64748b;">Tomorrow's Priorities</p>
              <ul style="margin: 4px 0 0 0; padding-left: 18px; font-size: 14px; color: #374151;">
                ${rockPriorities.map((p) => `<li style="margin: 4px 0;">${escapeHtml(p.text)}</li>`).join("")}
              </ul>
            `
                : ""
            }
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

      ${
        eodReport.challenges
          ? `
        <hr class="divider">
        <p style="font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 8px;">Challenges</p>
        <p style="font-size: 14px;">${escapeHtml(eodReport.challenges)}</p>
      `
          : ""
      }

      ${
        eodReport.needsEscalation && eodReport.escalationNote
          ? `
        <div class="callout-warning">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #dc2626;">Escalation Needed</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #374151;">${escapeHtml(eodReport.escalationNote)}</p>
        </div>
      `
          : ""
      }
    `, `${organization ? escapeHtml(organization.name) : "Taskspace"} &middot; Submitted at ${new Date(eodReport.submittedAt).toLocaleTimeString()}`)

    return sendEmail([ADMIN_EMAIL], `EOD Report: ${submittedBy.name} - ${new Date(eodReport.date).toLocaleDateString()}`, html)
  } catch (error) {
    logError(logger, "Failed to send EOD notification", error)
    return { success: false, error }
  }
}

// Send daily EOD reminder
export async function sendEODReminder(user: TeamMember, organization: Organization) {
  const html = emailWrapper(`
    <h1>Time to submit your EOD</h1>
    <p class="subtitle">A quick reflection on your day</p>

    <p>Hi ${escapeHtml((user.name || "there").split(" ")[0])},</p>
    <p>Take a few minutes to share what you accomplished today and plan for tomorrow.</p>

    <div class="cta">
      <a href="${APP_URL}" class="btn" style="color: #ffffff !important; text-decoration: none !important;">Submit EOD Report</a>
    </div>
  `, `${escapeHtml(organization.name)}<br><a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(user.email)}" style="color: #94a3b8;">Unsubscribe</a>`)

  return sendEmail(
    [user.email],
    `Time to submit your EOD report - ${organization.name}`,
    html
  )
}

// Send password reset email
export async function sendPasswordResetEmail(
  resetToken: PasswordResetToken,
  userName: string
) {
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

  return sendEmail(
    [resetToken.email],
    "Reset your Taskspace password",
    html
  )
}

// Send welcome email to new users
export async function sendWelcomeEmail(user: TeamMember, organization: Organization) {
  const dashboardLink = `${APP_URL}/dashboard`

  const html = emailWrapper(`
    <h1>Welcome to ${escapeHtml(organization.name)}</h1>
    <p class="subtitle">You're all set up on Taskspace</p>

    <p>Hi ${escapeHtml((user.name || "there").split(" ")[0])},</p>
    <p>Your account is ready. Here's what you can do:</p>

    <div class="callout">
      <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Submit EOD Reports</strong> &mdash; Share your daily progress</p>
      <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Track Quarterly Rocks</strong> &mdash; Focus on what matters</p>
      <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Manage Tasks</strong> &mdash; Stay organized</p>
      <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>View Scorecards</strong> &mdash; Monitor key metrics</p>
      <p style="margin: 0; font-size: 14px;"><strong>Join Meetings</strong> &mdash; Collaborate with your team</p>
    </div>

    <div class="cta">
      <a href="${dashboardLink}" class="btn" style="color: #ffffff !important; text-decoration: none !important;">Go to Dashboard</a>
    </div>
  `, `${escapeHtml(organization.name)} &middot; Powered by Taskspace<br><a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(user.email)}" style="color: #94a3b8;">Unsubscribe</a>`)

  return sendEmail(
    [user.email],
    `Welcome to ${escapeHtml(organization.name)} on TaskSpace!`,
    html
  )
}

// Send rock assigned notification
export async function sendRockAssignedEmail(
  rock: Rock,
  assignedTo: TeamMember,
  assignedBy: TeamMember,
  organization: Organization
) {
  const rockLink = `${APP_URL}/rocks?id=${rock.id}`
  const dueDate = new Date(rock.dueDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  })

  const html = emailWrapper(`
    <h1>New rock assigned</h1>
    <p class="subtitle">${escapeHtml(assignedBy.name)} assigned you a quarterly rock</p>

    <p>Hi ${escapeHtml((assignedTo.name || "there").split(" ")[0])},</p>

    <div class="callout">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #0f172a;">${escapeHtml(rock.title)}</p>
      ${rock.description ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #374151;">${escapeHtml(rock.description)}</p>` : ''}
      <p style="margin: 12px 0 0 0; font-size: 13px; color: #64748b;"><strong>Due:</strong> ${dueDate}</p>
    </div>

    <div class="cta">
      <a href="${rockLink}" class="btn" style="color: #ffffff !important; text-decoration: none !important;">View Rock</a>
    </div>

    <p class="note">Regular check-ins will help you stay on track with this rock.</p>
  `, `${escapeHtml(organization.name)}<br><a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(assignedTo.email)}" style="color: #94a3b8;">Unsubscribe</a>`)

  return sendEmail(
    [assignedTo.email],
    `New Rock: ${escapeHtml(rock.title)}`,
    html
  )
}

// Send task assigned notification
export async function sendTaskAssignedEmail(
  task: { id: string; title: string; description?: string; dueDate?: string },
  assignedTo: TeamMember,
  assignedBy: TeamMember,
  organization: Organization
) {
  const taskLink = `${APP_URL}/tasks?id=${task.id}`
  const dueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    : null

  const html = emailWrapper(`
    <h1>New task assigned</h1>
    <p class="subtitle">${escapeHtml(assignedBy.name)} assigned you a task</p>

    <p>Hi ${escapeHtml((assignedTo.name || "there").split(" ")[0])},</p>

    <div class="callout">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #0f172a;">${escapeHtml(task.title)}</p>
      ${task.description ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #374151;">${escapeHtml(task.description)}</p>` : ''}
      ${dueDate ? `<p style="margin: 12px 0 0 0; font-size: 13px; color: #64748b;"><strong>Due:</strong> ${dueDate}</p>` : ''}
    </div>

    <div class="cta">
      <a href="${taskLink}" class="btn" style="color: #ffffff !important; text-decoration: none !important;">View Task</a>
    </div>
  `, `${escapeHtml(organization.name)}<br><a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(assignedTo.email)}" style="color: #94a3b8;">Unsubscribe</a>`)

  return sendEmail(
    [assignedTo.email],
    `New Task: ${escapeHtml(task.title)}`,
    html
  )
}

// Send rock deadline approaching notification
export async function sendRockDeadlineEmail(
  rock: Rock,
  owner: TeamMember,
  organization: Organization,
  daysRemaining: number
) {
  const rockLink = `${APP_URL}/rocks?id=${rock.id}`
  const dueDate = new Date(rock.dueDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  })

  const html = emailWrapper(`
    <h1>Rock deadline approaching</h1>
    <p class="subtitle">${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining</p>

    <p>Hi ${escapeHtml((owner.name || "there").split(" ")[0])},</p>
    <p>Your quarterly rock is due soon:</p>

    <div class="callout-warning">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #0f172a;">${escapeHtml(rock.title)}</p>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b;"><strong>Due:</strong> ${dueDate}</p>
    </div>

    <div class="cta">
      <a href="${rockLink}" class="btn" style="color: #ffffff !important; text-decoration: none !important;">Review Progress</a>
    </div>

    <p class="note">If you're facing blockers, consider escalating to your team lead.</p>
  `, `${escapeHtml(organization.name)}<br><a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(owner.email)}" style="color: #94a3b8;">Unsubscribe</a>`)

  return sendEmail(
    [owner.email],
    `Rock deadline in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}: ${escapeHtml(rock.title)}`,
    html
  )
}

/**
 * Escape HTML special characters to prevent XSS attacks
 * Must be used on all user-generated content in email templates
 * @param text - Text to escape
 * @returns Safe HTML string
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
