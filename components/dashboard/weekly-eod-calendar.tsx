"use client"

import { useMemo } from "react"
import { CheckCircle2, Circle, Calendar } from "lucide-react"
import type { EODReport } from "@/lib/types"

interface WeeklyEODCalendarProps {
  eodReports: EODReport[]
  userId: string
}

interface WeekDay {
  date: string // YYYY-MM-DD format
  dayName: string // Mon, Tue, etc.
  dayNumber: number // 1-31
  isToday: boolean
  isFuture: boolean
  hasSubmission: boolean
}

function getWeekDays(reports: EODReport[], userId: string): WeekDay[] {
  const today = new Date()
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
    const dateString = date.toISOString().split("T")[0]

    weekDays.push({
      date: dateString,
      dayName: dayNames[i],
      dayNumber: date.getDate(),
      isToday: dateString === today.toISOString().split("T")[0],
      isFuture: date > today,
      hasSubmission: userReportDates.has(dateString),
    })
  }

  return weekDays
}

export function WeeklyEODCalendar({ eodReports, userId }: WeeklyEODCalendarProps) {
  const weekDays = useMemo(
    () => getWeekDays(eodReports, userId),
    [eodReports, userId]
  )

  const submittedCount = weekDays.filter(d => d.hasSubmission).length
  const todayIndex = weekDays.findIndex(d => d.isToday)
  const expectedCount = todayIndex >= 0 ? todayIndex + 1 : 5 // Days up to and including today

  return (
    <div className="bg-white rounded-xl shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-slate-100">
            <Calendar className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Weekly EOD Status</h3>
            <p className="text-xs text-slate-500">
              {submittedCount} of {expectedCount} submitted
            </p>
          </div>
        </div>
        {submittedCount === expectedCount && expectedCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <CheckCircle2 className="h-3 w-3" />
            On track
          </span>
        )}
      </div>

      <div className="flex justify-between gap-2">
        {weekDays.map((day) => (
          <div
            key={day.date}
            className={`flex-1 flex flex-col items-center p-3 rounded-lg transition-colors ${
              day.isToday
                ? "bg-slate-900 text-white"
                : day.isFuture
                ? "bg-slate-50 text-slate-400"
                : day.hasSubmission
                ? "bg-emerald-50"
                : "bg-red-50"
            }`}
          >
            <span
              className={`text-xs font-medium ${
                day.isToday
                  ? "text-slate-300"
                  : day.isFuture
                  ? "text-slate-400"
                  : "text-slate-500"
              }`}
            >
              {day.dayName}
            </span>
            <span
              className={`text-lg font-bold mt-1 ${
                day.isToday
                  ? "text-white"
                  : day.isFuture
                  ? "text-slate-400"
                  : day.hasSubmission
                  ? "text-emerald-700"
                  : "text-red-700"
              }`}
            >
              {day.dayNumber}
            </span>
            <div className="mt-2">
              {day.isFuture ? (
                <Circle className="h-5 w-5 text-slate-300" />
              ) : day.hasSubmission ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : day.isToday ? (
                <Circle className="h-5 w-5 text-amber-400" />
              ) : (
                <Circle className="h-5 w-5 text-red-400" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>Submitted</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Circle className="h-3.5 w-3.5 text-amber-400" />
          <span>Today (pending)</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Circle className="h-3.5 w-3.5 text-red-400" />
          <span>Missed</span>
        </div>
      </div>
    </div>
  )
}
