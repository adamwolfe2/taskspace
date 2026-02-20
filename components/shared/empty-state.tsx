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

 // Detect if icon is a component type (function or forwardRef object) vs a rendered ReactNode
 const IconComponent = IconProp && (typeof IconProp === "function" || (typeof IconProp === "object" && IconProp !== null && "render" in IconProp))
   ? (IconProp as React.ElementType)
   : null

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
 "rounded-full bg-slate-100 flex items-center justify-center mb-4",
 styles.iconWrapper
 )}
 >
 {IconComponent ? (
 <IconComponent className={cn("text-slate-400", styles.icon)} />
 ) : (
 (IconProp as React.ReactNode) || <Inbox className={cn("text-slate-400", styles.icon)} />
 )}
 </div>
 <h3 className={cn("text-slate-900 mb-1", styles.title)}>
 {title}
 </h3>
 {description && (
 <p className={cn("text-slate-500 max-w-sm mb-4 px-4 sm:px-0", styles.description)}>
 {description}
 </p>
 )}
 {(action || secondaryAction) && (
 <div className="flex flex-col sm:flex-row items-center gap-2 mt-2 w-full sm:w-auto px-4 sm:px-0">
 {action && (
 <Button
 onClick={action.onClick}
 variant={action.variant || "default"}
 size={size === "sm" ? "sm" : "default"}
 className="w-full sm:w-auto"
 >
 {action.label}
 </Button>
 )}
 {secondaryAction && (
 <Button
 onClick={secondaryAction.onClick}
 variant="ghost"
 size={size === "sm" ? "sm" : "default"}
 className="w-full sm:w-auto"
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
 description="Tasks are your daily and weekly action items. Create specific, time-bound tasks to stay on track — e.g., 'Follow up with client by Friday'."
 action={onAddTask ? { label: "Create your first task", onClick: onAddTask } : undefined}
 />
 )
}

export function EmptyRocksState({ onAddRock }: { onAddRock?: () => void }) {
 return (
 <EmptyState
 icon={Target}
 title="No quarterly rocks yet"
 description="Rocks are your 3-7 most important goals for the quarter. Focus on outcomes, not activities — e.g., 'Increase NPS by 15 points' or 'Launch V2 product'."
 action={onAddRock ? { label: "Create a rock", onClick: onAddRock } : undefined}
 />
 )
}

export function EmptyEODState({ onSubmitEOD }: { onSubmitEOD?: () => void }) {
 return (
 <EmptyState
 icon={Calendar}
 title="No EOD reports yet"
 description="End-of-day reports take 2-3 minutes and keep your team aligned. Share what you accomplished, what's next, and any blockers."
 action={onSubmitEOD ? { label: "Submit your first report", onClick: onSubmitEOD } : undefined}
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
