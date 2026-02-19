"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MeetingTimer } from "./meeting-timer"
import { SegueSection } from "./sections/segue-section"
import { ScorecardSection } from "./sections/scorecard-section"
import { RocksSection } from "./sections/rocks-section"
import { HeadlinesSection } from "./sections/headlines-section"
import { IDSSection } from "./sections/ids-section"
import { ConcludeSection } from "./sections/conclude-section"
import {
  Play,
  Users,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import type {
  Meeting,
  MeetingSection,
  MeetingPrep,
  Issue,
  MeetingTodo,
  SectionType,
} from "@/lib/db/meetings"

interface MeetingPageProps {
  meetingId: string
  workspaceId: string
}

interface Attendee {
  id: string
  name: string
  email?: string
}

const SECTION_DURATION: Record<SectionType, number> = {
  segue: 5,
  scorecard: 5,
  rocks: 5,
  headlines: 5,
  ids: 60,
  conclude: 5,
}

const SECTION_NAMES: Record<SectionType, string> = {
  segue: "Segue",
  scorecard: "Scorecard",
  rocks: "Rocks Review",
  headlines: "Headlines",
  ids: "IDS",
  conclude: "Conclude",
}

export function MeetingPage({ meetingId, workspaceId }: MeetingPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [sections, setSections] = useState<MeetingSection[]>([])
  const [prep, setPrep] = useState<MeetingPrep | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])
  const [todos, setTodos] = useState<MeetingTodo[]>([])
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentSection = sections[currentSectionIndex]
  const isInProgress = meeting?.status === "in_progress"
  const isCompleted = meeting?.status === "completed"

  // Load meeting data
  const loadMeeting = useCallback(async () => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setMeeting(data.data)
      setSections(data.data.sections || [])

      // Find current active section
      const activeSectionIdx = (data.data.sections || []).findIndex(
        (s: MeetingSection) => s.startedAt && !s.completed
      )
      if (activeSectionIdx >= 0) {
        setCurrentSectionIndex(activeSectionIdx)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load meeting")
    } finally {
      setLoading(false)
    }
  }, [meetingId])

  // Load issues for IDS section
  const loadIssues = useCallback(async () => {
    try {
      const res = await fetch(`/api/issues?workspaceId=${workspaceId}&status=open`)
      const data = await res.json()
      if (data.success) {
        setIssues(data.data || [])
      }
    } catch {
      // Issues load is non-critical, silently ignore
    }
  }, [workspaceId])

  // Load workspace members for attendees
  const loadAttendees = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`)
      const data = await res.json()
      if (data.success && data.data) {
        setAttendees(
          data.data.map((m: { userId: string; name: string; email?: string }) => ({
            id: m.userId,
            name: m.name,
            email: m.email,
          }))
        )
      }
    } catch {
      // Attendee load is non-critical
    }
  }, [workspaceId])

  // Load todos from API
  const loadTodos = useCallback(async () => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}/todos`)
      const data = await res.json()
      if (data.success) {
        setTodos(data.data || [])
      }
    } catch {
      // Todos load is non-critical
    }
  }, [meetingId])

  useEffect(() => {
    loadMeeting()
    loadIssues()
    loadTodos()
  }, [loadMeeting, loadIssues, loadTodos])

  // Poll for updates during active meeting (every 15 seconds)
  useEffect(() => {
    if (isInProgress) {
      pollRef.current = setInterval(() => {
        loadMeeting()
        loadTodos()
      }, 15000)
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [isInProgress, loadMeeting, loadTodos])

  // Start meeting
  const handleStartMeeting = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/meetings/${meetingId}/start`, {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setMeeting(data.data.meeting)
      setSections(data.data.sections || [])
      setPrep(data.data.prep)

      // Merge prep issues with existing issues
      if (data.data.prep?.openIssues) {
        setIssues((prev) => {
          const existingIds = new Set(prev.map((i) => i.id))
          const newIssues = data.data.prep.openIssues.filter(
            (i: Issue) => !existingIds.has(i.id)
          )
          return [...prev, ...newIssues]
        })
      }

      // Load real workspace members as attendees
      await loadAttendees()

      setCurrentSectionIndex(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start meeting")
    } finally {
      setLoading(false)
    }
  }

  // Complete section
  const handleCompleteSection = async (sectionData: Record<string, unknown>) => {
    if (!currentSection) return

    try {
      const res = await fetch(`/api/meetings/${meetingId}/sections`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          sectionType: currentSection.sectionType,
          action: "complete",
          data: sectionData,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      // Update sections state
      setSections((prev) =>
        prev.map((s) =>
          s.sectionType === currentSection.sectionType
            ? { ...s, completed: true, data: sectionData }
            : s
        )
      )

      // Move to next section
      if (currentSectionIndex < sections.length - 1) {
        setCurrentSectionIndex((prev) => prev + 1)
      }
    } catch {
      setError("Failed to complete section. Please try again.")
    }
  }

  // End meeting
  const handleEndMeeting = async (data: { rating: number; feedback: string }) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/meetings/${meetingId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          rating: data.rating,
          notes: data.feedback,
        }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)

      setMeeting(result.data.meeting)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end meeting")
    } finally {
      setLoading(false)
    }
  }

  // Create issue
  const handleCreateIssue = async (title: string, sourceType: string, sourceId?: string) => {
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          workspaceId,
          title,
          sourceType,
          sourceId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setIssues((prev) => [...prev, data.data])
      }
    } catch {
      setError("Failed to create issue. Please try again.")
    }
  }

  // Resolve issue
  const handleResolveIssue = async (issueId: string, resolution: string) => {
    try {
      const res = await fetch(`/api/issues/${issueId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ resolution, meetingId }),
      })
      const data = await res.json()
      if (data.success) {
        setIssues((prev) =>
          prev.map((i) => (i.id === issueId ? { ...i, status: "resolved" } : i))
        )
      }
    } catch {
      setError("Failed to resolve issue. Please try again.")
    }
  }

  // Drop issue
  const handleDropIssue = async (issueId: string) => {
    try {
      await fetch(`/api/issues/${issueId}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" }
      })
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, status: "dropped" } : i))
      )
    } catch {
      // Issue drop failed - non-critical
    }
  }

  // Create todo via API
  const handleCreateTodo = async (title: string, issueId?: string) => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ title, issueId }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        setTodos((prev) => [...prev, data.data])
      }
    } catch {
      setError("Failed to create todo. Please try again.")
    }
  }

  // Calculate meeting duration
  const getMeetingDuration = () => {
    if (!meeting?.startedAt) return undefined
    const start = new Date(meeting.startedAt)
    const end = meeting.endedAt ? new Date(meeting.endedAt) : new Date()
    return (end.getTime() - start.getTime()) / 60000 // minutes
  }

  if (loading && !meeting) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" role="status" aria-label="Loading" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </CardContent>
      </Card>
    )
  }

  // Pre-meeting state
  if (!isInProgress && !isCompleted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {meeting?.title || "L10 Meeting"}
          </CardTitle>
          <CardDescription>
            Scheduled for{" "}
            {meeting?.scheduledAt
              ? new Date(meeting.scheduledAt).toLocaleString()
              : "—"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              90 minutes
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {meeting?.attendees?.length || 0} attendees
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium mb-2">Meeting Agenda</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>1. Segue (Good News)</span>
                <span className="text-slate-500">5 min</span>
              </div>
              <div className="flex justify-between">
                <span>2. Scorecard Review</span>
                <span className="text-slate-500">5 min</span>
              </div>
              <div className="flex justify-between">
                <span>3. Rocks Review</span>
                <span className="text-slate-500">5 min</span>
              </div>
              <div className="flex justify-between">
                <span>4. Headlines</span>
                <span className="text-slate-500">5 min</span>
              </div>
              <div className="flex justify-between">
                <span>5. IDS (Issues)</span>
                <span className="text-slate-500">60 min</span>
              </div>
              <div className="flex justify-between">
                <span>6. Conclude</span>
                <span className="text-slate-500">5 min</span>
              </div>
            </div>
          </div>

          <Button onClick={handleStartMeeting} size="lg" className="w-full">
            <Play className="h-4 w-4 mr-2" />
            Start Meeting
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Completed state
  if (isCompleted) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              {meeting?.title || "L10 Meeting"}
            </CardTitle>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
              Completed
            </Badge>
          </div>
          <CardDescription>
            Completed on{" "}
            {meeting?.endedAt
              ? new Date(meeting.endedAt).toLocaleString()
              : "—"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold">{meeting?.rating || "—"}/10</div>
              <div className="text-sm text-slate-500">Rating</div>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold">
                {meeting?.durationMinutes ? `${Math.round(meeting.durationMinutes)}m` : "—"}
              </div>
              <div className="text-sm text-slate-500">Duration</div>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold">{todos.length}</div>
              <div className="text-sm text-slate-500">To-Dos</div>
            </div>
          </div>

          {meeting?.notes && (
            <div className="p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium mb-1">Feedback</div>
              <div className="text-sm text-slate-600">{meeting.notes}</div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // In-progress meeting
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {meeting?.title || "L10 Meeting"}
              <Badge>In Progress</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {currentSection && (
            <MeetingTimer
              targetMinutes={SECTION_DURATION[currentSection.sectionType]}
              sectionName={SECTION_NAMES[currentSection.sectionType]}
              autoStart={true}
            />
          )}
        </CardContent>
      </Card>

      {/* Section Progress */}
      <div className="flex gap-1">
        {sections.map((section, idx) => (
          <div
            key={section.id}
            className={`flex-1 h-2 rounded-full transition-colors ${
              section.completed
                ? "bg-emerald-500"
                : idx === currentSectionIndex
                  ? "bg-primary"
                  : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      {/* Current Section */}
      <div className="space-y-4">
        {sections.map((section, idx) => {
          const isActive = idx === currentSectionIndex
          const sectionProps = {
            section,
            isActive,
          }

          switch (section.sectionType) {
            case "segue":
              return (
                <SegueSection
                  key={section.id}
                  {...sectionProps}
                  attendees={attendees}
                  onComplete={handleCompleteSection}
                />
              )
            case "scorecard":
              return (
                <ScorecardSection
                  key={section.id}
                  {...sectionProps}
                  prep={prep || { scorecardAlerts: [], rocksAtRisk: [], overdueTasks: [], openIssues: [] }}
                  onComplete={handleCompleteSection}
                  onCreateIssue={handleCreateIssue}
                />
              )
            case "rocks":
              return (
                <RocksSection
                  key={section.id}
                  {...sectionProps}
                  prep={prep || { scorecardAlerts: [], rocksAtRisk: [], overdueTasks: [], openIssues: [] }}
                  onComplete={handleCompleteSection}
                  onCreateIssue={handleCreateIssue}
                />
              )
            case "headlines":
              return (
                <HeadlinesSection
                  key={section.id}
                  {...sectionProps}
                  onComplete={handleCompleteSection}
                  onCreateIssue={handleCreateIssue}
                />
              )
            case "ids":
              return (
                <IDSSection
                  key={section.id}
                  {...sectionProps}
                  issues={issues}
                  onComplete={handleCompleteSection}
                  onResolveIssue={handleResolveIssue}
                  onDropIssue={handleDropIssue}
                  onCreateTodo={handleCreateTodo}
                />
              )
            case "conclude":
              return (
                <ConcludeSection
                  key={section.id}
                  {...sectionProps}
                  todos={todos}
                  meetingDuration={getMeetingDuration()}
                  onComplete={handleEndMeeting}
                />
              )
            default:
              return null
          }
        })}
      </div>
    </div>
  )
}
