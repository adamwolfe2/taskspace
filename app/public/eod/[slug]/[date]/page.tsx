"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { format, parseISO } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  RefreshCw,
  Target,
  ArrowRight,
  Loader2,
  Calendar,
  Building2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface PublicEODTask {
  description: string
  rockTitle?: string
  completedAt?: string
}

interface PublicEODPriority {
  description: string
  rockTitle?: string
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
}

interface PublicDailyReport {
  organizationName: string
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
        return <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">Owner</span>
      case "admin":
        return <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Admin</span>
      default:
        return null
    }
  }

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
              {report.userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">{report.userName}</h3>
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
          {/* Completed Tasks */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Today's Completed Tasks ({report.tasks.length})
            </h4>
            <ul className="space-y-2">
              {report.tasks.map((task, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-0.5">•</span>
                  <div>
                    <span className="text-slate-700">{task.description}</span>
                    {task.rockTitle && (
                      <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-xs">
                        <Target className="h-3 w-3" />
                        {task.rockTitle}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
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

          {/* Tomorrow's Priorities */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <ArrowRight className="h-4 w-4 text-blue-500" />
              Tomorrow's Priorities ({report.tomorrowPriorities.length})
            </h4>
            <ul className="space-y-2">
              {report.tomorrowPriorities.map((priority, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500 mt-0.5">{idx + 1}.</span>
                  <div>
                    <span className="text-slate-700">{priority.description}</span>
                    {priority.rockTitle && (
                      <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-xs">
                        <Target className="h-3 w-3" />
                        {priority.rockTitle}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

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
  const slug = params.slug as string
  const date = params.date as string

  const [data, setData] = useState<PublicDailyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchReport = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true)

    try {
      const response = await fetch(`/api/public/eod/${slug}/${date}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to load report")
      }

      setData(result.data)
      setError(null)
      setLastRefresh(new Date())
    } catch (err) {
      console.error("Failed to fetch report:", err)
      setError(err instanceof Error ? err.message : "Failed to load report")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [slug, date])

  // Initial load
  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchReport()
    }, 30000)

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-slate-800 to-slate-600 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-slate-900">{data.organizationName}</h1>
                <p className="text-sm text-slate-500">End of Day Report</p>
              </div>
            </div>
            <button
              onClick={() => fetchReport(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
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
        {data.submissionStats.percentage < 100 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  Waiting for {data.submissionStats.total - data.submissionStats.submitted} more report{data.submissionStats.total - data.submissionStats.submitted > 1 ? "s" : ""}
                </p>
                <div className="mt-2 h-2 bg-amber-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${data.submissionStats.percentage}%` }}
                  />
                </div>
              </div>
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
        ) : (
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
            Powered by AIMS EOD Dashboard
          </p>
        </div>
      </footer>
    </div>
  )
}
