"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Pencil, Check, X, Loader2, BarChart3 } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { useToast } from "@/hooks/use-toast"

interface ScorecardRow {
  memberId: string
  memberName: string
  department: string
  metricName: string
  weeklyGoal: number
  entries: Record<string, number | null>
}

interface ScorecardData {
  weeks: string[]
  rows: ScorecardRow[]
}

function formatWeekHeader(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const MetricCell = React.memo(function MetricCell({
  value,
  goal,
  isAdmin,
  onEdit,
}: {
  value: number | null
  goal: number
  isAdmin?: boolean
  onEdit?: () => void
}) {
  if (value === null) {
    return (
      <div
        className={cn(
          "flex items-center justify-center",
          isAdmin && "cursor-pointer hover:bg-slate-100 rounded py-1 px-2"
        )}
        onClick={isAdmin ? onEdit : undefined}
        title={isAdmin ? "Click to add value" : undefined}
      >
        <span className="text-slate-400 text-sm">-</span>
        {isAdmin && <Pencil className="h-3 w-3 text-slate-300 ml-1" />}
      </div>
    )
  }

  const isOnTrack = value >= goal

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        isAdmin && "cursor-pointer"
      )}
      onClick={isAdmin ? onEdit : undefined}
      title={isAdmin ? "Click to edit" : undefined}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center px-2 py-1 rounded text-sm font-medium min-w-[3rem]",
          isOnTrack
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800",
          isAdmin && "hover:ring-2 hover:ring-offset-1 hover:ring-slate-300"
        )}
      >
        {value}
      </span>
    </div>
  )
})

// Inline edit component for metric values
const EditableMetricCell = React.memo(function EditableMetricCell({
  memberId,
  weekEnding,
  currentValue,
  goal,
  onSave,
  onCancel,
}: {
  memberId: string
  weekEnding: string
  currentValue: number | null
  goal: number
  onSave: (value: number) => Promise<void>
  onCancel: () => void
}) {
  const [value, setValue] = useState(currentValue?.toString() || "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const numValue = parseInt(value, 10)
    if (isNaN(numValue) || numValue < 0) {
      return
    }
    setSaving(true)
    try {
      await onSave(numValue)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      onCancel()
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-16 h-8 text-center text-sm"
        autoFocus
        disabled={saving}
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        onClick={handleSave}
        disabled={saving}
        aria-label="Save"
      >
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3 text-green-600" />
        )}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        onClick={onCancel}
        disabled={saving}
        aria-label="Cancel"
      >
        <X className="h-3 w-3 text-red-600" />
      </Button>
    </div>
  )
})

export function ScorecardTable() {
  const [data, setData] = useState<ScorecardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [editingCell, setEditingCell] = useState<{ memberId: string; week: string } | null>(null)
  const { toast } = useToast()

  const fetchScorecard = useCallback(async () => {
    try {
      const response = await fetch("/api/scorecard?weeks=8")
      if (!response.ok) {
        throw new Error("Failed to fetch scorecard data")
      }
      const result = await response.json()
      if (result.success) {
        setData(result.data)
        setIsAdmin(result.isAdmin || false)
      } else {
        setError(result.error || "Failed to load scorecard")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scorecard")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchScorecard()
  }, [fetchScorecard])

  const handleSaveMetric = async (memberId: string, weekEnding: string, value: number) => {
    try {
      const response = await fetch("/api/scorecard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ memberId, weekEnding, value }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to update metric")
      }

      // Update local data
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          rows: prev.rows.map((row) => {
            if (row.memberId === memberId) {
              return {
                ...row,
                entries: {
                  ...row.entries,
                  [weekEnding]: value,
                },
              }
            }
            return row
          }),
        }
      })

      setEditingCell(null)
      toast({
        title: "Metric updated",
        description: "Weekly scorecard entry has been saved",
      })
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Failed to update metric",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50">
        <EmptyState
          icon={BarChart3}
          title="No metrics configured yet"
          description="Set up weekly metrics for team members in the Team Management section"
          size="md"
        />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-white z-10 min-w-[150px]">
              Team Member
            </TableHead>
            <TableHead className="min-w-[120px]">Metric</TableHead>
            <TableHead className="text-center min-w-[60px]">Goal</TableHead>
            {data.weeks.map((week) => (
              <TableHead key={week} className="text-center min-w-[80px]">
                {formatWeekHeader(week)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row) => (
            <TableRow key={row.memberId}>
              <TableCell className="sticky left-0 bg-white z-10 font-medium">
                <div>
                  <p className="font-medium text-slate-900">{row.memberName}</p>
                  <p className="text-xs text-slate-500">{row.department}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-normal">
                  {row.metricName}
                </Badge>
              </TableCell>
              <TableCell className="text-center font-medium text-slate-700">
                {row.weeklyGoal}
              </TableCell>
              {data.weeks.map((week) => (
                <TableCell key={week} className="text-center">
                  {editingCell?.memberId === row.memberId && editingCell?.week === week ? (
                    <EditableMetricCell
                      memberId={row.memberId}
                      weekEnding={week}
                      currentValue={row.entries[week]}
                      goal={row.weeklyGoal}
                      onSave={(value) => handleSaveMetric(row.memberId, week, value)}
                      onCancel={() => setEditingCell(null)}
                    />
                  ) : (
                    <MetricCell
                      value={row.entries[week]}
                      goal={row.weeklyGoal}
                      isAdmin={isAdmin}
                      onEdit={() => setEditingCell({ memberId: row.memberId, week })}
                    />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
