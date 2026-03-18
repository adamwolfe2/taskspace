import {
  formatDistanceToNow,
  format,
  isToday,
  isTomorrow,
  isYesterday,
  differenceInDays,
  differenceInHours,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  addMonths,
  startOfDay,
  parseISO,
} from "date-fns"

/**
 * Format a date as a relative string (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

/**
 * Format a due date with smart relative display
 */
export function formatDueDate(date: string | Date): {
  text: string
  isOverdue: boolean
  urgency: "overdue" | "today" | "soon" | "upcoming" | "later"
} {
  const d = typeof date === "string" ? parseISO(date) : date
  const now = new Date()
  const daysDiff = differenceInDays(startOfDay(d), startOfDay(now))

  if (isToday(d)) {
    return { text: "Today", isOverdue: false, urgency: "today" }
  }

  if (isTomorrow(d)) {
    return { text: "Tomorrow", isOverdue: false, urgency: "soon" }
  }

  if (isYesterday(d)) {
    return { text: "Yesterday", isOverdue: true, urgency: "overdue" }
  }

  if (daysDiff < 0) {
    const absDays = Math.abs(daysDiff)
    if (absDays === 1) {
      return { text: "1 day overdue", isOverdue: true, urgency: "overdue" }
    }
    return { text: `${absDays} days overdue`, isOverdue: true, urgency: "overdue" }
  }

  if (daysDiff <= 7) {
    return { text: `In ${daysDiff} days`, isOverdue: false, urgency: "soon" }
  }

  if (daysDiff <= 30) {
    const weeks = Math.floor(daysDiff / 7)
    return {
      text: weeks === 1 ? "In 1 week" : `In ${weeks} weeks`,
      isOverdue: false,
      urgency: "upcoming",
    }
  }

  return { text: format(d, "MMM d, yyyy"), isOverdue: false, urgency: "later" }
}

/**
 * Get urgency color class based on due date
 */
export function getDueDateColor(urgency: string): string {
  switch (urgency) {
    case "overdue":
      return "text-red-600 bg-red-50"
    case "today":
      return "text-amber-600 bg-amber-50"
    case "soon":
      return "text-orange-600 bg-orange-50"
    case "upcoming":
      return "text-blue-600 bg-blue-50"
    default:
      return "text-slate-600 bg-slate-50"
  }
}

/**
 * Quick date options for date picker
 */
export function getQuickDateOptions(): { label: string; value: Date }[] {
  const today = new Date()
  return [
    { label: "Today", value: startOfDay(today) },
    { label: "Tomorrow", value: startOfDay(addDays(today, 1)) },
    { label: "Next Week", value: startOfDay(addWeeks(today, 1)) },
    { label: "In 2 Weeks", value: startOfDay(addWeeks(today, 2)) },
    { label: "Next Month", value: startOfDay(addMonths(today, 1)) },
    { label: "End of Week", value: endOfWeek(today, { weekStartsOn: 1 }) },
  ]
}

/**
 * Format time duration in human readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours}h`
  }
  return `${hours}h ${mins}m`
}

/**
 * Format time for display (e.g., "2:30 PM")
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date
  return format(d, "h:mm a")
}

/**
 * Format datetime for display (e.g., "Jan 15, 2025 at 2:30 PM")
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date
  return format(d, "MMM d, yyyy 'at' h:mm a")
}

/**
 * Get week start and end dates
 */
export function getWeekBounds(date: Date = new Date()): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(date, { weekStartsOn: 1 }),
  }
}

/**
 * Check if a date is a weekday
 */
export function isWeekday(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

/**
 * Get array of weekdays for a given week
 */
export function getWeekdays(weekStart: Date): Date[] {
  const days: Date[] = []
  let current = weekStart
  for (let i = 0; i < 5; i++) {
    days.push(current)
    current = addDays(current, 1)
  }
  return days
}

/**
 * Format relative time for recent activity
 */
export function formatActivityTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date
  const now = new Date()
  const hoursDiff = differenceInHours(now, d)

  if (hoursDiff < 1) {
    return "Just now"
  }
  if (hoursDiff < 24) {
    return `${hoursDiff}h ago`
  }
  if (isYesterday(d)) {
    return "Yesterday"
  }
  const daysDiff = differenceInDays(now, d)
  if (daysDiff < 7) {
    return `${daysDiff}d ago`
  }
  return format(d, "MMM d")
}
