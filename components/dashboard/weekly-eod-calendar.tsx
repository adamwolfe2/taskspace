"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Circle, Calendar, AlertTriangle, TrendingUp, Smile, Meh, Frown } from "lucide-react"
import {
 Tooltip,
 TooltipContent,
 TooltipProvider,
 TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import type { EODReport } from "@/lib/types"
import { cn } from "@/lib/utils"

interface WeeklyEODCalendarProps {
 eodReports: EODReport[]
 userId: string
 selectedDate?: string | null
 onSelectDate?: (date: string) => void
 onViewReport?: (reportId: string) => void
 showMoodTrend?: boolean
}

interface WeekDay {
 date: string // YYYY-MM-DD format
 dayName: string // Mon, Tue, etc.
 dayNumber: number // 1-31
 isToday: boolean
 isFuture: boolean
 hasSubmission: boolean
}

// Format date to YYYY-MM-DD using local timezone (not UTC)
function getLocalDateString(date: Date): string {
 const year = date.getFullYear()
 const month = String(date.getMonth() + 1).padStart(2, '0')
 const day = String(date.getDate()).padStart(2, '0')
 return `${year}-${month}-${day}`
}

function getWeekDays(reports: EODReport[], userId: string): WeekDay[] {
 const today = new Date()
 const todayString = getLocalDateString(today)
 const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.

 // Calculate Monday of current week
 const monday = new Date(today)
 const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Adjust for Sunday
 monday.setDate(today.getDate() + diff)
 monday.setHours(0, 0, 0, 0)

 // Get user's report dates as a Set for quick lookup
 const userReportDates = new Set(
 reports
 .filter(r => r.userId === userId)
 .map(r => r.date)
 )

 const weekDays: WeekDay[] = []
 const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"]

 for (let i = 0; i < 5; i++) {
 const date = new Date(monday)
 date.setDate(monday.getDate() + i)
 const dateString = getLocalDateString(date)

 // Compare dates at midnight local time for isFuture check
 const dateAtMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
 const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())

 weekDays.push({
 date: dateString,
 dayName: dayNames[i],
 dayNumber: date.getDate(),
 isToday: dateString === todayString,
 isFuture: dateAtMidnight > todayAtMidnight,
 hasSubmission: userReportDates.has(dateString),
 })
 }

 return weekDays
}

