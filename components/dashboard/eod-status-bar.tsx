"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle2, ClipboardEdit } from "lucide-react"
import { cn } from "@/lib/utils"
import { useThemedIconColors } from "@/lib/hooks/use-themed-icon-colors"

interface EODStatusBarProps {
  hasSubmittedToday: boolean
  onSubmitEOD: () => void
  className?: string
}

export function EODStatusBar({
  hasSubmittedToday,
  onSubmitEOD,
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
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2.5 rounded-lg border border-amber-200 bg-amber-50",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <ClipboardEdit className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-700">
          EOD Not Submitted
        </span>
      </div>
      <Button
        size="sm"
        onClick={onSubmitEOD}
        className="h-7 text-xs"
        style={{
          backgroundColor: themedColors.primary,
          color: "#fff",
        }}
      >
        Submit Now
      </Button>
    </div>
  )
}
