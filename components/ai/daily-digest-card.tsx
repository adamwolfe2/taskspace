"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserInitials } from "@/components/shared/user-initials"
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Calendar,
  Users,
  AlertCircle,
} from "lucide-react"
import type { DailyDigest, TeamMember } from "@/lib/types"

interface DailyDigestCardProps {
  digest: DailyDigest | null
  teamMembers: TeamMember[]
  onGenerate: () => Promise<void>
  isGenerating: boolean
  selectedDate: string
}

const sentimentIcons = {
  positive: <TrendingUp className="h-4 w-4 text-success" />,
  neutral: <Users className="h-4 w-4 text-muted-foreground" />,
  negative: <TrendingDown className="h-4 w-4 text-destructive" />,
  mixed: <AlertTriangle className="h-4 w-4 text-warning" />,
}

const sentimentColors = {
  positive: "text-success",
  neutral: "text-muted-foreground",
  negative: "text-destructive",
  mixed: "text-warning",
}

export function DailyDigestCard({
  digest,
  teamMembers,
  onGenerate,
  isGenerating,
  selectedDate,
}: DailyDigestCardProps) {
  const memberMap = new Map(teamMembers.map((m) => [m.id, m]))

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
  }

  if (!digest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Daily Digest
          </CardTitle>
          <CardDescription>
            Generate an AI summary of your team's EOD reports for {formatDate(selectedDate)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-muted-foreground mb-4 text-center">
            No digest generated for this date yet
          </p>
          <Button onClick={onGenerate} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Generate Digest
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Daily Digest - {formatDate(digest.digestDate)}
          </CardTitle>
          <CardDescription className="flex items-center gap-2 mt-1">
            {sentimentIcons[digest.teamSentiment]}
            <span className={sentimentColors[digest.teamSentiment]}>
              Team sentiment: {digest.teamSentiment}
            </span>
            <span className="text-muted-foreground">
              • {digest.reportsAnalyzed} reports analyzed
            </span>
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onGenerate}
          disabled={isGenerating}
          className="gap-1"
        >
          {isGenerating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm leading-relaxed">{digest.summary}</p>
            </div>

            {/* Wins */}
            {digest.wins && digest.wins.length > 0 && (
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Wins ({digest.wins.length})
                </h4>
                <div className="space-y-2">
                  {digest.wins.map((win, i) => {
                    const member = memberMap.get(win.memberId)
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 bg-success/5 border border-success/20 rounded-lg"
                      >
                        {member && <UserInitials name={member.name} size="sm" />}
                        <div>
                          <p className="text-sm font-medium">{win.memberName}</p>
                          <p className="text-sm text-muted-foreground">{win.text}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Blockers */}
            {digest.blockers && digest.blockers.length > 0 && (
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Blockers ({digest.blockers.length})
                </h4>
                <div className="space-y-2">
                  {digest.blockers.map((blocker, i) => {
                    const member = memberMap.get(blocker.memberId)
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg"
                      >
                        {member && <UserInitials name={member.name} size="sm" />}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{blocker.memberName}</p>
                            <Badge
                              variant={
                                blocker.severity === "high"
                                  ? "destructive"
                                  : blocker.severity === "medium"
                                  ? "warning"
                                  : "secondary"
                              }
                            >
                              {blocker.severity}
                            </Badge>
                            {blocker.daysOpen && blocker.daysOpen > 1 && (
                              <span className="text-xs text-muted-foreground">
                                {blocker.daysOpen} days
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{blocker.text}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Concerns */}
            {digest.concerns && digest.concerns.length > 0 && (
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Concerns ({digest.concerns.length})
                </h4>
                <div className="space-y-2">
                  {digest.concerns.map((concern, i) => (
                    <div
                      key={i}
                      className="p-3 bg-warning/5 border border-warning/20 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{concern.type}</Badge>
                      </div>
                      <p className="text-sm">{concern.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-ups */}
            {digest.followUps && digest.followUps.length > 0 && (
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Suggested Follow-ups ({digest.followUps.length})
                </h4>
                <div className="space-y-2">
                  {digest.followUps.map((followUp, i) => {
                    const member = memberMap.get(followUp.targetMemberId)
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 border rounded-lg"
                      >
                        {member && <UserInitials name={member.name} size="sm" />}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{followUp.targetMemberName}</p>
                            <Badge
                              variant={
                                followUp.priority === "high"
                                  ? "destructive"
                                  : followUp.priority === "medium"
                                  ? "warning"
                                  : "secondary"
                              }
                            >
                              {followUp.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{followUp.text}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Challenge Questions */}
            {digest.challengeQuestions && digest.challengeQuestions.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Questions to Consider</h4>
                <ul className="space-y-2">
                  {digest.challengeQuestions.map((question, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {question}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
