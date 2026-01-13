"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, RotateCcw, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface MeetingTimerProps {
  targetMinutes: number
  sectionName: string
  onTimeUp?: () => void
  autoStart?: boolean
  className?: string
}

export function MeetingTimer({
  targetMinutes,
  sectionName,
  onTimeUp,
  autoStart = false,
  className,
}: MeetingTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(targetMinutes * 60)
  const [isRunning, setIsRunning] = useState(autoStart)
  const [hasTriggeredTimeUp, setHasTriggeredTimeUp] = useState(false)

  const reset = useCallback(() => {
    setSecondsRemaining(targetMinutes * 60)
    setIsRunning(false)
    setHasTriggeredTimeUp(false)
  }, [targetMinutes])

  useEffect(() => {
    reset()
  }, [targetMinutes, reset])

  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (!hasTriggeredTimeUp && onTimeUp) {
            setHasTriggeredTimeUp(true)
            onTimeUp()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, hasTriggeredTimeUp, onTimeUp])

  const formatTime = (totalSeconds: number) => {
    const absSeconds = Math.abs(totalSeconds)
    const minutes = Math.floor(absSeconds / 60)
    const seconds = absSeconds % 60
    const sign = totalSeconds < 0 ? "-" : ""
    return `${sign}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const progress = Math.max(0, Math.min(100, (secondsRemaining / (targetMinutes * 60)) * 100))
  const isOvertime = secondsRemaining <= 0
  const isWarning = secondsRemaining > 0 && secondsRemaining <= 60

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* Timer Display */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xl font-semibold min-w-[120px] justify-center",
          isOvertime && "bg-red-100 text-red-700",
          isWarning && "bg-amber-100 text-amber-700",
          !isOvertime && !isWarning && "bg-slate-100 text-slate-700"
        )}
      >
        <Clock
          className={cn(
            "h-5 w-5",
            isOvertime && "text-red-600 animate-pulse",
            isWarning && "text-amber-600",
            !isOvertime && !isWarning && "text-slate-500"
          )}
        />
        {formatTime(secondsRemaining)}
      </div>

      {/* Progress Bar */}
      <div className="flex-1 max-w-[200px]">
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-1000 rounded-full",
              isOvertime && "bg-red-500",
              isWarning && "bg-amber-500",
              !isOvertime && !isWarning && "bg-emerald-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>{sectionName}</span>
          <span>{targetMinutes} min</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsRunning(!isRunning)}
          className="h-8 w-8"
        >
          {isRunning ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={reset}
          className="h-8 w-8"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
