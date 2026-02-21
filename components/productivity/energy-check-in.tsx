"use client"

import { useState } from "react"
import { Battery, BatteryLow, BatteryMedium, BatteryFull, Zap, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { EnergyLevel, MoodEmoji, EnergyFactor, DailyEnergyInput } from "@/lib/types"

interface EnergyCheckInProps {
  currentEnergy?: {
    energyLevel: EnergyLevel
    mood: MoodEmoji
    factors: EnergyFactor[]
  } | null
  onSave: (data: DailyEnergyInput) => Promise<void>
  date?: string
  className?: string
}

const energyLevels: { value: EnergyLevel; label: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
  { value: "low", label: "Low", icon: <BatteryLow className="h-5 w-5" />, color: "text-red-500", bgColor: "bg-red-50 border-red-200 hover:bg-red-100" },
  { value: "medium", label: "Medium", icon: <BatteryMedium className="h-5 w-5" />, color: "text-amber-500", bgColor: "bg-amber-50 border-amber-200 hover:bg-amber-100" },
  { value: "high", label: "High", icon: <BatteryFull className="h-5 w-5" />, color: "text-emerald-500", bgColor: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100" },
  { value: "peak", label: "Peak", icon: <Zap className="h-5 w-5" />, color: "text-slate-600", bgColor: "bg-slate-50 border-slate-200 hover:bg-slate-100" },
]

const moodOptions: { value: MoodEmoji; label: string }[] = [
  { value: "😫", label: "Exhausted" },
  { value: "😐", label: "Neutral" },
  { value: "🙂", label: "Good" },
  { value: "😄", label: "Great" },
  { value: "🔥", label: "On Fire" },
]

const factorOptions: { value: EnergyFactor; label: string; icon: string }[] = [
  { value: "good_sleep", label: "Good Sleep", icon: "😴" },
  { value: "exercise", label: "Exercise", icon: "💪" },
  { value: "caffeine", label: "Caffeine", icon: "☕" },
  { value: "stress", label: "Stress", icon: "😰" },
  { value: "meetings", label: "Many Meetings", icon: "📅" },
  { value: "deadline_pressure", label: "Deadline", icon: "⏰" },
  { value: "great_progress", label: "Great Progress", icon: "🚀" },
  { value: "team_support", label: "Team Support", icon: "🤝" },
]

export function EnergyCheckIn({
  currentEnergy,
  onSave,
  date,
  className,
}: EnergyCheckInProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel | null>(
    currentEnergy?.energyLevel || null
  )
  const [selectedMood, setSelectedMood] = useState<MoodEmoji | null>(
    currentEnergy?.mood || null
  )
  const [selectedFactors, setSelectedFactors] = useState<EnergyFactor[]>(
    currentEnergy?.factors || []
  )
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const toggleFactor = (factor: EnergyFactor) => {
    setSelectedFactors((prev) =>
      prev.includes(factor)
        ? prev.filter((f) => f !== factor)
        : [...prev, factor]
    )
  }

  const handleSave = async () => {
    if (!selectedEnergy || !selectedMood) return

    setIsSaving(true)
    try {
      await onSave({
        date: date || new Date().toISOString().split("T")[0],
        energyLevel: selectedEnergy,
        mood: selectedMood,
        factors: selectedFactors,
        notes: notes || undefined,
      })
      setIsOpen(false)
    } catch (err) {
      toast({
        title: "Failed to save",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const currentEnergyLevel = energyLevels.find(
    (e) => e.value === (currentEnergy?.energyLevel || selectedEnergy)
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all w-full text-left",
            className
          )}
        >
          {currentEnergy ? (
            <>
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full",
                  currentEnergyLevel?.bgColor.split(" ")[0]
                )}
              >
                <span className="text-2xl">{currentEnergy.mood}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-medium", currentEnergyLevel?.color)}>
                    {currentEnergyLevel?.label} Energy
                  </span>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {currentEnergy.factors.length > 0
                    ? `${currentEnergy.factors.length} factor${currentEnergy.factors.length !== 1 ? "s" : ""} logged`
                    : "Tap to update"}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100">
                <Battery className="h-5 w-5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-700">
                  How&apos;s your energy?
                </span>
                <p className="text-xs text-slate-500">
                  Quick daily check-in
                </p>
              </div>
            </>
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Daily Energy Check-In</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Energy Level */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">
              Energy Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {energyLevels.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setSelectedEnergy(level.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all",
                    selectedEnergy === level.value
                      ? level.bgColor.replace("hover:", "")
                      : "bg-white border-slate-200 hover:border-slate-300"
                  )}
                >
                  <span className={level.color}>{level.icon}</span>
                  <span className="text-xs font-medium text-slate-600">
                    {level.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Mood */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">
              How do you feel?
            </label>
            <div className="flex justify-between">
              {moodOptions.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setSelectedMood(mood.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                    selectedMood === mood.value
                      ? "bg-slate-100 ring-2 ring-slate-300"
                      : "hover:bg-slate-50"
                  )}
                >
                  <span className="text-2xl">{mood.value}</span>
                  <span className="text-[10px] text-slate-500">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Factors */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">
              What&apos;s affecting your energy? <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {factorOptions.map((factor) => (
                <button
                  key={factor.value}
                  onClick={() => toggleFactor(factor.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all",
                    selectedFactors.includes(factor.value)
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200"
                  )}
                >
                  <span>{factor.icon}</span>
                  <span>{factor.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="Any thoughts on your energy today..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedEnergy || !selectedMood || isSaving}
          >
            {isSaving ? "Saving..." : "Save Check-In"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Compact display version
export function EnergyDisplay({
  energyLevel,
  mood,
  className,
}: {
  energyLevel: EnergyLevel
  mood: MoodEmoji
  className?: string
}) {
  const level = energyLevels.find((e) => e.value === energyLevel)

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className="text-lg">{mood}</span>
      <div className="flex items-center gap-1">
        <span className={level?.color}>{level?.icon}</span>
        <span className={cn("text-xs font-medium", level?.color)}>
          {level?.label}
        </span>
      </div>
    </div>
  )
}
