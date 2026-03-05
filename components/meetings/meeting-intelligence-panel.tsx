"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sparkles,
  CheckSquare,
  AlertCircle,
  ArrowRight,
  Loader2,
  ListChecks,
  Lightbulb,
} from "lucide-react"
import type { MeetingIntelligence } from "@/lib/types"

interface MeetingIntelligencePanelProps {
  meetingId: string
  aiSummary?: string | null
  aiActionItems?: MeetingIntelligence["actionItems"] | null
  aiKeyDecisions?: MeetingIntelligence["keyDecisions"] | null
  initialIntelligence?: MeetingIntelligence | null
  onConvertToTask?: (actionItem: MeetingIntelligence["actionItems"][number]) => void
}

export function MeetingIntelligencePanel({
  meetingId,
  aiSummary,
  aiActionItems,
  aiKeyDecisions,
  initialIntelligence,
  onConvertToTask,
}: MeetingIntelligencePanelProps) {
  const [intelligence, setIntelligence] = useState<MeetingIntelligence | null>(
    initialIntelligence ?? null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Merge prop-provided AI fields with state (state takes precedence after generation)
  const summary = intelligence?.summary ?? aiSummary ?? null
  const actionItems = intelligence?.actionItems ?? aiActionItems ?? null
  const keyDecisions = intelligence?.keyDecisions ?? aiKeyDecisions ?? null
  const unresolvedIssues = intelligence?.unresolvedIssues ?? null
  const followUpSuggestions = intelligence?.followUpSuggestions ?? null

  const hasAIData = Boolean(summary || actionItems?.length || keyDecisions?.length)

  async function handleGenerate() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/ai/meetings/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ meetingId }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error ?? "Failed to generate meeting intelligence")
        return
      }

      setIntelligence(data.data as MeetingIntelligence)
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!hasAIData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Meeting Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Generate an AI-powered summary with action items, key decisions, and
            follow-up suggestions for this meeting.
          </p>
          {error && (
            <p className="text-sm text-destructive mb-4">{error}</p>
          )}
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            variant="outline"
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Summary
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Meeting Intelligence
          </CardTitle>
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            variant="ghost"
            size="sm"
            className="gap-2 text-xs text-muted-foreground"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                Regenerate
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Summary */}
        {summary && (
          <div>
            <h3 className="text-sm font-medium mb-2">Summary</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Action Items */}
        {actionItems && actionItems.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                <CheckSquare className="h-4 w-4" />
                Action Items
                <Badge variant="secondary" className="ml-1 text-xs">
                  {actionItems.length}
                </Badge>
              </h3>
              <ul className="space-y-2">
                {actionItems.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{item.text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.assignee && (
                          <span className="text-xs text-muted-foreground">
                            {item.assignee}
                          </span>
                        )}
                        {item.dueDate && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {item.dueDate}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {onConvertToTask && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 gap-1 text-xs h-7 px-2"
                        onClick={() => onConvertToTask(item)}
                      >
                        <ListChecks className="h-3 w-3" />
                        Convert to Task
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Key Decisions */}
        {keyDecisions && keyDecisions.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                <ArrowRight className="h-4 w-4" />
                Key Decisions
                <Badge variant="secondary" className="ml-1 text-xs">
                  {keyDecisions.length}
                </Badge>
              </h3>
              <ul className="space-y-2">
                {keyDecisions.map((item, index) => (
                  <li key={index} className="rounded-md border px-3 py-2">
                    <p className="text-sm font-medium">{item.decision}</p>
                    {item.context && (
                      <p className="text-xs text-muted-foreground mt-1">{item.context}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Unresolved Issues */}
        {unresolvedIssues && unresolvedIssues.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                <AlertCircle className="h-4 w-4" />
                Unresolved Issues
                <Badge variant="secondary" className="ml-1 text-xs">
                  {unresolvedIssues.length}
                </Badge>
              </h3>
              <ul className="space-y-2">
                {unresolvedIssues.map((issue, index) => (
                  <li key={index} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <p className="text-sm">{issue.title}</p>
                    {issue.priority && (
                      <Badge
                        variant={issue.priority === "high" ? "destructive" : "outline"}
                        className="text-xs capitalize"
                      >
                        {issue.priority}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Follow-up Suggestions */}
        {followUpSuggestions && followUpSuggestions.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                <Lightbulb className="h-4 w-4" />
                Follow-up Suggestions
              </h3>
              <ul className="space-y-1.5">
                {followUpSuggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">{suggestion}</p>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
