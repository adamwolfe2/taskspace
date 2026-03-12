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
  Sparkles,
  Loader2,
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
  accentColor,
  size = "sm"
}: {
  progress: number
  status: RockProgress["status"]
  accentColor?: string
  size?: "sm" | "md"
}) {
  // Use semantic colors for warning/danger; accent color for on-track/completed
  const barColor = status === "blocked"
    ? "#ef4444"
    : status === "at-risk"
    ? "#f59e0b"
    : (accentColor || "#3b82f6")

  return (
    <div
      className={cn(
        "w-full bg-slate-100 rounded-full overflow-hidden",
        size === "sm" ? "h-1.5" : "h-2"
      )}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: barColor }}
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
  accentColor,
  reportId,
  slug,
  token,
  weekDate,
  initialSummary,
}: {
  data: UserBentoData
  className?: string
  defaultExpanded?: boolean
  accentColor?: string
  reportId?: string
  slug?: string
  token?: string | null
  weekDate?: string
  initialSummary?: string | null
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [summary, setSummary] = useState<string | null>(initialSummary || null)
  const [isSummarizing, setIsSummarizing] = useState(false)

  const canSummarize = token && slug && (reportId || weekDate)

  const fetchSummary = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (summary || isSummarizing || !canSummarize) return
    setIsSummarizing(true)
    try {
      // Use weekly summary endpoint if weekDate is provided, otherwise daily
      const endpoint = weekDate ? "/api/public/eod/weekly-summary" : "/api/public/eod/summary"
      const body = weekDate
        ? { slug, token, date: weekDate, userName: data.userName }
        : { reportId, slug, token }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success && json.data?.summary) setSummary(json.data.summary)
    } finally {
      setIsSummarizing(false)
    }
  }

  // Calculate aggregate rock progress
  const avgRockProgress = useMemo(() => {
    if (data.rocks.length === 0) return 0
    return Math.round(data.rocks.reduce((acc, r) => acc + r.progress, 0) / data.rocks.length)
  }, [data.rocks])

  // Group tasks by rock (like internal EOD reports)
  const tasksByRock = useMemo(() => {
    return data.tasks.reduce((acc, task) => {
      const key = task.rockTitle || "general"
      if (!acc[key]) acc[key] = []
      acc[key].push(task)
      return acc
    }, {} as Record<string, BentoTask[]>)
  }, [data.tasks])

  // Role badge
  const getRoleBadge = () => {
    switch (data.userRole) {
      case "owner":
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded">OWNER</span>
      case "admin":
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded">ADMIN</span>
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
          <div className="flex items-center gap-1">
            {canSummarize && (
              <button
                onClick={fetchSummary}
                disabled={isSummarizing}
                title="AI summary"
                className={`p-1 rounded-lg transition-colors ${summary ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"} disabled:opacity-50`}
              >
                {isSummarizing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </button>
            )}
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
                  accentColor={accentColor}
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

      {/* AI Summary strip */}
      {summary && (
        <div className="px-4 py-2.5 bg-blue-50/60 border-t border-blue-100 flex items-start gap-2">
          <Sparkles className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-700 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Expanded Content - Task Details grouped by Rock */}
      {isExpanded && data.tasks.length > 0 && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
          <h4 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-blue-500" />
            Rock Progress ({data.totalTasks} tasks)
          </h4>

          <div className="space-y-3">
            {/* Rock-specific tasks first */}
            {Object.entries(tasksByRock)
              .filter(([rockTitle]) => rockTitle !== "general")
              .map(([rockTitle, tasks]) => (
                <div key={rockTitle} className="p-2 bg-white border border-slate-200 rounded-lg">
                  <p className="text-[10px] font-semibold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Target className="h-3 w-3 text-slate-500" />
                    {rockTitle}
                  </p>
                  <ul className="space-y-1">
                    {tasks.map((task, idx) => (
                      <TaskItemSimple key={idx} description={task.description} />
                    ))}
                  </ul>
                </div>
              ))}

            {/* General tasks */}
            {tasksByRock["general"] && tasksByRock["general"].length > 0 && (
              <div className="p-2 bg-white/50 border border-slate-100 rounded-lg">
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                  General Activities
                </p>
                <ul className="space-y-1">
                  {tasksByRock["general"].map((task, idx) => (
                    <TaskItemSimple key={idx} description={task.description} />
                  ))}
                </ul>
              </div>
            )}
          </div>
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

// Simple task list item (without rock tag - used when grouped by rock)
function TaskItemSimple({ description }: { description: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
      <span className="text-slate-700 text-xs">{description}</span>
    </li>
  )
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
