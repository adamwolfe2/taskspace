"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
 Sparkles,
 Target,
 Clock,
 Pin,
 X,
 AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AssignedTask, Rock } from "@/lib/types"
import { parseISO, isToday, isBefore, startOfDay } from "date-fns"
import { useThemedIconColors } from "@/lib/hooks/use-themed-icon-colors"

interface FocusOfTheDayProps {
 tasks: AssignedTask[]
 rocks: Rock[]
 onToggleTask: (taskId: string) => void
 onViewTask: (taskId: string) => void
 className?: string
}

interface FocusItem {
 id: string
 type: "task" | "rock_deadline"
 title: string
 reason: string
 priority: "high" | "medium" | "normal" | "low"
 dueDate?: string | null
 rockTitle?: string
 isOverdue?: boolean
 task?: AssignedTask
}

export function FocusOfTheDay({
 tasks,
 rocks,
 onToggleTask,
 onViewTask,
 className,
}: FocusOfTheDayProps) {
 const themedColors = useThemedIconColors()
 const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
 const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())

 const focusItems = useMemo(() => {
 const items: FocusItem[] = []
 const today = startOfDay(new Date())

 // Get pending tasks only
 const pendingTasks = tasks.filter(
 (t) => t.status !== "completed" && !dismissedIds.has(t.id)
 )

 // Prioritize tasks
 pendingTasks.forEach((task) => {
 let score = 0
 let reason = ""

 // Overdue tasks get highest priority
 if (task.dueDate) {
 const dueDate = parseISO(task.dueDate)
 if (isBefore(dueDate, today)) {
 score += 100
 reason = "Overdue"
 } else if (isToday(dueDate)) {
 score += 80
 reason = "Due today"
 }
 }

 // High priority tasks
 if (task.priority === "high") {
 score += 50
 if (!reason) reason = "High priority"
 }

 // Tasks linked to at-risk rocks
 if (task.rockId) {
 const rock = rocks.find((r) => r.id === task.rockId)
 if (rock && (rock.status === "at-risk" || rock.status === "blocked")) {
 score += 40
 if (!reason) reason = `Linked to ${rock.status} rock`
 }
 }

 // Pinned items
 if (pinnedIds.has(task.id)) {
 score += 200
 reason = "Pinned"
 }

 if (score > 0 || task.priority === "high") {
 items.push({
 id: task.id,
 type: "task",
 title: task.title,
 reason: reason || "Suggested focus",
 priority: task.priority,
 dueDate: task.dueDate,
 rockTitle: task.rockTitle || undefined,
 isOverdue: task.dueDate ? isBefore(parseISO(task.dueDate), today) : false,
 task,
 })
 }
 })

 // Check for rock deadlines approaching
 rocks.forEach((rock) => {
 if (rock.status === "completed" || dismissedIds.has(`rock_${rock.id}`)) return

 const dueDate = parseISO(rock.dueDate)
 if (isToday(dueDate)) {
 items.push({
 id: `rock_${rock.id}`,
 type: "rock_deadline",
 title: rock.title,
 reason: "Rock deadline today",
 priority: "high",
 dueDate: rock.dueDate,
 })
 } else if (isBefore(dueDate, today)) {
 items.push({
 id: `rock_${rock.id}`,
 type: "rock_deadline",
 title: rock.title,
 reason: "Rock deadline passed",
 priority: "high",
 dueDate: rock.dueDate,
 isOverdue: true,
 })
 }
 })

 // Sort by pinned first, then by whether they're overdue, then by priority
 return items
 .sort((a, b) => {
 if (pinnedIds.has(a.id) && !pinnedIds.has(b.id)) return -1
 if (!pinnedIds.has(a.id) && pinnedIds.has(b.id)) return 1
 if (a.isOverdue && !b.isOverdue) return -1
 if (!a.isOverdue && b.isOverdue) return 1
 const priorityOrder = { high: 0, medium: 1, normal: 2, low: 3 }
 return priorityOrder[a.priority] - priorityOrder[b.priority]
 })
 .slice(0, 3)
 }, [tasks, rocks, dismissedIds, pinnedIds])

 const handleDismiss = (id: string) => {
 setDismissedIds((prev) => new Set(prev).add(id))
 setPinnedIds((prev) => {
 const next = new Set(prev)
 next.delete(id)
 return next
 })
 }

 const handlePin = (id: string) => {
 setPinnedIds((prev) => {
 const next = new Set(prev)
 if (next.has(id)) {
 next.delete(id)
 } else {
 next.add(id)
 }
 return next
 })
 }

 if (focusItems.length === 0) {
 return (
 <Card className={cn("border-dashed", className)}>
 <CardContent className="flex flex-col items-center justify-center py-8 text-center">
 <div
  className="h-12 w-12 rounded-full flex items-center justify-center mb-3"
  style={{ backgroundColor: themedColors.primaryAlpha10 }}
 >
 <Sparkles className="h-6 w-6" style={{ color: themedColors.primary }} />
 </div>
 <p className="font-medium text-slate-900 ">All caught up!</p>
 <p className="text-sm text-slate-500  mt-1">
 No urgent items need your attention right now.
 </p>
 </CardContent>
 </Card>
 )
 }

 return (
 <Card className={className}>
 <CardHeader className="pb-3">
 <CardTitle className="flex items-center gap-2 text-base">
 <Sparkles className="h-5 w-5" style={{ color: themedColors.accent }} />
 Focus of the Day
 <Badge variant="brand-secondary-soft" className="ml-auto text-xs">
 AI Suggested
 </Badge>
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-2">
 {focusItems.map((item, index) => (
 <div
 key={item.id}
 className={cn(
 "group flex items-start gap-3 p-3 rounded-lg border transition-colors animate-fade-in-up opacity-0",
 item.isOverdue
 ? "bg-red-50 border-red-200"
 : pinnedIds.has(item.id)
 ? "bg-amber-50 border-amber-200"
 : "bg-slate-50 border-slate-200 hover:bg-slate-100"
 )}
 style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}
 >
 {item.type === "task" && item.task && (
 <Checkbox
 checked={item.task.status === "completed"}
 onCheckedChange={() => onToggleTask(item.task!.id)}
 className="mt-0.5"
 />
 )}
 {item.type === "rock_deadline" && (
 <div className="mt-0.5">
 <Target className="h-4 w-4" style={{ color: themedColors.secondary }} />
 </div>
 )}
 <div className="flex-1 min-w-0">
 <button
 onClick={() => item.type === "task" && onViewTask(item.id)}
 className="text-left w-full"
 >
 <p className="font-medium text-slate-900  truncate">
 {item.title}
 </p>
 <div className="flex items-center gap-2 mt-1">
 <span
 className={cn(
 "text-xs",
 item.isOverdue
 ? "text-red-600 "
 : "text-slate-500 "
 )}
 >
 {item.isOverdue && <AlertCircle className="inline h-3 w-3 mr-1" />}
 {item.reason}
 </span>
 {item.rockTitle && (
 <Badge variant="outline" className="text-xs">
 {item.rockTitle}
 </Badge>
 )}
 </div>
 </button>
 </div>
 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <Button
 variant="ghost"
 size="icon"
 className="h-7 w-7"
 onClick={() => handlePin(item.id)}
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
 onClick={() => handleDismiss(item.id)}
 title="Dismiss"
 aria-label="Dismiss"
 >
 <X className="h-3.5 w-3.5" style={{ color: themedColors.secondary }} />
 </Button>
 </div>
 </div>
 ))}
 </CardContent>
 </Card>
 )
}
