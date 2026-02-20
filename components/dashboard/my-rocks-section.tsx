"use client"

import { useState, useMemo } from "react"
import type { Rock, Project } from "@/lib/types"
import { formatDate } from "@/lib/utils/date-utils"
import { AlertCircle, CheckCircle2, Clock, Target, ArrowRight, ChevronRight, RefreshCw, ChevronDown, ChevronUp, Minus, Plus } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { useApp } from "@/lib/contexts/app-context"
import { RockDetailModal } from "@/components/rocks/rock-detail-modal"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useBrandStatusStyles } from "@/lib/hooks/use-brand-status-styles"
import { useThemedIconColors } from "@/lib/hooks/use-themed-icon-colors"

interface MyRocksSectionProps {
  rocks: Rock[]
  onUpdateProgress: (rockId: string, progress: number) => void
  onUpdateRock?: (id: string, updates: Partial<Rock>) => Promise<Rock>
  onRefresh?: () => Promise<void>
  projects?: Project[]
}

// Calculate quarter from a date string (YYYY-MM-DD or ISO format)
function getQuarterFromDate(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1 // 1-12
  const year = date.getFullYear()
  const quarter = Math.ceil(month / 3)
  return `Q${quarter} ${year}`
}

// Get current quarter based on date
function getCurrentQuarter(): string {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const year = now.getFullYear()
  const quarter = Math.ceil(month / 3)
  return `Q${quarter} ${year}`
}

// Parse quarter string to get year and quarter number
function parseQuarter(quarterStr: string): { year: number; quarter: number } | null {
  const match = quarterStr.match(/^Q([1-4])\s+(\d{4})$/)
  if (!match) return null
  return { quarter: parseInt(match[1]), year: parseInt(match[2]) }
}

// Get rock's effective quarter (from due date, falling back to stored quarter)
function getRockQuarter(rock: Rock): string {
  // Calculate quarter from due date for accuracy
  if (rock.dueDate) {
    return getQuarterFromDate(rock.dueDate)
  }
  // Fall back to stored quarter if no due date
  return rock.quarter || getCurrentQuarter()
}

// Get available quarters from rocks and ensure current quarter is included
function getAvailableQuarters(rocks: Rock[]): string[] {
  const quarters = new Set<string>()
  const currentQuarter = getCurrentQuarter()
  quarters.add(currentQuarter)

  rocks.forEach(rock => {
    // Use calculated quarter from due date instead of stored quarter
    const rockQuarter = getRockQuarter(rock)
    if (rockQuarter) {
      quarters.add(rockQuarter)
    }
  })

  // Sort quarters chronologically (most recent first)
  return Array.from(quarters).sort((a, b) => {
    const parsedA = parseQuarter(a)
    const parsedB = parseQuarter(b)
    if (!parsedA || !parsedB) return 0
    if (parsedA.year !== parsedB.year) return parsedB.year - parsedA.year
    return parsedB.quarter - parsedA.quarter
  })
}

