"use client"

import { cn } from "@/lib/utils"
import { formatDueDate, getDueDateColor } from "@/lib/utils/date-helpers"
import { Clock, AlertTriangle, Calendar } from "lucide-react"

interface DueDateBadgeProps {
  dueDate: string | Date
  className?: string
  showIcon?: boolean
  size?: "sm" | "md"
}

export function DueDateBadge({
  dueDate,
  className,
  showIcon = true,
  size = "sm",
}: DueDateBadgeProps) {
  const { text, isOverdue, urgency } = formatDueDate(dueDate)
  const colorClass = getDueDateColor(urgency)

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
  }

  const Icon = isOverdue ? AlertTriangle : urgency === "today" ? Clock : Calendar

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded-full",
        sizeClasses[size],
        colorClass,
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {text}
    </span>
  )
}

// Compact version for lists
export function CompactDueDate({
  dueDate,
  className,
}: {
  dueDate: string | Date
  className?: string
}) {
  const { text, isOverdue, urgency } = formatDueDate(dueDate)

  const textColor = isOverdue
    ? "text-red-600 dark:text-red-400"
    : urgency === "today"
    ? "text-amber-600 dark:text-amber-400"
    : urgency === "soon"
    ? "text-orange-600 dark:text-orange-400"
    : "text-slate-500 dark:text-slate-400"

  return (
    <span className={cn("text-xs", textColor, className)}>
      {isOverdue && "⚠ "}
      {text}
    </span>
  )
}
