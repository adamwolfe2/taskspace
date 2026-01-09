"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Clock,
  Flame,
} from "lucide-react"

// Rock progress data for display
interface RockProgress {
  id: string
  progress: number // 0-100
  status: "on-track" | "at-risk" | "blocked" | "completed"
}

// Task for display
interface BentoTask {
  description: string
  rockTitle?: string
  date?: string
  completedAt?: string
}

// User bento card data
export interface UserBentoData {
  userName: string
  userRole: "owner" | "admin" | "member"
  department: string
  jobTitle?: string
  // Metrics
  totalTasks: number
  totalReports?: number // For weekly view
  reportsSubmitted?: number // For daily view (0 or 1)
  escalationCount: number
  // Rock progress (just bars, no names)
  rocks: RockProgress[]
  // Detailed tasks (for expansion)
  tasks: BentoTask[]
  // Period info
  periodType: "daily" | "weekly"
}

// Progress bar component without labels
function RockProgressBar({
  progress,
  status,
  size = "sm"
}: {
  progress: number
  status: RockProgress["status"]
  size?: "sm" | "md"
}) {
  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "from-emerald-400 to-emerald-500"
      case "on-track":
        return "from-blue-400 to-blue-500"
      case "at-risk":
        return "from-amber-400 to-amber-500"
      case "blocked":
        return "from-red-400 to-red-500"
      default:
        return "from-slate-300 to-slate-400"
    }
  }

  return (
    <div
      className={cn(
        "w-full bg-slate-100 rounded-full overflow-hidden",
        size === "sm" ? "h-1.5" : "h-2"
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r transition-all duration-500",
          getStatusColor()
        )}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  )
}

// Mini stat display
function MiniStat({
  value,
  label,
  icon: Icon,
  highlight = false,
  trend,
}: {
  value: string | number
  label: string
  icon: React.ElementType
  highlight?: boolean
  trend?: "up" | "down" | "neutral"
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-2 rounded-lg transition-colors",
      highlight ? "bg-green-50" : "bg-slate-50"
    )}>
      <div className="flex items-center gap-1">
        <Icon className={cn(
          "h-3.5 w-3.5",
          highlight ? "text-green-500" : "text-slate-400"
        )} />
        <span className={cn(
          "text-lg font-bold",
          highlight ? "text-green-600" : "text-slate-900"
        )}>
          {value}
        </span>
        {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
      </div>
      <span className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</span>
    </div>
  )
}

