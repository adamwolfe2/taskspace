"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getInitials, getAvatarColor, parseRocks, calculateRockProgress } from "@/lib/org-chart/utils"
import type { OrgChartEmployee } from "@/lib/org-chart/types"
import { ChevronDown, ChevronUp, Target } from "lucide-react"

interface EmployeeCardProps {
  employee: OrgChartEmployee
  onClick?: () => void
  isHighlighted?: boolean
  progressData?: Map<string, boolean>
}

export function EmployeeCard({
  employee,
  onClick,
  isHighlighted = false,
  progressData = new Map(),
}: EmployeeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const avatarColor = getAvatarColor(employee.fullName)
  const initials = getInitials(employee.fullName)
  const rocks = parseRocks(employee.rocks)
  const progress = calculateRockProgress(rocks, progressData)

  // Create employee-specific progress map
  const employeeProgress = new Map<string, boolean>()
  progressData.forEach((completed, key) => {
    if (key.startsWith(employee.fullName + "-")) {
      const parts = key.replace(employee.fullName + "-", "").split("-")
      if (parts.length === 2) {
        employeeProgress.set(`${parts[0]}-${parts[1]}`, completed)
      }
    }
  })

  return (
    <Card
      className={cn(
        "w-64 cursor-pointer transition-all duration-200 hover:shadow-lg",
        isHighlighted && "ring-2 ring-blue-500 ring-offset-2 animate-pulse",
        "bg-white"
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.expand-toggle')) {
          return
        }
        onClick?.()
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0",
              avatarColor.bg,
              avatarColor.text
            )}
          >
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">
              {employee.fullName}
            </h3>
            <p className="text-sm text-slate-500 truncate">{employee.jobTitle}</p>
            <p className="text-xs text-slate-400 truncate">{employee.department}</p>
          </div>

          {/* Progress badge */}
          {rocks.length > 0 && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs flex-shrink-0",
                progress >= 80
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : progress >= 50
                  ? "bg-amber-100 text-amber-700 border-amber-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              )}
            >
              <Target className="h-3 w-3 mr-1" />
              {progress}%
            </Badge>
          )}
        </div>

        {/* Rocks preview */}
        {rocks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <button
              className="expand-toggle flex items-center justify-between w-full text-xs text-slate-500 hover:text-slate-700"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
            >
              <span>{rocks.length} Rock{rocks.length !== 1 ? "s" : ""}</span>
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {isExpanded && (
              <div className="mt-2 space-y-1">
                {rocks.slice(0, 2).map((rock, idx) => (
                  <p
                    key={idx}
                    className="text-xs text-slate-600 truncate"
                  >
                    {rock.title}
                  </p>
                ))}
                {rocks.length > 2 && (
                  <p className="text-xs text-slate-400">
                    +{rocks.length - 2} more...
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
