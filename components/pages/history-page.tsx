"use client"

import { useState, useEffect } from "react"
import { ExportButton } from "@/components/shared/export-button"
import type { TeamMember, EODReport, Rock } from "@/lib/types"
import { CONFIG } from "@/lib/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserInitials } from "@/components/shared/user-initials"
import { formatDate } from "@/lib/utils/date-utils"
import { Search, AlertCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Pencil, Trash2, Loader2, FileText, Calendar, Copy, Check, Smile, Meh, Frown, Sparkles } from "lucide-react"
import { subDays, startOfDay, parseISO } from "date-fns"
import { EmptyState } from "@/components/shared/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EditEODModal } from "@/components/dashboard/edit-eod-modal"
import { NoWorkspaceAlert } from "@/components/shared/no-workspace-alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

// Grace period for editing reports — sourced from config
const EDIT_GRACE_PERIOD_MS = CONFIG.ui.eodEditGracePeriodHours * 60 * 60 * 1000
const REPORTS_PER_PAGE = CONFIG.ui.reportsPerPage

interface HistoryPageProps {
  currentUser: TeamMember
  teamMembers: TeamMember[]
  eodReports: EODReport[]
  rocks: Rock[]
  updateEODReport?: (id: string, updates: Partial<EODReport>) => Promise<EODReport>
  deleteEODReport?: (id: string) => Promise<void>
  initialUserFilter?: string // Pre-set user filter (e.g., from manager drill-down)
  onFilterConsumed?: () => void  // Callback to clear the filter after consuming it
}

