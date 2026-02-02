"use client"

import { useState, useMemo } from "react"
import type { AssignedTask, Rock, EODReport, TeamMember } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight, Target, CheckSquare, FileText, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarViewProps {
  tasks: AssignedTask[]
  rocks: Rock[]
  eodReports: EODReport[]
  currentUser: TeamMember
  onSelectDate?: (date: Date) => void
}

interface DayData {
  date: Date
  tasks: AssignedTask[]
  rocks: Rock[]
  hasEOD: boolean
}

export function CalendarView({ tasks, rocks, eodReports, currentUser, onSelectDate }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const calendarData = useMemo(() => {
    const data: Map<string, DayData> = new Map()

    days.forEach((day) => {
      const dateKey = format(day, "yyyy-MM-dd")
      data.set(dateKey, {
        date: day,
        tasks: [],
        rocks: [],
        hasEOD: false,
      })
    })

    // Add tasks
    tasks.forEach((task) => {
      if (!task.dueDate) return
      const dateKey = task.dueDate.split("T")[0]
      const dayData = data.get(dateKey)
      if (dayData) {
        dayData.tasks.push(task)
      }
    })

    // Add rocks
    rocks.forEach((rock) => {
      if (!rock.dueDate) return
      const dateKey = rock.dueDate.split("T")[0]
      const dayData = data.get(dateKey)
      if (dayData) {
        dayData.rocks.push(rock)
      }
    })

    // Add EOD reports
    eodReports.forEach((report) => {
      const dateKey = report.date.split("T")[0]
      const dayData = data.get(dateKey)
      if (dayData) {
        dayData.hasEOD = true
      }
    })

    return data
  }, [days, tasks, rocks, eodReports])

  const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const handleToday = () => setCurrentMonth(new Date())

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    onSelectDate?.(date)
  }

  const selectedDayData = selectedDate
    ? calendarData.get(format(selectedDate, "yyyy-MM-dd"))
    : null

  return (
    <div className="bg-white rounded-xl shadow-card">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-slate-900">Calendar</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mt-2">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
            <div
              key={idx}
              className="text-center text-xs font-medium text-slate-500 py-2 md:hidden"
            >
              {day}
            </div>
          ))}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="hidden md:block text-center text-xs font-medium text-slate-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd")
            const dayData = calendarData.get(dateKey)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isDayToday = isToday(day)

            const pendingTasks = dayData?.tasks.filter((t) => t.status !== "completed") || []
            const overdueTasks = pendingTasks.filter(
              (t) => t.dueDate && new Date(t.dueDate) < new Date() && !isSameDay(new Date(t.dueDate), new Date())
            )

            return (
              <button
                key={dateKey}
                onClick={() => handleDateClick(day)}
                className={cn(
                  "relative h-14 md:h-20 p-1 rounded-lg border transition-colors text-left",
                  isCurrentMonth ? "bg-white" : "bg-slate-50",
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : isDayToday
                      ? "border-blue-300"
                      : "border-slate-100 hover:border-slate-200",
                  !isCurrentMonth && "text-slate-400"
                )}
              >
                <div
                  className={cn(
                    "text-sm font-medium",
                    isDayToday &&
                      "bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  )}
                >
                  {format(day, "d")}
                </div>

                {/* Indicators */}
                <div className="mt-1 space-y-0.5">
                  {dayData && dayData.tasks.length > 0 && (
                    <div
                      className={cn(
                        "flex items-center gap-0.5 text-xs",
                        overdueTasks.length > 0 ? "text-red-600" : "text-blue-600"
                      )}
                    >
                      <CheckSquare className="h-3 w-3" />
                      <span>{dayData.tasks.length}</span>
                    </div>
                  )}
                  {dayData && dayData.rocks.length > 0 && (
                    <div className="flex items-center gap-0.5 text-xs text-purple-600">
                      <Target className="h-3 w-3" />
                      <span>{dayData.rocks.length}</span>
                    </div>
                  )}
                  {dayData?.hasEOD && (
                    <div className="flex items-center gap-0.5 text-xs text-emerald-600">
                      <FileText className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDayData && (
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50">
          <h4 className="font-medium text-slate-900 mb-3">
            {format(selectedDayData.date, "EEEE, MMMM d, yyyy")}
          </h4>

          {selectedDayData.tasks.length === 0 &&
            selectedDayData.rocks.length === 0 &&
            !selectedDayData.hasEOD && (
              <p className="text-sm text-slate-500">No items for this day</p>
            )}

          {selectedDayData.tasks.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Tasks ({selectedDayData.tasks.length})
              </h5>
              <div className="space-y-1">
                {selectedDayData.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "text-sm p-2 rounded bg-white border",
                      task.status === "completed"
                        ? "border-slate-200 text-slate-400 line-through"
                        : "border-blue-200"
                    )}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDayData.rocks.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Rocks Due ({selectedDayData.rocks.length})
              </h5>
              <div className="space-y-1">
                {selectedDayData.rocks.map((rock) => (
                  <div
                    key={rock.id}
                    className="text-sm p-2 rounded bg-white border border-purple-200 flex items-center justify-between"
                  >
                    <span>{rock.title}</span>
                    <span className="text-xs text-slate-500">{rock.progress}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDayData.hasEOD && (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <FileText className="h-4 w-4" />
              <span>EOD Report submitted</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
