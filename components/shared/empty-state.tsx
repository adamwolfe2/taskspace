"use client"

import { ReactNode } from "react"
import {
  ClipboardList,
  Target,
  Calendar,
  Bell,
  Search,
  FolderOpen,
  Users,
  FileText,
  Clock,
  Trophy,
  Inbox,
  LucideIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon | ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "ghost"
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
  size?: "sm" | "md" | "lg"
}

export function EmptyState({
  icon: IconProp,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "md",
}: EmptyStateProps) {
  const sizeStyles = {
    sm: {
      container: "py-6 px-4",
      icon: "h-8 w-8",
      iconWrapper: "h-12 w-12",
      title: "text-sm font-medium",
      description: "text-xs",
    },
    md: {
      container: "py-10 px-6",
      icon: "h-10 w-10",
      iconWrapper: "h-16 w-16",
      title: "text-base font-semibold",
      description: "text-sm",
    },
    lg: {
      container: "py-16 px-8",
      icon: "h-14 w-14",
      iconWrapper: "h-24 w-24",
      title: "text-lg font-semibold",
      description: "text-base",
    },
  }

  const styles = sizeStyles[size]

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        styles.container,
        className
      )}
    >
      <div
        className={cn(
          "rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4",
          styles.iconWrapper
        )}
      >
        {IconProp && typeof IconProp === "function" ? (
          <IconProp className={cn("text-slate-400 dark:text-slate-500", styles.icon)} />
        ) : (
          IconProp || <Inbox className={cn("text-slate-400 dark:text-slate-500", styles.icon)} />
        )}
      </div>
      <h3 className={cn("text-slate-900 dark:text-slate-100 mb-1", styles.title)}>
        {title}
      </h3>
      {description && (
        <p className={cn("text-slate-500 dark:text-slate-400 max-w-sm mb-4", styles.description)}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || "default"}
              size={size === "sm" ? "sm" : "default"}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="ghost"
              size={size === "sm" ? "sm" : "default"}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Pre-configured empty states for common scenarios
export function EmptyTasksState({ onAddTask }: { onAddTask?: () => void }) {
  return (
    <EmptyState
      icon={ClipboardList}
      title="No tasks yet"
      description="Get started by creating your first task. Stay organized and track your progress."
      action={onAddTask ? { label: "Add Task", onClick: onAddTask } : undefined}
    />
  )
}

export function EmptyRocksState({ onAddRock }: { onAddRock?: () => void }) {
  return (
    <EmptyState
      icon={Target}
      title="No quarterly goals"
      description="Set ambitious quarterly goals (rocks) to drive your team's success."
      action={onAddRock ? { label: "Create Rock", onClick: onAddRock } : undefined}
    />
  )
}

export function EmptyEODState({ onSubmitEOD }: { onSubmitEOD?: () => void }) {
  return (
    <EmptyState
      icon={Calendar}
      title="No EOD reports"
      description="Start tracking your daily progress with end-of-day reports."
      action={onSubmitEOD ? { label: "Submit EOD", onClick: onSubmitEOD } : undefined}
    />
  )
}

export function EmptyNotificationsState() {
  return (
    <EmptyState
      icon={Bell}
      title="All caught up!"
      description="You have no new notifications. Check back later for updates."
      size="sm"
    />
  )
}

export function EmptySearchState({ query }: { query?: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={query ? `No matches for "${query}". Try a different search term.` : "Try adjusting your search or filters."}
    />
  )
}

export function EmptyTeamState({ onInvite }: { onInvite?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No team members"
      description="Invite your team to start collaborating and tracking progress together."
      action={onInvite ? { label: "Invite Team", onClick: onInvite } : undefined}
    />
  )
}

export function EmptyFilesState() {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No files"
      description="No files have been uploaded yet."
    />
  )
}

export function EmptyReportsState() {
  return (
    <EmptyState
      icon={FileText}
      title="No reports available"
      description="Reports will appear here once your team starts submitting EOD updates."
    />
  )
}

export function EmptyHistoryState() {
  return (
    <EmptyState
      icon={Clock}
      title="No history"
      description="Your activity history will appear here as you use the app."
    />
  )
}

export function EmptyAchievementsState() {
  return (
    <EmptyState
      icon={Trophy}
      title="No achievements yet"
      description="Complete tasks, maintain streaks, and reach goals to earn achievements!"
    />
  )
}
