export function formatDate(date: string): string {
  const d = new Date(date)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function getRelativeDate(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diffTime = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return formatDate(date)
}

export function getDaysUntil(date: string): number {
  const d = new Date(date)
  const now = new Date()
  const diffTime = d.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function isOverdue(date: string): boolean {
  return getDaysUntil(date) < 0
}

export function getTodayString(): string {
  return new Date().toISOString().split("T")[0]
}

/**
 * Get the current date in a specific timezone as YYYY-MM-DD string
 * This is critical for EOD reports to ensure all team members submit for the correct day
 * regardless of their local timezone.
 */
export function getTodayInTimezone(timezone: string = "America/Los_Angeles"): string {
  try {
    const now = new Date()
    // Use Intl.DateTimeFormat to get the date parts in the target timezone
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    // en-CA locale gives us YYYY-MM-DD format
    return formatter.format(now)
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    console.error(`Invalid timezone "${timezone}", falling back to UTC:`, error)
    return new Date().toISOString().split("T")[0]
  }
}

/**
 * Get current time formatted in a specific timezone
 */
export function getCurrentTimeInTimezone(timezone: string = "America/Los_Angeles"): string {
  const now = new Date()
  try {
    return now.toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  } catch (_error) {
    return now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  }
}

/**
 * Check if a given date string is valid for EOD submission in the org's timezone
 * - Cannot submit for future dates
 * - Cannot submit for dates more than 1 day in the past (grace period for late submissions)
 */
export function isValidEODDate(dateString: string, timezone: string = "America/Los_Angeles"): {
  valid: boolean
  reason?: string
  suggestedDate?: string
} {
  const todayInTz = getTodayInTimezone(timezone)
  const today = new Date(todayInTz + "T12:00:00Z")
  const submissionDate = new Date(dateString + "T12:00:00Z")

  const diffDays = Math.round((submissionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays > 0) {
    return {
      valid: false,
      reason: `Cannot submit EOD report for a future date. Today in ${timezone} is ${todayInTz}.`,
      suggestedDate: todayInTz,
    }
  }

  if (diffDays < -1) {
    return {
      valid: false,
      reason: `EOD reports can only be submitted for today or yesterday. Please contact an admin if you need to submit for ${dateString}.`,
      suggestedDate: todayInTz,
    }
  }

  return { valid: true }
}

/**
 * Format a date string for display with timezone awareness
 */
export function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString + "T12:00:00Z")
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
