"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

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

function MetricCell({
  value,
  goal,
}: {
  value: number | null
  goal: number
}) {
  if (value === null) {
    return (
      <span className="text-slate-400 text-sm">-</span>
    )
  }

  const isOnTrack = value >= goal

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2 py-1 rounded text-sm font-medium min-w-[3rem]",
        isOnTrack
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      )}
    >
      {value}
    </span>
  )
}

export function ScorecardTable() {
  const [data, setData] = useState<ScorecardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchScorecard() {
      try {
        const response = await fetch("/api/scorecard?weeks=8")
        if (!response.ok) {
          throw new Error("Failed to fetch scorecard data")
        }
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        } else {
          setError(result.error || "Failed to load scorecard")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load scorecard")
      } finally {
        setLoading(false)
      }
    }
    fetchScorecard()
  }, [])

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
      <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
        <p className="text-slate-600 font-medium">No metrics configured yet</p>
        <p className="text-sm text-slate-500 mt-1">
          Set up weekly metrics for team members in the Team Management section
        </p>
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
                  <MetricCell
                    value={row.entries[week]}
                    goal={row.weeklyGoal}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
