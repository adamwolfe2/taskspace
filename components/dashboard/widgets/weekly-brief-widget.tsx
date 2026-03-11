"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sun, Target, AlertCircle, ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react"
import type { WeeklyBriefRecord } from "@/lib/types"

interface WeeklyBriefWidgetProps {
  userId: string
  workspaceId?: string
}

export function WeeklyBriefWidget({ userId, workspaceId }: WeeklyBriefWidgetProps) {
  const [brief, setBrief] = useState<WeeklyBriefRecord | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")

  const fetchBrief = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/briefs/weekly?userId=${userId}`)
      const data = await res.json()
      if (data.success && data.data) setBrief(data.data)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchBrief() }, [fetchBrief])

  const handleGenerate = async () => {
    if (!workspaceId) return
    setIsGenerating(true)
    setError("")
    try {
      const res = await fetch("/api/briefs/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ workspaceId }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        setBrief(data.data)
      } else {
        setError(data.error || "Failed to generate brief")
      }
    } catch {
      setError("Network error — please try again")
    } finally {
      setIsGenerating(false)
    }
  }

  // Only show on Mon–Fri
  const dayOfWeek = new Date().getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) return null

  if (isLoading) return null

  // No brief yet — show generate prompt (Mon/Tue only)
  if (!brief) {
    if (dayOfWeek > 2) return null
    if (!workspaceId) return null
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sun className="h-4 w-4" />Week Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">Get your AI-powered Monday morning brief — priorities, overdue items, and focus suggestions for the week ahead.</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Generating...</>
            ) : (
              <><Sparkles className="h-3 w-3 mr-1.5" />Generate this week&apos;s brief</>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const content = brief.content

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sun className="h-4 w-4" />Week Preview
          </CardTitle>
          <div className="flex items-center gap-1">
            {workspaceId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground"
                onClick={handleGenerate}
                disabled={isGenerating}
                title="Regenerate"
              >
                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-6 w-6 p-0">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{content.greeting}</p>
          <p className="text-sm">{content.weekAtAGlance}</p>

          {content.overdueItems.length > 0 && (
            <div>
              <p className="text-xs font-medium text-destructive mb-1">Overdue</p>
              {content.overdueItems.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
                  <span className="truncate">{item.title}</span>
                  <Badge variant="destructive" className="text-[10px] px-1 shrink-0">{item.daysOverdue}d</Badge>
                </div>
              ))}
            </div>
          )}

          {content.topPriorities.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1">Focus This Week</p>
              {content.topPriorities.slice(0, 3).map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <Target className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{p.title}</span>
                  <Badge variant="outline" className="text-[10px] px-1 shrink-0">{p.type}</Badge>
                </div>
              ))}
            </div>
          )}

          {content.focusSuggestion && (
            <p className="text-xs text-muted-foreground italic border-l-2 border-primary pl-2">{content.focusSuggestion}</p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
