/**
 * Centralized date formatting utilities.
 * All user-facing dates should use these functions for consistency.
 */

/** "March 19, 2026" */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

/** "Mar 19, 2026" */
export function formatDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/** "Wed, Mar 19" */
export function formatDateCompact(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date + (date.includes("T") ? "" : "T12:00:00")) : date
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

/** "Wednesday, March 19, 2026" */
export function formatDateLong(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

/** "3:45 PM" */
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

/** "Mar 19, 2026 at 3:45 PM" */
export function formatDateTime(date: string | Date): string {
  return `${formatDateShort(date)} at ${formatTime(date)}`
}

/** "YYYY-MM-DD" in a specific timezone */
export function formatDateISO(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date)
  } catch {
    return date.toISOString().split("T")[0]
  }
}

/** Relative time: "2 hours ago", "yesterday", "3 days ago" */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDateShort(d)
}
