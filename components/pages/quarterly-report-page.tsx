"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { useToast } from "@/components/ui/use-toast"
import {
  BarChart2,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Users,
  Target,
  Trash2,
  ExternalLink,
  Globe,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Plus,
  Calendar,
} from "lucide-react"
import type { QuarterlyReport, QuarterlyMemberReport } from "@/lib/types"

// =============================================
// Helpers
// =============================================

function getCurrentQuarter(): { label: string; start: string; end: string } {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3)
  const year = now.getFullYear()
  const labels = ["Q1", "Q2", "Q3", "Q4"]
  const starts = [
    `${year}-01-01`, `${year}-04-01`, `${year}-07-01`, `${year}-10-01`,
  ]
  const ends = [
    `${year}-03-31`, `${year}-06-30`, `${year}-09-30`, `${year}-12-31`,
  ]
  return { label: `${labels[q]}-${year}`, start: starts[q], end: ends[q] }
}

function getQuarterOptions(): { label: string; start: string; end: string }[] {
  const now = new Date()
  const options = []
  for (let offset = 0; offset < 6; offset++) {
    const d = new Date(now)
    d.setMonth(now.getMonth() - offset * 3)
    const q = Math.floor(d.getMonth() / 3)
    const year = d.getFullYear()
    const labels = ["Q1", "Q2", "Q3", "Q4"]
    const starts = [
      `${year}-01-01`, `${year}-04-01`, `${year}-07-01`, `${year}-10-01`,
    ]
    const ends = [
      `${year}-03-31`, `${year}-06-30`, `${year}-09-30`, `${year}-12-31`,
    ]
    options.push({ label: `${labels[q]}-${year}`, start: starts[q], end: ends[q] })
  }
  return options
}

