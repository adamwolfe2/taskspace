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
import { getTodayInTimezone } from "@/lib/utils/date-utils"
import { useApp } from "@/lib/contexts/app-context"

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

// Format date to YYYY-MM-DD using specified timezone
function getDateStringInTimezone(date: Date, timezone: string): string {
 try {
   const formatter = new Intl.DateTimeFormat("en-CA", {
     timeZone: timezone,
     year: "numeric",
     month: "2-digit",
     day: "2-digit",
   })
   // en-CA locale gives us YYYY-MM-DD format
   return formatter.format(date)
 } catch (error) {
   // Fallback to local timezone
   const year = date.getFullYear()
   const month = String(date.getMonth() + 1).padStart(2, '0')
   const day = String(date.getDate()).padStart(2, '0')
   return `${year}-${month}-${day}`
 }
}

// Get day of week in specified timezone (0 = Sunday, 6 = Saturday)
function getDayOfWeekInTimezone(date: Date, timezone: string): number {
 try {
   const formatter = new Intl.DateTimeFormat("en-US", {
     timeZone: timezone,
     weekday: "short",
   })
   const dayName = formatter.format(date)
   const days: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
   return days[dayName] ?? date.getDay()
 } catch (error) {
   return date.getDay()
 }
}

function getWeekDays(reports: EODReport[], userId: string, todayString: string): WeekDay[] {
 // Parse today's date string (already in org timezone from getTodayInTimezone)
 const [year, month, day] = todayString.split('-').map(Number)

 // Calculate day of week (0-6) by creating date at noon UTC to avoid timezone issues
 const todayDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
 const dayOfWeek = todayDate.getUTCDay() // 0 = Sunday, 1 = Monday, etc.

 // Calculate Monday of current week
 const mondayDate = new Date(todayDate)
 const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Adjust for Sunday
 mondayDate.setUTCDate(todayDate.getUTCDate() + diff)

 // Get user's report dates as a Set for quick lookup
 const userReports = reports.filter(r => r.userId === userId)
 const userReportDates = new Set(userReports.map(r => r.date))

 const weekDays: WeekDay[] = []
 const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"]

 for (let i = 0; i < 5; i++) {
   const date = new Date(mondayDate)
   date.setUTCDate(mondayDate.getUTCDate() + i)
   const dateYear = date.getUTCFullYear()
   const dateMonth = String(date.getUTCMonth() + 1).padStart(2, '0')
   const dateDay = String(date.getUTCDate()).padStart(2, '0')
   const dateString = `${dateYear}-${dateMonth}-${dateDay}`

   weekDays.push({
     date: dateString,
     dayName: dayNames[i],
     dayNumber: date.getUTCDate(),
     isToday: dateString === todayString,
     isFuture: dateString > todayString,
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
 const { currentOrganization } = useApp()
 // Use organization timezone for date calculations
 const orgTimezone = currentOrganization?.settings?.timezone || "America/Los_Angeles"
 const todayString = getTodayInTimezone(orgTimezone)

 const weekDays = useMemo(
 () => getWeekDays(eodReports, userId, todayString),
 [eodReports, userId, todayString]
 )

 // Create a map of date -> reports array for quick lookup (supports multiple reports per day)
 const reportsByDate = useMemo(() => {
 const map = new Map<string, EODReport[]>()
 eodReports
 .filter(r => r.userId === userId)
 .forEach(r => {
 const existing = map.get(r.date) || []
 map.set(r.date, [...existing, r])
 })
 return map
 }, [eodReports, userId])

 const submittedCount = weekDays.filter(d => d.hasSubmission).length
 const todayIndex = weekDays.findIndex(d => d.isToday)
 const expectedCount = todayIndex >= 0 ? todayIndex + 1 : 5 // Days up to and including today

 // Calculate mood trend (if reports have mood data)
 const moodTrend = useMemo(() => {
 const moods = weekDays
 .filter(d => d.hasSubmission)
 .map(d => {
 const reports = reportsByDate.get(d.date) || []
 // Try to infer mood from escalation (any report with escalation = stressed)
 if (reports.some(r => r.needsEscalation)) return 'stressed'
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
 const reports = reportsByDate.get(day.date) || []
 const reportCount = reports.length
 const hasMultipleReports = reportCount > 1
 const latestReport = reports[0] // Already sorted by date desc
 const hasEscalation = reports.some(r => r.needsEscalation)
 const totalTasks = reports.reduce((sum, r) => sum + (r.tasks?.length || 0), 0)

 const dayButton = (
 <button
 key={day.date}
 onClick={() => {
 if (isClickable) onSelectDate(day.date)
 if (latestReport && onViewReport) onViewReport(latestReport.id)
 }}
 disabled={day.isFuture}
 className={cn(
 "flex-1 flex flex-col items-center p-3 rounded-lg transition-all relative",
 showAsSelected
 ? "bg-gradient-to-br from-slate-500 to-slate-600 text-white ring-2 ring-slate-400 ring-offset-2"
 : day.isFuture
 ? "bg-slate-100 text-slate-400 cursor-not-allowed"
 : day.hasSubmission
 ? "bg-emerald-50 hover:bg-emerald-100 cursor-pointer"
 : "bg-red-50 hover:bg-red-100 cursor-pointer"
 )}
 >
 {/* Badge for multiple reports */}
 {hasMultipleReports && (
 <span className={cn(
 "absolute -top-1 -right-1 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center",
 showAsSelected ? "bg-white text-slate-600" : "bg-emerald-600 text-white"
 )}>
 {reportCount}
 </span>
 )}
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

 // Add tooltip with report preview if reports exist
 if (reports.length > 0 && !day.isFuture) {
 return (
 <Tooltip key={day.date}>
 <TooltipTrigger asChild>
 {dayButton}
 </TooltipTrigger>
 <TooltipContent side="top" className="max-w-xs p-3">
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="font-medium text-sm">
 {hasMultipleReports ? `${reportCount} EOD Reports` : "EOD Report"}
 </span>
 {hasEscalation && (
 <Badge variant="destructive" className="text-xs">
 <AlertTriangle className="h-3 w-3 mr-1" />
 Escalation
 </Badge>
 )}
 </div>
 <div className="text-xs text-slate-500 ">
 <p className="font-medium text-slate-700  mb-1">
 Tasks completed: {totalTasks}
 </p>
 {latestReport?.tasks && latestReport.tasks.length > 0 && (
 <ul className="list-disc list-inside space-y-0.5">
 {latestReport.tasks.slice(0, 3).map((task, i) => (
 <li key={i} className="truncate">{task.text}</li>
 ))}
 {(totalTasks > 3) && (
 <li className="text-slate-400">+{totalTasks - 3} more tasks</li>
 )}
 </ul>
 )}
 {latestReport?.challenges && (
 <p className="mt-2 italic text-slate-400 truncate">
 "{latestReport.challenges}"
 </p>
 )}
 </div>
 <p className="text-xs text-slate-400 pt-1 border-t ">
 Click to {hasMultipleReports ? "view reports" : "view full report"}
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
 const reports = reportsByDate.get(day.date) || []
 const mood = reports.some(r => r.needsEscalation) ? 'stressed' : 'neutral'
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
