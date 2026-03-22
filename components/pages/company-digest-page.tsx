"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import {
  Newspaper,
  Sparkles,
  Loader2,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Trash2,
  Calendar,
} from "lucide-react"
import type { CompanyDigest } from "@/lib/types"

function getPeriodLabel(type: string): string {
  switch (type) {
    case "weekly": return "Weekly"
    case "monthly": return "Monthly"
    case "quarterly": return "Quarterly"
    default: return type
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function getDefaultPeriod(type: string): { start: string; end: string } {
  const now = new Date()
  if (type === "weekly") {
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return {
      start: monday.toISOString().split("T")[0],
      end: sunday.toISOString().split("T")[0],
    }
  }
  if (type === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    }
  }
  // quarterly
  const q = Math.floor(now.getMonth() / 3)
  const start = new Date(now.getFullYear(), q * 3, 1)
  const end = new Date(now.getFullYear(), q * 3 + 3, 0)
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  }
}

function DigestCard({ digest, onDelete }: { digest: CompanyDigest; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const { content } = digest

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-semibold truncate">{digest.title}</CardTitle>
              <Badge variant="outline" className="shrink-0 text-xs">
                {getPeriodLabel(digest.periodType)}
              </Badge>
            </div>
            <CardDescription className="mt-1 text-xs">
              {formatDate(digest.periodStart)} — {formatDate(digest.periodEnd)} &middot; Generated {formatDate(digest.createdAt)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(v => !v)}
              aria-label={expanded ? "Collapse digest" : "Expand digest"}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              aria-label="Delete digest"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          <Separator />

          {content.executiveSummary && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Executive Summary</p>
              <p className="text-sm leading-relaxed">{content.executiveSummary}</p>
            </div>
          )}

          {content.rockUpdate && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Rock Update</p>
              <p className="text-sm leading-relaxed">{content.rockUpdate}</p>
            </div>
          )}

          {content.keyMetrics && content.keyMetrics.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Key Metrics</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {content.keyMetrics.map((m, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                    <span className="text-sm font-medium">{m.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold">{m.value}</span>
                      {m.trend && (
                        <span className={`text-xs ${m.trend === "up" ? "text-green-600" : m.trend === "down" ? "text-red-500" : "text-muted-foreground"}`}>
                          {m.trend === "up" ? "↑" : m.trend === "down" ? "↓" : "—"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {content.teamHighlights && content.teamHighlights.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Team Highlights</p>
              <ul className="space-y-1">
                {content.teamHighlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {content.challenges && content.challenges.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Challenges</p>
              <ul className="space-y-1">
                {content.challenges.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {content.outlook && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Outlook</p>
              <p className="text-sm leading-relaxed">{content.outlook}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export function CompanyDigestPage() {
  const { currentWorkspace } = useWorkspaces()
  const [digests, setDigests] = useState<CompanyDigest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")
  const [periodType, setPeriodType] = useState("weekly")
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")

  const workspaceId = currentWorkspace?.id

  // Set default period dates when period type changes
  useEffect(() => {
    const defaults = getDefaultPeriod(periodType)
    setPeriodStart(defaults.start)
    setPeriodEnd(defaults.end)
  }, [periodType])

  const fetchDigests = useCallback(async () => {
    if (!workspaceId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/company-digests?workspaceId=${workspaceId}`)
      const data = await res.json()
      if (data.success) setDigests(data.data || [])
    } catch {
      // ignore fetch errors on load
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { fetchDigests() }, [fetchDigests])

  const handleGenerate = async () => {
    if (!workspaceId || !periodStart || !periodEnd) return
    setIsGenerating(true)
    setError("")
    try {
      const res = await fetch("/api/company-digests", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ workspaceId, periodType, periodStart, periodEnd }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        setDigests(prev => [data.data, ...prev])
      } else {
        setError(data.error || "Failed to generate digest")
      }
    } catch {
      setError("Network error — please try again")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDelete = async (digestId: string) => {
    try {
      const res = await fetch(`/api/company-digests/${digestId}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      if (res.ok) {
        setDigests(prev => prev.filter(d => d.id !== digestId))
      } else {
        setError("Failed to delete digest")
      }
    } catch {
      setError("Network error — could not delete digest")
    }
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6 p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Newspaper className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold">Company Digest</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-generated board updates and company summaries for any period.
            </p>
          </div>
        </div>

        {/* Generator card */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              Generate New Digest
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Period Type</Label>
                <Select value={periodType} onValueChange={setPeriodType}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Start Date</Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={periodStart}
                  onChange={e => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">End Date</Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={periodEnd}
                  onChange={e => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                Uses 1 AI credit. Pulls rocks, scorecard metrics, and highlights.
              </p>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating || !workspaceId || !periodStart || !periodEnd}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Digest
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Digest list */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Recent Digests</h2>
            {digests.length > 0 && (
              <Badge variant="secondary" className="text-xs">{digests.length}</Badge>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : digests.length === 0 ? (
            <Card className="border-dashed border-border">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Newspaper className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground mb-1">No digests yet</p>
                <p className="text-xs text-muted-foreground">
                  Generate your first company digest above to create a board-ready summary.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {digests.map(digest => (
                <DigestCard
                  key={digest.id}
                  digest={digest}
                  onDelete={() => handleDelete(digest.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info card */}
        <Card className="border-border bg-muted/20">
          <CardContent className="py-4 px-5">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">What&apos;s included</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Each digest pulls your team&apos;s Rock progress, Scorecard metrics, completed milestones, and at-risk items for the selected period. The AI synthesizes them into an executive summary, key metrics table, team highlights, and forward-looking outlook — ready to copy into a board update or investor report.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}
