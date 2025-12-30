"use client"

import { useState } from "react"
import type { Rock, RockMilestone } from "@/lib/types"
import { formatDate } from "@/lib/utils/date-utils"
import { AlertCircle, CheckCircle2, Clock, Target, ArrowRight, ChevronRight } from "lucide-react"
import { RockDetailModal } from "@/components/rocks/rock-detail-modal"
import { Checkbox } from "@/components/ui/checkbox"

interface MyRocksSectionProps {
  rocks: Rock[]
  onUpdateProgress: (rockId: string, progress: number) => void
  onUpdateRock?: (id: string, updates: Partial<Rock>) => Promise<Rock>
}

export function MyRocksSection({ rocks, onUpdateProgress, onUpdateRock }: MyRocksSectionProps) {
  const [draggedRock, setDraggedRock] = useState<string | null>(null)
  const [selectedRock, setSelectedRock] = useState<Rock | null>(null)

  const getStatusConfig = (status: Rock["status"]) => {
    switch (status) {
      case "on-track":
        return {
          icon: CheckCircle2,
          label: "On Track",
          bgColor: "bg-emerald-50",
          textColor: "text-emerald-700",
          iconColor: "text-emerald-500",
        }
      case "at-risk":
        return {
          icon: Clock,
          label: "At Risk",
          bgColor: "bg-amber-50",
          textColor: "text-amber-700",
          iconColor: "text-amber-500",
        }
      case "blocked":
        return {
          icon: AlertCircle,
          label: "Blocked",
          bgColor: "bg-red-50",
          textColor: "text-red-700",
          iconColor: "text-red-500",
        }
      case "completed":
        return {
          icon: CheckCircle2,
          label: "Completed",
          bgColor: "bg-slate-100",
          textColor: "text-slate-700",
          iconColor: "text-slate-500",
        }
    }
  }

  const handleSliderChange = (rockId: string, value: number) => {
    setDraggedRock(rockId)
    onUpdateProgress(rockId, value)
  }

  const handleSliderRelease = () => {
    setDraggedRock(null)
  }

  return (
    <div className="bg-white rounded-xl shadow-card">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-slate-900">My Rocks</h3>
            <span className="text-sm text-slate-500">({rocks.length})</span>
          </div>
          {rocks.length > 0 && (
            <button className="text-sm text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-5">
        {rocks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No rocks assigned yet</p>
            <p className="text-sm text-slate-400 mt-1">Your quarterly goals will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rocks.map((rock) => {
              const statusConfig = getStatusConfig(rock.status)
              const StatusIcon = statusConfig.icon
              return (
                <div
                  key={rock.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors duration-200"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusIcon className={`h-4 w-4 ${statusConfig.iconColor} flex-shrink-0`} />
                        <h4 className="font-medium text-slate-900 truncate">{rock.title}</h4>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2">{rock.description}</p>
                    </div>
                    <span className={`status-pill ${statusConfig.bgColor} ${statusConfig.textColor} flex-shrink-0`}>
                      {statusConfig.label}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Progress</span>
                      <span className="font-semibold text-slate-700">{rock.progress}%</span>
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
                        className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-0.5"
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

      {/* Rock Detail Modal */}
      {selectedRock && onUpdateRock && (
        <RockDetailModal
          open={!!selectedRock}
          onOpenChange={(open) => !open && setSelectedRock(null)}
          rock={selectedRock}
          onUpdateRock={onUpdateRock}
        />
      )}
    </div>
  )
}
