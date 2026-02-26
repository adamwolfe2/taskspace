"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { format, parseISO } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
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
  LayoutGrid,
  List,
} from "lucide-react"
import { UserBentoCard, UserBentoGrid, type UserBentoData } from "@/components/public/user-bento-card"
import { ExportDropdown } from "@/components/public/export-dropdown"
import { generateDailyMarkdown } from "@/lib/utils/report-export"
import { CONFIG } from "@/lib/config"
import * as Sentry from "@sentry/nextjs"

interface PublicEODTask {
  description: string
  rockTitle?: string
  completedAt?: string
}

interface PublicEODPriority {
  description: string
  rockTitle?: string
}

// Rock progress for bento cards
interface PublicRockProgress {
  id: string
  progress: number
  status: "on-track" | "at-risk" | "blocked" | "completed"
}

interface PublicEODReport {
  userName: string
  userRole: "owner" | "admin" | "member"
  department: string
  jobTitle?: string
  date: string
  submittedAt: string
  tasks: PublicEODTask[]
  challenges: string
  tomorrowPriorities: PublicEODPriority[]
  needsEscalation: boolean
  escalationNote: string | null
  rocks: PublicRockProgress[]
}

interface PublicDailyReport {
  organizationName: string
  organizationLogo?: string
  accentColor?: string | null
  date: string
  displayDate: string
  timezone: string
  lastUpdated: string
  reports: PublicEODReport[]
  submissionStats: {
    submitted: number
    total: number
    percentage: number
  }
}

function ReportCard({ report, timezone }: { report: PublicEODReport; timezone: string }) {
  const [isExpanded, setIsExpanded] = useState(true)

  const submittedTime = formatInTimeZone(
    parseISO(report.submittedAt),
    timezone,
    "h:mm a"
  )

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">Owner</span>
      case "admin":
        return <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">Admin</span>
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
  }, {} as Record<string, PublicEODTask[]>)

  // Group priorities by rock
  const prioritiesByRock = report.tomorrowPriorities.reduce((acc, priority) => {
    const key = priority.rockTitle || "general"
    if (!acc[key]) acc[key] = []
    acc[key].push(priority)
    return acc
  }, {} as Record<string, PublicEODPriority[]>)

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
                {report.jobTitle || report.department} &bull; Submitted at {submittedTime}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {report.needsEscalation && (
              <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                Escalation
              </span>
            )}
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
          {/* Rock Progress Update - Tasks grouped by rock */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
              <Target className="h-4 w-4 text-blue-500" />
              Rock Progress Update ({report.tasks.length} tasks)
            </h4>

            {/* Tasks grouped by rock */}
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
                            Today's Key Activities ({tasks.length})
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
                              Tomorrow's Priorities
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
                        Tomorrow's Priorities
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
          </div>

          {/* Challenges */}
          {report.challenges && (
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Challenges / Blockers
              </h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{report.challenges}</p>
            </div>
          )}

          {/* Escalation Note */}
          {report.needsEscalation && report.escalationNote && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-2">
                <AlertTriangle className="h-4 w-4" />
                Escalation Note
              </h4>
              <p className="text-sm text-red-600">{report.escalationNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PublicEODDailyReportPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const date = params.date as string
  const token = searchParams.get("token")

  const [data, setData] = useState<PublicDailyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [_lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<"bento" | "list">("bento")

  const fetchReport = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true)

    try {
      const url = token
        ? `/api/public/eod/${slug}/${date}?token=${token}`
        : `/api/public/eod/${slug}/${date}`
      const response = await fetch(url)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to load report")
      }

      setData(result.data)
      setError(null)
      setLastRefresh(new Date())
    } catch (err) {
      Sentry.captureException(err, { tags: { page: "public-eod-daily", slug, date } })
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

  // Auto-refresh periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchReport()
    }, CONFIG.polling.fast)

    return () => clearInterval(interval)
  }, [fetchReport])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500">Loading daily report...</p>
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
          <p className="text-slate-500 mb-4">{error || "Unable to load the daily report."}</p>
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
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
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
                <p className="text-sm text-slate-500">End of Day Report</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {data && data.reports.length > 0 && (
                <ExportDropdown
                  markdownText={generateDailyMarkdown(
                    data.organizationName,
                    data.displayDate,
                    data.reports
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
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        {/* Date Banner */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-200 mb-3">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">{data.displayDate}</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {data.submissionStats.submitted} of {data.submissionStats.total} submitted ({data.submissionStats.percentage}%)
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Last updated: {format(parseISO(data.lastUpdated), "h:mm a")}
            </span>
          </div>
        </div>

        {/* Submission Progress */}
        {data.submissionStats.percentage < 100 && (() => {
          const accent = data.accentColor || "#64748b"
          return (
            <div
              className="mb-6 p-4 rounded-xl border"
              style={{ backgroundColor: `${accent}12`, borderColor: `${accent}35` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${accent}20` }}
                >
                  <Clock className="h-5 w-5" style={{ color: accent }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    Waiting for {data.submissionStats.total - data.submissionStats.submitted} more report{data.submissionStats.total - data.submissionStats.submitted > 1 ? "s" : ""}
                  </p>
                  <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${accent}25` }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${data.submissionStats.percentage}%`, backgroundColor: accent }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* View Toggle */}
        {data.reports.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Users className="h-5 w-5 text-slate-400" />
              Team Reports ({data.reports.length})
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

        {/* Reports */}
        {data.reports.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">No Reports Yet</h2>
            <p className="text-slate-500">Reports will appear here as team members submit them.</p>
            <p className="text-sm text-slate-400 mt-2">This page auto-refreshes every 30 seconds.</p>
          </div>
        ) : viewMode === "bento" ? (
          // Bento Grid View - Executive Overview
          <UserBentoGrid>
            {data.reports.map((report, idx) => {
              const bentoData: UserBentoData = {
                userName: report.userName,
                userRole: report.userRole,
                department: report.department,
                jobTitle: report.jobTitle,
                totalTasks: report.tasks.length,
                reportsSubmitted: 1,
                escalationCount: report.needsEscalation ? 1 : 0,
                rocks: report.rocks || [],
                tasks: report.tasks.map(t => ({
                  description: t.description,
                  rockTitle: t.rockTitle,
                  completedAt: t.completedAt,
                })),
                periodType: "daily",
              }
              return <UserBentoCard key={idx} data={bentoData} accentColor={data.accentColor ?? undefined} />
            })}
          </UserBentoGrid>
        ) : (
          // List View - Detailed Reports
          <div className="space-y-4">
            {data.reports.map((report, idx) => (
              <ReportCard key={idx} report={report} timezone={data.timezone} />
            ))}
          </div>
        )}

        {/* Auto-refresh indicator */}
        <div className="mt-8 text-center text-sm text-slate-400">
          <p>This page auto-refreshes every 30 seconds</p>
          <p className="mt-1">Timezone: {data.timezone}</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
          <p className="text-center text-sm text-slate-400">
            Powered by Taskspace
          </p>
        </div>
      </footer>
    </div>
  )
}
