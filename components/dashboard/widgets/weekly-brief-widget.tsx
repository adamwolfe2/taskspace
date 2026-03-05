"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sun, Target, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import type { WeeklyBriefRecord } from "@/lib/types"

interface WeeklyBriefWidgetProps {
  userId: string
}

export function WeeklyBriefWidget({ userId }: WeeklyBriefWidgetProps) {
  const [brief, setBrief] = useState<WeeklyBriefRecord | null>(null)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    async function fetchBrief() {
      try {
        const res = await fetch(`/api/briefs/weekly?userId=${userId}`)
        const data = await res.json()
        if (data.success && data.data) setBrief(data.data)
      } catch {
        // ignore
      }
    }
    fetchBrief()
  }, [userId])

  // Only show on Monday/Tuesday
  const dayOfWeek = new Date().getDay()
  if (dayOfWeek > 2 || dayOfWeek === 0) return null
  if (!brief) return null

  const content = brief.content

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sun className="h-4 w-4" />Week Preview
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-6 w-6 p-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
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
                  <AlertCircle className="h-3 w-3 text-destructive" />
                  <span>{item.title}</span>
                  <Badge variant="destructive" className="text-[10px] px-1">{item.daysOverdue}d</Badge>
                </div>
              ))}
            </div>
          )}

          {content.topPriorities.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1">Focus This Week</p>
              {content.topPriorities.slice(0, 3).map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <Target className="h-3 w-3 text-muted-foreground" />
                  <span>{p.title}</span>
                  <Badge variant="outline" className="text-[10px] px-1">{p.type}</Badge>
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
