"use client"

import { useState, useMemo } from "react"
import { Activity, ChevronRight, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { FocusScoreGauge, FocusScoreCompact } from "./focus-score-gauge"
import { StreakCounter, StreakBadge } from "./streak-counter"
import { EnergyCheckIn, EnergyDisplay } from "./energy-check-in"
import { WeeklyHoursChart, WeeklyHoursMini } from "./weekly-hours-chart"
import { FocusBlockLogger } from "./focus-block-logger"
import { Button } from "@/components/ui/button"
import type {
  FocusScore,
  UserStreak,
  DailyEnergy,
  FocusBlock,
  DailyEnergyInput,
  FocusBlockInput,
  FocusBlockCategory,
} from "@/lib/types"

interface ProductivityDashboardProps {
  focusScore: FocusScore
  streak: UserStreak
  todayEnergy: DailyEnergy | null
  recentFocusBlocks: FocusBlock[]
  weeklyHoursData: {
    date: string
    dayLabel: string
    totalMinutes: number
    byCategory: Partial<Record<FocusBlockCategory, number>>
  }[]
  onSaveEnergy: (data: DailyEnergyInput) => Promise<void>
  onSaveFocusBlock: (data: FocusBlockInput) => Promise<void>
  goalMinutesPerDay?: number
  className?: string
}

export function ProductivityDashboard({
  focusScore,
  streak,
  todayEnergy,
  recentFocusBlocks,
  weeklyHoursData,
  onSaveEnergy,
  onSaveFocusBlock,
  goalMinutesPerDay = 360, // 6 hours default
  className,
}: ProductivityDashboardProps) {
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false)

  const totalWeekMinutes = useMemo(
    () => weeklyHoursData.reduce((sum, d) => sum + d.totalMinutes, 0),
    [weeklyHoursData]
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50">
            <Activity className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Productivity</h2>
            <p className="text-xs text-slate-500">Your focus metrics at a glance</p>
          </div>
        </div>
        <StreakBadge currentStreak={streak.currentStreak} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Focus Score Card */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 col-span-1">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Focus Score</h3>
          <div className="flex justify-center">
            <FocusScoreGauge
              score={focusScore.score}
              breakdown={focusScore.breakdown}
              trend={focusScore.trend}
              weekOverWeek={focusScore.weekOverWeek}
              size="lg"
            />
          </div>
        </div>

        {/* Streak & Energy Column */}
        <div className="space-y-4 col-span-1">
          <StreakCounter
            currentStreak={streak.currentStreak}
            longestStreak={streak.longestStreak}
            lastSubmissionDate={streak.lastSubmissionDate}
            size="md"
          />
          <EnergyCheckIn
            currentEnergy={todayEnergy ? {
              energyLevel: todayEnergy.energyLevel,
              mood: todayEnergy.mood,
              factors: todayEnergy.factors,
            } : null}
            onSave={onSaveEnergy}
          />
        </div>

        {/* Focus Time Logger */}
        <div className="col-span-1 lg:col-span-1 md:col-span-2">
          <FocusBlockLogger
            recentBlocks={recentFocusBlocks}
            onSave={onSaveFocusBlock}
          />
        </div>
      </div>

      {/* Weekly Hours Chart */}
      <WeeklyHoursChart
        data={weeklyHoursData}
        goalMinutesPerDay={goalMinutesPerDay}
        showCategoryBreakdown={showDetailedBreakdown}
      />

      {/* Toggle for detailed breakdown */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
          className="text-slate-500 hover:text-slate-700"
        >
          {showDetailedBreakdown ? "Hide" : "Show"} category breakdown
          <ChevronRight
            className={cn(
              "h-4 w-4 ml-1 transition-transform",
              showDetailedBreakdown && "rotate-90"
            )}
          />
        </Button>
      </div>
    </div>
  )
}

// Compact version for sidebar or smaller spaces
export function ProductivityCompact({
  focusScore,
  streak,
  totalFocusHours,
  className,
}: {
  focusScore: number
  streak: number
  totalFocusHours: number
  className?: string
}) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-red-500" />
        <span className="text-sm font-semibold text-slate-700">Today&apos;s Productivity</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div
            className="text-2xl font-bold"
            style={{ color: focusScore >= 70 ? "#10B981" : focusScore >= 50 ? "#F59E0B" : "#EF4444" }}
          >
            {focusScore}
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wide">Focus</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-500">
            {streak}🔥
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wide">Streak</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {totalFocusHours.toFixed(1)}h
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wide">Focus</div>
        </div>
      </div>
    </div>
  )
}

// Widget for the customizable dashboard
export function ProductivityWidget({
  focusScore,
  streak,
  todayEnergy,
  totalFocusMinutes,
  onViewDetails,
  className,
}: {
  focusScore: FocusScore
  streak: UserStreak
  todayEnergy: DailyEnergy | null
  totalFocusMinutes: number
  onViewDetails?: () => void
  className?: string
}) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden", className)}>
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-500" />
            Productivity
          </h3>
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewDetails}
              className="text-xs text-slate-500 h-7 px-2"
            >
              View all
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Focus Score - Compact */}
        <FocusScoreCompact score={focusScore.score} trend={focusScore.trend} />

        {/* Metrics row */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Streak */}
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
            <span className="text-lg">🔥</span>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {streak.currentStreak} days
              </div>
              <div className="text-[10px] text-slate-500">Streak</div>
            </div>
          </div>

          {/* Focus Time */}
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
            <span className="text-lg">⏱️</span>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {(totalFocusMinutes / 60).toFixed(1)}h
              </div>
              <div className="text-[10px] text-slate-500">Today</div>
            </div>
          </div>
        </div>

        {/* Energy Status */}
        {todayEnergy && (
          <div className="pt-2 border-t border-slate-100">
            <EnergyDisplay
              energyLevel={todayEnergy.energyLevel}
              mood={todayEnergy.mood}
            />
          </div>
        )}
      </div>
    </div>
  )
}
