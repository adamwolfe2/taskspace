"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { Separator } from "@/components/ui/separator"
import { Sparkles, Loader2, TrendingUp, Users, Target } from "lucide-react"
import type { RockRetrospective } from "@/lib/types"

interface RockRetrospectivePanelProps {
  workspaceId: string
  quarter: string
  hasRocks: boolean
}

export function RockRetrospectivePanel({ workspaceId, quarter, hasRocks }: RockRetrospectivePanelProps) {
  const [retrospective, setRetrospective] = useState<RockRetrospective | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchRetro() {
      if (!workspaceId || !quarter) return
      setIsLoading(true)
      try {
        const res = await fetch(`/api/rocks/retrospective?workspaceId=${workspaceId}&quarter=${quarter}`)
        const data = await res.json()
        if (data.success && data.data?.length > 0) {
          setRetrospective(data.data[0])
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    fetchRetro()
  }, [workspaceId, quarter])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError("")
    try {
      const res = await fetch("/api/rocks/retrospective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, quarter }),
      })
      const data = await res.json()
      if (data.success) {
        setRetrospective(data.data)
      } else {
        setError(data.error || "Failed to generate retrospective")
      }
    } catch {
      setError("Failed to generate retrospective")
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!retrospective) {
    if (!hasRocks) return null
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm font-medium mb-1">Quarter Retrospective</p>
          <p className="text-xs text-muted-foreground mb-3">AI analysis of rock completion patterns for {quarter}</p>
          {error && <p className="text-xs text-destructive mb-2">{error}</p>}
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Generate Retrospective
          </Button>
        </CardContent>
      </Card>
    )
  }

  const analysis = retrospective.aiAnalysis

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Quarter Retrospective — {quarter}</CardTitle>
          <Badge variant={retrospective.completionRate >= 75 ? "default" : retrospective.completionRate >= 50 ? "secondary" : "destructive"}>
            {Math.round(retrospective.completionRate)}% completed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold">{retrospective.totalRocks}</p>
            <p className="text-xs text-muted-foreground">Total Rocks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{retrospective.completedRocks}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{retrospective.totalRocks - retrospective.completedRocks}</p>
            <p className="text-xs text-muted-foreground">Missed</p>
          </div>
        </div>

        <Separator />

        {/* Summary */}
        <div>
          <p className="text-sm whitespace-pre-wrap">{analysis.summary}</p>
        </div>

        {/* Top Performers */}
        {analysis.topPerformers.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <Users className="h-4 w-4" />Top Performers
            </p>
            <div className="space-y-2">
              {analysis.topPerformers.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="text-muted-foreground">{p.completed}/{p.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patterns */}
        {analysis.patterns.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />Patterns
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {analysis.patterns.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <Target className="h-4 w-4" />Recommendations
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
