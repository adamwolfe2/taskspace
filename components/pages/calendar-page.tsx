"use client"

import type { TeamMember, AssignedTask, Rock, EODReport } from "@/lib/types"
import { EnhancedCalendarView } from "@/components/calendar/enhanced-calendar-view"
import { EmptyState } from "@/components/shared/empty-state"
import { Calendar } from "lucide-react"

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

  const hasNoData = userTasks.length === 0 && userRocks.length === 0 && userEODReports.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <p className="text-muted-foreground mt-1">View your tasks, rocks, and EOD submissions</p>
      </div>

      {hasNoData ? (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <EmptyState
            icon={Calendar}
            title="Your calendar is empty"
            description="Once you create tasks, set quarterly rocks, or submit EOD reports, they'll appear here on your calendar. Start by adding a task or submitting your first EOD report!"
            size="lg"
          />
        </div>
      ) : (
        <EnhancedCalendarView
          tasks={userTasks}
          rocks={userRocks}
          eodReports={userEODReports}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}
