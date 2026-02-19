"use client"

import { useState, useMemo } from "react"
import type { AssignedTask, Rock, EODReport, TeamMember } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  addWeeks,
  subWeeks,
} from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Target,
  CheckSquare,
  FileText,
  Calendar as CalendarIcon,
  Grid3x3,
  List,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface EnhancedCalendarViewProps {
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

export function EnhancedCalendarView({
  tasks,
  rocks,
  eodReports,
  currentUser: _currentUser,
  onSelectDate
}: EnhancedCalendarViewProps) {
  const [view, setView] = useState<"month" | "week">("month")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Calculate date ranges based on view
  const { start, end } = useMemo(() => {
    if (view === "month") {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(monthStart)
      return {
        start: startOfWeek(monthStart, { weekStartsOn: 0 }),
        end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
      }
    } else {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 0 }),
        end: endOfWeek(currentDate, { weekStartsOn: 0 }),
      }
    }
  }, [view, currentDate])

  const days = eachDayOfInterval({ start, end })

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
      if (task.dueDate) {
        const dateKey = task.dueDate.split("T")[0]
        const dayData = data.get(dateKey)
        if (dayData) {
          dayData.tasks.push(task)
        }
      }
    })

    // Add rocks
    rocks.forEach((rock) => {
      if (rock.dueDate) {
        const dateKey = rock.dueDate.split("T")[0]
        const dayData = data.get(dateKey)
        if (dayData) {
          dayData.rocks.push(rock)
        }
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

  const handlePrevious = () => {
    if (view === "month") {
      setCurrentDate(subMonths(currentDate, 1))
    } else {
      setCurrentDate(subWeeks(currentDate, 1))
    }
  }

  const handleNext = () => {
    if (view === "month") {
      setCurrentDate(addMonths(currentDate, 1))
    } else {
      setCurrentDate(addWeeks(currentDate, 1))
    }
  }

  const handleToday = () => setCurrentDate(new Date())

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    onSelectDate?.(date)
  }

  const selectedDayData = selectedDate
    ? calendarData.get(format(selectedDate, "yyyy-MM-dd"))
    : null

  // Get title based on view
  const getTitle = () => {
    if (view === "month") {
      return format(currentDate, "MMMM yyyy")
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Calendar</h3>
              <p className="text-sm text-muted-foreground">{getTitle()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week")} className="mr-2">
              <TabsList className="h-9">
                <TabsTrigger value="month" className="text-xs px-3">
                  <Grid3x3 className="h-3.5 w-3.5 mr-1.5" />
                  Month
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs px-3">
                  <List className="h-3.5 w-3.5 mr-1.5" />
                  Week
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Navigation */}
            <Button variant="outline" size="sm" onClick={handlePrevious} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday} className="hidden sm:inline-flex">
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
            <div
              key={idx}
              className="text-center text-xs font-semibold text-muted-foreground py-2 md:hidden"
            >
              {day}
            </div>
          ))}
          {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
            <div
              key={day}
              className="hidden md:block text-center text-xs font-semibold text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className={cn(
          "grid gap-2",
          view === "month" ? "grid-cols-7" : "grid-cols-7"
        )}>
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd")
            const dayData = calendarData.get(dateKey)
            const isCurrentMonth = view === "month" ? isSameMonth(day, currentDate) : true
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isDayToday = isToday(day)

            const pendingTasks = dayData?.tasks.filter((t) => t.status !== "completed") || []

            return (
              <button
                key={dateKey}
                onClick={() => handleDateClick(day)}
                className={cn(
                  "relative rounded-lg border transition-all text-left p-2",
                  view === "month" ? "h-20 md:h-24" : "h-32 md:h-36",
                  isCurrentMonth
                    ? "bg-background border-border hover:border-primary/50 hover:shadow-sm"
                    : "bg-muted/50 border-border/50",
                  isSelected && "border-primary bg-primary/5 shadow-sm",
                  isDayToday && !isSelected && "border-primary/70 bg-primary/5",
                  !isCurrentMonth && "opacity-50"
                )}
              >
                {/* Date Number */}
                <div className="flex items-center justify-between mb-1">
                  <div
                    className={cn(
                      "text-sm font-semibold rounded-full flex items-center justify-center",
                      isDayToday && "bg-primary text-primary-foreground w-7 h-7"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                  {dayData?.hasEOD && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </div>

                {/* Event Indicators */}
                <div className="space-y-1">
                  {/* Tasks */}
                  {pendingTasks.slice(0, view === "week" ? 3 : 2).map((task, _idx) => (
                    <div
                      key={task.id}
                      className="text-[10px] md:text-xs truncate px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200"
                    >
                      {task.title}
                    </div>
                  ))}

                  {/* Rocks */}
                  {dayData?.rocks.slice(0, 1).map((rock) => (
                    <div
                      key={rock.id}
                      className="text-[10px] md:text-xs truncate px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1"
                    >
                      <Target className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="truncate">{rock.title}</span>
                    </div>
                  ))}

                  {/* More indicator */}
                  {(dayData && (dayData.tasks.length + dayData.rocks.length > 3)) && (
                    <div className="text-[10px] text-muted-foreground font-medium px-1">
                      +{dayData.tasks.length + dayData.rocks.length - 3} more
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day detail panel */}
      {selectedDayData && (
        <div className="px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-foreground">
              {format(selectedDayData.date, "EEEE, MMMM d, yyyy")}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(null)}
            >
              Close
            </Button>
          </div>

          {selectedDayData.tasks.length === 0 &&
            selectedDayData.rocks.length === 0 &&
            !selectedDayData.hasEOD && (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No items for this day</p>
              </div>
            )}

          {/* Tasks */}
          {selectedDayData.tasks.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <h5 className="text-sm font-semibold text-foreground">
                  Tasks ({selectedDayData.tasks.length})
                </h5>
              </div>
              <div className="space-y-2">
                {selectedDayData.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "p-3 rounded-lg border bg-background",
                      task.status === "completed"
                        ? "border-border opacity-60"
                        : "border-blue-200 bg-blue-50/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium",
                          task.status === "completed" && "line-through text-muted-foreground"
                        )}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={task.priority === "high" ? "high" : task.priority === "medium" ? "medium" : "low"}
                        className="text-xs flex-shrink-0"
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rocks */}
          {selectedDayData.rocks.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-muted-foreground" />
                <h5 className="text-sm font-semibold text-foreground">
                  Rocks Due ({selectedDayData.rocks.length})
                </h5>
              </div>
              <div className="space-y-2">
                {selectedDayData.rocks.map((rock) => (
                  <div
                    key={rock.id}
                    className="p-3 rounded-lg border border-purple-200 bg-purple-50/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium flex-1 min-w-0">{rock.title}</p>
                      <Badge variant="secondary" className="text-xs">
                        {rock.progress}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EOD Indicator */}
          {selectedDayData.hasEOD && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <FileText className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">EOD Report submitted</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
