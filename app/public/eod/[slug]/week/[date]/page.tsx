"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { format, parseISO } from "date-fns"
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  RefreshCw,
  Target,
  Loader2,
  Calendar,
  Building2,
  ChevronDown,
  ChevronUp,
  BarChart3,
  TrendingUp,
  FileText,
  LayoutGrid,
  List,
  Paperclip,
  File,
  ExternalLink,
} from "lucide-react"
import { UserBentoCard, UserBentoGrid, type UserBentoData } from "@/components/public/user-bento-card"
import { ExportDropdown } from "@/components/public/export-dropdown"
import { generateWeeklyMarkdown } from "@/lib/utils/report-export"
import * as Sentry from "@sentry/nextjs"

interface WeeklyTask {
  description: string
  rockTitle?: string
  date: string
  completedAt?: string
}

interface WeeklyPriority {
  description: string
  rockTitle?: string
  date: string
}

interface WeeklyAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  date: string
}

// Rock progress for bento cards
interface PublicRockProgress {
  id: string
  progress: number
  status: "on-track" | "at-risk" | "blocked" | "completed"
}

interface WeeklyUserReport {
  userName: string
  userRole: "owner" | "admin" | "member"
  department: string
  jobTitle?: string
  totalReports: number
  totalTasks: number
  tasks: WeeklyTask[]
  challenges: string[]
  priorities: WeeklyPriority[]
  escalations: Array<{ date: string; note: string }>
  attachments: WeeklyAttachment[]
  rocks: PublicRockProgress[]
}

// Scorecard entry for weekly deliverables
interface ScorecardEntry {
  memberId: string
  memberName: string
  department: string
  metricName: string
  weeklyGoal: number
  actualValue: number | null
  isOnTrack: boolean
}

