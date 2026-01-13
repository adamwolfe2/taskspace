"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Circle,
  Check,
  X,
  Loader2,
  Pencil,
  Trash2,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ScorecardSummary } from "@/lib/db/scorecard"

interface MetricCardProps {
  metric: ScorecardSummary
  canEdit: boolean
  onUpdateEntry: (metricId: string, value: number, notes?: string) => Promise<void>
  onEditMetric?: (metricId: string) => void
  onDeleteMetric?: (metricId: string) => void
  showHistory?: boolean
}

const statusConfig = {
  green: {
    icon: TrendingUp,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    label: "On Track",
  },
  yellow: {
    icon: Minus,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    label: "At Risk",
  },
  red: {
    icon: TrendingDown,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    label: "Off Track",
  },
  gray: {
    icon: Circle,
    color: "text-slate-400",
    bg: "bg-slate-50",
    border: "border-slate-200",
    label: "No Data",
  },
}

export function MetricCard({
  metric,
  canEdit,
  onUpdateEntry,
  onEditMetric,
  onDeleteMetric,
  showHistory = false,
}: MetricCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(metric.currentValue?.toString() || "")
  const [notes, setNotes] = useState(metric.currentNotes || "")
  const [isSaving, setIsSaving] = useState(false)

  const status = statusConfig[metric.currentStatus]
  const StatusIcon = status.icon

  const handleSave = async () => {
    const numValue = parseFloat(value)
    if (isNaN(numValue)) return

    setIsSaving(true)
    try {
      await onUpdateEntry(metric.metricId, numValue, notes.trim() || undefined)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setValue(metric.currentValue?.toString() || "")
    setNotes(metric.currentNotes || "")
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  const formatTarget = () => {
    if (metric.targetValue === undefined || metric.targetValue === null) return "No target"
    const direction =
      metric.targetDirection === "above"
        ? ">="
        : metric.targetDirection === "below"
          ? "<="
          : "="
    return `${direction} ${metric.targetValue}${metric.unit ? ` ${metric.unit}` : ""}`
  }

  return (
    <Card
      className={cn(
        "relative transition-all",
        status.border,
        isEditing && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <CardContent className="pt-4 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{metric.metricName}</h3>
            {metric.metricDescription && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                {metric.metricDescription}
              </p>
            )}
          </div>

          {/* Status Badge */}
          <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full", status.bg)}>
            <StatusIcon className={cn("h-3.5 w-3.5", status.color)} />
            <span className={cn("text-xs font-medium", status.color)}>{status.label}</span>
          </div>
        </div>

        {/* Owner & Target Info */}
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
          {metric.ownerName && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{metric.ownerName}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs font-normal">
              {formatTarget()}
            </Badge>
          </div>
        </div>

        {/* Value Display / Edit Form */}
        {isEditing ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter value"
                className="w-28"
                autoFocus
                disabled={isSaving}
              />
              {metric.unit && <span className="text-sm text-slate-500">{metric.unit}</span>}
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes (optional)"
              className="text-sm min-h-[60px]"
              disabled={isSaving}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} disabled={isSaving || !value}>
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Check className="h-3 w-3 mr-1" />
                )}
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-bold", status.color)}>
                  {metric.currentValue !== undefined && metric.currentValue !== null
                    ? metric.currentValue
                    : "-"}
                </span>
                {metric.unit && <span className="text-sm text-slate-500">{metric.unit}</span>}
              </div>
              {metric.currentNotes && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{metric.currentNotes}</p>
              )}
            </div>

            {/* Action Buttons */}
            {canEdit && (
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setIsEditing(true)}
                  title="Enter value"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {onEditMetric && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-400 hover:text-slate-600"
                    onClick={() => onEditMetric(metric.metricId)}
                    title="Edit metric settings"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onDeleteMetric && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                    onClick={() => onDeleteMetric(metric.metricId)}
                    title="Delete metric"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Week Label */}
        <div className="mt-3 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            Week of {new Date(metric.weekStart + "T12:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
