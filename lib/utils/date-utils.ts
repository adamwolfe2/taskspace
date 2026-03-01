/**
 * Date Utilities Module
 *
 * IMPORTANT: Date Handling Best Practices
 *
 * 1. For EOD reports and timezone-sensitive dates:
 *    - Use getTodayInTimezone(orgTimezone) to get the current date in organization timezone
 *    - Pass the organization's settings.timezone (e.g., "America/Los_Angeles")
 *
 * 2. For date display in UI:
 *    - Use formatDate() or formatShortDate() for user-friendly display
 *
 * 3. For database timestamps:
 *    - Use new Date().toISOString() for createdAt/updatedAt fields
 *
 * 4. AVOID these patterns:
 *    - toISOString().split("T")[0] - causes timezone shift (UTC conversion)
 *    - Manual YYYY-MM-DD string concatenation - use getTodayInTimezone() instead
 *
 * @module date-utils
 */

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

/**
 * Get today's date as YYYY-MM-DD string in local timezone
 * Uses local timezone to match EOD report dates
 */
export function getTodayString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
  } catch {
    // Silently fallback to UTC if timezone is invalid
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
  } catch {
    return now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  }
}

/**
 * Check if a given date string is valid for EOD submission
 * - Cannot submit for future dates (in any timezone)
 * - Extended grace period of 2 days to support international teams
 *   (e.g., IST is 13.5 hours ahead of PST, so an employee submitting at
 *   their EOD might be submitting for "2 days ago" in PST)
 * - For international teams, the date on the report represents the employee's
 *   work day, and the admin dashboard groups by submission timestamp
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

  // Don't allow future dates
  if (diffDays > 0) {
    return {
      valid: false,
      reason: `Cannot submit EOD report for a future date. Today in ${timezone} is ${todayInTz}.`,
      suggestedDate: todayInTz,
    }
  }

  // Allow submissions for the past 14 days to support backfilling missed reports
  if (diffDays < -14) {
    return {
      valid: false,
      reason: `EOD reports can only be submitted for the past 14 days. Please contact an admin if you need to submit for ${dateString}.`,
      suggestedDate: todayInTz,
    }
  }

  return { valid: true }
}

/**
 * Get the quarter string ("Q1 2026") for a given YYYY-MM-DD date string.
 */
export function getQuarterFromDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00Z")
  const month = date.getMonth() // 0-11
  const year = date.getFullYear()
  const quarter = Math.floor(month / 3) + 1
  return `Q${quarter} ${year}`
}

/**
 * Compare two quarter strings ("Q1 2026") chronologically.
 * Returns positive if a is later than b, negative if earlier, 0 if equal.
 * Use with Array.sort() to order quarters from oldest to newest.
 */
export function compareQuarters(a: string, b: string): number {
  const parse = (q: string) => {
    const [qPart, yearStr] = q.split(" ")
    return { year: parseInt(yearStr, 10), quarter: parseInt(qPart.slice(1), 10) }
  }
  const pa = parse(a)
  const pb = parse(b)
  if (pa.year !== pb.year) return pa.year - pb.year
  return pa.quarter - pb.quarter
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

/**
 * Format a date string as a short display string (e.g., "Mon, Feb 18")
 */
export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

/**
 * Get valid date options for EOD submission (today through 14 days ago)
 */
export function getValidDateOptions(todayInOrgTz: string): { value: string; label: string; isToday: boolean }[] {
  const today = new Date(todayInOrgTz + "T12:00:00")
  const options = []

  for (let i = 0; i <= 13; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

    let label = formatShortDate(dateStr)
    if (i === 0) label = `Today - ${label}`
    else if (i === 1) label = `Yesterday - ${label}`
    else label = `${i} days ago - ${label}`

    options.push({
      value: dateStr,
      label,
      isToday: i === 0
    })
  }

  return options
}

/**
 * Get current quarter display string (e.g., "Q1 2026")
 */
export function getCurrentQuarterDisplay(): string {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const quarter = Math.floor(month / 3) + 1
  return `Q${quarter} ${year}`
}

/** Returns the current quarter string e.g. "Q1 2026" */
export function getCurrentQuarter(): string {
  const now = new Date()
  const month = now.getMonth() // 0-11
  const year = now.getFullYear()
  const quarter = Math.floor(month / 3) + 1
  return `Q${quarter} ${year}`
}

/**
 * Check if a date string falls on a Thursday (day 4)
 */
export function isThursday(dateStr: string): boolean {
  const date = new Date(dateStr + "T12:00:00")
  return date.getDay() === 4
}
