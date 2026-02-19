"use client"

import { useMemo, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { AssignedTask, Rock, EODReport } from "@/lib/types"
import {
  Sparkles,
  Clock,
  AlertTriangle,
  TrendingUp,
  Target,
  CheckCircle2,
  Flame,
  Calendar,
  Brain,
  ChevronDown,
  ChevronUp,
  Pin,
  X,
} from "lucide-react"
import { parseISO, differenceInDays, isToday, isTomorrow, startOfDay, format } from "date-fns"
import { useBrandStatusStyles } from "@/lib/hooks/use-brand-status-styles"
import { useThemedIconColors } from "@/lib/hooks/use-themed-icon-colors"

const DISMISSED_KEY = "actionhub-dismissed"

function getDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const stored = localStorage.getItem(DISMISSED_KEY)
    if (stored) return new Set(JSON.parse(stored))
  } catch {
    // localStorage unavailable — graceful degradation
  }
  return new Set()
}

function saveDismissedIds(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]))
  } catch {
    // localStorage unavailable — graceful degradation
  }
}

interface ActionHubProps {
  tasks: AssignedTask[]
  rocks: Rock[]
  eodReports: EODReport[]
  onToggleTask: (taskId: string) => void
  onViewTask: (taskId: string) => void
  onTaskClick?: () => void
  onRockClick?: () => void
  className?: string
}

interface ActionItem {
  id: string
  type: "task" | "rock" | "habit" | "insight"
  priority: "critical" | "high" | "medium" | "low"
  title: string
  description: string
  reason: string
  taskId?: string
  rockId?: string
  icon: React.ElementType
  isOverdue?: boolean
  task?: AssignedTask
  rockTitle?: string
}

