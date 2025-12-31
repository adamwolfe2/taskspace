"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserInitials } from "@/components/shared/user-initials"
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Sparkles,
} from "lucide-react"
import type { EODInsight, TeamMember, EODReport } from "@/lib/types"

interface EODInsightsCardProps {
  insights: Array<EODInsight & { memberName?: string; memberDepartment?: string }>
  teamMembers: TeamMember[]
  reports: EODReport[]
  maxItems?: number
}

const sentimentConfig: Record<string, {
  icon: typeof TrendingUp
  color: string
  bgColor: string
  borderColor: string
  label: string
}> = {
  positive: {
    icon: TrendingUp,
    color: "text-green-500",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    label: "Positive",
  },
  neutral: {
    icon: CheckCircle2,
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    label: "Neutral",
  },
  negative: {
    icon: TrendingDown,
    color: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "Negative",
  },
  stressed: {
    icon: AlertTriangle,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    label: "Stressed",
  },
}

const defaultSentiment = {
  icon: CheckCircle2,
  color: "text-gray-500",
  bgColor: "bg-gray-50",
  borderColor: "border-gray-200",
  label: "Unknown",
}

export function EODInsightsCard({
  insights,
  teamMembers,
  reports,
  maxItems = 5,
}: EODInsightsCardProps) {
  const memberMap = new Map(teamMembers.map(m => [m.id, m]))
  const reportMap = new Map(reports.map(r => [r.id, r]))

  // Enrich insights with member info
  const enrichedInsights = insights.slice(0, maxItems).map(insight => {
    const report = reportMap.get(insight.eodReportId)
    const member = report ? memberMap.get(report.userId) : undefined
    return {
      ...insight,
      memberName: member?.name || insight.memberName || "Unknown",
      memberDepartment: member?.department || insight.memberDepartment || "",
    }
  })

  if (enrichedInsights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-primary" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No AI insights yet</p>
            <p className="text-xs">Submit EOD reports to generate insights</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5 text-primary" />
          AI Insights
        </CardTitle>
        <CardDescription>
          Recent analysis from team EOD reports
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-4">
            {enrichedInsights.map((insight) => {
              const sentimentInfo = sentimentConfig[insight.sentiment] || defaultSentiment
              const SentimentIcon = sentimentInfo.icon

              return (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border ${sentimentInfo.bgColor} ${sentimentInfo.borderColor}`}
                >
                  <div className="flex items-start gap-3">
                    <UserInitials name={insight.memberName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{insight.memberName}</span>
                        <span className="text-xs text-muted-foreground">
                          {insight.memberDepartment}
                        </span>
                        <div className="flex items-center gap-1 ml-auto">
                          <SentimentIcon className={`h-4 w-4 ${sentimentInfo.color}`} />
                          <span className={`text-xs font-medium ${sentimentInfo.color}`}>
                            {sentimentInfo.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({insight.sentimentScore})
                          </span>
                        </div>
                      </div>

                      <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                        {insight.aiSummary}
                      </p>

                      {/* Highlights */}
                      {insight.highlights && insight.highlights.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {insight.highlights.slice(0, 3).map((highlight, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {highlight}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Blockers */}
                      {insight.blockers && insight.blockers.length > 0 && (
                        <div className="flex items-start gap-2 mt-2 p-2 bg-red-50 rounded border border-red-100">
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-red-700">
                            <span className="font-medium">Blocker: </span>
                            {insight.blockers[0].text}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
