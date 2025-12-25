import type { EODReport, TeamMember, Rock } from "./types"

const RESEND_API_KEY = "re_SBcHC7kC_PFPYoeyF34P2FJYhsp5Es2cm"
const ADMIN_EMAIL = "adam@aims.com"

export async function sendEODNotification(eodReport: EODReport, submittedBy: TeamMember, rocks: Rock[]) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AIMS Dashboard <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject: `EOD Report Submitted: ${submittedBy.name} - ${new Date(eodReport.date).toLocaleDateString()}`,
        html: generateEODEmailHTML(eodReport, submittedBy, rocks),
      }),
    })

    const data = await response.json()
    return { success: response.ok, data }
  } catch (error) {
    console.error("Failed to send email notification:", error)
    return { success: false, error }
  }
}

function generateEODEmailHTML(eod: EODReport, user: TeamMember, rocks: Rock[]): string {
  const tasksByRock = (eod.tasks || []).reduce(
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
      const rockPriorities = (eod.tomorrowPriorities || []).filter((p) => p.rockId === rockId)

      return `
        <div class="rock-section">
          <div class="rock-title">${data.title}</div>
          <span class="status status-ontrack">On Track</span>
          <h4>Today's Key Activities:</h4>
          <ul class="task-list">
            ${data.tasks.map((t) => `<li>${t}</li>`).join("")}
          </ul>
          ${
            rockPriorities.length > 0
              ? `
            <h4>Tomorrow's Priorities:</h4>
            <ul class="task-list">
              ${rockPriorities.map((p) => `<li>${p.text}</li>`).join("")}
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
        ${tasksByRock.general.tasks.map((t) => `<li>${t}</li>`).join("")}
      </ul>
    </div>
  `
      : ""

  return `
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
      <p style="margin:5px 0 0 0;">${user.name} • ${new Date(eod.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
    </div>
    
    <div class="content">
      <h2>Rock Progress Update</h2>
      
      ${rockSections}
      ${generalSection}
      
      ${
        eod.challenges
          ? `
        <h3>Challenges</h3>
        <p>${eod.challenges}</p>
      `
          : ""
      }
      
      ${
        eod.needsEscalation && eod.escalationNote
          ? `
        <div class="escalation">
          <div class="escalation-header">⚠️ ESCALATION NEEDED</div>
          <p>${eod.escalationNote}</p>
        </div>
      `
          : ""
      }
    </div>
    
    <div class="footer">
      AIMS Dashboard • Submitted at ${new Date(eod.submittedAt).toLocaleTimeString()}
    </div>
  </div>
</body>
</html>
`
}