export function ActionHub({
  tasks,
  rocks,
  eodReports,
  onToggleTask,
  onViewTask,
  onTaskClick,
  onRockClick,
  className,
}: ActionHubProps) {
  const { getPriorityStyle: getBrandPriorityStyle } = useBrandStatusStyles()
  const themedColors = useThemedIconColors()
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => getDismissedIds())
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())
  const [showMore, setShowMore] = useState(false)

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveDismissedIds(next)
      return next
    })
    setPinnedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const handlePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const items = useMemo(() => {
    const result: ActionItem[] = []
    const today = startOfDay(new Date())

    // 1. Critical: Overdue tasks
    tasks.forEach((task) => {
      if (task.status === "completed" || !task.dueDate || dismissedIds.has(`overdue-${task.id}`)) return
      if (parseISO(task.dueDate) >= today) return
      const daysOverdue = differenceInDays(today, parseISO(task.dueDate))
      result.push({
        id: `overdue-${task.id}`,
        type: "task",
        priority: "critical",
        title: task.title,
        description: `${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue`,
        reason: "Overdue tasks impact team velocity",
        taskId: task.id,
        icon: AlertTriangle,
        isOverdue: true,
        task,
      })
    })

    // 2. High: Due today
    tasks.forEach((task) => {
      if (task.status === "completed" || !task.dueDate || dismissedIds.has(`today-${task.id}`)) return
      if (!isToday(parseISO(task.dueDate))) return
      result.push({
        id: `today-${task.id}`,
        type: "task",
        priority: "high",
        title: task.title,
        description: "Due today",
        reason: "Complete before EOD",
        taskId: task.id,
        icon: Clock,
        task,
      })
    })

    // 3. High: Blocked rocks
    rocks.forEach((rock) => {
      if (rock.status !== "blocked" || dismissedIds.has(`blocked-${rock.id}`)) return
      result.push({
        id: `blocked-${rock.id}`,
        type: "rock",
        priority: "high",
        title: rock.title,
        description: "Blocked - needs attention",
        reason: "Unblock to maintain quarterly progress",
        rockId: rock.id,
        icon: Target,
        isOverdue: true,
      })
    })

    // 4. Medium: At-risk rocks
    rocks.forEach((rock) => {
      if (rock.status !== "at-risk" || dismissedIds.has(`atrisk-${rock.id}`)) return
      const daysLeft = differenceInDays(parseISO(rock.dueDate), today)
      result.push({
        id: `atrisk-${rock.id}`,
        type: "rock",
        priority: "medium",
        title: rock.title,
        description: `At risk - ${rock.progress}% complete, ${daysLeft} days left`,
        reason: "Increase velocity to meet deadline",
        rockId: rock.id,
        icon: TrendingUp,
      })
    })

    // 5. High: Tasks linked to at-risk/blocked rocks
    tasks.forEach((task) => {
      if (task.status === "completed" || !task.rockId) return
      // Skip if already captured as overdue or due-today
      if (result.some((r) => r.taskId === task.id)) return
      const rock = rocks.find((r) => r.id === task.rockId)
      if (!rock || (rock.status !== "at-risk" && rock.status !== "blocked")) return
      if (dismissedIds.has(`rocklinked-${task.id}`)) return
      result.push({
        id: `rocklinked-${task.id}`,
        type: "task",
        priority: "high",
        title: task.title,
        description: `Linked to ${rock.status} rock`,
        reason: `Help unblock "${rock.title}"`,
        taskId: task.id,
        icon: Target,
        task,
        rockTitle: rock.title,
      })
    })

    // 6. Medium: Due tomorrow
    tasks.forEach((task) => {
      if (task.status === "completed" || !task.dueDate || dismissedIds.has(`tomorrow-${task.id}`)) return
      if (!isTomorrow(parseISO(task.dueDate))) return
      if (result.some((r) => r.taskId === task.id)) return
      result.push({
        id: `tomorrow-${task.id}`,
        type: "task",
        priority: "medium",
        title: task.title,
        description: "Due tomorrow",
        reason: "Get a head start",
        taskId: task.id,
        icon: Calendar,
        task,
      })
    })

    // 7. EOD streak insight
    const hasEodToday = eodReports.some((r) => isToday(parseISO(r.date)))
    const hasEodYesterday = eodReports.some(
      (r) => differenceInDays(today, parseISO(r.date)) === 1
    )
    if (!hasEodToday && hasEodYesterday && !dismissedIds.has("eod-streak")) {
      const streak = calculateStreak(eodReports)
      if (streak > 0) {
        result.push({
          id: "eod-streak",
          type: "habit",
          priority: "medium",
          title: "Continue your EOD streak!",
          description: `${streak} day streak - don't break it!`,
          reason: "Consistent reporting improves visibility",
          icon: Flame,
        })
      }
    }

    // 8. Productivity insight
    const completedThisWeek = tasks.filter((t) => {
      if (t.status !== "completed" || !t.completedAt) return false
      return differenceInDays(today, parseISO(t.completedAt)) <= 7
    }).length
    if (completedThisWeek >= 10 && !dismissedIds.has("productivity-high")) {
      result.push({
        id: "productivity-high",
        type: "insight",
        priority: "low",
        title: "Productivity insight",
        description: `You've completed ${completedThisWeek} tasks this week!`,
        reason: "Keep up the great work",
        icon: Brain,
      })
    }

    // Sort by pinned first, then priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return result.sort((a, b) => {
      if (pinnedIds.has(a.id) && !pinnedIds.has(b.id)) return -1
      if (!pinnedIds.has(a.id) && pinnedIds.has(b.id)) return 1
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }, [tasks, rocks, eodReports, dismissedIds, pinnedIds])

  const topItems = items.slice(0, 3)
  const moreItems = items.slice(3)

  const getPriorityInlineStyle = (priority: ActionItem["priority"]) => {
    const style = getBrandPriorityStyle(priority)
    return { backgroundColor: style.backgroundColor, borderColor: style.borderColor }
  }

  const getSemanticColor = (item: ActionItem) => {
    if (item.isOverdue || item.priority === "critical") return "text-red-600"
    if (item.priority === "high") return "text-amber-600"
    return undefined // use themed
  }

  if (items.length === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: themedColors.primaryAlpha10 }}
          >
            <Sparkles className="h-6 w-6" style={{ color: themedColors.primary }} />
          </div>
          <p className="font-medium text-slate-900">All caught up!</p>
          <p className="text-sm text-slate-500 mt-1">
            No urgent items need your attention right now.
          </p>
        </CardContent>
      </Card>
    )
  }

  const renderItem = (item: ActionItem, index: number) => {
    const Icon = item.icon
    const semanticColor = getSemanticColor(item)
    const isInteractiveTask = item.type === "task" && item.task

    return (
      <TooltipProvider key={item.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "group flex items-start gap-3 p-3 rounded-lg border transition-colors hover:shadow-sm animate-fade-in-up opacity-0",
                item.isOverdue && "bg-red-50 border-red-200",
                pinnedIds.has(item.id) && !item.isOverdue && "bg-amber-50 border-amber-200",
              )}
              style={{
                animationDelay: `${index * 0.05}s`,
                animationFillMode: "forwards",
                ...(!item.isOverdue && !pinnedIds.has(item.id) ? getPriorityInlineStyle(item.priority) : {}),
              }}
            >
              {/* Checkbox for tasks */}
              {isInteractiveTask ? (
                <Checkbox
                  checked={item.task!.status === "completed"}
                  onCheckedChange={() => onToggleTask(item.task!.id)}
                  className="mt-0.5"
                />
              ) : (
                <Icon
                  className={cn("h-5 w-5 shrink-0 mt-0.5", semanticColor)}
                  style={semanticColor ? undefined : { color: themedColors.secondary }}
                />
              )}

              {/* Content */}
              <button
                className="flex-1 min-w-0 text-left"
                onClick={() => {
                  if (item.taskId) {
                    onViewTask(item.taskId)
                    onTaskClick?.()
                  }
                  if (item.rockId) onRockClick?.()
                }}
              >
                <p className="text-sm font-medium text-slate-900 truncate">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn("text-xs", item.isOverdue ? "text-red-600" : "text-slate-500")}>
                    {item.description}
                  </span>
                  {item.rockTitle && (
                    <Badge variant="outline" className="text-xs">
                      {item.rockTitle}
                    </Badge>
                  )}
                </div>
              </button>

              {/* Priority badge */}
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-xs capitalize hidden sm:inline-flex",
                  item.priority === "critical" && "bg-red-100 text-red-700 border-red-300",
                  item.priority === "high" && "bg-amber-100 text-amber-700 border-amber-300",
                  item.priority === "medium" && "bg-blue-100 text-blue-700 border-blue-300",
                  item.priority === "low" && "bg-slate-100 text-slate-600 border-slate-300"
                )}
              >
                {item.type}
              </Badge>

              {/* Pin / Dismiss */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePin(item.id)
                  }}
                  title={pinnedIds.has(item.id) ? "Unpin" : "Pin"}
                  aria-label={pinnedIds.has(item.id) ? "Unpin" : "Pin"}
                >
                  <Pin
                    className={cn(
                      "h-3.5 w-3.5",
                      pinnedIds.has(item.id) && "text-amber-600 fill-amber-600"
                    )}
                    style={pinnedIds.has(item.id) ? undefined : { color: themedColors.secondary }}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDismiss(item.id)
                  }}
                  title="Dismiss"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" style={{ color: themedColors.secondary }} />
                </Button>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <p className="text-sm">{item.reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-5 w-5" style={{ color: themedColors.accent }} />
          Action Hub
          <Badge variant="brand-secondary-soft" className="ml-auto text-xs">
            AI Suggested
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {topItems.map((item, i) => renderItem(item, i))}

        {moreItems.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setShowMore(!showMore)}
            >
              {showMore ? "Show less" : `${moreItems.length} more suggestion${moreItems.length > 1 ? "s" : ""}`}
              {showMore ? (
                <ChevronUp className="h-3.5 w-3.5 ml-1" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              )}
            </Button>
            {showMore && moreItems.map((item, i) => renderItem(item, i + 3))}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function calculateStreak(reports: EODReport[]): number {
  const today = startOfDay(new Date())
  const sortedDates = reports
    .map((r) => r.date)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  let streak = 0
  let expectedDate = today

  const hasToday = sortedDates.some((d) => d === format(today, "yyyy-MM-dd"))
  if (hasToday) {
    streak = 1
    expectedDate = new Date(today)
    expectedDate.setDate(expectedDate.getDate() - 1)
  }

  for (const dateStr of sortedDates) {
    const date = parseISO(dateStr)
    const diff = differenceInDays(expectedDate, date)

    if (diff === 0) {
      streak++
      expectedDate.setDate(expectedDate.getDate() - 1)
    } else if (diff === 1 && !hasToday) {
      streak++
      expectedDate = new Date(date)
      expectedDate.setDate(expectedDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}
