"use client"

import type { TeamMember, AssignedTask, Rock, EODReport } from "@/lib/types"
import { EnhancedCalendarView } from "@/components/calendar/enhanced-calendar-view"

interface CalendarPageProps {
  currentUser: TeamMember
  assignedTasks: AssignedTask[]
  rocks: Rock[]
  eodReports: EODReport[]
}

export function CalendarPage({ currentUser, assignedTasks, rocks, eodReports }: CalendarPageProps) {
  const userTasks = assignedTasks.filter((t) => t.assigneeId === currentUser.id)
  const userRocks = rocks.filter((r) => r.userId === currentUser.id)
  const userEODReports = eodReports.filter((r) => r.userId === currentUser.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <p className="text-muted-foreground mt-1">View your tasks, rocks, and EOD submissions</p>
      </div>

      <EnhancedCalendarView
        tasks={userTasks}
        rocks={userRocks}
        eodReports={userEODReports}
        currentUser={currentUser}
      />
    </div>
  )
}
