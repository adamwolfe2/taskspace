"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
 ArrowRight,
 Flame,
 Calendar,
 Brain,
} from "lucide-react"
import { format, parseISO, differenceInDays, isToday, isTomorrow, startOfDay } from "date-fns"
import { useBrandStatusStyles } from "@/lib/hooks/use-brand-status-styles"

interface SmartSuggestionsProps {
 tasks: AssignedTask[]
 rocks: Rock[]
 eodReports: EODReport[]
 onTaskClick?: (taskId: string) => void
 onRockClick?: (rockId: string) => void
 className?: string
}

interface Suggestion {
 id: string
 type: "task" | "rock" | "habit" | "insight"
 priority: "critical" | "high" | "medium" | "low"
 title: string
 description: string
 reason: string
 taskId?: string
 rockId?: string
 icon: React.ElementType
 color: string
}

export function SmartSuggestions({
 tasks,
 rocks,
 eodReports,
 onTaskClick,
 onRockClick,
 className,
}: SmartSuggestionsProps) {
 const { getPriorityStyle: getBrandPriorityStyle } = useBrandStatusStyles()
 const [showAll, setShowAll] = useState(false)
 const suggestions = useMemo(() => {
 const result: Suggestion[] = []
 const today = startOfDay(new Date())

 // 1. Critical: Overdue tasks
 const overdueTasks = tasks.filter((t) => {
 if (t.status === "completed") return false
 if (!t.dueDate) return false
 return parseISO(t.dueDate) < today
 })

 overdueTasks.forEach((task) => {
 const daysOverdue = task.dueDate ? differenceInDays(today, parseISO(task.dueDate)) : 0
 result.push({
 id: `overdue-${task.id}`,
 type: "task",
 priority: "critical",
 title: task.title,
 description: `${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue`,
 reason: "Overdue tasks impact team velocity",
 taskId: task.id,
 icon: AlertTriangle,
 color: "text-red-600",
 })
 })

 // 2. High: Due today
 const dueToday = tasks.filter((t) => {
 if (t.status === "completed") return false
 if (!t.dueDate) return false
 return isToday(parseISO(t.dueDate))
 })

 dueToday.forEach((task) => {
 result.push({
 id: `today-${task.id}`,
 type: "task",
 priority: "high",
 title: task.title,
 description: "Due today",
 reason: "Complete before EOD",
 taskId: task.id,
 icon: Clock,
 color: "text-amber-600",
 })
 })

 // 3. High: Blocked rocks
 const blockedRocks = rocks.filter((r) => r.status === "blocked")
 blockedRocks.forEach((rock) => {
 result.push({
 id: `blocked-${rock.id}`,
 type: "rock",
 priority: "high",
 title: rock.title,
 description: "Blocked - needs attention",
 reason: "Unblock to maintain quarterly progress",
 rockId: rock.id,
 icon: Target,
 color: "text-red-600",
 })
 })

 // 4. Medium: At-risk rocks
 const atRiskRocks = rocks.filter((r) => r.status === "at-risk")
 atRiskRocks.forEach((rock) => {
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
 color: "text-amber-600",
 })
 })

 // 5. Medium: Due tomorrow
 const dueTomorrow = tasks.filter((t) => {
 if (t.status === "completed") return false
 if (!t.dueDate) return false
 return isTomorrow(parseISO(t.dueDate))
 })

 dueTomorrow.slice(0, 2).forEach((task) => {
 result.push({
 id: `tomorrow-${task.id}`,
 type: "task",
 priority: "medium",
 title: task.title,
 description: "Due tomorrow",
 reason: "Get a head start",
 taskId: task.id,
 icon: Calendar,
 color: "text-blue-600",
 })
 })

 // 6. Insights: EOD streak
 const recentEods = eodReports
 .filter((r) => differenceInDays(today, parseISO(r.date)) <= 7)
 .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

 const hasEodYesterday = recentEods.some(
 (r) => differenceInDays(today, parseISO(r.date)) === 1
 )
 const hasEodToday = recentEods.some((r) => isToday(parseISO(r.date)))

 if (!hasEodToday && hasEodYesterday) {
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
 color: "text-orange-600",
 })
 }
 }

 // 7. Insights: Quick wins (short tasks that can be completed)
 const quickWins = tasks
 .filter((t) => {
 if (t.status === "completed") return false
 // Tasks without subtasks or with few subtasks are quick wins
 return !t.dueDate || differenceInDays(parseISO(t.dueDate), today) > 3
 })
 .slice(0, 2)

 if (quickWins.length > 0 && result.length < 5) {
 quickWins.forEach((task) => {
 result.push({
 id: `quickwin-${task.id}`,
 type: "task",
 priority: "low",
 title: task.title,
 description: "Quick win opportunity",
 reason: "Build momentum with easy victories",
 taskId: task.id,
 icon: CheckCircle2,
 color: "text-emerald-600",
 })
 })
 }

 // 8. Insights: Productivity patterns
 const completedThisWeek = tasks.filter((t) => {
 if (t.status !== "completed" || !t.completedAt) return false
 return differenceInDays(today, parseISO(t.completedAt)) <= 7
 }).length

 if (completedThisWeek >= 10) {
 result.push({
 id: "productivity-high",
 type: "insight",
 priority: "low",
 title: "Productivity insight",
 description: `You've completed ${completedThisWeek} tasks this week!`,
 reason: "Keep up the great work",
 icon: Brain,
 color: "text-slate-600",
 })
 }

 // Sort by priority
 const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
 return result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
 }, [tasks, rocks, eodReports])

 // Calculate EOD streak
 function calculateStreak(reports: EODReport[]): number {
 const today = startOfDay(new Date())
 const sortedDates = reports
 .map((r) => r.date)
 .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

 let streak = 0
 let expectedDate = today

 // Check if today has an EOD
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
 // Allow for yesterday start
 streak++
 expectedDate = new Date(date)
 expectedDate.setDate(expectedDate.getDate() - 1)
 } else {
 break
 }
 }

 return streak
 }

 const getPriorityInlineStyle = (priority: Suggestion["priority"]) => {
 const style = getBrandPriorityStyle(priority)
 return { backgroundColor: style.backgroundColor, borderColor: style.borderColor }
 }

 if (suggestions.length === 0) {
 return null
 }

 return (
 <Card className={cn("", className)}>
 <CardHeader className="pb-3">
 <CardTitle className="text-base flex items-center gap-2">
 <Sparkles className="h-5 w-5 text-slate-600" />
 Smart Suggestions
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-2">
 {(showAll ? suggestions : suggestions.slice(0, 5)).map((suggestion, index) => {
 const Icon = suggestion.icon
 return (
 <TooltipProvider key={suggestion.id}>
 <Tooltip>
 <TooltipTrigger asChild>
 <div
 className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:shadow-sm animate-fade-in-up opacity-0"
 style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards', ...getPriorityInlineStyle(suggestion.priority) }}
 onClick={() => {
 if (suggestion.taskId) onTaskClick?.(suggestion.taskId)
 if (suggestion.rockId) onRockClick?.(suggestion.rockId)
 }}
 >
 <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", suggestion.color)} />
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-slate-900  truncate">
 {suggestion.title}
 </p>
 <p className="text-xs text-slate-500 ">
 {suggestion.description}
 </p>
 </div>
 <Badge
 variant="outline"
 className={cn(
 "shrink-0 text-xs capitalize",
 suggestion.priority === "critical" && "bg-red-100 text-red-700 border-red-300",
 suggestion.priority === "high" && "bg-amber-100 text-amber-700 border-amber-300",
 suggestion.priority === "medium" && "bg-blue-100 text-blue-700 border-blue-300",
 suggestion.priority === "low" && "bg-slate-100 text-slate-600 border-slate-300"
 )}
 >
 {suggestion.type}
 </Badge>
 </div>
 </TooltipTrigger>
 <TooltipContent side="left" className="max-w-xs">
 <p className="text-sm">{suggestion.reason}</p>
 </TooltipContent>
 </Tooltip>
 </TooltipProvider>
 )
 })}

 {suggestions.length > 5 && (
 <Button
   variant="ghost"
   size="sm"
   className="w-full text-xs"
   onClick={() => setShowAll((v) => !v)}
 >
   {showAll ? "Show fewer" : `View all ${suggestions.length} suggestions`}
   <ArrowRight className={`h-3.5 w-3.5 ml-1 transition-transform ${showAll ? "rotate-90" : ""}`} />
 </Button>
 )}
 </CardContent>
 </Card>
 )
}

