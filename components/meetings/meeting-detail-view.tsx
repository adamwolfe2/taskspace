"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowLeft,
  Sparkles,
  Loader2,
  Copy,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AgendaBuilder } from "./agenda-builder"

interface ScorecardMetric {
  name: string
  value: string | number
  goal?: string | number
}

interface RockReview {
  title: string
  owner?: string
  onTrack: boolean
}

interface IdsIssue {
  title: string
  resolution?: string
}

interface MeetingDetailViewProps {
  meeting: {
    id: string
    title: string
    status: string
    scheduledAt: string
    startedAt?: string
    endedAt?: string
    durationMinutes?: number
    notes?: string
    rating?: number
    attendees: string[]
  }
  sections?: Array<{
    sectionType: string
    data: Record<string, unknown>
    completed: boolean
  }>
  todos?: Array<{
    id: string
    title: string
    assigneeName?: string
    completed: boolean
    dueDate?: string
  }>
  onBack?: () => void
  workspaceId?: string
}

const SECTION_ORDER = [
  "segue",
  "scorecard",
  "rocks",
  "headlines",
  "ids",
  "conclude",
]

const SECTION_LABELS: Record<string, string> = {
  segue: "Segue",
  scorecard: "Scorecard",
  rocks: "Rock Review",
  headlines: "Headlines",
  ids: "IDS (Identify, Discuss, Solve)",
  conclude: "Conclude",
}

