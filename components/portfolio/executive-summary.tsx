"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Brain, Loader2, RefreshCw, AlertTriangle, CheckCircle, Lightbulb,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ErrorState } from "@/components/shared/error-state"
import { EmptyState } from "@/components/shared/empty-state"

interface OrgHighlight {
  orgName: string
  status: "healthy" | "needs-attention" | "critical"
  headline: string
}

interface SummaryData {
  summary: string
  orgHighlights: OrgHighlight[]
  topConcerns: string[]
  topWins: string[]
  recommendations: string[]
  generatedAt: string
}

const statusConfig = {
  healthy: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  "needs-attention": { color: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  critical: { color: "bg-red-100 text-red-700", icon: AlertTriangle },
}

export function ExecutiveSummary() {
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/super-admin/executive-summary", {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        setError(json.error || "Failed to generate summary")
      }
    } catch {
      setError("Failed to generate summary")
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" /> AI Executive Briefing
            </CardTitle>
            {data && (
              <span className="text-[10px] text-slate-400">
                Last generated {new Date(data.generatedAt).toLocaleString()}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generate}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            {data ? "Refresh" : "Generate"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Initial empty state */}
        {!data && !loading && !error && (
          <EmptyState
            icon={Brain}
            title="No briefing yet"
            description="Generate an AI-powered executive briefing across all your organizations."
            action={{ label: "Generate Briefing", onClick: generate }}
            size="sm"
          />
        )}

        {/* Error state */}
        {error && !loading && (
          <ErrorState
            title="Failed to generate briefing"
            message={error}
            onRetry={generate}
            size="sm"
          />
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-500">Analyzing your portfolio...</span>
          </div>
        )}

        {/* Content */}
        {data && !loading && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">{data.summary}</p>

            {/* Org Highlights */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Organization Status</h4>
              {data.orgHighlights.map((org) => {
                const config = statusConfig[org.status]
                const Icon = config.icon
                return (
                  <div key={org.orgName} className="flex items-center gap-2">
                    <Badge className={cn("text-xs", config.color)}>
                      <Icon className="h-3 w-3 mr-1" />
                      {org.status}
                    </Badge>
                    <span className="text-sm font-medium">{org.orgName}</span>
                    <span className="text-xs text-slate-500">{org.headline}</span>
                  </div>
                )
              })}
            </div>

            {/* Concerns & Wins */}
            <div className="grid grid-cols-2 gap-4">
              {data.topConcerns.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Concerns</h4>
                  <ul className="space-y-1">
                    {data.topConcerns.map((c, i) => (
                      <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.topWins.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Wins</h4>
                  <ul className="space-y-1">
                    {data.topWins.map((w, i) => (
                      <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Recommendations</h4>
                <ul className="space-y-1">
                  {data.recommendations.map((r, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                      <Lightbulb className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
