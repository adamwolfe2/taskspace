"use client"

import { useState } from "react"
import { Plus, Clock, Star, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCategoryInfo, formatDuration } from "@/lib/productivity/calculations"
import type { FocusBlock, FocusBlockCategory, FocusBlockInput } from "@/lib/types"

interface FocusBlockLoggerProps {
  onSave: (data: FocusBlockInput) => Promise<void>
  recentBlocks?: FocusBlock[]
  className?: string
}

const categories: { value: FocusBlockCategory; label: string; icon: string }[] = [
  { value: "deep_work", label: "Deep Work", icon: "🎯" },
  { value: "meetings", label: "Meetings", icon: "👥" },
  { value: "admin", label: "Admin", icon: "📋" },
  { value: "collaboration", label: "Collaboration", icon: "🤝" },
  { value: "learning", label: "Learning", icon: "📚" },
  { value: "planning", label: "Planning", icon: "📊" },
]

const qualityRatings = [
  { value: 1, label: "Poor", description: "Many distractions" },
  { value: 2, label: "Fair", description: "Some interruptions" },
  { value: 3, label: "Good", description: "Decent focus" },
  { value: 4, label: "Great", description: "Strong focus" },
  { value: 5, label: "Excellent", description: "Peak focus" },
]

export function FocusBlockLogger({
  onSave,
  recentBlocks = [],
  className,
}: FocusBlockLoggerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [category, setCategory] = useState<FocusBlockCategory>("deep_work")
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [interruptions, setInterruptions] = useState(0)
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Set default times
  const setDefaultTimes = () => {
    const now = new Date()
    const end = now.toTimeString().slice(0, 5)
    const start = new Date(now.getTime() - 60 * 60 * 1000).toTimeString().slice(0, 5)
    setStartTime(start)
    setEndTime(end)
  }

  const handleOpen = (open: boolean) => {
    if (open) {
      setDefaultTimes()
      setError(null)
    }
    setIsOpen(open)
  }

  const calculateDuration = () => {
    if (!startTime || !endTime) return 0
    const [startH, startM] = startTime.split(":").map(Number)
    const [endH, endM] = endTime.split(":").map(Number)
    const startMins = startH * 60 + startM
    const endMins = endH * 60 + endM
    return Math.max(0, endMins - startMins)
  }

  const duration = calculateDuration()

  const handleSave = async () => {
    if (!startTime || !endTime) {
      setError("Please select start and end times")
      return
    }

    if (duration <= 0) {
      setError("End time must be after start time")
      return
    }

    if (duration > 12 * 60) {
      setError("Focus block cannot exceed 12 hours")
      return
    }

    setError(null)
    setIsSaving(true)

    try {
      // Create ISO timestamps for today
      const today = new Date().toISOString().split("T")[0]
      await onSave({
        startTime: `${today}T${startTime}:00`,
        endTime: `${today}T${endTime}:00`,
        category,
        quality,
        interruptions,
        notes: notes || undefined,
      })
      setIsOpen(false)
      // Reset form
      setNotes("")
      setInterruptions(0)
      setQuality(3)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={cn("bg-white rounded-xl border border-slate-100 shadow-sm", className)}>
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              Focus Time
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Log your focus sessions
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={handleOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Log Time
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Log Focus Block</DialogTitle>
              </DialogHeader>

              <div className="space-y-5 py-4">
                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Duration display */}
                {duration > 0 && (
                  <div className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-2 rounded-lg">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">Duration:</span>
                    <span className="font-medium text-slate-900">
                      {formatDuration(duration)}
                    </span>
                  </div>
                )}

                {/* Category */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as FocusBlockCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quality Rating */}
                <div className="space-y-2">
                  <Label>Focus Quality</Label>
                  <div className="flex justify-between gap-1">
                    {qualityRatings.map((rating) => (
                      <button
                        key={rating.value}
                        onClick={() => setQuality(rating.value as 1 | 2 | 3 | 4 | 5)}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                          quality === rating.value
                            ? "bg-red-50 ring-2 ring-red-200"
                            : "hover:bg-slate-50"
                        )}
                      >
                        <div className="flex">
                          {[...Array(rating.value)].map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "h-3 w-3",
                                quality >= rating.value
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-300"
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {rating.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interruptions */}
                <div className="space-y-2">
                  <Label>Interruptions</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setInterruptions(Math.max(0, interruptions - 1))}
                      disabled={interruptions === 0}
                    >
                      -
                    </Button>
                    <span className="text-lg font-semibold w-8 text-center">
                      {interruptions}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setInterruptions(interruptions + 1)}
                    >
                      +
                    </Button>
                    <span className="text-xs text-slate-500">
                      times distracted
                    </span>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="What did you work on?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving || duration <= 0}>
                  {isSaving ? "Saving..." : "Save Focus Block"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Recent blocks list */}
      <div className="divide-y divide-slate-100">
        {recentBlocks.length === 0 ? (
          <div className="p-6 text-center">
            <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No focus blocks logged today</p>
            <p className="text-xs text-slate-400 mt-1">
              Click &quot;Log Time&quot; to track your focus
            </p>
          </div>
        ) : (
          recentBlocks.slice(0, 5).map((block) => (
            <FocusBlockItem key={block.id} block={block} />
          ))
        )}
      </div>
    </div>
  )
}

function FocusBlockItem({ block }: { block: FocusBlock }) {
  const categoryInfo = getCategoryInfo(block.category)
  const startTime = new Date(block.startTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
  const endTime = new Date(block.endTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  // Calculate duration
  const durationMs = new Date(block.endTime).getTime() - new Date(block.startTime).getTime()
  const durationMins = Math.round(durationMs / 60000)

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg text-sm bg-slate-100">
        {categoryInfo.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">
            {categoryInfo.label}
          </span>
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded",
            categoryInfo.color
          )}>
            {formatDuration(durationMins)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{startTime} - {endTime}</span>
          {block.quality && (
            <>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                {[...Array(block.quality)].map((_, i) => (
                  <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                ))}
              </span>
            </>
          )}
          {block.interruptions > 0 && (
            <>
              <span>•</span>
              <span>{block.interruptions} interruption{block.interruptions !== 1 ? "s" : ""}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Quick log button for compact use
export function QuickFocusLog({
  onQuickLog,
  className,
}: {
  onQuickLog: (minutes: number, category: FocusBlockCategory) => void
  className?: string
}) {
  const quickOptions = [
    { minutes: 25, label: "25m", category: "deep_work" as FocusBlockCategory },
    { minutes: 50, label: "50m", category: "deep_work" as FocusBlockCategory },
    { minutes: 30, label: "30m mtg", category: "meetings" as FocusBlockCategory },
    { minutes: 60, label: "1h mtg", category: "meetings" as FocusBlockCategory },
  ]

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs text-slate-500">Quick log:</span>
      {quickOptions.map((opt) => (
        <button
          key={`${opt.minutes}-${opt.category}`}
          onClick={() => onQuickLog(opt.minutes, opt.category)}
          className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
