"use client"

import { useState } from "react"
import type { TeamMember, AssignedTask, Rock, EODReport } from "@/lib/types"
import { EnhancedCalendarView } from "@/components/calendar/enhanced-calendar-view"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Sparkles, Loader2 } from "lucide-react"
import { useWorkspaceStore } from "@/lib/hooks/use-workspace"
import { useApp } from "@/lib/contexts/app-context"
import { useToast } from "@/hooks/use-toast"
import { DEMO_READONLY_MESSAGE } from "@/lib/demo-data"
import { ErrorBoundary } from "@/components/shared/error-boundary"

interface CalendarPageProps {
  currentUser: TeamMember
  assignedTasks: AssignedTask[]
  rocks: Rock[]
  eodReports: EODReport[]
}

export function CalendarPage({ currentUser, assignedTasks, rocks, eodReports }: CalendarPageProps) {
  // Use users.id (not org_members.id) for filtering rocks/tasks/EODs
  const effectiveUserId = currentUser.userId || currentUser.id
  const userTasks = assignedTasks.filter((t) => t.assigneeId === effectiveUserId)
  const userRocks = rocks.filter((r) => r.userId === effectiveUserId)
  const userEODReports = eodReports.filter((r) => r.userId === effectiveUserId)
  const { currentWorkspaceId } = useWorkspaceStore()
  const { isDemoMode } = useApp()
  const { toast } = useToast()

  const [prepLoading, setPrepLoading] = useState(false)
  const [meetingPrep, setMeetingPrep] = useState<{
    summary: string
    talkingPoints: string[]
    atRiskRocks: string[]
    decliningMetrics: string[]
    overdueTasks: string[]
    openIssues: string[]
  } | null>(null)

  const handleMeetingPrep = async () => {
    if (isDemoMode) {
      toast({ title: "Demo Mode", description: DEMO_READONLY_MESSAGE })
      return
    }
    if (!currentWorkspaceId) return
    setPrepLoading(true)
    try {
      const response = await fetch("/api/ai/meeting-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: JSON.stringify({
          workspaceId: currentWorkspaceId,
          rocks: rocks.map((r) => ({
            title: r.title,
            progress: r.progress,
            status: r.status,
            ownerName: r.ownerEmail,
          })),
          tasks: assignedTasks.map((t) => ({
            title: t.title,
            status: t.status,
            priority: t.priority,
            assigneeName: t.assigneeName,
            dueDate: t.dueDate,
          })),
        }),
      })
      const result = await response.json().catch(() => ({ success: false, error: null }))
      if (result.success) {
        setMeetingPrep(result.data)
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate meeting prep", variant: "destructive" })
    } finally {
      setPrepLoading(false)
    }
  }

  const hasNoData = userTasks.length === 0 && userRocks.length === 0 && userEODReports.length === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground mt-1">View your tasks, rocks, and EOD submissions</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleMeetingPrep} disabled={prepLoading}>
          {prepLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          AI Meeting Prep
        </Button>
      </div>

      {meetingPrep && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Meeting Prep
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-slate-700">{meetingPrep.summary}</p>
            {meetingPrep.talkingPoints.length > 0 && (
              <div>
                <p className="font-medium text-slate-900 mb-1">Talking Points:</p>
                <ul className="list-disc list-inside text-slate-600 space-y-1">
                  {meetingPrep.talkingPoints.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
            {meetingPrep.atRiskRocks.length > 0 && (
              <div>
                <p className="font-medium text-red-700 mb-1">At-Risk Rocks:</p>
                <ul className="list-disc list-inside text-red-600 space-y-1">
                  {meetingPrep.atRiskRocks.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            {meetingPrep.overdueTasks.length > 0 && (
              <div>
                <p className="font-medium text-yellow-700 mb-1">Overdue Tasks:</p>
                <ul className="list-disc list-inside text-yellow-600 space-y-1">
                  {meetingPrep.overdueTasks.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ErrorBoundary title="Calendar unavailable">
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
      </ErrorBoundary>
    </div>
  )
}
