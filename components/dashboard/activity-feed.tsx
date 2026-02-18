"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CheckCircle2, FileText, Target, Activity as ActivityIcon } from "lucide-react"
import { formatActivityTime } from "@/lib/utils/date-helpers"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { useThemedIconColors } from "@/lib/hooks/use-themed-icon-colors"

interface Activity {
  id: string
  type: "task_completed" | "eod_submitted" | "rock_updated"
  description: string
  actorName: string
  occurredAt: string
}

function getInitials(name: string): string {
  return (name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getActivityIcon(type: Activity["type"]) {
  switch (type) {
    case "task_completed":
      return CheckCircle2
    case "eod_submitted":
      return FileText
    case "rock_updated":
      return Target
    default:
      return ActivityIcon
  }
}

// Hardcoded fallback removed — themed colors applied inline in the component

function getActivityDescription(activity: Activity): string {
  switch (activity.type) {
    case "task_completed":
      return `completed task "${activity.description}"`
    case "eod_submitted":
      return "submitted EOD report"
    case "rock_updated":
      return `updated Rock "${activity.description}"`
    default:
      return "performed an action"
  }
}

interface ActivityFeedProps {
  workspaceId?: string
}

function useActivityIconStyle(type: Activity["type"]) {
  const themedColors = useThemedIconColors()
  switch (type) {
    case "task_completed":
      return { backgroundColor: themedColors.primaryAlpha10, color: themedColors.primary }
    case "eod_submitted":
      return { backgroundColor: themedColors.secondaryAlpha10, color: themedColors.secondary }
    case "rock_updated":
      return { backgroundColor: themedColors.accentAlpha10, color: themedColors.accent }
    default:
      return { backgroundColor: "rgb(241 245 249)", color: "rgb(71 85 105)" } // slate-100/600
  }
}

function ActivityItem({ activity }: { activity: Activity }) {
  const Icon = getActivityIcon(activity.type)
  const iconStyle = useActivityIconStyle(activity.type)
  const description = getActivityDescription(activity)

  return (
    <div className="flex items-start gap-3">
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-slate-100 text-slate-600 text-sm">
            {getInitials(activity.actorName)}
          </AvatarFallback>
        </Avatar>
        <div
          className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center"
          style={iconStyle}
        >
          <Icon className="h-3 w-3" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-900">
          <span className="font-medium">{activity.actorName}</span>{" "}
          <span className="text-slate-600">{description}</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {formatActivityTime(activity.occurredAt)}
        </p>
      </div>
    </div>
  )
}

export function ActivityFeed({ workspaceId }: ActivityFeedProps) {
  const { currentWorkspace } = useWorkspaces()
  const themedColors = useThemedIconColors()
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const effectiveWorkspaceId = workspaceId || currentWorkspace?.id

  useEffect(() => {
    async function fetchActivities() {
      if (!effectiveWorkspaceId) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/activity?workspaceId=${effectiveWorkspaceId}`)
        const result = await response.json()

        if (result.success) {
          setActivities(result.data)
        } else {
          setError(result.error || "Failed to load activity")
        }
      } catch {
        setError("Failed to load activity")
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivities()
  }, [effectiveWorkspaceId])

  // Hide if no workspace selected
  if (!effectiveWorkspaceId) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8">
            <ActivityIcon className="h-12 w-12 mx-auto mb-3" style={{ color: themedColors.secondary }} />
            <p className="text-sm text-slate-500">Couldn&apos;t load activity</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs"
              onClick={() => {
                setError(null)
                setIsLoading(true)
                fetch(`/api/activity?workspaceId=${effectiveWorkspaceId}`)
                  .then((res) => res.json())
                  .then((result) => {
                    if (result.success) {
                      setActivities(result.data)
                    } else {
                      setError(result.error || "Failed to load activity")
                    }
                  })
                  .catch(() => setError("Failed to load activity"))
                  .finally(() => setIsLoading(false))
              }}
            >
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <ActivityIcon className="h-12 w-12 mx-auto mb-3" style={{ color: themedColors.secondary }} />
            <p className="text-sm text-slate-500">No recent activity</p>
            <p className="text-xs text-slate-400 mt-1">Activity from the last 7 days will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