export function WeeklyEODCalendar({
 eodReports,
 userId,
 selectedDate,
 onSelectDate,
 onViewReport,
 showMoodTrend = true
}: WeeklyEODCalendarProps) {
 const weekDays = useMemo(
 () => getWeekDays(eodReports, userId),
 [eodReports, userId]
 )

 // Create a map of date -> report for quick lookup
 const reportsByDate = useMemo(() => {
 const map = new Map<string, EODReport>()
 eodReports
 .filter(r => r.userId === userId)
 .forEach(r => map.set(r.date, r))
 return map
 }, [eodReports, userId])

 const todayString = getLocalDateString(new Date())

 const submittedCount = weekDays.filter(d => d.hasSubmission).length
 const todayIndex = weekDays.findIndex(d => d.isToday)
 const expectedCount = todayIndex >= 0 ? todayIndex + 1 : 5 // Days up to and including today

 // Calculate mood trend (if reports have mood data)
 const moodTrend = useMemo(() => {
 const moods = weekDays
 .filter(d => d.hasSubmission)
 .map(d => {
 const report = reportsByDate.get(d.date)
 // Try to infer mood from escalation
 if (report?.needsEscalation) return 'stressed'
 return 'neutral' // Default
 })
 return moods
 }, [weekDays, reportsByDate])

 const getMoodIcon = (mood: string) => {
 switch (mood) {
 case 'positive': return <Smile className="h-3 w-3 text-green-500" />
 case 'stressed':
 case 'negative': return <Frown className="h-3 w-3 text-red-500" />
 default: return <Meh className="h-3 w-3 text-slate-400" />
 }
 }

 return (
 <TooltipProvider>
 <div className="section-card p-5">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-lg bg-slate-100 ">
 <Calendar className="h-5 w-5 text-slate-600 " />
 </div>
 <div>
 <h3 className="font-semibold text-slate-900 ">Weekly EOD Status</h3>
 <p className="text-xs text-slate-500 ">
 {submittedCount} of {expectedCount} submitted
 </p>
 </div>
 </div>
 {submittedCount === expectedCount && expectedCount > 0 && (
 <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50   px-2 py-1 rounded-full">
 <CheckCircle2 className="h-3 w-3" />
 On track
 </span>
 )}
 </div>

 <div className="flex justify-between gap-2">
 {weekDays.map((day) => {
 const isSelected = selectedDate === day.date
 const isClickable = !day.isFuture && onSelectDate
 const showAsSelected = isSelected || (selectedDate === null && day.isToday)
 const report = reportsByDate.get(day.date)

 const dayButton = (
 <button
 key={day.date}
 onClick={() => {
 if (isClickable) onSelectDate(day.date)
 if (report && onViewReport) onViewReport(report.id)
 }}
 disabled={day.isFuture}
 className={cn(
 "flex-1 flex flex-col items-center p-3 rounded-lg transition-all",
 showAsSelected
 ? "bg-gradient-to-br from-slate-500 to-slate-600 text-white ring-2 ring-slate-400 ring-offset-2"
 : day.isFuture
 ? "bg-slate-100 text-slate-400 cursor-not-allowed"
 : day.hasSubmission
 ? "bg-emerald-50 hover:bg-emerald-100 cursor-pointer"
 : "bg-red-50 hover:bg-red-100 cursor-pointer"
 )}
 >
 <span
 className={cn(
 "text-xs font-medium",
 showAsSelected
 ? "text-slate-200"
 : day.isFuture
 ? "text-slate-400"
 : "text-slate-500"
 )}
 >
 {day.dayName}
 </span>
 <span
 className={cn(
 "text-lg font-bold mt-1",
 showAsSelected
 ? "text-white"
 : day.isFuture
 ? "text-slate-400"
 : day.hasSubmission
 ? "text-emerald-700"
 : "text-red-700"
 )}
 >
 {day.dayNumber}
 </span>
 <div className="mt-2">
 {day.isFuture ? (
 <Circle className="h-5 w-5 text-slate-300 " />
 ) : day.hasSubmission ? (
 <CheckCircle2 className="h-5 w-5 text-emerald-500" />
 ) : showAsSelected ? (
 <Circle className="h-5 w-5 text-amber-400" />
 ) : (
 <Circle className="h-5 w-5 text-red-400" />
 )}
 </div>
 </button>
 )

 // Add tooltip with report preview if report exists
 if (report && !day.isFuture) {
 return (
 <Tooltip key={day.date}>
 <TooltipTrigger asChild>
 {dayButton}
 </TooltipTrigger>
 <TooltipContent side="top" className="max-w-xs p-3">
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="font-medium text-sm">EOD Report</span>
 {report.needsEscalation && (
 <Badge variant="destructive" className="text-xs">
 <AlertTriangle className="h-3 w-3 mr-1" />
 Escalation
 </Badge>
 )}
 </div>
 <div className="text-xs text-slate-500 ">
 <p className="font-medium text-slate-700  mb-1">
 Tasks completed: {report.tasks?.length || 0}
 </p>
 {report.tasks && report.tasks.length > 0 && (
 <ul className="list-disc list-inside space-y-0.5">
 {report.tasks.slice(0, 3).map((task, i) => (
 <li key={i} className="truncate">{task.text}</li>
 ))}
 {report.tasks.length > 3 && (
 <li className="text-slate-400">+{report.tasks.length - 3} more</li>
 )}
 </ul>
 )}
 {report.challenges && (
 <p className="mt-2 italic text-slate-400 truncate">
 "{report.challenges}"
 </p>
 )}
 </div>
 <p className="text-xs text-slate-400 pt-1 border-t ">
 Click to view full report
 </p>
 </div>
 </TooltipContent>
 </Tooltip>
 )
 }

 return dayButton
 })}
 </div>

 {/* Mood Trend Line (optional) */}
 {showMoodTrend && submittedCount > 0 && (
 <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 ">
 <span className="text-xs text-slate-500 ">Mood:</span>
 <div className="flex items-center gap-1">
 {weekDays.map((day, i) => {
 if (!day.hasSubmission) return null
 const report = reportsByDate.get(day.date)
 const mood = report?.needsEscalation ? 'stressed' : 'neutral'
 return (
 <div key={day.date} className="flex items-center">
 {getMoodIcon(mood)}
 {i < weekDays.filter(d => d.hasSubmission).length - 1 && (
 <div className="w-4 h-px bg-slate-200  mx-1" />
 )}
 </div>
 )
 })}
 </div>
 </div>
 )}

 <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-100 ">
 <div className="flex items-center gap-1.5 text-xs text-slate-500 ">
 <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
 <span>Submitted</span>
 </div>
 <div className="flex items-center gap-1.5 text-xs text-slate-500 ">
 <Circle className="h-3.5 w-3.5 text-amber-400" />
 <span>Today (pending)</span>
 </div>
 <div className="flex items-center gap-1.5 text-xs text-slate-500 ">
 <Circle className="h-3.5 w-3.5 text-red-400" />
 <span>Missed</span>
 </div>
 </div>
 </div>
 </TooltipProvider>
 )
}
