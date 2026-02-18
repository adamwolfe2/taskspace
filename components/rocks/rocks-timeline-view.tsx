"use client"

import { useMemo } from "react"
import type { Rock } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useBrandStatusStyles } from "@/lib/hooks/use-brand-status-styles"
import {
  Target,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Ban,
  CheckCircle2,
} from "lucide-react"
import {
  format,
  startOfQuarter,
  endOfQuarter,
  eachWeekOfInterval,
  isWithinInterval,
  parseISO,
  differenceInDays,
} from "date-fns"
import { ProgressBar } from "@/components/shared/progress-bar"

interface RocksTimelineViewProps {
  rocks: Rock[]
  quarter?: string
}

export function RocksTimelineView({ rocks, quarter }: RocksTimelineViewProps) {
  const { getStatusStyle } = useBrandStatusStyles()

  // Calculate quarter date range
  const { quarterStart, quarterEnd, weeks } = useMemo(() => {
    const now = new Date()
    const start = startOfQuarter(now)
    const end = endOfQuarter(now)
    const weekList = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })

    return {
      quarterStart: start,
      quarterEnd: end,
      weeks: weekList,
    }
  }, [])

  // Filter rocks for current quarter if specified
  const displayRocks = quarter
    ? rocks.filter((r) => r.quarter === quarter)
    : rocks

  const getStatusIcon = (status: Rock["status"]) => {
    const icons = {
      "on-track": TrendingUp,
      "at-risk": AlertTriangle,
      blocked: Ban,
      completed: CheckCircle2,
    }
    return icons[status]
  }

  // Calculate timeline position for a rock
  const getTimelinePosition = (rock: Rock) => {
    if (!rock.dueDate) return { left: 0, width: 100 }

    const rockDate = parseISO(rock.dueDate)
    const totalDays = differenceInDays(quarterEnd, quarterStart)
    const daysSinceStart = differenceInDays(rockDate, quarterStart)

    const position = (daysSinceStart / totalDays) * 100
    const width = Math.max(5, 100 - position) // Minimum 5% width

    return {
      left: Math.max(0, Math.min(95, position)),
      width: Math.min(width, 100 - position),
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-50">
            <Calendar className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Rocks Timeline</h3>
            <p className="text-sm text-muted-foreground">
              {format(quarterStart, "MMM d")} - {format(quarterEnd, "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <Badge variant="secondary">
          {displayRocks.length} {displayRocks.length === 1 ? "Rock" : "Rocks"}
        </Badge>
      </div>

      {/* Timeline Header - Week Labels */}
      <div className="relative">
        <div className="h-12 border-b border-border flex">
          {weeks.map((week, idx) => (
            <div
              key={idx}
              className="flex-1 text-center border-r border-border last:border-r-0"
            >
              <div className="text-xs font-medium text-muted-foreground py-2">
                W{idx + 1}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {format(week, "MMM d")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Rows - Each Rock */}
      <div className="space-y-3">
        {displayRocks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No rocks for this quarter</p>
          </div>
        ) : (
          displayRocks.map((rock) => {
            const StatusIcon = getStatusIcon(rock.status)
            const position = getTimelinePosition(rock)

            return (
              <div
                key={rock.id}
                className="group relative border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
              >
                {/* Rock Info */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="p-1.5 rounded-lg border flex-shrink-0"
                      style={getStatusStyle(rock.status)}
                    >
                      <StatusIcon className="h-4 w-4" style={{ color: getStatusStyle(rock.status).color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground line-clamp-1">
                        {rock.title}
                      </h4>
                      {rock.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                          {rock.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {rock.quarter || "No Quarter"}
                    </Badge>
                    <Badge className="text-xs border" style={getStatusStyle(rock.status)}>
                      {rock.status}
                    </Badge>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <ProgressBar value={rock.progress} size="sm" />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Progress</span>
                    <span className="text-xs font-medium text-foreground">
                      {rock.progress}%
                    </span>
                  </div>
                </div>

                {/* Timeline Bar */}
                <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
                  {/* Current week indicator */}
                  <div className="absolute inset-y-0 left-0 right-0 flex">
                    {weeks.map((week, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex-1 border-r border-border/50 last:border-r-0",
                          isWithinInterval(new Date(), {
                            start: week,
                            end: new Date(week.getTime() + 7 * 24 * 60 * 60 * 1000),
                          }) && "bg-primary/5"
                        )}
                      />
                    ))}
                  </div>

                  {/* Rock timeline bar */}
                  {rock.dueDate && (
                    <div
                      className="absolute inset-y-1 rounded flex items-center justify-center text-xs font-medium transition-all text-white"
                      style={{
                        left: `${position.left}%`,
                        width: `${position.width}%`,
                        backgroundColor: getStatusStyle(rock.status).color,
                      }}
                    >
                      {rock.dueDate && (
                        <span className="truncate px-2">
                          Due {format(parseISO(rock.dueDate), "MMM d")}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Metadata */}
                {rock.userName && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Owner: {rock.userName}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