interface WeeklyReport {
  organizationName: string
  organizationLogo?: string
  weekEnding: string
  weekRange: string
  displayWeek: string
  timezone: string
  lastUpdated: string
  userReports: WeeklyUserReport[]
  weeklyStats: {
    totalReports: number
    totalTasks: number
    totalEscalations: number
    averageTasksPerDay: number
    submissionsByDay: Array<{ date: string; displayDate: string; count: number; total: number }>
  }
  scorecard: ScorecardEntry[]
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageType(type: string): boolean {
  return type.startsWith("image/")
}

function UserWeeklyCard({ report }: { report: WeeklyUserReport }) {
  const [isExpanded, setIsExpanded] = useState(true)

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">Owner</span>
      case "admin":
        return <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Admin</span>
      default:
        return null
    }
  }

  // Group tasks by rock (like internal EOD reports)
  const tasksByRock = report.tasks.reduce((acc, task) => {
    const key = task.rockTitle || "general"
    if (!acc[key]) acc[key] = []
    acc[key].push(task)
    return acc
  }, {} as Record<string, WeeklyTask[]>)

  // Group priorities by rock
  const prioritiesByRock = report.priorities.reduce((acc, priority) => {
    const key = priority.rockTitle || "general"
    if (!acc[key]) acc[key] = []
    acc[key].push(priority)
    return acc
  }, {} as Record<string, WeeklyPriority[]>)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div
        className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-semibold">
              {(report.userName || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">{report.userName || "Unknown"}</h3>
                {getRoleBadge(report.userRole)}
              </div>
              <p className="text-sm text-slate-500">
                {report.jobTitle || report.department}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                {report.totalTasks} tasks
              </span>
              <span className="flex items-center gap-1 text-blue-600">
                <FileText className="h-4 w-4" />
                {report.totalReports} reports
              </span>
              {report.attachments && report.attachments.length > 0 && (
                <span className="flex items-center gap-1 text-slate-500">
                  <Paperclip className="h-4 w-4" />
                  {report.attachments.length}
                </span>
              )}
              {report.escalations.length > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  {report.escalations.length}
                </span>
              )}
            </div>
            <button className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Rock Progress Update */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
              <Target className="h-4 w-4 text-blue-500" />
              Rock Progress Update ({report.totalTasks} tasks)
            </h4>

            {/* Tasks grouped by rock */}
            {Object.entries(tasksByRock).length > 0 ? (
              <div className="space-y-4">
                {/* Show rock-specific tasks first */}
                {Object.entries(tasksByRock)
                  .filter(([rockTitle]) => rockTitle !== "general")
                  .map(([rockTitle, tasks]) => {
                    const rockPriorities = prioritiesByRock[rockTitle] || []
                    return (
                      <div key={rockTitle} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                        <h5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <Target className="h-4 w-4 text-slate-600" />
                          {rockTitle}
                        </h5>

                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                              This Week's Activities ({tasks.length})
                            </p>
                            <ul className="space-y-1.5 ml-4">
                              {tasks.map((task, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                                  <span className="text-slate-700">{task.description}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {rockPriorities.length > 0 && (
                            <div className="pt-2 border-t border-slate-200">
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                                Next Week's Priorities
                              </p>
                              <ul className="space-y-1.5 ml-4">
                                {rockPriorities.map((priority, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm">
                                    <span className="text-blue-500 font-medium">{idx + 1}.</span>
                                    <span className="text-slate-700">{priority.description}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                {/* General activities (tasks without rocks) */}
                {tasksByRock["general"] && tasksByRock["general"].length > 0 && (
                  <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-lg">
                    <h5 className="font-semibold text-slate-700 mb-3">
                      General Activities
                    </h5>
                    <ul className="space-y-1.5 ml-4">
                      {tasksByRock["general"].map((task, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                          <span className="text-slate-600">{task.description}</span>
                        </li>
                      ))}
                    </ul>

                    {/* General priorities */}
                    {prioritiesByRock["general"] && prioritiesByRock["general"].length > 0 && (
                      <div className="pt-2 mt-3 border-t border-slate-200">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                          Next Week's Priorities
                        </p>
                        <ul className="space-y-1.5 ml-4">
                          {prioritiesByRock["general"].map((priority, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <span className="text-blue-500 font-medium">{idx + 1}.</span>
                              <span className="text-slate-600">{priority.description}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No tasks recorded this week</p>
            )}
          </div>

          {/* Challenges */}
          {report.challenges.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Challenges / Blockers
              </h4>
              <ul className="space-y-2">
                {report.challenges.map((challenge, idx) => (
                  <li key={idx} className="text-sm text-slate-600 pl-4 border-l-2 border-amber-200">
                    {challenge}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Escalations */}
          {report.escalations.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-3">
                <AlertTriangle className="h-4 w-4" />
                Escalations ({report.escalations.length})
              </h4>
              <ul className="space-y-2">
                {report.escalations.map((esc, idx) => (
                  <li key={idx} className="text-sm">
                    <span className="text-red-500 font-medium">{format(parseISO(esc.date), "MMM d")}:</span>
                    <span className="text-red-600 ml-2">{esc.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Attachments */}
          {report.attachments && report.attachments.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <Paperclip className="h-4 w-4 text-slate-500" />
                Attachments ({report.attachments.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {report.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-100 transition-colors"
                  >
                    {isImageType(attachment.type) ? (
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <File className="h-5 w-5 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate group-hover:text-slate-900">
                        {attachment.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PublicEODWeeklyReportPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const date = params.date as string
  const token = searchParams.get("token")

  const [data, setData] = useState<WeeklyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [_lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<"bento" | "list">("bento")

  const fetchReport = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true)

    try {
      const url = token
        ? `/api/public/eod/${slug}/week/${date}?token=${token}`
        : `/api/public/eod/${slug}/week/${date}`
      const response = await fetch(url)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to load report")
      }

      setData(result.data)
      setError(null)
      setLastRefresh(new Date())
    } catch (err) {
      Sentry.captureException(err, { tags: { page: "public-eod-weekly", slug, date } })
      setError(err instanceof Error ? err.message : "Failed to load report")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [slug, date, token])

  // Initial load
  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500">Loading weekly report...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Report Not Found</h1>
          <p className="text-slate-500 mb-4">{error || "Unable to load the weekly report."}</p>
          <button
            onClick={() => fetchReport()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 print:bg-white print:min-h-0">
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          header { position: static !important; border: none !important; }
          footer { display: none !important; }
          .print\\:hidden { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 print:static print:border-none">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {data.organizationLogo ? (
                <img
                  src={data.organizationLogo}
                  alt={`${data.organizationName} logo`}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="h-10 w-10 bg-gradient-to-br from-slate-800 to-slate-600 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="font-semibold text-slate-900">{data.organizationName}</h1>
                <p className="text-sm text-slate-500">Weekly EOD Report</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {data && data.userReports.length > 0 && (
                <ExportDropdown
                  markdownText={generateWeeklyMarkdown(
                    data.organizationName,
                    data.weekRange,
                    data.userReports
                  )}
                />
              )}
              <button
                onClick={() => fetchReport(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 print:hidden"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6">
        {/* Week Banner */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-200 mb-3">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">{data.weekRange}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{data.displayWeek}</h2>
          <p className="text-sm text-slate-500">
            Last updated: {format(parseISO(data.lastUpdated), "h:mm a")}
          </p>
        </div>

        {/* Weekly Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-medium">Total Reports</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{data.weeklyStats.totalReports}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">Tasks Completed</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{data.weeklyStats.totalTasks}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Avg Tasks/Day</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{data.weeklyStats.averageTasksPerDay}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">Escalations</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{data.weeklyStats.totalEscalations}</p>
          </div>
        </div>

        {/* Daily Submission Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
            <BarChart3 className="h-4 w-4 text-slate-400" />
            Daily Submissions
          </h3>
          <div className="flex items-end gap-2 h-32">
            {data.weeklyStats.submissionsByDay.map((day) => {
              const percentage = day.total > 0 ? (day.count / day.total) * 100 : 0
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-slate-600">{day.count}/{day.total}</span>
                  <div className="w-full bg-slate-100 rounded-t-lg overflow-hidden" style={{ height: "80px" }}>
                    <div
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500"
                      style={{ height: `${percentage}%`, marginTop: `${100 - percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{day.displayDate.split(",")[0]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Weekly Scorecard - Deliverables */}
        {data.scorecard && data.scorecard.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-white">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Target className="h-5 w-5 text-purple-600" />
                Weekly Scorecard
              </h3>
              <p className="text-sm text-slate-500 mt-1">Team deliverables and metrics for this week</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Team Member</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Metric</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Goal</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Actual</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.scorecard.map((entry) => (
                    <tr key={entry.memberId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{entry.memberName}</p>
                          <p className="text-xs text-slate-500">{entry.department}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                          <Target className="h-3.5 w-3.5" />
                          {entry.metricName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-semibold text-slate-700">{entry.weeklyGoal}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {entry.actualValue !== null ? (
                          <span className={`inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-full text-sm font-bold ${
                            entry.isOnTrack
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {entry.actualValue}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {entry.actualValue !== null ? (
                          entry.isOnTrack ? (
                            <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                              <CheckCircle2 className="h-4 w-4" />
                              On Track
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 text-sm font-medium">
                              <AlertTriangle className="h-4 w-4" />
                              Below Goal
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 text-sm italic">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Summary Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  <span className="font-medium text-slate-900">{data.scorecard.filter(e => e.actualValue !== null).length}</span> of{" "}
                  <span className="font-medium text-slate-900">{data.scorecard.length}</span> metrics reported
                </span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {data.scorecard.filter(e => e.isOnTrack).length} on track
                  </span>
                  <span className="flex items-center gap-1.5 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    {data.scorecard.filter(e => e.actualValue !== null && !e.isOnTrack).length} below goal
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Reports with View Toggle */}
        {data.userReports.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Users className="h-5 w-5 text-slate-400" />
              Team Reports ({data.userReports.length} members)
            </h3>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("bento")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "bento"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Overview
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="h-4 w-4" />
                Details
              </button>
            </div>
          </div>
        )}

        {data.userReports.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">No Reports This Week</h2>
            <p className="text-slate-500">Reports will appear here as team members submit them.</p>
          </div>
        ) : viewMode === "bento" ? (
          // Bento Grid View - Executive Overview
          <UserBentoGrid>
            {data.userReports.map((report, idx) => {
              const bentoData: UserBentoData = {
                userName: report.userName,
                userRole: report.userRole,
                department: report.department,
                jobTitle: report.jobTitle,
                totalTasks: report.totalTasks,
                totalReports: report.totalReports,
                escalationCount: report.escalations.length,
                rocks: report.rocks || [],
                tasks: report.tasks.map(t => ({
                  description: t.description,
                  rockTitle: t.rockTitle,
                  date: t.date,
                  completedAt: t.completedAt,
                })),
                periodType: "weekly",
              }
              return <UserBentoCard key={idx} data={bentoData} />
            })}
          </UserBentoGrid>
        ) : (
          // List View - Detailed Reports
          <div className="space-y-4">
            {data.userReports.map((report, idx) => (
              <UserWeeklyCard key={idx} report={report} />
            ))}
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 text-center text-sm text-slate-400">
          <p>Timezone: {data.timezone}</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
          <p className="text-center text-sm text-slate-400">
            Powered by Taskspace
          </p>
        </div>
      </footer>
    </div>
  )
}
