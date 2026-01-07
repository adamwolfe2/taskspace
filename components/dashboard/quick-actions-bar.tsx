"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
 ClipboardEdit,
 Plus,
 Target,
 Zap,
 Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickAction {
 id: string
 label: string
 shortLabel: string
 icon: React.ElementType
 color: string
 bgColor: string
 hoverColor: string
 onClick: () => void
 badge?: string
}

interface QuickActionsBarProps {
 onSubmitEOD: () => void
 onAddTask: () => void
 onUpdateRock?: () => void
 onStartFocus?: () => void
 hasSubmittedEOD?: boolean
 activeFocusSession?: boolean
 className?: string
}

export function QuickActionsBar({
 onSubmitEOD,
 onAddTask,
 onUpdateRock,
 onStartFocus,
 hasSubmittedEOD,
 activeFocusSession,
 className,
}: QuickActionsBarProps) {
 const actions: QuickAction[] = [
 {
 id: "eod",
 label: hasSubmittedEOD ? "EOD Submitted" : "Submit EOD",
 shortLabel: "EOD",
 icon: ClipboardEdit,
 color: hasSubmittedEOD ? "text-green-600" : "text-blue-600",
 bgColor: hasSubmittedEOD ? "bg-green-50 " : "bg-blue-50 ",
 hoverColor: hasSubmittedEOD ? "hover:bg-green-100 " : "hover:bg-blue-100 ",
 onClick: onSubmitEOD,
 badge: hasSubmittedEOD ? "✓" : undefined,
 },
 {
 id: "task",
 label: "Add Task",
 shortLabel: "Task",
 icon: Plus,
 color: "text-emerald-600",
 bgColor: "bg-emerald-50 ",
 hoverColor: "hover:bg-emerald-100 ",
 onClick: onAddTask,
 },
 ...(onUpdateRock
 ? [
 {
 id: "rock",
 label: "Update Rock",
 shortLabel: "Rock",
 icon: Target,
 color: "text-purple-600",
 bgColor: "bg-purple-50 ",
 hoverColor: "hover:bg-purple-100 ",
 onClick: onUpdateRock,
 },
 ]
 : []),
 ...(onStartFocus
 ? [
 {
 id: "focus",
 label: activeFocusSession ? "Focus Active" : "Start Focus",
 shortLabel: "Focus",
 icon: activeFocusSession ? Zap : Clock,
 color: activeFocusSession ? "text-orange-600" : "text-amber-600",
 bgColor: activeFocusSession ? "bg-orange-50 " : "bg-amber-50 ",
 hoverColor: activeFocusSession ? "hover:bg-orange-100 " : "hover:bg-amber-100 ",
 onClick: onStartFocus,
 badge: activeFocusSession ? "●" : undefined,
 },
 ]
 : []),
 ]

 return (
 <div className={cn("flex flex-wrap gap-2", className)}>
 {actions.map((action) => (
 <Button
 key={action.id}
 variant="ghost"
 onClick={action.onClick}
 className={cn(
 "gap-2 transition-all",
 action.bgColor,
 action.hoverColor,
 action.color
 )}
 >
 <action.icon className="h-4 w-4" />
 <span className="hidden sm:inline">{action.label}</span>
 <span className="sm:hidden">{action.shortLabel}</span>
 {action.badge && (
 <span className="text-xs font-bold">{action.badge}</span>
 )}
 </Button>
 ))}
 </div>
 )
}

// Compact floating action bar
export function FloatingQuickActions({
 onSubmitEOD,
 onAddTask,
 className,
}: {
 onSubmitEOD: () => void
 onAddTask: () => void
 className?: string
}) {
 const [isExpanded, setIsExpanded] = useState(false)

 return (
 <div
 className={cn(
 "fixed bottom-6 right-6 z-50 flex items-center gap-2",
 className
 )}
 onMouseEnter={() => setIsExpanded(true)}
 onMouseLeave={() => setIsExpanded(false)}
 >
 {isExpanded && (
 <>
 <Button
 size="lg"
 variant="secondary"
 onClick={onAddTask}
 className="gap-2 shadow-lg animate-fade-in"
 >
 <Plus className="h-5 w-5" />
 Task
 </Button>
 <Button
 size="lg"
 variant="secondary"
 onClick={onSubmitEOD}
 className="gap-2 shadow-lg animate-fade-in"
 >
 <ClipboardEdit className="h-5 w-5" />
 EOD
 </Button>
 </>
 )}
 <Button
 size="lg"
 className={cn(
 "h-14 w-14 rounded-full shadow-lg transition-transform",
 isExpanded && "rotate-45"
 )}
 onClick={() => setIsExpanded(!isExpanded)}
 >
 <Plus className="h-6 w-6" />
 </Button>
 </div>
 )
}