export function MyRocksSection({ rocks, onUpdateProgress, onUpdateRock, onRefresh, projects }: MyRocksSectionProps) {
  const { setCurrentPage } = useApp()
  const [_draggedRock, setDraggedRock] = useState<string | null>(null)
  const [selectedRock, setSelectedRock] = useState<Rock | null>(null)
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const { toast } = useToast()
  const { getStatusStyle } = useBrandStatusStyles()
  const themedColors = useThemedIconColors()

  // Get available quarters for filter
  const availableQuarters = useMemo(() => getAvailableQuarters(rocks), [rocks])

  // Filter rocks by selected quarter (using calculated quarter from due date)
  const filteredRocks = useMemo(() => {
    if (selectedQuarter === "all") return rocks
    return rocks.filter(rock => getRockQuarter(rock) === selectedQuarter)
  }, [rocks, selectedQuarter])

  const getStatusIcon = (status: Rock["status"]) => {
    switch (status) {
      case "on-track":
        return { icon: CheckCircle2, label: "On Track" }
      case "at-risk":
        return { icon: Clock, label: "At Risk" }
      case "blocked":
        return { icon: AlertCircle, label: "Blocked" }
      case "completed":
        return { icon: CheckCircle2, label: "Completed" }
      default:
        return { icon: Target, label: "Unknown" }
    }
  }

  const handleSliderChange = (rockId: string, value: number) => {
    setDraggedRock(rockId)
    onUpdateProgress(rockId, value)
  }

  const handleSliderRelease = () => {
    setDraggedRock(null)
  }

  const handleRefresh = async () => {
    if (!onRefresh) return
    setIsRefreshing(true)
    try {
      await onRefresh()
      toast({
        title: "Rocks refreshed",
        description: "Your rocks have been synchronized",
      })
    } catch {
      toast({
        title: "Refresh failed",
        description: "Failed to sync rocks",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="section-card">
      <div className="section-header flex-col items-start gap-3">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
              aria-label={isExpanded ? "Collapse section" : "Expand section"}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" style={{ color: themedColors.secondary }} />
              ) : (
                <ChevronDown className="h-4 w-4" style={{ color: themedColors.secondary }} />
              )}
            </button>
            <Target className="h-5 w-5" style={{ color: themedColors.secondary }} />
            <h3 className="font-semibold text-slate-900">My Rocks</h3>
            <span className="text-sm text-slate-500">({filteredRocks.length})</span>
          </div>
          <div className="flex items-center gap-3">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Syncing..." : "Refresh"}
              </Button>
            )}
            {rocks.length > 0 && (
              <button className="text-sm text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {/* Quarter Filter Tabs */}
        {availableQuarters.length > 0 && (
          <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedQuarter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedQuarter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({rocks.length})
            </button>
            {availableQuarters.map((quarter) => {
              const count = rocks.filter(r => getRockQuarter(r) === quarter).length
              return (
                <button
                  key={quarter}
                  onClick={() => setSelectedQuarter(quarter)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    selectedQuarter === quarter
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {quarter} ({count})
                </button>
              )
            })}
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="p-5">
          {filteredRocks.length === 0 ? (
          <EmptyState
            icon={Target}
            title={rocks.length === 0 ? "No rocks assigned yet" : `No rocks in ${selectedQuarter}`}
            description={
              rocks.length === 0
                ? "Set quarterly goals to track your most important priorities"
                : `You have ${rocks.length} rock${rocks.length === 1 ? "" : "s"} in other quarters`
            }
            size="sm"
            action={
              rocks.length === 0
                ? { label: "Go to Rocks", onClick: () => setCurrentPage("rocks") }
                : { label: "View All", onClick: () => setSelectedQuarter("all") }
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredRocks.map((rock) => {
              const { icon: StatusIcon, label: statusLabel } = getStatusIcon(rock.status)
              const statusStyle = getStatusStyle(rock.status)
              return (
                <div
                  key={rock.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors duration-200"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusIcon className="h-4 w-4 flex-shrink-0" style={{ color: statusStyle.color }} />
                        <h4 className="font-medium text-slate-900 truncate">{rock.title}</h4>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2">{rock.description}</p>
                    </div>
                    <span
                      className="status-pill flex-shrink-0"
                      style={{
                        backgroundColor: statusStyle.backgroundColor,
                        color: statusStyle.color,
                        borderColor: statusStyle.borderColor,
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Progress</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSliderChange(rock.id, Math.max(0, rock.progress - 10))}
                          className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          aria-label="Decrease progress by 10%"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-semibold text-slate-700 w-10 text-center">{rock.progress}%</span>
                        <button
                          onClick={() => handleSliderChange(rock.id, Math.min(100, rock.progress + 10))}
                          className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          aria-label="Increase progress by 10%"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-600 rounded-full transition-all duration-300"
                          style={{ width: `${rock.progress}%` }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={rock.progress}
                        onChange={(e) => handleSliderChange(rock.id, Number(e.target.value))}
                        onMouseUp={handleSliderRelease}
                        onTouchEnd={handleSliderRelease}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Milestones preview */}
                  {rock.milestones && rock.milestones.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Milestones</span>
                        <span>
                          {rock.milestones.filter((m) => m.completed).length}/{rock.milestones.length}
                        </span>
                      </div>
                      {rock.milestones.slice(0, 2).map((milestone) => (
                        <div key={milestone.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={milestone.completed}
                            className="h-3.5 w-3.5"
                            disabled
                          />
                          <span
                            className={`truncate text-xs ${
                              milestone.completed ? "line-through text-slate-400" : "text-slate-600"
                            }`}
                          >
                            {milestone.text}
                          </span>
                        </div>
                      ))}
                      {rock.milestones.length > 2 && (
                        <p className="text-xs text-slate-400">+{rock.milestones.length - 2} more</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400">Due: {formatDate(rock.dueDate)}</span>
                    {onUpdateRock && (
                      <button
                        onClick={() => setSelectedRock(rock)}
                        className="text-xs text-primary hover:text-slate-700 font-medium flex items-center gap-0.5"
                      >
                        Details <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </div>
      )}

      {/* Rock Detail Modal */}
      {selectedRock && onUpdateRock && (
        <RockDetailModal
          open={!!selectedRock}
          onOpenChange={(open) => !open && setSelectedRock(null)}
          rock={selectedRock}
          onUpdateRock={onUpdateRock}
          projects={projects}
        />
      )}
    </div>
  )
}
