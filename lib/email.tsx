import type { EODReport, TeamMember, Rock, Invitation, Organization, PasswordResetToken } from "./types"

// Use environment variables for sensitive data
const RESEND_API_KEY = process.env.RESEND_API_KEY || ""
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
// Default to Resend's testing email - works without domain verification
// For production, set EMAIL_FROM to your verified domain (e.g., "AIMS <noreply@yourdomain.com>")
const EMAIL_FROM = process.env.EMAIL_FROM || "AIMS Dashboard <onboarding@resend.dev>"

// Check if email is configured
function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY && RESEND_API_KEY.startsWith("re_")
}

// Generic email sending function
async function sendEmail(to: string[], subject: string, html: string) {
  if (!isEmailConfigured()) {
    console.warn("Email not configured - RESEND_API_KEY not set")
    return { success: false, error: "Email not configured" }
  }

  try {
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

    const data = await response.json()
    return { success: response.ok, data }
  } catch (error) {
    console.error("Failed to send email:", error)
    return { success: false, error }
  }
}

// Send invitation email
export async function sendInvitationEmail(
  invitation: Invitation,
  organization: Organization,
  inviterName: string
) {
  const inviteLink = `${APP_URL}?invite=${invitation.token}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #2563EB, #1d4ed8); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .invite-box { background: #f0f9ff; border: 2px dashed #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #2563EB; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 10px 0; }
    .button:hover { background: #1d4ed8; }
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
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Join ${organization.name} on AIMS Dashboard</p>
      </div>

      <div class="content">
        <p>Hi there,</p>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${organization.name}</strong> on AIMS Dashboard - the team accountability and management platform.</p>

        <div class="invite-box">
          <p style="margin: 0 0 15px 0;">Click the button below to accept your invitation:</p>
          <a href="${inviteLink}" class="button">Accept Invitation</a>
          <p class="expires">This invitation expires in 7 days</p>
        </div>

        <div class="details">
          <div class="details-row">
            <span class="label">Organization</span>
            <span class="value">${organization.name}</span>
          </div>
          <div class="details-row">
            <span class="label">Role</span>
            <span class="value">${invitation.role === "admin" ? "Administrator" : "Team Member"}</span>
          </div>
          <div class="details-row">
            <span class="label">Department</span>
            <span class="value">${invitation.department}</span>
          </div>
        </div>

        <p style="color: #6b7280; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>

      <div class="footer">
        <p>AIMS Dashboard - Team Accountability & Management</p>
        <p style="margin-top: 10px;">If the button doesn't work, copy and paste this link:<br/>
        <a href="${inviteLink}" style="color: #2563EB; word-break: break-all;">${inviteLink}</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`

  return sendEmail(
    [invitation.email],
    `You're invited to join ${organization.name} on AIMS Dashboard`,
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
      <p><strong>${submittedBy.name}</strong> has flagged an issue that needs your attention.</p>

      <div class="content">
        <div class="meta">
          <strong>Date:</strong> ${new Date(eodReport.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}<br/>
          <strong>Department:</strong> ${submittedBy.department}<br/>
          <strong>Submitted:</strong> ${new Date(eodReport.submittedAt).toLocaleString()}
        </div>

        <div class="note">
          <strong>Escalation Note:</strong><br/>
          ${eodReport.escalationNote || "No details provided"}
        </div>

        ${eodReport.challenges ? `
        <div style="margin-top: 15px;">
          <strong>Challenges Mentioned:</strong><br/>
          ${eodReport.challenges}
        </div>
        ` : ""}
      </div>
    </div>

    <div class="footer">
      <p>AIMS Dashboard - ${organization.name}</p>
    </div>
  </div>
</body>
</html>
`

  return sendEmail(
    [ADMIN_EMAIL],
    `⚠️ Escalation from ${submittedBy.name} - ${organization.name}`,
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
            <div class="rock-title">${data.title}</div>
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
      AIMS Dashboard${organization ? ` - ${escapeHtml(organization.name)}` : ""} • Submitted at ${new Date(eodReport.submittedAt).toLocaleTimeString()}
    </div>
  </div>
</body>
</html>
`

    return sendEmail([ADMIN_EMAIL], `EOD Report: ${submittedBy.name} - ${new Date(eodReport.date).toLocaleDateString()}`, html)
  } catch (error) {
    console.error("Failed to send EOD notification:", error)
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
        <p>AIMS Dashboard - ${escapeHtml(organization.name)}</p>
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
        <p style="margin: 10px 0 0 0; opacity: 0.9;">AIMS Dashboard</p>
      </div>

      <div class="content">
        <p>Hi ${escapeHtml(userName.split(" ")[0])},</p>
        <p>We received a request to reset your password for your AIMS Dashboard account. Click the button below to create a new password:</p>

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
        <p>AIMS Dashboard - Team Accountability & Management</p>
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
    "Reset your AIMS Dashboard password",
    html
  )
}

// Utility function to escape HTML
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
