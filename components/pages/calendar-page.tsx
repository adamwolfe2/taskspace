"use client"

import type { TeamMember, AssignedTask, Rock, EODReport } from "@/lib/types"
import { CalendarView } from "@/components/calendar/calendar-view"
import { useState } from "react"
import { format } from "date-fns"

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
        <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
        <p className="text-slate-500 mt-1">View your tasks, rocks, and EOD submissions</p>
      </div>

      <CalendarView
        tasks={userTasks}
        rocks={userRocks}
        eodReports={userEODReports}
        currentUser={currentUser}
      />
    </div>
  )
}
