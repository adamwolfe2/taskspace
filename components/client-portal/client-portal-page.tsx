"use client"

import { useState, useEffect, useCallback } from "react"
import { format, parseISO, subDays, addDays } from "date-fns"
import {
  CheckCircle2,
  AlertTriangle,
  Target,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PlusCircle,
  Users,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TaskRequestModal } from "./task-request-modal"
import { CommentSection } from "./comment-section"

interface PortalEODReport {
  id: string
  userName: string
  userRole: "owner" | "admin" | "member"
  department: string
  jobTitle?: string
  date: string
  submittedAt: string
  tasks: { description: string; rockTitle?: string; completedAt?: string }[]
  challenges: string
  tomorrowPriorities: { description: string; rockTitle?: string }[]
  needsEscalation: boolean
  escalationNote: string | null
  rocks: { progress: number; status: "on-track" | "at-risk" | "blocked" | "completed" }[]
}

interface PortalEODResponse {
  date: string
  displayDate: string
  reports: PortalEODReport[]
  submissionStats: { submitted: number; total: number; percentage: number }
}

interface ClientPortalPageProps {
  clientName: string
  orgName: string
  orgLogoUrl: string | null
  orgPrimaryColor: string | null
  slug: string
  token: string
}

function ReportCard({ report, slug, token }: { report: PortalEODReport; slug: string; token: string }) {
  const [showComments, setShowComments] = useState(false)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{report.userName}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {report.jobTitle || report.department}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {report.needsEscalation && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                Escalation
              </Badge>
            )}
            <Badge variant="outline" className="text-xs capitalize">{report.userRole}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-4 space-y-4">
        {/* Tasks completed */}
        {report.tasks.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Completed Today
            </h4>
            <ul className="space-y-1.5">
              {report.tasks.map((task, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>
                    {task.description}
                    {task.rockTitle && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        — {task.rockTitle}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tomorrow priorities */}
        {report.tomorrowPriorities.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Tomorrow&apos;s Priorities
            </h4>
            <ul className="space-y-1.5">
              {report.tomorrowPriorities.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Target className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <span>
                    {p.description}
                    {p.rockTitle && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        — {p.rockTitle}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Challenges */}
        {report.challenges && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Challenges
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.challenges}</p>
          </div>
        )}

        {/* Escalation note */}
        {report.escalationNote && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-xs font-medium text-destructive mb-1">Escalation Note</p>
            <p className="text-sm">{report.escalationNote}</p>
          </div>
        )}

        {/* Rocks summary */}
        {report.rocks.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Quarterly Rocks ({report.rocks.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {report.rocks.map((rock, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs bg-muted rounded px-2 py-1">
                  <span>{rock.progress}%</span>
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize ${
                      rock.status === "on-track"
                        ? "border-emerald-500/50 text-emerald-600"
                        : rock.status === "at-risk"
                        ? "border-amber-500/50 text-amber-600"
                        : rock.status === "blocked"
                        ? "border-red-500/50 text-red-600"
                        : "border-slate-500/50 text-slate-600"
                    }`}
                  >
                    {rock.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments toggle */}
        <div>
          <button
            onClick={() => setShowComments((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showComments ? "Hide comments" : "Show comments"}
          </button>
          {showComments && (
            <CommentSection reportId={report.id} slug={slug} token={token} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function ClientPortalPage({
  clientName,
  orgName,
  orgLogoUrl,
  orgPrimaryColor,
  slug,
  token,
}: ClientPortalPageProps) {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0])
  const [data, setData] = useState<PortalEODResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)

  const fetchReports = useCallback(
    async (targetDate: string, silent = false) => {
      if (!silent) setIsLoading(true)
      else setIsRefreshing(true)
      try {
        const res = await fetch(`/api/client/${slug}/${token}/eod?date=${targetDate}`)
        const json = await res.json()
        if (json.success) setData(json.data)
      } catch {
        // Non-fatal
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [slug, token]
  )

  useEffect(() => {
    fetchReports(date)
  }, [date, fetchReports])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchReports(date, true), 60_000)
    return () => clearInterval(interval)
  }, [date, fetchReports])

  const goBack = () => setDate(format(subDays(parseISO(date), 1), "yyyy-MM-dd"))
  const goForward = () => {
    const next = addDays(parseISO(date), 1)
    if (next <= new Date()) setDate(format(next, "yyyy-MM-dd"))
  }
  const isToday = date === new Date().toISOString().split("T")[0]

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          {orgLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={orgLogoUrl} alt={orgName} className="h-8 w-8 rounded object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm truncate">{orgName}</h1>
            <p className="text-xs text-muted-foreground truncate">{clientName} Portal</p>
          </div>
          {orgPrimaryColor && (
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: orgPrimaryColor }}
            />
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Date navigation + stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[180px]">
              <p className="font-medium text-sm">
                {data?.displayDate || format(parseISO(date), "EEEE, MMMM d, yyyy")}
              </p>
              {isToday && (
                <p className="text-xs text-muted-foreground">Today</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={goForward}
              disabled={isToday}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {data && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {data.submissionStats.submitted}/{data.submissionStats.total} submitted
                ({data.submissionStats.percentage}%)
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchReports(date, true)}
              disabled={isRefreshing}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Reports */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.reports.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-medium">No reports for this date</p>
            <p className="text-sm mt-1">Check back later or navigate to a different day.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.reports.map((report) => (
              <ReportCard key={report.id} report={report} slug={slug} token={token} />
            ))}
          </div>
        )}
      </main>

      {/* FAB — Request a task */}
      <button
        onClick={() => setShowTaskModal(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 bg-foreground text-background px-4 py-2.5 rounded-full shadow-lg hover:opacity-90 transition-opacity text-sm font-medium"
        style={orgPrimaryColor ? { backgroundColor: orgPrimaryColor, color: "#fff" } : undefined}
      >
        <PlusCircle className="h-4 w-4" />
        Request a Task
      </button>

      <TaskRequestModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
        slug={slug}
        token={token}
      />
    </div>
  )
}
