"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart3, AlertCircle, CheckCircle2, ChevronRight, ExternalLink } from "lucide-react"
import type { MeetingSection, MeetingPrep } from "@/lib/db/meetings"

interface ScorecardSectionProps {
  section: MeetingSection
  prep: MeetingPrep
  onComplete: (data: Record<string, unknown>) => void
  onCreateIssue: (title: string, sourceType: string, sourceId: string) => void
  isActive: boolean
}

export function ScorecardSection({
  section,
  prep,
  onComplete,
  onCreateIssue,
  isActive,
}: ScorecardSectionProps) {
  const [reviewedMetrics, setReviewedMetrics] = useState<string[]>(
    (section.data?.reviewed as string[]) || []
  )
  const [issuesCreated, setIssuesCreated] = useState<string[]>(
    (section.data?.issuesCreated as string[]) || []
  )

  const alerts = prep.scorecardAlerts || []

  const handleReview = (metricId: string) => {
    if (!reviewedMetrics.includes(metricId)) {
      setReviewedMetrics((prev) => [...prev, metricId])
    }
  }

  const handleCreateIssue = (alert: (typeof alerts)[0]) => {
    onCreateIssue(
      `Scorecard: ${alert.metric_name} is ${alert.status}`,
      "scorecard",
      alert.metric_id
    )
    setIssuesCreated((prev) => [...prev, alert.metric_id])
    handleReview(alert.metric_id)
  }

  const handleComplete = () => {
    onComplete({
      reviewed: reviewedMetrics,
      issuesCreated,
      alertCount: alerts.length,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "red":
        return "bg-red-100 text-red-700 border-red-200"
      case "yellow":
        return "bg-amber-100 text-amber-700 border-amber-200"
      default:
        return "bg-slate-100 text-slate-700 border-slate-200"
    }
  }

  if (!isActive && section.completed) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg">Scorecard Review</CardTitle>
            </div>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
              Completed
            </Badge>
          </div>
          <CardDescription>KPIs reviewed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-600">
            {alerts.length} alerts reviewed, {issuesCreated.length} issues created
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isActive) {
    return (
      <Card className="opacity-60">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-slate-400" />
            <CardTitle className="text-lg text-slate-500">Scorecard Review</CardTitle>
          </div>
          <CardDescription>Review weekly KPIs</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-primary/30 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Scorecard Review</CardTitle>
          </div>
          {alerts.length > 0 && (
            <Badge variant="destructive">
              {alerts.length} Alert{alerts.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <CardDescription>
          Review metrics that are off-track. Create issues for discussion if needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-center">
            <div>
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium text-emerald-700">All metrics on track!</p>
              <p className="text-sm text-slate-500">No alerts this week</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const isReviewed = reviewedMetrics.includes(alert.metric_id)
              const hasIssue = issuesCreated.includes(alert.metric_id)

              return (
                <div
                  key={alert.metric_id}
                  className={`p-3 rounded-lg border ${
                    isReviewed ? "bg-slate-50 opacity-60" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle
                          className={`h-4 w-4 ${
                            alert.status === "red" ? "text-red-500" : "text-amber-500"
                          }`}
                        />
                        <span className="font-medium">{alert.metric_name}</span>
                        <Badge className={getStatusColor(alert.status)} variant="outline">
                          {alert.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        Current: {alert.current_value ?? "—"} {alert.unit || ""} | Target:{" "}
                        {alert.target_value ?? "—"} {alert.unit || ""}
                      </div>
                      {alert.owner_name && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          Owner: {alert.owner_name}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!hasIssue && !isReviewed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateIssue(alert)}
                        >
                          Add to IDS
                        </Button>
                      )}
                      {hasIssue && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          Issue Created
                        </Badge>
                      )}
                      {!isReviewed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReview(alert.metric_id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <Button onClick={handleComplete} className="w-full">
          Complete Scorecard Review
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  )
}
