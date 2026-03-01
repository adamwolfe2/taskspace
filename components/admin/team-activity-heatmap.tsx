"use client"

import { useMemo } from "react"
import {
 Tooltip,
 TooltipContent,
 TooltipProvider,
 TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { EODReport, TeamMember, AssignedTask } from "@/lib/types"
import { format, subDays, parseISO, isSameDay, startOfDay } from "date-fns"
import { Check, X } from "lucide-react"

interface TeamActivityHeatmapProps {
 teamMembers: TeamMember[]
 eodReports: EODReport[]
 tasks: AssignedTask[]
 days?: number
 className?: string
}

interface DayActivity {
 date: Date
 dateStr: string
 eodSubmitted: boolean
 tasksCompleted: number
 hasEscalation: boolean
}

export function TeamActivityHeatmap({
 teamMembers,
 eodReports,
 tasks,
 days = 7,
 className,
}: TeamActivityHeatmapProps) {
 const today = startOfDay(new Date())

 // Generate array of dates
 const dates = useMemo(() => {
 const result: Date[] = []
 for (let i = days - 1; i >= 0; i--) {
 result.push(subDays(today, i))
 }
 return result
 }, [days, today])

 // Calculate activity for each member
 const memberActivities = useMemo(() => {
 return teamMembers.map((member) => {
 const activities: DayActivity[] = dates.map((date) => {
 const dateStr = format(date, "yyyy-MM-dd")

 // Check for EOD
 const eod = eodReports.find(
 (r) => r.userId === member.id && r.date === dateStr
 )

 // Count completed tasks
 const completedTasks = tasks.filter((t) => {
 if (t.assigneeId !== member.id) return false
 if (!t.completedAt) return false
 return isSameDay(parseISO(t.completedAt), date)
 }).length

 return {
 date,
 dateStr,
 eodSubmitted: !!eod,
 tasksCompleted: completedTasks,
 hasEscalation: eod?.needsEscalation || false,
 }
 })

 return {
 member,
 activities,
 totalEod: activities.filter((a) => a.eodSubmitted).length,
 totalTasks: activities.reduce((sum, a) => sum + a.tasksCompleted, 0),
 hasEscalations: activities.some((a) => a.hasEscalation),
 }
 })
 }, [teamMembers, eodReports, tasks, dates])

 // Get activity level color
 const getActivityColor = (activity: DayActivity) => {
 if (activity.hasEscalation) {
 return "bg-red-500 "
 }
 if (!activity.eodSubmitted && activity.tasksCompleted === 0) {
 return "bg-slate-100 "
 }
 if (activity.eodSubmitted && activity.tasksCompleted >= 3) {
 return "bg-green-500 "
 }
 if (activity.eodSubmitted || activity.tasksCompleted >= 2) {
 return "bg-green-400 "
 }
 if (activity.tasksCompleted >= 1) {
 return "bg-green-300 "
 }
 return "bg-green-200 "
 }

 return (
 <TooltipProvider>
 <div className={cn("space-y-3", className)}>
 {/* Header Row - Day names */}
 <div className="flex items-center gap-2">
 <div className="w-28 shrink-0" /> {/* Spacer for member names */}
 <div className="flex-1 flex gap-1">
 {dates.map((date) => (
 <div
 key={date.toISOString()}
 className="flex-1 text-center text-xs text-slate-500 "
 >
 {format(date, "EEE")}
 </div>
 ))}
 </div>
 </div>

 {/* Member Rows */}
 {memberActivities.map(({ member, activities, totalEod, totalTasks: _totalTasks }) => (
 <div key={member.id} className="flex items-center gap-2">
 {/* Member Name */}
 <div className="w-28 shrink-0 truncate">
 <span className="text-sm font-medium text-slate-700 ">
 {member.name?.[0] || "?"}
 </span>
 </div>

 {/* Activity Cells */}
 <div className="flex-1 flex gap-1">
 {activities.map((activity) => (
 <Tooltip key={activity.dateStr}>
 <TooltipTrigger asChild>
 <div
 className={cn(
 "flex-1 h-8 rounded-sm cursor-default transition-colors",
 getActivityColor(activity)
 )}
 />
 </TooltipTrigger>
 <TooltipContent side="top">
 <div className="text-xs space-y-1">
 <p className="font-medium">
 {format(activity.date, "MMM d, yyyy")}
 </p>
 <p>
 EOD:{" "}{activity.eodSubmitted ? <><Check className="inline h-3 w-3 text-emerald-500" /> Submitted</> : <><X className="inline h-3 w-3 text-red-400" /> Not submitted</>}
 </p>
 <p>Tasks: {activity.tasksCompleted} completed</p>
 {activity.hasEscalation && (
 <p className="text-red-400">⚠ Has escalation</p>
 )}
 </div>
 </TooltipContent>
 </Tooltip>
 ))}
 </div>

 {/* Summary */}
 <div className="w-16 shrink-0 text-right text-xs text-slate-500 ">
 {totalEod}/{days}
 </div>
 </div>
 ))}

 {/* Legend */}
 <div className="flex items-center justify-end gap-4 pt-2 text-xs text-slate-500 ">
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 rounded-sm bg-slate-100 " />
 <span>No activity</span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 rounded-sm bg-green-300 " />
 <span>Some activity</span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 rounded-sm bg-green-500 " />
 <span>Active</span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 rounded-sm bg-red-500 " />
 <span>Escalation</span>
 </div>
 </div>
 </div>
 </TooltipProvider>
 )
}

// Compact version for dashboard cards
export function CompactActivityHeatmap({
 activities,
 className,
}: {
 activities: { date: string; level: 0 | 1 | 2 | 3 | 4 }[]
 className?: string
}) {
 const levelColors = [
 "bg-slate-100 ",
 "bg-green-200 ",
 "bg-green-300 ",
 "bg-green-400 ",
 "bg-green-500 ",
 ]

 return (
 <div className={cn("flex gap-0.5", className)}>
 {activities.map((activity) => (
 <div
 key={activity.date}
 className={cn("w-3 h-3 rounded-sm", levelColors[activity.level])}
 />
 ))}
 </div>
 )
}