// Compact suggestion badge for headers
export function SuggestionBadge({
 count,
 criticalCount = 0,
 onClick,
 className,
}: {
 count: number
 criticalCount?: number
 onClick?: () => void
 className?: string
}) {
 if (count === 0) return null

 return (
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger asChild>
 <Badge
 variant="outline"
 className={cn(
 "cursor-pointer",
 criticalCount > 0
 ? "bg-red-50 text-red-700 border-red-200  "
 : "bg-slate-50 text-slate-700 border-slate-200  ",
 className
 )}
 onClick={onClick}
 >
 <Sparkles className="h-3 w-3 mr-1" />
 {count} suggestion{count !== 1 ? "s" : ""}
 {criticalCount > 0 && (
 <span className="ml-1">({criticalCount} critical)</span>
 )}
 </Badge>
 </TooltipTrigger>
 <TooltipContent>Click to view AI suggestions</TooltipContent>
 </Tooltip>
 </TooltipProvider>
 )
}

// Next action recommendation
export function NextActionSuggestion({
 tasks,
 rocks,
 className,
}: {
 tasks: AssignedTask[]
 rocks: Rock[]
 className?: string
}) {
 const { getPriorityStyle: getBrandPriorityStyle2 } = useBrandStatusStyles()
 const nextAction = useMemo(() => {
 const today = startOfDay(new Date())

 // Priority 1: Overdue tasks
 const overdue = tasks.find((t) => {
 if (t.status === "completed") return false
 if (!t.dueDate) return false
 return parseISO(t.dueDate) < today
 })
 if (overdue) {
 return {
 type: "task" as const,
 item: overdue,
 reason: "Overdue - complete ASAP",
 urgency: "critical" as const,
 }
 }

 // Priority 2: Due today
 const dueToday = tasks.find((t) => {
 if (t.status === "completed") return false
 if (!t.dueDate) return false
 return isToday(parseISO(t.dueDate))
 })
 if (dueToday) {
 return {
 type: "task" as const,
 item: dueToday,
 reason: "Due today",
 urgency: "high" as const,
 }
 }

 // Priority 3: Blocked rock tasks
 const blockedRock = rocks.find((r) => r.status === "blocked")
 if (blockedRock) {
 const rockTask = tasks.find(
 (t) => t.rockId === blockedRock.id && t.status !== "completed"
 )
 if (rockTask) {
 return {
 type: "task" as const,
 item: rockTask,
 reason: `Unblock ${blockedRock.title}`,
 urgency: "high" as const,
 }
 }
 }

 // Priority 4: High priority tasks
 const highPriority = tasks.find(
 (t) => t.status !== "completed" && t.priority === "high"
 )
 if (highPriority) {
 return {
 type: "task" as const,
 item: highPriority,
 reason: "High priority",
 urgency: "medium" as const,
 }
 }

 // Priority 5: Any pending task
 const pending = tasks.find((t) => t.status === "pending")
 if (pending) {
 return {
 type: "task" as const,
 item: pending,
 reason: "Next in queue",
 urgency: "low" as const,
 }
 }

 return null
 }, [tasks, rocks])

 if (!nextAction) {
 return (
 <div className={cn("flex items-center gap-2 text-emerald-600", className)}>
 <CheckCircle2 className="h-4 w-4" />
 <span className="text-sm">All caught up!</span>
 </div>
 )
 }

 const urgencyInlineStyle = getBrandPriorityStyle2(nextAction.urgency)

 return (
 <div
 className={cn(
 "flex items-center gap-3 p-3 rounded-lg border",
 className
 )}
 style={{ backgroundColor: urgencyInlineStyle.backgroundColor, borderColor: urgencyInlineStyle.borderColor, color: urgencyInlineStyle.color }}
 >
 <Sparkles className="h-5 w-5 shrink-0" />
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium truncate">
 {nextAction.item.title}
 </p>
 <p className="text-xs opacity-75">{nextAction.reason}</p>
 </div>
 <ArrowRight className="h-4 w-4 shrink-0" />
 </div>
 )
}
