"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Flame, Trophy, BookOpen, Loader2 } from "lucide-react"
import { AchievementSummary } from "@/components/shared/achievement-badge"
import { WeeklyReviewModal } from "@/components/shared/weekly-review-modal"
import { useToast } from "@/hooks/use-toast"
import type { Achievement, UserAchievement, EODReport, AssignedTask, Rock, WeeklyReview } from "@/lib/types"

interface ProductivityBarProps {
  userId: string
  eodReports: EODReport[]
  tasks: AssignedTask[]
  rocks: Rock[]
  showStreaks?: boolean
  showAchievements?: boolean
  showWeeklyReview?: boolean
}

export function ProductivityBar({
  userId,
  eodReports,
  tasks,
  rocks,
  showStreaks = false,
  showAchievements = false,
  showWeeklyReview = false,
}: ProductivityBarProps) {
  const { toast } = useToast()
  const [streak, setStreak] = useState<{ currentStreak: number; longestStreak: number } | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [existingReview, setExistingReview] = useState<WeeklyReview | undefined>()
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const promises: Promise<void>[] = []

      if (showStreaks) {
        promises.push(
          fetch("/api/productivity/streak").then(async (res) => {
            if (res.ok) {
              const data = await res.json()
              if (data.success && data.data) setStreak(data.data)
            }
          })
        )
      }

      if (showAchievements) {
        promises.push(
          fetch("/api/productivity/achievements").then(async (res) => {
            if (res.ok) {
              const data = await res.json()
              if (data.success && data.data) {
                setAchievements(data.data.achievements || [])
                setUserAchievements(data.data.userAchievements || [])
              }
            }
          })
        )
      }

      if (showWeeklyReview) {
        const weekStart = getWeekStart()
        promises.push(
          fetch(`/api/productivity/weekly-reviews?weekStart=${weekStart}`).then(async (res) => {
            if (res.ok) {
              const data = await res.json()
              if (data.success && data.data) setExistingReview(data.data)
            }
          })
        )
      }

      await Promise.allSettled(promises)
    } catch {
      // Non-critical, silently fail
    } finally {
      setIsLoading(false)
    }
  }, [showStreaks, showAchievements, showWeeklyReview])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSaveReview = async (review: Partial<WeeklyReview>) => {
    const res = await fetch("/api/productivity/weekly-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify(review),
    })
    if (!res.ok) throw new Error("Failed to save review")
    toast({ title: "Weekly review saved" })
    loadData()
  }

  if (isLoading) return null

  const hasContent = (showStreaks && streak) || (showAchievements && userAchievements.length > 0) || showWeeklyReview
  if (!hasContent) return null

  return (
    <>
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Streak */}
              {showStreaks && streak && streak.currentStreak > 0 && (
                <div className="flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-semibold">{streak.currentStreak}</span>
                  <span className="text-xs text-muted-foreground">day streak</span>
                  {streak.currentStreak >= 7 && (
                    <Badge variant="secondary" className="text-xs ml-1">
                      Best: {streak.longestStreak}
                    </Badge>
                  )}
                </div>
              )}

              {/* Achievements Summary */}
              {showAchievements && userAchievements.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <AchievementSummary
                    achievements={achievements}
                    userAchievements={userAchievements}
                    maxDisplay={3}
                  />
                </div>
              )}
            </div>

            {/* Weekly Review Button */}
            {showWeeklyReview && (
              <Button
                variant={existingReview ? "outline" : "default"}
                size="sm"
                onClick={() => setShowReviewModal(true)}
              >
                <BookOpen className="h-4 w-4 mr-1" />
                {existingReview ? "Edit Review" : "Weekly Review"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Review Modal */}
      {showWeeklyReview && (
        <WeeklyReviewModal
          open={showReviewModal}
          onOpenChange={setShowReviewModal}
          eodReports={eodReports}
          tasks={tasks}
          rocks={rocks}
          existingReview={existingReview}
          onSave={handleSaveReview}
          userId={userId}
        />
      )}
    </>
  )
}

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday start
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split("T")[0]
}
