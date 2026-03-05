"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { TeamHealthSnapshot } from "@/lib/types"

interface TeamHealthWidgetProps {
  workspaceId: string
}

const DIMENSION_LABELS: Record<string, string> = {
  eodRate: "EOD Rate",
  taskCompletion: "Tasks",
  rockProgress: "Rocks",
  meetingAttendance: "Meetings",
  moodScore: "Mood",
  escalationRate: "Escalation",
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600"
  if (score >= 60) return "text-yellow-600"
  if (score >= 40) return "text-orange-600"
  return "text-red-600"
}

function getBarColor(score: number): string {
  if (score >= 80) return "bg-green-500"
  if (score >= 60) return "bg-yellow-500"
  if (score >= 40) return "bg-orange-500"
  return "bg-red-500"
}

export function TeamHealthWidget({ workspaceId }: TeamHealthWidgetProps) {
  const [snapshots, setSnapshots] = useState<TeamHealthSnapshot[]>([])

  useEffect(() => {
    async function fetchHealth() {
      if (!workspaceId) return
      try {
        const res = await fetch(`/api/team-health?workspaceId=${workspaceId}&weeks=2`)
        const data = await res.json()
        if (data.success) setSnapshots(data.data || [])
      } catch {
        // ignore
      }
    }
    fetchHealth()
  }, [workspaceId])

  if (snapshots.length === 0) return null

  const latest = snapshots[0]
  const previous = snapshots[1]
  const trend = previous ? latest.overallScore - previous.overallScore : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Heart className="h-4 w-4" />Team Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overall Score */}
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-3xl font-bold ${getScoreColor(latest.overallScore)}`}>
              {latest.overallScore}
            </span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
          {trend !== 0 && (
            <Badge variant={trend > 0 ? "default" : "destructive"} className="flex items-center gap-1">
              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend > 0 ? "+" : ""}{trend}
            </Badge>
          )}
          {trend === 0 && previous && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Minus className="h-3 w-3" />No change
            </Badge>
          )}
        </div>

        {/* Dimension Bars */}
        <div className="space-y-2">
          {Object.entries(latest.dimensions).map(([key, value]) => (
            <div key={key}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-muted-foreground">{DIMENSION_LABELS[key] || key}</span>
                <span className="font-medium">{value}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${getBarColor(value as number)}`}
                  style={{ width: `${Math.min(value as number, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground">
          Week of {latest.weekStart}
        </p>
      </CardContent>
    </Card>
  )
}
