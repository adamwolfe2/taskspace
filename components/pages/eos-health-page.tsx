"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { ErrorBoundary } from "@/components/shared/error-boundary"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { Heart, Sparkles, Loader2, AlertCircle } from "lucide-react"
import type { EOSHealthReport, EOSHealthScores } from "@/lib/types"

const EOS_COMPONENTS = [
  { key: "vision" as keyof EOSHealthScores, label: "Vision", description: "Clear vision, values, and goals" },
  { key: "people" as keyof EOSHealthScores, label: "People", description: "Right people, right seats" },
  { key: "data" as keyof EOSHealthScores, label: "Data", description: "Data-driven decisions" },
  { key: "issues" as keyof EOSHealthScores, label: "Issues", description: "Identify, discuss, solve" },
  { key: "process" as keyof EOSHealthScores, label: "Process", description: "Documented and followed" },
  { key: "traction" as keyof EOSHealthScores, label: "Traction", description: "Executing with discipline" },
]

function getGradeColor(grade: string): string {
  switch (grade) {
    case "A": return "text-green-600 bg-green-50 border-green-200"
    case "B": return "text-blue-600 bg-blue-50 border-blue-200"
    case "C": return "text-yellow-600 bg-yellow-50 border-yellow-200"
    case "D": return "text-orange-600 bg-orange-50 border-orange-200"
    case "F": return "text-red-600 bg-red-50 border-red-200"
    default: return "text-muted-foreground bg-muted"
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-500"
  if (score >= 60) return "bg-yellow-500"
  if (score >= 40) return "bg-orange-500"
  return "bg-red-500"
}

function getCurrentQuarter(): string {
  const now = new Date()
  const q = Math.ceil((now.getMonth() + 1) / 3)
  return `Q${q} ${now.getFullYear()}`
}

export function EOSHealthPage() {
  const { currentWorkspace } = useWorkspaces()
  const [reports, setReports] = useState<EOSHealthReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedQuarter, setSelectedQuarter] = useState(getCurrentQuarter())
  const [error, setError] = useState("")

  const workspaceId = currentWorkspace?.id

  const fetchReports = useCallback(async () => {
    if (!workspaceId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/eos-health?workspaceId=${workspaceId}`)
      const data = await res.json()
      if (data.success) setReports(data.data || [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { fetchReports() }, [fetchReports])

  const handleGenerate = async () => {
    if (!workspaceId) return
    setIsGenerating(true)
    setError("")
    try {
      const res = await fetch("/api/eos-health", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ workspaceId, quarter: selectedQuarter }),
      })
      const data = await res.json()
      if (data.success) {
        fetchReports()
      } else {
        setError(data.error || "Failed to generate report")
      }
    } catch {
      setError("Failed to generate report")
    } finally {
      setIsGenerating(false)
    }
  }

  const latestReport = reports[0]

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">EOS Health Report</h1>
            <p className="text-muted-foreground">AI-scored report card on all 6 EOS components</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, -1, -2, -3].map(offset => {
                  const now = new Date()
                  now.setMonth(now.getMonth() + offset * 3)
                  const q = Math.ceil((now.getMonth() + 1) / 3)
                  const label = `Q${q} ${now.getFullYear()}`
                  return <SelectItem key={label} value={label}>{label}</SelectItem>
                })}
              </SelectContent>
            </Select>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate Report
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />{error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !latestReport ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Heart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No health reports generated yet</p>
              <p className="text-sm">Click &ldquo;Generate Report&rdquo; to score your organization on the 6 EOS components</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Overall Grade */}
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Grade</p>
                    <p className="text-xs text-muted-foreground mt-1">{latestReport.quarter}</p>
                  </div>
                  <div className={`text-5xl font-bold rounded-xl px-6 py-3 border ${getGradeColor(latestReport.overallGrade)}`}>
                    {latestReport.overallGrade}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 6 Component Scores */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {EOS_COMPONENTS.map(comp => {
                const score = latestReport.scores[comp.key] || 0
                return (
                  <Card key={comp.key}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{comp.label}</p>
                        <span className="text-lg font-bold">{score}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getScoreColor(score)}`}
                          style={{ width: `${Math.min(score, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{comp.description}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Analysis */}
            {latestReport.aiAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{latestReport.aiAnalysis}</p>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {latestReport.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {latestReport.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5 shrink-0">{i + 1}</Badge>
                        <p className="text-sm">{rec}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
