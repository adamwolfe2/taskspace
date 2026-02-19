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

// Send invitation email
export async function sendInvitationEmail(
  invitation: Invitation,
  organization: Organization,
  inviterName: string
) {
  const inviteLink = `${APP_URL}/app?invite=${invitation.token}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #000000, #1f2937); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .invite-box { background: #f9fafb; border: 2px dashed #000000; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #000000; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 10px 0; }
    .button:hover { background: #1f2937; }
    .details { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .details-row:last-child { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: 600; color: #1f2937; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .expires { color: #dc2626; font-size: 14px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>You're Invited!</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Join ${escapeHtml(organization.name)}</p>
      </div>

      <div class="content">
        <p>Hi there,</p>
        <p><strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(organization.name)}</strong> on Taskspace - the AI operational infrastructure for multi-company founders & builders.</p>

        <div class="invite-box">
          <p style="margin: 0 0 15px 0;">Click the button below to accept your invitation:</p>
          <a href="${inviteLink}" class="button">Accept Invitation</a>
          <p class="expires">This invitation expires in 7 days</p>
        </div>

        <div class="details">
          <div class="details-row">
            <span class="label">Organization</span>
            <span class="value">${escapeHtml(organization.name)}</span>
          </div>
          <div class="details-row">
            <span class="label">Role</span>
            <span class="value">${invitation.role === "admin" ? "Administrator" : "Team Member"}</span>
          </div>
          <div class="details-row">
            <span class="label">Department</span>
            <span class="value">${escapeHtml(invitation.department)}</span>
          </div>
        </div>

        <p style="color: #6b7280; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>

      <div class="footer">
        <p>${escapeHtml(organization.name)} - Powered by Taskspace</p>
        <p style="margin-top: 10px;">If the button doesn't work, copy and paste this link:<br/>
        <a href="${inviteLink}" style="color: #000000; word-break: break-all;">${inviteLink}</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`

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

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #000000, #1f2937); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .verify-box { background: #f9fafb; border: 2px dashed #000000; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #000000; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 10px 0; }
    .button:hover { background: #1f2937; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .expires { color: #6b7280; font-size: 14px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>Verify Your Email</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Welcome to Taskspace</p>
      </div>

      <div class="content">
        <p>Hi ${escapeHtml(userName.split(" ")[0])},</p>
        <p>Thanks for signing up for Taskspace! Please verify your email address to get started.</p>

        <div class="verify-box">
          <p style="margin: 0 0 15px 0;">Click the button below to verify your email:</p>
          <a href="${verifyLink}" class="button">Verify Email Address</a>
          <p class="expires">This link expires in 24 hours</p>
        </div>

        <p style="color: #6b7280; font-size: 14px;">If you didn't create an account on Taskspace, you can safely ignore this email.</p>
      </div>

      <div class="footer">
        <p>Taskspace - Team Productivity Platform</p>
        <p style="margin-top: 10px;">If the button doesn't work, copy and paste this link:<br/>
        <a href="${verifyLink}" style="color: #000000; word-break: break-all;">${verifyLink}</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`

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
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert { background: #fef2f2; border: 2px solid #fecaca; border-radius: 12px; padding: 20px; }
    .alert-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
    .alert-icon { font-size: 24px; }
    .alert-title { color: #dc2626; font-size: 20px; font-weight: 600; margin: 0; }
    .content { background: white; border-radius: 8px; padding: 20px; margin-top: 15px; }
    .meta { color: #6b7280; font-size: 14px; margin-bottom: 15px; }
    .note { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
    .footer { text-align: center; padding: 15px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert">
      <div class="alert-header">
        <span class="alert-icon">⚠️</span>
        <h1 class="alert-title">Escalation Required</h1>
      </div>
      <p><strong>${escapeHtml(submittedBy.name)}</strong> has flagged an issue that needs your attention.</p>

      <div class="content">
        <div class="meta">
          <strong>Date:</strong> ${new Date(eodReport.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}<br/>
          <strong>Department:</strong> ${escapeHtml(submittedBy.department)}<br/>
          <strong>Submitted:</strong> ${new Date(eodReport.submittedAt).toLocaleString()}
        </div>

        <div class="note">
          <strong>Escalation Note:</strong><br/>
          ${escapeHtml(eodReport.escalationNote || "No details provided")}
        </div>

        ${eodReport.challenges ? `
        <div style="margin-top: 15px;">
          <strong>Challenges Mentioned:</strong><br/>
          ${escapeHtml(eodReport.challenges)}
        </div>
        ` : ""}
      </div>
    </div>

    <div class="footer">
      <p>${escapeHtml(organization.name)}</p>
    </div>
  </div>
</body>
</html>
`

  return sendEmail(
    [ADMIN_EMAIL],
    `⚠️ Escalation from ${escapeHtml(submittedBy.name)} - ${escapeHtml(organization.name)}`,
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
          <div class="rock-section">
            <div class="rock-title">${escapeHtml(data.title)}</div>
            <span class="status status-ontrack">${rock?.status === "completed" ? "Completed" : "On Track"}</span>
            <h4>Today's Key Activities:</h4>
            <ul class="task-list">
              ${data.tasks.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}
            </ul>
            ${
              rockPriorities.length > 0
                ? `
              <h4>Tomorrow's Priorities:</h4>
              <ul class="task-list">
                ${rockPriorities.map((p) => `<li>${escapeHtml(p.text)}</li>`).join("")}
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
      <div class="rock-section">
        <div class="rock-title">General Activities</div>
        <ul class="task-list">
          ${tasksByRock.general.tasks.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}
        </ul>
      </div>
    `
        : ""

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563EB; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .rock-section { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #2563EB; }
    .rock-title { font-weight: 600; color: #1f2937; margin-bottom: 8px; }
    .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .status-ontrack { background: #dcfce7; color: #166534; }
    .task-list { margin: 10px 0; padding-left: 20px; }
    .task-list li { margin: 5px 0; }
    .escalation { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin-top: 15px; }
    .escalation-header { color: #dc2626; font-weight: 600; }
    .footer { text-align: center; padding: 15px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;">EOD Report Submitted</h1>
      <p style="margin:5px 0 0 0;">${escapeHtml(submittedBy.name)} • ${new Date(eodReport.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
    </div>

    <div class="content">
      <h2>Rock Progress Update</h2>

      ${rockSections}
      ${generalSection}

      ${
        eodReport.challenges
          ? `
        <h3>Challenges</h3>
        <p>${escapeHtml(eodReport.challenges)}</p>
      `
          : ""
      }

      ${
        eodReport.needsEscalation && eodReport.escalationNote
          ? `
        <div class="escalation">
          <div class="escalation-header">⚠️ ESCALATION NEEDED</div>
          <p>${escapeHtml(eodReport.escalationNote)}</p>
        </div>
      `
          : ""
      }
    </div>

    <div class="footer">
      ${organization ? escapeHtml(organization.name) : "Taskspace"} • Submitted at ${new Date(eodReport.submittedAt).toLocaleTimeString()}
    </div>
  </div>
</body>
</html>
`

    return sendEmail([ADMIN_EMAIL], `EOD Report: ${submittedBy.name} - ${new Date(eodReport.date).toLocaleDateString()}`, html)
  } catch (error) {
    logError(logger, "Failed to send EOD notification", error)
    return { success: false, error }
  }
}

// Send daily EOD reminder
export async function sendEODReminder(user: TeamMember, organization: Organization) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; text-align: center; }
    .button { display: inline-block; background: #2563EB; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .footer { text-align: center; padding: 15px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1 style="margin:0;">⏰ EOD Reminder</h1>
      </div>
      <div class="content">
        <p>Hi ${escapeHtml(user.name.split(" ")[0])},</p>
        <p>Don't forget to submit your End of Day report!</p>
        <p>Take a few minutes to reflect on what you accomplished today and plan for tomorrow.</p>
        <a href="${APP_URL}" class="button">Submit EOD Report</a>
      </div>
      <div class="footer">
        <p>${escapeHtml(organization.name)}</p>
        <p style="margin-top: 10px; font-size: 11px;">
          <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(user.email)}" style="color: #6b7280;">Unsubscribe from notifications</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`

  return sendEmail(
    [user.email],
    `⏰ Time to submit your EOD report - ${organization.name}`,
    html
  )
}

// Send password reset email
export async function sendPasswordResetEmail(
  resetToken: PasswordResetToken,
  userName: string
) {
  const resetLink = `${APP_URL}?resetToken=${resetToken.token}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .reset-box { background: #fef2f2; border: 2px dashed #dc2626; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #dc2626; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 10px 0; }
    .button:hover { background: #b91c1c; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .expires { color: #dc2626; font-size: 14px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>Password Reset Request</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Taskspace</p>
      </div>

      <div class="content">
        <p>Hi ${escapeHtml(userName.split(" ")[0])},</p>
        <p>We received a request to reset your password for your account. Click the button below to create a new password:</p>

        <div class="reset-box">
          <a href="${resetLink}" class="button">Reset Password</a>
          <p class="expires">This link expires in 1 hour</p>
        </div>

        <div class="warning">
          <strong>Security Notice:</strong><br/>
          If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
        </div>

        <p style="color: #6b7280; font-size: 14px;">For security reasons, this link can only be used once and will expire after 1 hour.</p>
      </div>

      <div class="footer">
        <p>Taskspace - Team Productivity Platform</p>
        <p style="margin-top: 10px;">If the button doesn't work, copy and paste this link:<br/>
        <a href="${resetLink}" style="color: #dc2626; word-break: break-all;">${resetLink}</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`

  return sendEmail(
    [resetToken.email],
    "Reset your Taskspace password",
    html
  )
}

// Send welcome email to new users
export async function sendWelcomeEmail(user: TeamMember, organization: Organization) {
  const dashboardLink = `${APP_URL}/dashboard`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px; }
    .welcome-box { background: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 10px 0; }
    .features { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .feature-item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .feature-item:last-child { border-bottom: none; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>🎉 Welcome to TaskSpace!</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Your team's productivity platform</p>
      </div>

      <div class="content">
        <p>Hi ${escapeHtml(user.name.split(" ")[0])},</p>
        <p>Welcome to <strong>${escapeHtml(organization.name)}</strong> on TaskSpace! We're excited to have you on board.</p>

        <div class="welcome-box">
          <p style="margin: 0 0 15px 0;">Get started with your dashboard:</p>
          <a href="${dashboardLink}" class="button">Go to Dashboard</a>
        </div>

        <div class="features">
          <h3 style="margin-top: 0;">What you can do:</h3>
          <div class="feature-item"><strong>📝 Submit EOD Reports</strong> - Share your daily progress</div>
          <div class="feature-item"><strong>🎯 Track Quarterly Rocks</strong> - Focus on what matters most</div>
          <div class="feature-item"><strong>✅ Manage Tasks</strong> - Stay organized and on track</div>
          <div class="feature-item"><strong>📊 View Scorecards</strong> - Monitor key metrics</div>
          <div class="feature-item"><strong>🤝 Join L10 Meetings</strong> - Collaborate with your team</div>
        </div>

        <p>Need help getting started? Check out our <a href="${APP_URL}/help" style="color: #3b82f6;">help center</a> or reach out to your team admin.</p>
      </div>

      <div class="footer">
        <p>${escapeHtml(organization.name)} - Powered by TaskSpace</p>
        <p style="margin-top: 10px; font-size: 11px;">
          <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(user.email)}" style="color: #6b7280;">Unsubscribe from notifications</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`

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

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .rock-box { background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .rock-title { font-size: 20px; font-weight: 600; color: #1f2937; margin-bottom: 10px; }
    .rock-details { color: #6b7280; margin: 10px 0; }
    .button { display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>🎯 New Rock Assigned</h1>
      </div>

      <div class="content">
        <p>Hi ${escapeHtml(assignedTo.name.split(" ")[0])},</p>
        <p><strong>${escapeHtml(assignedBy.name)}</strong> has assigned you a new quarterly rock:</p>

        <div class="rock-box">
          <div class="rock-title">${escapeHtml(rock.title)}</div>
          ${rock.description ? `<p>${escapeHtml(rock.description)}</p>` : ''}
          <div class="rock-details">
            <strong>Due Date:</strong> ${dueDate}
          </div>
          <a href="${rockLink}" class="button">View Rock Details</a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">This rock is part of your quarterly goals. Regular check-ins will help you stay on track.</p>
      </div>

      <div class="footer">
        <p>${escapeHtml(organization.name)}</p>
        <p style="margin-top: 10px; font-size: 11px;">
          <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(assignedTo.email)}" style="color: #6b7280;">Unsubscribe from notifications</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`

  return sendEmail(
    [assignedTo.email],
    `🎯 New Rock Assigned: ${escapeHtml(rock.title)}`,
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

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .task-box { background: #fffbeb; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .task-title { font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 10px; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>✅ New Task Assigned</h1>
      </div>

      <div class="content">
        <p>Hi ${escapeHtml(assignedTo.name.split(" ")[0])},</p>
        <p><strong>${escapeHtml(assignedBy.name)}</strong> has assigned you a new task:</p>

        <div class="task-box">
          <div class="task-title">${escapeHtml(task.title)}</div>
          ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}
          ${dueDate ? `<p><strong>Due Date:</strong> ${dueDate}</p>` : ''}
          <a href="${taskLink}" class="button">View Task</a>
        </div>
      </div>

      <div class="footer">
        <p>${escapeHtml(organization.name)}</p>
        <p style="margin-top: 10px; font-size: 11px;">
          <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(assignedTo.email)}" style="color: #6b7280;">Unsubscribe from notifications</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`

  return sendEmail(
    [assignedTo.email],
    `✅ New Task: ${escapeHtml(task.title)}`,
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

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .warning-box { background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .deadline-badge { display: inline-block; background: #dc2626; color: white; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 18px; margin: 10px 0; }
    .button { display: inline-block; background: #dc2626; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>⚠️ Rock Deadline Approaching</h1>
      </div>

      <div class="content">
        <p>Hi ${escapeHtml(owner.name.split(" ")[0])},</p>
        <p>Your quarterly rock deadline is coming up soon:</p>

        <div class="warning-box">
          <h2 style="margin-top: 0; color: #dc2626;">${escapeHtml(rock.title)}</h2>
          <div class="deadline-badge">${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining</div>
          <p style="margin-bottom: 0;"><strong>Due:</strong> ${dueDate}</p>
          <a href="${rockLink}" class="button">Review Progress</a>
        </div>

        <p>Make sure you're on track to complete this rock on time. If you're facing any blockers, consider escalating to your team lead.</p>
      </div>

      <div class="footer">
        <p>${escapeHtml(organization.name)}</p>
        <p style="margin-top: 10px; font-size: 11px;">
          <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(owner.email)}" style="color: #6b7280;">Unsubscribe from notifications</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`

  return sendEmail(
    [owner.email],
    `⚠️ Rock deadline in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}: ${escapeHtml(rock.title)}`,
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