function formatDate(s: string) {
  if (!s) return ""
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function statusBadge(status: QuarterlyReport["status"]) {
  if (status === "published") return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Published</Badge>
  if (status === "generating") return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Generating...</Badge>
  return <Badge variant="outline" className="text-xs">Draft</Badge>
}

// =============================================
// Member detail row
// =============================================

function MemberRow({ member }: { member: QuarterlyMemberReport }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold text-sm shrink-0">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
            <p className="text-xs text-muted-foreground truncate">{member.jobTitle || member.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            <span><span className="font-semibold text-foreground">{member.stats.eodReportsSubmitted}</span> EODs</span>
            <span><span className="font-semibold text-foreground">{member.stats.totalTasksCompleted}</span> tasks</span>
            <span><span className="font-semibold text-foreground">{member.stats.rocksCompleted}/{member.stats.rocksAssigned}</span> rocks</span>
            <span><span className="font-semibold text-foreground">{member.stats.submissionRate}%</span> rate</span>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-4 border-t border-border">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
            {[
              { label: "EOD Reports", value: member.stats.eodReportsSubmitted },
              { label: "Submission Rate", value: `${member.stats.submissionRate}%` },
              { label: "Tasks Completed", value: member.stats.totalTasksCompleted },
              { label: "Rock Completion", value: `${member.stats.rockCompletionRate}%` },
            ].map((stat, i) => (
              <div key={i} className="bg-muted/40 rounded-lg p-2.5 text-center">
                <p className="text-base font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Rocks */}
          {member.rocks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <Target className="h-3.5 w-3.5" />
                Rocks
              </p>
              <div className="space-y-1.5">
                {member.rocks.map((rock, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-foreground">{rock.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${rock.progress}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-7 text-right">{rock.progress}%</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] py-0 ${
                          rock.status === "completed" ? "border-green-300 text-green-700 bg-green-50" :
                          rock.status === "on-track" ? "border-blue-300 text-blue-700 bg-blue-50" :
                          rock.status === "at-risk" ? "border-amber-300 text-amber-700 bg-amber-50" :
                          rock.status === "blocked" ? "border-red-300 text-red-700 bg-red-50" :
                          ""
                        }`}
                      >
                        {rock.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Summary */}
          {member.aiSummary && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-2 bg-muted/30 flex items-center gap-2 border-b border-border">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI Performance Summary</span>
              </div>
              <div className="p-3 space-y-3">
                {member.aiSummary.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 mb-1.5">Strengths</p>
                    <ul className="space-y-1">
                      {member.aiSummary.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {member.aiSummary.growthAreas.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-700 mb-1.5">Growth Areas</p>
                    <ul className="space-y-1">
                      {member.aiSummary.growthAreas.map((g, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                          <TrendingUp className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {member.aiSummary.overallAssessment && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Overall Assessment</p>
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{member.aiSummary.overallAssessment}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================
// Report card (in list)
// =============================================

function ReportCard({
  report,
  onDelete,
  onGenerate,
  onPublish,
  isGenerating,
}: {
  report: QuarterlyReport
  onDelete: () => void
  onGenerate: () => void
  onPublish: () => void
  isGenerating: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const stats = report.data?.teamStats

  const publicUrl = report.publicToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/public/quarterly/${report.publicToken}`
    : null

  const copyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl)
    }
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <CardTitle className="text-base font-semibold">{report.title}</CardTitle>
              {statusBadge(report.status)}
            </div>
            <CardDescription className="text-xs">
              {formatDate(report.periodStart)} — {formatDate(report.periodEnd)}
              {report.createdAt && ` · Created ${formatDate(report.createdAt)}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {report.status === "draft" && report.data?.members?.length > 0 && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1" onClick={() => setExpanded(v => !v)}>
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {expanded ? "Hide" : "View"}
              </Button>
            )}
            {report.status === "draft" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={onGenerate}
                disabled={isGenerating}
                title="Regenerate report"
              >
                <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
              </Button>
            )}
            {report.status === "draft" && report.data?.members?.length > 0 && !report.publicToken && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={onPublish}
                title="Publish & get share link"
              >
                <Globe className="h-4 w-4" />
              </Button>
            )}
            {publicUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={copyLink}
                title="Copy public link"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              title="Delete report"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Team summary stats */}
      {stats && (
        <CardContent className="pt-0 pb-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="font-semibold text-foreground">{stats.totalMembers}</span> members
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <BarChart2 className="h-3.5 w-3.5" />
              <span className="font-semibold text-foreground">{stats.avgSubmissionRate}%</span> EOD rate
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              <span className="font-semibold text-foreground">{stats.completedRocks}/{stats.totalRocks}</span> rocks ({stats.rockCompletionRate}%)
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="font-semibold text-foreground">{stats.totalTasksCompleted}</span> tasks done
            </span>
          </div>

          {publicUrl && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg text-xs text-green-700">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate">{publicUrl}</span>
              <button className="font-medium hover:underline shrink-0" onClick={copyLink}>Copy</button>
            </div>
          )}
        </CardContent>
      )}

      {/* Expanded member rows */}
      {expanded && report.data?.members?.length > 0 && (
        <>
          <Separator />
          <CardContent className="pt-4 pb-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Individual Performance
            </p>
            {report.data.members.map((member, i) => (
              <MemberRow key={i} member={member} />
            ))}
          </CardContent>
        </>
      )}
    </Card>
  )
}

// =============================================
// Main page
// =============================================

export function QuarterlyReportPage() {
  const { currentWorkspace } = useWorkspaces()
  const { toast } = useToast()

  const [reports, setReports] = useState<QuarterlyReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Create form state
  const quarters = getQuarterOptions()
  const [selectedQuarterLabel, setSelectedQuarterLabel] = useState(quarters[0].label)

  const workspaceId = currentWorkspace?.id

  const fetchReports = useCallback(async () => {
    if (!workspaceId) return
    try {
      const res = await fetch(`/api/quarterly-reports?workspaceId=${workspaceId}`)
      const data = await res.json()
      if (data.success) setReports(data.data || [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { fetchReports() }, [fetchReports])

  const handleCreate = async () => {
    if (!workspaceId) return
    const q = quarters.find(o => o.label === selectedQuarterLabel) || quarters[0]
    setIsCreating(true)
    try {
      const res = await fetch("/api/quarterly-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          workspaceId,
          quarter: q.label,
          periodStart: q.start,
          periodEnd: q.end,
        }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        setReports(prev => [data.data, ...prev])
        setShowCreateForm(false)
        // Auto-generate immediately
        handleGenerate(data.data.id)
      } else {
        toast({ title: "Error", description: data.error || "Failed to create report", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error — please try again", variant: "destructive" })
    } finally {
      setIsCreating(false)
    }
  }

  const handleGenerate = async (reportId: string) => {
    setGeneratingId(reportId)
    // Optimistically mark as generating
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: "generating" as const } : r))
    try {
      const res = await fetch(`/api/quarterly-reports/${reportId}/generate`, {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      const data = await res.json()
      if (data.success && data.data) {
        setReports(prev => prev.map(r => r.id === reportId ? data.data : r))
        toast({ title: "Report ready", description: "Quarterly report has been generated." })
      } else {
        toast({ title: "Error", description: data.error || "Failed to generate report", variant: "destructive" })
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: "draft" as const } : r))
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" })
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: "draft" as const } : r))
    } finally {
      setGeneratingId(null)
    }
  }

  const handlePublish = async (reportId: string) => {
    try {
      const res = await fetch(`/api/quarterly-reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ publish: true }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        setReports(prev => prev.map(r => r.id === reportId ? data.data : r))
        toast({ title: "Published", description: "Share link is now active." })
      } else {
        toast({ title: "Error", description: data.error || "Failed to publish", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" })
    }
  }

  const handleDelete = async (reportId: string) => {
    try {
      const res = await fetch(`/api/quarterly-reports/${reportId}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      if (res.ok) {
        setReports(prev => prev.filter(r => r.id !== reportId))
        toast({ title: "Deleted", description: "Report removed." })
      } else {
        toast({ title: "Error", description: "Failed to delete report", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" })
    }
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6 p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <BarChart2 className="h-5 w-5 text-indigo-600" />
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Quarterly Reports</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-12">
              Deep-dive analytics with AI summaries for every team member — one per quarter.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreateForm(v => !v)}
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Report
          </Button>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <Card className="border-border border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Create Quarterly Report
              </CardTitle>
              <CardDescription className="text-xs">
                Generates AI summaries for every active team member with full stats for the selected quarter.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Quarter</Label>
                  <Select value={selectedQuarterLabel} onValueChange={setSelectedQuarterLabel}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {quarters.map(q => (
                        <SelectItem key={q.label} value={q.label}>
                          {q.label} ({q.start} – {q.end})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Period</Label>
                  <Input
                    className="h-9 text-sm bg-muted/40"
                    value={`${quarters.find(q => q.label === selectedQuarterLabel)?.start || ""} – ${quarters.find(q => q.label === selectedQuarterLabel)?.end || ""}`}
                    readOnly
                    disabled
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">
                  Uses 1 AI credit per team member. Generation takes 30–60 seconds.
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleCreate} disabled={isCreating || !workspaceId}>
                    {isCreating ? (
                      <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Creating...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-1.5" />Generate Report</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reports list */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <Card className="border-dashed border-border">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground mb-1">No quarterly reports yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Create a report to get AI-powered performance summaries for every team member with full quarter analytics.
                </p>
              </CardContent>
            </Card>
          ) : (
            reports.map(report => (
              <ReportCard
                key={report.id}
                report={report}
                onDelete={() => handleDelete(report.id)}
                onGenerate={() => handleGenerate(report.id)}
                onPublish={() => handlePublish(report.id)}
                isGenerating={generatingId === report.id}
              />
            ))
          )}
        </div>

        {/* Info card */}
        <Card className="border-border bg-muted/20">
          <CardContent className="py-4 px-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">What&apos;s included</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Each quarterly report aggregates EOD submissions, tasks completed, rocks assigned and completed, escalation counts, and submission rates for every active team member. The AI generates per-person summaries with strengths, growth areas, and an overall assessment — ideal for quarterly reviews. Published reports get a shareable link for managers or leadership.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}
