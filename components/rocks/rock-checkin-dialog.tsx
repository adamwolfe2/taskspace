"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  TrendingUp,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useThemedIconColors } from "@/lib/hooks/use-themed-icon-colors"

type Confidence = "on_track" | "at_risk" | "off_track"

interface RockCheckinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rockId: string
  rockTitle: string
  currentProgress: number
  currentConfidence?: Confidence
  onCheckinComplete?: () => void
}

const confidenceOptions: {
  value: Confidence
  label: string
  icon: typeof CheckCircle2
  color: string
  bgColor: string
  description: string
}[] = [
  {
    value: "on_track",
    label: "On Track",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200 hover:bg-green-100",
    description: "Making good progress, confident we'll hit the goal",
  },
  {
    value: "at_risk",
    label: "At Risk",
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100",
    description: "Some concerns, may need adjustments or help",
  },
  {
    value: "off_track",
    label: "Off Track",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200 hover:bg-red-100",
    description: "Significant issues, unlikely to complete without intervention",
  },
]

export function RockCheckinDialog({
  open,
  onOpenChange,
  rockId,
  rockTitle,
  currentProgress,
  currentConfidence = "on_track",
  onCheckinComplete,
}: RockCheckinDialogProps) {
  const { toast } = useToast()
  const themedColors = useThemedIconColors()
  const [confidence, setConfidence] = useState<Confidence>(currentConfidence)
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/rocks/${rockId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: JSON.stringify({
          confidence,
          notes: notes.trim() || undefined,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to submit check-in")
      }

      toast({
        title: "Check-in Submitted",
        description: `Confidence updated to "${confidenceOptions.find((o) => o.value === confidence)?.label}"`,
      })

      onOpenChange(false)
      setNotes("")
      onCheckinComplete?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit check-in",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Weekly Rock Check-in
          </DialogTitle>
          <DialogDescription>
            Update your confidence level for this rock
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rock Info */}
          <div className="p-3 bg-slate-50 rounded-lg">
            <h4 className="font-medium text-slate-900">{rockTitle}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{currentProgress}% complete</Badge>
            </div>
          </div>

          {/* Confidence Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">How confident are you about this rock?</Label>
            <div className="space-y-2">
              {confidenceOptions.map((option) => {
                const Icon = option.icon
                const isSelected = confidence === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setConfidence(option.value)}
                    disabled={isLoading}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left",
                      isSelected
                        ? cn(option.bgColor, "border-current")
                        : "bg-white border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 mt-0.5 flex-shrink-0",
                        isSelected ? option.color : ""
                      )}
                      style={!isSelected ? { color: themedColors.secondary } : undefined}
                    />
                    <div className="flex-1">
                      <div
                        className={cn(
                          "font-medium",
                          isSelected ? option.color : "text-slate-700"
                        )}
                      >
                        {option.label}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {option.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any context, blockers, or updates..."
              rows={3}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Check-in
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
