"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle2, ClipboardEdit, Flame, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useThemedIconColors } from "@/lib/hooks/use-themed-icon-colors"

interface EODStatusBarProps {
  hasSubmittedToday: boolean
  onSubmitEOD: () => void
  streakDays?: number
  className?: string
}

export function EODStatusBar({
  hasSubmittedToday,
  onSubmitEOD,
  streakDays,
  className,
}: EODStatusBarProps) {
  const themedColors = useThemedIconColors()

  if (hasSubmittedToday) {
    return (
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2.5 rounded-lg border",
          className
        )}
        style={{
          backgroundColor: themedColors.primaryAlpha10,
          borderColor: themedColors.primaryLight,
        }}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" style={{ color: themedColors.primary }} />
          <span className="text-sm font-medium" style={{ color: themedColors.primary }}>
            EOD Submitted
          </span>
        </div>
        {streakDays && streakDays > 1 && (
          <div className="flex items-center gap-1">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold text-orange-600">{streakDays} day streak</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3.5 rounded-lg border-2 border-amber-300 bg-amber-50 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <ClipboardEdit className="h-5 w-5 text-amber-600" />
        <div>
          <span className="text-sm font-semibold text-amber-800">
            EOD Not Submitted
          </span>
          <p className="text-xs text-amber-600">Fill out the form below to submit your daily report</p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={onSubmitEOD}
        className="h-8 text-sm font-medium gap-1.5"
        style={{
          backgroundColor: themedColors.primary,
          color: "#fff",
        }}
      >
        Submit Now
        <ArrowDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