export function HistoryPage({ currentUser, teamMembers, eodReports, rocks, updateEODReport, deleteEODReport, initialUserFilter, onFilterConsumed }: HistoryPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [userFilter, setUserFilter] = useState<string>(initialUserFilter || "all")
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "30days">("all")
  const [moodFilter, setMoodFilter] = useState<"all" | "positive" | "neutral" | "negative">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [isPageLoading, setIsPageLoading] = useState(false)

  // Apply initial filter from navigation (e.g., manager dashboard drill-down)
  useEffect(() => {
    if (initialUserFilter) {
      setUserFilter(initialUserFilter)
      onFilterConsumed?.()
    }
  }, [initialUserFilter, onFilterConsumed])

  const handlePageChange = (newPage: number) => {
    setIsPageLoading(true)
    setCurrentPage(newPage)
    // Reset loading after a brief delay for smooth UX
    requestAnimationFrame(() => setIsPageLoading(false))
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, userFilter, dateFilter, moodFilter])
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set())
  const [editingReport, setEditingReport] = useState<EODReport | null>(null)
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)
  const [reportToDelete, setReportToDelete] = useState<string | null>(null)
  const [copiedReportId, setCopiedReportId] = useState<string | null>(null)
  const [summaries, setSummaries] = useState<Record<string, string>>({})
  const [summarizingId, setSummarizingId] = useState<string | null>(null)

  const fetchSummary = async (reportId: string) => {
    if (summaries[reportId] || summarizingId) return
    setSummarizingId(reportId)
    try {
      const res = await fetch("/api/ai/eod-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      })
      const json = await res.json()
      if (json.success && json.data?.summary) {
        setSummaries(prev => ({ ...prev, [reportId]: json.data.summary }))
      }
    } finally {
      setSummarizingId(null)
    }
  }

  const handleDeleteReport = (reportId: string) => {
    if (!deleteEODReport) return
    setReportToDelete(reportId)
  }

  const confirmDeleteReport = async () => {
    if (!reportToDelete || !deleteEODReport) return
    const reportId = reportToDelete
    setReportToDelete(null)

    setDeletingReportId(reportId)
    try {
      await deleteEODReport(reportId)
    } finally {
      setDeletingReportId(null)
    }
  }

  const canEditReport = (report: EODReport) => {
    // Only the owner can edit their own report
    if (report.userId !== currentUser.userId) return false
    // Check if within grace period
    const submittedAt = new Date(report.submittedAt).getTime()
    const now = Date.now()
    return now - submittedAt < EDIT_GRACE_PERIOD_MS
  }

  const toggleExpanded = (reportId: string) => {
    const newExpanded = new Set(expandedReports)
    if (newExpanded.has(reportId)) {
      newExpanded.delete(reportId)
    } else {
      newExpanded.add(reportId)
    }
    setExpandedReports(newExpanded)
  }

  const isAdminOrOwner = currentUser.role === "admin" || currentUser.role === "owner"
  const hasManagerFilter = !!initialUserFilter

  const dateFilterCutoff = (() => {
    const now = new Date()
    if (dateFilter === "today") return startOfDay(now)
    if (dateFilter === "week") return subDays(now, 7)
    if (dateFilter === "30days") return subDays(now, 30)
    return null
  })()

  const filteredReports = eodReports
    .filter((report) => {
      if (!isAdminOrOwner && !hasManagerFilter && userFilter === "all") {
        return report.userId === currentUser.userId
      }
      if (userFilter !== "all") {
        return report.userId === userFilter
      }
      return true
    })
    .filter((report) => {
      if (!dateFilterCutoff) return true
      return parseISO(report.date) >= dateFilterCutoff
    })
    .filter((report) => {
      if (moodFilter === "all") return true
      return report.mood === moodFilter
    })
    .filter((report) => {
      if (!searchQuery) return true
      const user = teamMembers.find((m) => m.userId === report.userId)
      const searchLower = searchQuery.toLowerCase()
      return (
        (user?.name?.toLowerCase().includes(searchLower) ?? false) ||
        report.tasks?.some((t) => t.text?.toLowerCase().includes(searchLower)) ||
        report.challenges?.toLowerCase().includes(searchLower) ||
        report.tomorrowPriorities?.some((p) => p.text?.toLowerCase().includes(searchLower))
      )
    })
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

  const totalPages = Math.ceil(filteredReports.length / REPORTS_PER_PAGE)
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * REPORTS_PER_PAGE,
    currentPage * REPORTS_PER_PAGE
  )
  const showingFrom = filteredReports.length === 0 ? 0 : (currentPage - 1) * REPORTS_PER_PAGE + 1
  const showingTo = Math.min(currentPage * REPORTS_PER_PAGE, filteredReports.length)

  const getRockForId = (rockId: string | null) => {
    if (!rockId) return null
    return rocks.find((r) => r.id === rockId)
  }

  return (
    <div className="space-y-6">
      <NoWorkspaceAlert />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">EOD History</h1>
          <p className="text-slate-500 mt-1">View past end-of-day reports</p>
        </div>
        <ExportButton type="eod-reports" />
      </div>

      <div className="bg-white rounded-xl shadow-card p-5">
        <div className="flex flex-col gap-3">
          {/* Date quick-filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            {(["all", "today", "week", "30days"] as const).map((filter) => (
              <Button
                key={filter}
                variant={dateFilter === filter ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setDateFilter(filter)}
              >
                {filter === "all" ? "All Time" : filter === "today" ? "Today" : filter === "week" ? "Last 7 Days" : "Last 30 Days"}
              </Button>
            ))}
          </div>

          {/* Mood quick-filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">Mood:</span>
            {([
              { value: "all", label: "All", icon: null },
              { value: "positive", label: "Positive", icon: Smile },
              { value: "neutral", label: "Neutral", icon: Meh },
              { value: "negative", label: "Negative", icon: Frown },
            ] as const).map((opt) => (
              <Button
                key={opt.value}
                variant={moodFilter === opt.value ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setMoodFilter(opt.value)}
              >
                {opt.icon && <opt.icon className="h-3.5 w-3.5" />}
                {opt.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>
          {(isAdminOrOwner || hasManagerFilter) && (
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-slate-50 border-slate-200">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Team Members</SelectItem>
                {teamMembers.filter(m => m.userId).map((member) => (
                  <SelectItem key={member.userId} value={member.userId!}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          </div>
        </div>
      </div>

      {/* Summary strip */}
      {filteredReports.length > 0 && (() => {
        const escalationCount = filteredReports.filter((r) => r.needsEscalation).length
        const uniqueSubmitters = new Set(filteredReports.map((r) => r.userId)).size
        const moodReports = filteredReports.filter((r) => r.mood)
        const positiveMood = moodReports.filter((r) => r.mood === "positive").length
        const moodPct = moodReports.length > 0 ? Math.round((positiveMood / moodReports.length) * 100) : null
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Reports", value: filteredReports.length, sub: `page ${currentPage} of ${totalPages}` },
              { label: "Submitters", value: uniqueSubmitters, sub: "unique team members" },
              { label: "Escalations", value: escalationCount, sub: escalationCount > 0 ? "need attention" : "all clear", accent: escalationCount > 0 },
              { label: "Positive Mood", value: moodPct !== null ? `${moodPct}%` : "—", sub: moodReports.length > 0 ? `${moodReports.length} with mood` : "no mood data" },
            ].map((s) => (
              <div key={s.label} className={`bg-white rounded-lg border p-3 ${s.accent ? "border-red-200 bg-red-50/30" : "border-slate-100"}`}>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-xl font-bold ${s.accent ? "text-red-600" : "text-slate-900"}`}>{s.value}</p>
                <p className="text-xs text-slate-400">{s.sub}</p>
              </div>
            ))}
          </div>
        )
      })()}

      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card">
            {eodReports.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No EOD reports yet"
                description="End-of-day reports help you reflect on your progress and plan for tomorrow. Head to the Dashboard to submit your first EOD report!"
                size="lg"
              />
            ) : (
              <EmptyState
                icon={Search}
                title="No reports match your search"
                description="Try adjusting your search query or filters to find the reports you're looking for."
                size="md"
              />
            )}
          </div>
        ) : (
          paginatedReports.map((report) => {
            const user = teamMembers.find((m) => m.userId === report.userId)
            const isExpanded = expandedReports.has(report.id)

            // Group tasks by rock
            const tasksByRock = (report.tasks || []).reduce(
              (acc, task) => {
                const key = task.rockId || "general"
                if (!acc[key]) acc[key] = []
                acc[key].push(task)
                return acc
              },
              {} as Record<string, typeof report.tasks>,
            )

            const prioritiesByRock = (report.tomorrowPriorities || []).reduce(
              (acc, priority) => {
                const key = priority.rockId || "general"
                if (!acc[key]) acc[key] = []
                acc[key].push(priority)
                return acc
              },
              {} as Record<string, typeof report.tomorrowPriorities>,
            )

            return (
              <div key={report.id} className="bg-white rounded-xl shadow-card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {user && <UserInitials name={user.name} />}
                      <div>
                        <h3 className="font-semibold text-slate-900">EOD Report - {formatDate(report.date)}</h3>
                        <p className="text-sm text-slate-500 flex items-center gap-1.5">
                          Submitted by {user?.name} at {new Date(report.submittedAt).toLocaleTimeString()}
                          {report.mood && (
                            <span title={`Mood: ${report.mood}`} className="inline-flex items-center">
                              {report.mood === "positive" ? <Smile className="h-3.5 w-3.5 text-emerald-500" /> : report.mood === "neutral" ? <Meh className="h-3.5 w-3.5 text-amber-500" /> : <Frown className="h-3.5 w-3.5 text-red-500" />}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.needsEscalation && (
                        <span className="status-pill bg-red-50 text-red-700 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Escalation
                        </span>
                      )}
                      {isAdminOrOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 ${summaries[report.id] ? "text-primary" : "text-slate-400 hover:text-primary"}`}
                          title="AI summary"
                          onClick={() => fetchSummary(report.id)}
                          disabled={summarizingId === report.id}
                        >
                          {summarizingId === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-slate-600"
                        title="Copy link to report"
                        onClick={() => {
                          const url = `${window.location.origin}/app?page=history&reportId=${report.id}`
                          navigator.clipboard.writeText(url).then(() => {
                            setCopiedReportId(report.id)
                            setTimeout(() => setCopiedReportId(null), 2000)
                          })
                        }}
                      >
                        {copiedReportId === report.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      {canEditReport(report) && updateEODReport && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => setEditingReport(report)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdminOrOwner && deleteEODReport && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteReport(report.id)}
                          disabled={deletingReportId === report.id}
                        >
                          {deletingReportId === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600" onClick={() => toggleExpanded(report.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                {summaries[report.id] && (
                  <div className="px-5 py-3 bg-primary/5 border-b border-primary/10 flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-700">{summaries[report.id]}</p>
                  </div>
                )}
                {isExpanded && (
                  <div className="p-5 space-y-6">
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Rock Progress Update</h4>

                      {/* Tasks grouped by rock */}
                      {Object.entries(tasksByRock).map(([rockId, tasks]) => {
                        if (rockId === "general") return null
                        const rock = getRockForId(rockId)
                        if (!rock) return null

                        const rockPriorities = prioritiesByRock[rockId] || []

                        return (
                          <div key={rockId} className="mb-4 pb-4 border-b border-slate-100 last:border-b-0">
                            <div className="mb-3">
                              <h5 className="font-semibold text-slate-900">{rock.title}</h5>
                              <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                <span className="status-pill bg-slate-100 text-slate-600">{rock.status.replace("-", " ")}</span>
                                <span>Progress: {rock.progress}%</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-sm font-medium text-slate-700">Today's Key Activities:</p>
                              <ul className="list-disc list-inside space-y-1 ml-2">
                                {tasks.map((task) => (
                                  <li key={task.id} className="text-sm text-slate-600">
                                    {task.text}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {rockPriorities.length > 0 && (
                              <div className="space-y-2 mt-3">
                                <p className="text-sm font-medium text-slate-700">Tomorrow's Priorities:</p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                  {rockPriorities.map((priority) => (
                                    <li key={priority.id} className="text-sm text-slate-600">
                                      {priority.text}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* General activities */}
                      {tasksByRock.general && (
                        <div className="mb-4 pb-4 border-b border-slate-100">
                          <h5 className="font-semibold text-slate-700 mb-2">General Activities:</h5>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            {tasksByRock.general.map((task) => (
                              <li key={task.id} className="text-sm text-slate-600">
                                {task.text}
                              </li>
                            ))}
                          </ul>
                          {prioritiesByRock.general && prioritiesByRock.general.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-sm font-medium text-slate-700">Tomorrow's Priorities:</p>
                              <ul className="list-disc list-inside space-y-1 ml-2">
                                {prioritiesByRock.general.map((priority) => (
                                  <li key={priority.id} className="text-sm text-slate-600">
                                    {priority.text}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Challenges */}
                    <div>
                      <h4 className="font-semibold text-slate-700 mb-2">Challenges:</h4>
                      <p className="text-sm text-slate-600">{report.challenges}</p>
                    </div>

                    {/* Escalation */}
                    {report.needsEscalation && report.escalationNote && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          ESCALATION NEEDED
                        </h4>
                        <p className="text-sm text-red-600">{report.escalationNote}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-card px-5 py-3">
          <p className="text-sm text-slate-500">
            Showing {showingFrom}–{showingTo} of {filteredReports.length} reports
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || isPageLoading}
              className="border-slate-200"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-slate-600 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || isPageLoading}
              className="border-slate-200"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit EOD Modal */}
      {editingReport && updateEODReport && (
        <EditEODModal
          open={!!editingReport}
          onOpenChange={(open) => !open && setEditingReport(null)}
          report={editingReport}
          rocks={rocks}
          onSave={updateEODReport}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!reportToDelete} onOpenChange={(open) => !open && setReportToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete EOD Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this report. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteReport}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
