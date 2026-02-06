/**
 * Report Export Utilities
 *
 * Generates formatted markdown from public EOD data for copy-to-clipboard and print.
 */

// ============================================
// TYPES (match public page interfaces)
// ============================================

interface ExportTask {
  description: string
  rockTitle?: string
  completedAt?: string
}

interface ExportPriority {
  description: string
  rockTitle?: string
}

interface ExportDailyReport {
  userName: string
  department: string
  jobTitle?: string
  tasks: ExportTask[]
  challenges: string
  tomorrowPriorities: ExportPriority[]
  needsEscalation: boolean
  escalationNote: string | null
}

interface ExportWeeklyUserReport {
  userName: string
  department: string
  jobTitle?: string
  totalReports: number
  totalTasks: number
  tasks: (ExportTask & { date?: string })[]
  challenges: string[]
  priorities: (ExportPriority & { date?: string })[]
  escalations: Array<{ date: string; note: string }>
}

// ============================================
// DAILY EXPORT
// ============================================

export function generateDailyMarkdown(
  orgName: string,
  displayDate: string,
  reports: ExportDailyReport[]
): string {
  const lines: string[] = []

  lines.push(`${orgName} — Daily EOD Report — ${displayDate}`)
  lines.push("=".repeat(50))
  lines.push("")

  for (const report of reports) {
    const role = report.jobTitle || report.department
    lines.push(`## ${report.userName} (${role})`)
    lines.push("")

    // Group tasks by rock
    const tasksByRock = groupByRock(report.tasks)

    for (const [rockTitle, tasks] of Object.entries(tasksByRock)) {
      if (rockTitle === "general") continue
      lines.push(`### Rock: ${rockTitle}`)
      for (const task of tasks) {
        lines.push(`- [x] ${task.description}`)
      }
      lines.push("")
    }

    // General tasks
    if (tasksByRock["general"]?.length) {
      lines.push("### Other Tasks")
      for (const task of tasksByRock["general"]) {
        lines.push(`- [x] ${task.description}`)
      }
      lines.push("")
    }

    // Tomorrow's priorities grouped by rock
    if (report.tomorrowPriorities.length > 0) {
      lines.push("### Tomorrow's Priorities")
      const prioritiesByRock = groupByRock(report.tomorrowPriorities)
      for (const [rockTitle, priorities] of Object.entries(prioritiesByRock)) {
        if (rockTitle !== "general") {
          lines.push(`**${rockTitle}:**`)
        }
        for (const p of priorities) {
          lines.push(`- [ ] ${p.description}`)
        }
      }
      lines.push("")
    }

    // Challenges
    lines.push(`Challenges: ${report.challenges || "None reported"}`)

    // Escalation
    if (report.needsEscalation && report.escalationNote) {
      lines.push(`**ESCALATION:** ${report.escalationNote}`)
    }

    lines.push("")
    lines.push("---")
    lines.push("")
  }

  return lines.join("\n")
}

// ============================================
// WEEKLY EXPORT
// ============================================

export function generateWeeklyMarkdown(
  orgName: string,
  weekRange: string,
  userReports: ExportWeeklyUserReport[]
): string {
  const lines: string[] = []

  lines.push(`${orgName} — Weekly EOD Report — ${weekRange}`)
  lines.push("=".repeat(50))
  lines.push("")

  for (const report of userReports) {
    const role = report.jobTitle || report.department
    lines.push(`## ${report.userName} (${role})`)
    lines.push(`${report.totalReports} reports | ${report.totalTasks} tasks`)
    lines.push("")

    // Group tasks by rock
    const tasksByRock = groupByRock(report.tasks)

    for (const [rockTitle, tasks] of Object.entries(tasksByRock)) {
      if (rockTitle === "general") continue
      lines.push(`### Rock: ${rockTitle}`)
      for (const task of tasks) {
        lines.push(`- [x] ${task.description}`)
      }
      lines.push("")
    }

    if (tasksByRock["general"]?.length) {
      lines.push("### Other Tasks")
      for (const task of tasksByRock["general"]) {
        lines.push(`- [x] ${task.description}`)
      }
      lines.push("")
    }

    // Challenges
    if (report.challenges.length > 0) {
      lines.push("### Challenges")
      for (const challenge of report.challenges) {
        if (challenge) lines.push(`- ${challenge}`)
      }
      lines.push("")
    }

    // Escalations
    if (report.escalations.length > 0) {
      lines.push("### Escalations")
      for (const esc of report.escalations) {
        lines.push(`- **${esc.date}:** ${esc.note}`)
      }
      lines.push("")
    }

    lines.push("---")
    lines.push("")
  }

  return lines.join("\n")
}

// ============================================
// CLIPBOARD & PRINT HELPERS
// ============================================

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand("copy")
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
}

export function printReport(): void {
  window.print()
}

// ============================================
// HELPERS
// ============================================

function groupByRock<T extends { rockTitle?: string }>(
  items: T[]
): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = item.rockTitle || "general"
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, T[]>)
}