export function UserBentoCard({
  data,
  className,
  defaultExpanded = false,
}: {
  data: UserBentoData
  className?: string
  defaultExpanded?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Calculate aggregate rock progress
  const avgRockProgress = useMemo(() => {
    if (data.rocks.length === 0) return 0
    return Math.round(data.rocks.reduce((acc, r) => acc + r.progress, 0) / data.rocks.length)
  }, [data.rocks])

  // Group tasks by date for weekly view
  const tasksByDate = useMemo(() => {
    if (data.periodType !== "weekly") return null
    return data.tasks.reduce((acc, task) => {
      const date = task.date || "Unknown"
      if (!acc[date]) acc[date] = []
      acc[date].push(task)
      return acc
    }, {} as Record<string, BentoTask[]>)
  }, [data.tasks, data.periodType])

  // Role badge
  const getRoleBadge = () => {
    switch (data.userRole) {
      case "owner":
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700 rounded">OWNER</span>
      case "admin":
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded">ADMIN</span>
      default:
        return null
    }
  }

  // Count rocks by status
  const rockStatusCounts = useMemo(() => {
    return data.rocks.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [data.rocks])

  return (
    <div className={cn(
      "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300",
      "hover:shadow-md hover:border-slate-300",
      className
    )}>
      {/* Header - Always visible */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Name row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 text-base">{data.userName}</h3>
            {getRoleBadge()}
          </div>
          <button
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
        </div>

        {/* Department/Title - compact */}
        <p className="text-xs text-slate-500 mb-3">{data.jobTitle || data.department}</p>

        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <MiniStat
            value={data.totalTasks}
            label="Tasks"
            icon={CheckCircle2}
            highlight={data.totalTasks > 0}
          />
          <MiniStat
            value={data.rocks.length}
            label="Rocks"
            icon={Target}
          />
          {data.periodType === "weekly" ? (
            <MiniStat
              value={data.totalReports || 0}
              label="Reports"
              icon={Calendar}
              highlight={(data.totalReports || 0) >= 4}
            />
          ) : (
            <MiniStat
              value={data.escalationCount > 0 ? data.escalationCount : "-"}
              label="Escalations"
              icon={AlertTriangle}
              highlight={data.escalationCount > 0}
            />
          )}
        </div>

        {/* Rock Progress Bars - Anonymous, no labels */}
        {data.rocks.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 font-medium">Rock Progress</span>
              <span className="text-slate-700 font-semibold">{avgRockProgress}%</span>
            </div>
            <div className="space-y-1">
              {data.rocks.map((rock, idx) => (
                <RockProgressBar
                  key={rock.id || idx}
                  progress={rock.progress}
                  status={rock.status}
                  size="sm"
                />
              ))}
            </div>
            {/* Rock status summary - compact */}
            <div className="flex gap-2 mt-2 text-[10px]">
              {rockStatusCounts["on-track"] > 0 && (
                <span className="text-blue-600">{rockStatusCounts["on-track"]} on track</span>
              )}
              {rockStatusCounts["at-risk"] > 0 && (
                <span className="text-amber-600">{rockStatusCounts["at-risk"]} at risk</span>
              )}
              {rockStatusCounts["blocked"] > 0 && (
                <span className="text-red-600">{rockStatusCounts["blocked"]} blocked</span>
              )}
              {rockStatusCounts["completed"] > 0 && (
                <span className="text-emerald-600">{rockStatusCounts["completed"]} done</span>
              )}
            </div>
          </div>
        )}

        {/* No rocks indicator */}
        {data.rocks.length === 0 && (
          <div className="text-xs text-slate-400 italic">No rocks assigned</div>
        )}

        {/* Escalation Alert */}
        {data.escalationCount > 0 && (
          <div className="mt-3 flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-100 rounded-lg">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-xs text-red-600 font-medium">
              {data.escalationCount} escalation{data.escalationCount > 1 ? "s" : ""} flagged
            </span>
          </div>
        )}
      </div>

      {/* Expanded Content - Task Details */}
      {isExpanded && data.tasks.length > 0 && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
          <h4 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            Completed Tasks ({data.totalTasks})
          </h4>

          {data.periodType === "weekly" && tasksByDate ? (
            // Weekly view - grouped by date
            <div className="space-y-3">
              {Object.entries(tasksByDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, tasks]) => (
                  <div key={date}>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                      {formatDateShort(date)}
                    </p>
                    <ul className="space-y-1">
                      {tasks.map((task, idx) => (
                        <TaskItem key={idx} task={task} />
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          ) : (
            // Daily view - flat list
            <ul className="space-y-1.5">
              {data.tasks.map((task, idx) => (
                <TaskItem key={idx} task={task} />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Empty state when expanded but no tasks */}
      {isExpanded && data.tasks.length === 0 && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
          <p className="text-xs text-slate-400 italic text-center">No tasks recorded</p>
        </div>
      )}
    </div>
  )
}

// Task list item
function TaskItem({ task }: { task: BentoTask }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className="text-green-500 mt-0.5 shrink-0">-</span>
      <div className="flex-1 min-w-0">
        <span className="text-slate-700 text-xs">{task.description}</span>
        {task.rockTitle && (
          <span className="ml-1.5 inline-flex items-center gap-0.5 px-1 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px]">
            <Target className="h-2.5 w-2.5" />
            {task.rockTitle}
          </span>
        )}
      </div>
    </li>
  )
}

// Helper to format date short
function formatDateShort(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T12:00:00Z")
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  } catch {
    return dateStr
  }
}

// Bento Grid Container for multiple cards
export function UserBentoGrid({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      "grid gap-4",
      // Responsive: 1 col mobile, 2 cols tablet, 3 cols desktop
      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      className
    )}>
      {children}
    </div>
  )
}