export function MeetingDetailView({
  meeting,
  sections = [],
  todos = [],
  onBack,
  workspaceId,
}: MeetingDetailViewProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [copiedSummary, setCopiedSummary] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const getRatingBadge = (rating: number) => {
    if (rating >= 8) {
      return <Badge variant="success">Rating: {rating}/10</Badge>
    } else if (rating >= 5) {
      return <Badge variant="warning">Rating: {rating}/10</Badge>
    } else {
      return <Badge variant="destructive">Rating: {rating}/10</Badge>
    }
  }

  const handleGenerateAISummary = async () => {
    if (!workspaceId) return

    setIsGeneratingAI(true)
    try {
      const response = await fetch("/api/ai/meeting-notes", {
        method: "POST",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId,
          meetingData: {
            meeting,
            sections,
            todos,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate AI summary")
      }

      const data = await response.json()
      setAiSummary(data.summary || "No summary generated")
    } catch {
      setAiSummary("Failed to generate summary. Please try again.")
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const renderSectionData = (sectionType: string, data: Record<string, unknown>) => {
    switch (sectionType) {
      case "segue":
        return (
          <div className="space-y-2">
            {data.highlights ? (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">
                  Good News
                </p>
                <p className="text-sm text-slate-600">{String(data.highlights)}</p>
              </div>
            ) : null}
          </div>
        )

      case "scorecard":
        if (Array.isArray(data.metrics)) {
          return (
            <div className="space-y-3">
              {(data.metrics as ScorecardMetric[]).map((metric, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {metric.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">
                      {metric.value}
                    </span>
                    {metric.goal && (
                      <span className="text-xs text-slate-500">
                        (Goal: {metric.goal})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        }
        return <p className="text-sm text-slate-500">No metrics recorded</p>

      case "rocks":
        if (Array.isArray(data.rocks)) {
          return (
            <div className="space-y-2">
              {(data.rocks as RockReview[]).map((rock, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 rounded-lg bg-slate-50"
                >
                  {rock.onTrack ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">
                      {rock.title}
                    </p>
                    {rock.owner && (
                      <p className="text-xs text-slate-500">Owner: {rock.owner}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        }
        return <p className="text-sm text-slate-500">No rocks reviewed</p>

      case "headlines":
        if (Array.isArray(data.headlines)) {
          return (
            <ul className="space-y-1 list-disc list-inside">
              {data.headlines.map((headline: string, index: number) => (
                <li key={index} className="text-sm text-slate-700">
                  {headline}
                </li>
              ))}
            </ul>
          )
        }
        return <p className="text-sm text-slate-500">No headlines shared</p>

      case "ids":
        if (Array.isArray(data.issues)) {
          return (
            <div className="space-y-3">
              {(data.issues as IdsIssue[]).map((issue, index) => (
                <div key={index} className="border-l-2 border-slate-300 pl-3">
                  <p className="text-sm font-medium text-slate-700">
                    {issue.title}
                  </p>
                  {issue.resolution && (
                    <p className="text-sm text-slate-600 mt-1">
                      Resolution: {issue.resolution}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        }
        return <p className="text-sm text-slate-500">No issues discussed</p>

      case "conclude":
        return (
          <div className="space-y-2">
            {data.cascadeMessage ? (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">
                  Cascade Message
                </p>
                <p className="text-sm text-slate-600">
                  {String(data.cascadeMessage)}
                </p>
              </div>
            ) : null}
            {data.rating ? (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-700">
                  Meeting Rating:
                </p>
                {getRatingBadge(Number(data.rating))}
              </div>
            ) : null}
          </div>
        )

      default:
        return (
          <pre className="text-xs text-slate-600 overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )
    }
  }

  const sortedSections = [...sections].sort((a, b) => {
    const indexA = SECTION_ORDER.indexOf(a.sectionType.toLowerCase())
    const indexB = SECTION_ORDER.indexOf(b.sectionType.toLowerCase())
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} aria-label="Go back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {meeting.title}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Calendar className="h-4 w-4" />
                  {formatDate(meeting.scheduledAt)}
                </div>
                {meeting.startedAt && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Clock className="h-4 w-4" />
                    {formatTime(meeting.startedAt)}
                  </div>
                )}
                {meeting.durationMinutes && (
                  <Badge variant="outline">
                    {meeting.durationMinutes} minutes
                  </Badge>
                )}
                {meeting.rating && getRatingBadge(meeting.rating)}
                <Badge
                  variant={
                    meeting.status === "completed"
                      ? "completed"
                      : meeting.status === "in_progress"
                      ? "active"
                      : "pending"
                  }
                >
                  {meeting.status.replace("_", " ")}
                </Badge>
              </div>
            </div>
          </div>

          {meeting.attendees.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">
                Attendees
              </p>
              <div className="flex flex-wrap gap-2">
                {meeting.attendees.map((attendee, index) => (
                  <Badge key={index} variant="soft-slate">
                    {attendee}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Summary Button & Display */}
      {workspaceId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-slate-600" />
              AI Meeting Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!aiSummary ? (
              <Button
                onClick={handleGenerateAISummary}
                disabled={isGeneratingAI}
                className="w-full sm:w-auto"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Summary...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate AI Summary
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="prose prose-sm max-w-none">
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">
                    {aiSummary}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      if (!aiSummary) return
                      navigator.clipboard.writeText(aiSummary).then(() => {
                        setCopiedSummary(true)
                        setTimeout(() => setCopiedSummary(false), 2000)
                      })
                    }}
                  >
                    {copiedSummary ? (
                      <><Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />Copied</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy Summary</>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-slate-500"
                    onClick={handleGenerateAISummary}
                    disabled={isGeneratingAI}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Regenerate
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sections */}
      {sortedSections.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Meeting Sections
          </h2>
          {sortedSections.map((section, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {SECTION_LABELS[section.sectionType.toLowerCase()] ||
                      section.sectionType}
                  </CardTitle>
                  {section.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {renderSectionData(section.sectionType.toLowerCase(), section.data)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Todos */}
      {todos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Action Items
              <span className="text-sm font-normal text-slate-500">
                ({todos.filter(t => t.completed).length}/{todos.length} done)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    todo.completed
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-slate-50 border-slate-200"
                  )}
                >
                  {todo.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        todo.completed
                          ? "text-emerald-900 line-through"
                          : "text-slate-900"
                      )}
                    >
                      {todo.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {todo.assigneeName && (
                        <span className="text-xs text-slate-600">
                          Assigned to: {todo.assigneeName}
                        </span>
                      )}
                      {todo.dueDate && (
                        <span className="text-xs text-slate-500">
                          Due: {formatDate(todo.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {meeting.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Meeting Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {meeting.notes}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agenda Builder — shown for scheduled/active meetings */}
      {(meeting.status === "scheduled" || meeting.status === "active") && (
        <AgendaBuilder
          meetingId={meeting.id}
          disabled={false}
        />
      )}

      {/* Empty State */}
      {sections.length === 0 && todos.length === 0 && !meeting.notes && meeting.status === "completed" && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No meeting content available</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
