"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Calendar,
  TrendingDown,
} from "lucide-react"
import type { MeetingSection, MeetingPrep } from "@/lib/db/meetings"

interface RocksSectionProps {
  section: MeetingSection
  prep: MeetingPrep
  onComplete: (data: Record<string, unknown>) => void
  onCreateIssue: (title: string, sourceType: string, sourceId: string) => void
  isActive: boolean
}

export function RocksSection({
  section,
  prep,
  onComplete,
  onCreateIssue,
  isActive,
}: RocksSectionProps) {
  const [reviewedRocks, setReviewedRocks] = useState<string[]>(
    (section.data?.reviewed as string[]) || []
  )
  const [issuesCreated, setIssuesCreated] = useState<string[]>(
    (section.data?.issuesCreated as string[]) || []
  )

  const rocksAtRisk = prep.rocksAtRisk || []

  const handleReview = (rockId: string) => {
    if (!reviewedRocks.includes(rockId)) {
      setReviewedRocks((prev) => [...prev, rockId])
    }
  }

  const handleCreateIssue = (rock: (typeof rocksAtRisk)[0]) => {
    onCreateIssue(`Rock at Risk: ${rock.title}`, "rock", rock.id)
    setIssuesCreated((prev) => [...prev, rock.id])
    handleReview(rock.id)
  }

  const handleComplete = () => {
    onComplete({
      reviewed: reviewedRocks,
      issuesCreated,
      atRiskCount: rocksAtRisk.length,
    })
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "off_track":
        return "bg-red-100 text-red-700 border-red-200"
      case "at_risk":
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
              <Target className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg">Rocks Review</CardTitle>
            </div>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
              Completed
            </Badge>
          </div>
          <CardDescription>Quarterly priorities reviewed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-600">
            {rocksAtRisk.length} at-risk rocks reviewed, {issuesCreated.length} issues created
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
            <Target className="h-5 w-5 text-slate-400" />
            <CardTitle className="text-lg text-slate-500">Rocks Review</CardTitle>
          </div>
          <CardDescription>Review quarterly priorities</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-primary/30 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-lg">Rocks Review</CardTitle>
          </div>
          {rocksAtRisk.length > 0 && (
            <Badge variant="destructive">
              {rocksAtRisk.length} At Risk
            </Badge>
          )}
        </div>
        <CardDescription>
          Review rocks that are at risk or off-track. Create issues for discussion if needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rocksAtRisk.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-center">
            <div>
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium text-emerald-700">All rocks on track!</p>
              <p className="text-sm text-slate-500">No at-risk rocks this week</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {rocksAtRisk.map((rock) => {
              const isReviewed = reviewedRocks.includes(rock.id)
              const hasIssue = issuesCreated.includes(rock.id)

              return (
                <div
                  key={rock.id}
                  className={`p-3 rounded-lg border ${
                    isReviewed ? "bg-slate-50 opacity-60" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <AlertTriangle
                          className={`h-4 w-4 ${
                            rock.confidence === "off_track" ? "text-red-500" : "text-amber-500"
                          }`}
                        />
                        <span className="font-medium">{rock.title}</span>
                        <Badge className={getConfidenceColor(rock.confidence)} variant="outline">
                          {rock.confidence === "off_track" ? "OFF TRACK" : "AT RISK"}
                        </Badge>
                      </div>

                      {/* Progress */}
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Progress</span>
                          <span className="font-medium">{rock.progress}%</span>
                        </div>
                        <Progress value={rock.progress} className="h-1.5" />
                      </div>

                      {/* Risk reason & details */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          {rock.risk_reason}
                        </div>
                        {rock.days_remaining !== undefined && rock.days_remaining !== null && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {rock.days_remaining > 0
                              ? `${rock.days_remaining} days left`
                              : `${Math.abs(rock.days_remaining)} days overdue`}
                          </div>
                        )}
                      </div>

                      {rock.owner_name && (
                        <div className="text-xs text-slate-500 mt-1">
                          Owner: {rock.owner_name}
                        </div>
                      )}

                      {rock.confidence_notes && (
                        <div className="text-xs text-slate-600 mt-1 italic">
                          &ldquo;{rock.confidence_notes}&rdquo;
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!hasIssue && !isReviewed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateIssue(rock)}
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
                          onClick={() => handleReview(rock.id)}
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
          Complete Rocks Review
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  )
}
