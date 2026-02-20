"use client"

import { useState, useEffect } from "react"
import { Flame, Trophy, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getStreakMilestoneInfo,
  getProgressToNextMilestone,
} from "@/lib/productivity/calculations"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface StreakCounterProps {
  currentStreak: number
  longestStreak: number
  lastSubmissionDate?: string | null
  size?: "sm" | "md" | "lg"
  showProgress?: boolean
  showBest?: boolean
  className?: string
}

export function StreakCounter({
  currentStreak,
  longestStreak,
  lastSubmissionDate: _lastSubmissionDate,
  size = "md",
  showProgress = true,
  showBest = true,
  className,
}: StreakCounterProps) {
  const [animatedStreak, setAnimatedStreak] = useState(0)
  const milestoneInfo = getStreakMilestoneInfo(currentStreak)
  const nextMilestone = getProgressToNextMilestone(currentStreak)

  useEffect(() => {
    // Animate streak count
    const duration = 800
    const steps = Math.min(currentStreak, 30)
    if (steps === 0) {
      setAnimatedStreak(0)
      return
    }
    const increment = currentStreak / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= currentStreak) {
        setAnimatedStreak(currentStreak)
        clearInterval(timer)
      } else {
        setAnimatedStreak(Math.round(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [currentStreak])

  const sizeClasses = {
    sm: {
      container: "p-3",
      icon: "h-5 w-5",
      number: "text-2xl",
      label: "text-xs",
    },
    md: {
      container: "p-4",
      icon: "h-6 w-6",
      number: "text-3xl",
      label: "text-sm",
    },
    lg: {
      container: "p-5",
      icon: "h-8 w-8",
      number: "text-4xl",
      label: "text-base",
    },
  }

  const classes = sizeClasses[size]
  const isNewRecord = currentStreak > 0 && currentStreak >= longestStreak

  return (
    <div className={cn("bg-white rounded-xl border border-slate-100 shadow-sm", classes.container, className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Fire icon with animation for active streaks */}
          <div
            className={cn(
              "flex items-center justify-center rounded-full",
              currentStreak > 0
                ? "bg-primary"
                : "bg-slate-200",
              size === "sm" ? "w-10 h-10" : size === "md" ? "w-12 h-12" : "w-14 h-14"
            )}
          >
            <Flame
              className={cn(
                classes.icon,
                currentStreak > 0 ? "text-white" : "text-slate-400",
                currentStreak >= 7 && "animate-pulse"
              )}
            />
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className={cn("font-bold text-slate-900", classes.number)}>
                {animatedStreak}
              </span>
              <span className={cn("text-slate-500", classes.label)}>
                day{currentStreak !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Milestone badge */}
            {milestoneInfo && (
              <div className={cn("flex items-center gap-1 mt-0.5", milestoneInfo.color)}>
                <span className="text-sm">{milestoneInfo.icon}</span>
                <span className="text-xs font-medium">{milestoneInfo.label}</span>
              </div>
            )}

            {/* No milestone - show encouragement */}
            {!milestoneInfo && currentStreak > 0 && (
              <span className="text-xs text-slate-500">
                {7 - currentStreak} more to your first badge!
              </span>
            )}

            {currentStreak === 0 && (
              <span className="text-xs text-slate-400">
                Start your streak today!
              </span>
            )}
          </div>
        </div>

        {/* New record indicator */}
        {isNewRecord && currentStreak > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-full">
                  <Trophy className="h-3 w-3 text-amber-500" />
                  <span className="text-[10px] font-medium text-amber-600">NEW BEST</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>You&apos;ve set a new personal record!</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Progress to next milestone */}
      {showProgress && nextMilestone && currentStreak > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Progress to {nextMilestone.next} days
            </span>
            <span className="text-slate-700 font-medium">
              {currentStreak}/{nextMilestone.next}
            </span>
          </div>
          <Progress value={nextMilestone.progress} className="h-1.5" />
        </div>
      )}

      {/* Best streak */}
      {showBest && longestStreak > 0 && !isNewRecord && size !== "sm" && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
          <Target className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs text-slate-500">
            Best: <span className="font-medium text-slate-700">{longestStreak} days</span>
          </span>
        </div>
      )}
    </div>
  )
}

// Compact inline version for headers/cards
export function StreakBadge({
  currentStreak,
  className,
}: {
  currentStreak: number
  className?: string
}) {
  if (currentStreak === 0) return null

  const milestoneInfo = getStreakMilestoneInfo(currentStreak)

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        currentStreak >= 7
          ? "bg-slate-100"
          : "bg-slate-100",
        className
      )}
    >
      <Flame
        className={cn(
          "h-3.5 w-3.5",
          currentStreak >= 7 ? "text-orange-500" : "text-slate-500"
        )}
      />
      <span
        className={cn(
          "text-xs font-semibold",
          currentStreak >= 7 ? "text-orange-700" : "text-slate-600"
        )}
      >
        {currentStreak}
      </span>
      {milestoneInfo && (
        <span className="text-xs">{milestoneInfo.icon}</span>
      )}
    </div>
  )
}
