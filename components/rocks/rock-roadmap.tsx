"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select"
import {
 Tooltip,
 TooltipContent,
 TooltipProvider,
 TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useBrandStatusStyles } from "@/lib/hooks/use-brand-status-styles"
import { useThemedIconColors } from "@/lib/hooks/use-themed-icon-colors"
import type { Rock, RockDependency, TeamMember } from "@/lib/types"
import {
 Target,
 Calendar,
 ChevronLeft,
 ChevronRight,
 ZoomIn,
 ZoomOut,
 Users,
 AlertTriangle,
 CheckCircle2,
 Clock,
 AlertCircle,
 Link2
} from "lucide-react"
import {
 format,
 startOfQuarter,
 endOfQuarter,
 addMonths,
 subMonths,
 differenceInDays,
 isWithinInterval,
 parseISO,
 startOfMonth,
 endOfMonth,
 eachWeekOfInterval,
 eachMonthOfInterval
} from "date-fns"

interface RockRoadmapProps {
 rocks: Rock[]
 dependencies: RockDependency[]
 teamMembers?: TeamMember[]
 onRockClick?: (rock: Rock) => void
 className?: string
}

type ViewMode = "quarter" | "month" | "team"

export function RockRoadmap({
 rocks,
 dependencies,
 teamMembers = [],
 onRockClick,
 className,
}: RockRoadmapProps) {
 const { getStatusStyle } = useBrandStatusStyles()
 const themedColors = useThemedIconColors()
 const [viewMode, setViewMode] = useState<ViewMode>("quarter")
 const [currentDate, setCurrentDate] = useState(new Date())
 const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

 // Calculate view range based on mode
 const viewRange = useMemo(() => {
 if (viewMode === "month") {
 return {
 start: startOfMonth(currentDate),
 end: endOfMonth(currentDate),
 }
 }
 return {
 start: startOfQuarter(currentDate),
 end: endOfQuarter(currentDate),
 }
 }, [viewMode, currentDate])

 // Filter rocks within view range
 const visibleRocks = useMemo(() => {
 let filtered = rocks.filter((rock) => {
 const dueDate = parseISO(rock.dueDate)
 return isWithinInterval(dueDate, viewRange) ||
 (dueDate < viewRange.start && rock.status !== "completed")
 })

 if (selectedUserId) {
 filtered = filtered.filter((r) => r.userId === selectedUserId)
 }

 return filtered.sort((a, b) =>
 new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
 )
 }, [rocks, viewRange, selectedUserId])

 // Generate time markers
 const timeMarkers = useMemo(() => {
 if (viewMode === "month") {
 return eachWeekOfInterval(viewRange).map((date) => ({
 date,
 label: format(date, "MMM d"),
 }))
 }
 return eachMonthOfInterval(viewRange).map((date) => ({
 date,
 label: format(date, "MMMM"),
 }))
 }, [viewRange, viewMode])

 // Calculate position of a rock on the timeline
 const getRockPosition = (rock: Rock) => {
 const dueDate = parseISO(rock.dueDate)
 const totalDays = differenceInDays(viewRange.end, viewRange.start)
 const daysFromStart = differenceInDays(dueDate, viewRange.start)
 const percentage = Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100))
 return percentage
 }

 // Get rocks that depend on a given rock
 const getDependentRocks = (rockId: string) => {
 return dependencies
 .filter((d) => d.dependsOnRockId === rockId)
 .map((d) => rocks.find((r) => r.id === d.rockId))
 .filter(Boolean) as Rock[]
 }

 // Navigate time
 const navigateTime = (direction: "prev" | "next") => {
 const months = viewMode === "month" ? 1 : 3
 setCurrentDate((prev) =>
 direction === "next" ? addMonths(prev, months) : subMonths(prev, months)
 )
 }

 const getStatusConfig = (status: Rock["status"]) => {
 const style = getStatusStyle(status)
 const icons: Record<string, typeof CheckCircle2> = {
 "on-track": CheckCircle2,
 "at-risk": Clock,
 blocked: AlertCircle,
 completed: CheckCircle2,
 }
 return {
 icon: icons[status] || Target,
 style,
 }
 }

 // Group rocks by team member for team view
 const rocksByUser = useMemo(() => {
 if (viewMode !== "team") return {}

 const grouped: Record<string, Rock[]> = {}
 visibleRocks.forEach((rock) => {
 if (!rock.userId) return // Skip rocks for draft members
 if (!grouped[rock.userId]) {
 grouped[rock.userId] = []
 }
 grouped[rock.userId].push(rock)
 })
 return grouped
 }, [visibleRocks, viewMode])

 return (
 <Card className={cn("overflow-hidden", className)}>
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between gap-4">
 <CardTitle className="flex items-center gap-2">
 <Calendar className="h-5 w-5" style={{ color: themedColors.primary }} />
 Rock Roadmap
 </CardTitle>

 <div className="flex items-center gap-2 flex-wrap">
 {/* User Filter */}
 {teamMembers.length > 0 && (
 <Select
 value={selectedUserId || "all"}
 onValueChange={(v) => setSelectedUserId(v === "all" ? null : v)}
 >
 <SelectTrigger className="w-full sm:w-[150px] h-8">
 <Users className="h-3.5 w-3.5 mr-1" />
 <SelectValue placeholder="All members" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All members</SelectItem>
 {teamMembers.map((member) => (
 <SelectItem key={member.id} value={member.id}>
 {member.name.split("")[0]}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 )}

 {/* View Mode */}
 <Select
 value={viewMode}
 onValueChange={(v) => setViewMode(v as ViewMode)}
 >
 <SelectTrigger className="w-full sm:w-[120px] h-8">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="quarter">Quarter</SelectItem>
 <SelectItem value="month">Month</SelectItem>
 <SelectItem value="team">By Team</SelectItem>
 </SelectContent>
 </Select>

 {/* Navigation */}
 <div className="flex items-center gap-1">
 <Button
 variant="outline"
 size="icon"
 className="h-8 w-8"
 onClick={() => navigateTime("prev")}
 aria-label="Previous"
 >
 <ChevronLeft className="h-4 w-4" />
 </Button>
 <span className="text-sm font-medium px-2 min-w-[120px] text-center">
 {viewMode === "month"
 ? format(currentDate, "MMMM yyyy")
 : `Q${Math.ceil((currentDate.getMonth() + 1) / 3)} ${format(currentDate, "yyyy")}`}
 </span>
 <Button
 variant="outline"
 size="icon"
 className="h-8 w-8"
 onClick={() => navigateTime("next")}
 aria-label="Next"
 >
 <ChevronRight className="h-4 w-4" />
 </Button>
 </div>
 </div>
 </div>
 </CardHeader>

 <CardContent className="p-0">
 {/* Timeline Header */}
 <div className="border-b bg-slate-50  px-4 py-2">
 <div className="flex">
 <div className="w-48 shrink-0" /> {/* Space for rock names */}
 <div className="flex-1 flex">
 {timeMarkers.map((marker, i) => (
 <div
 key={marker.date.toISOString()}
 className="flex-1 text-center text-xs font-medium text-slate-500 "
 >
 {marker.label}
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Timeline Content */}
 <div className="min-h-[300px] max-h-[500px] overflow-y-auto">
 {viewMode === "team" ? (
 // Team View
 Object.entries(rocksByUser).map(([userId, userRocks]) => {
 const member = teamMembers.find((m) => m.userId === userId)
 return (
 <div key={userId} className="border-b last:border-b-0">
 <div className="px-4 py-2 bg-slate-100  font-medium text-sm text-slate-700 ">
 {member?.name || "Unknown"}
 </div>
 {userRocks.map((rock) => (
 <RoadmapRow
 key={rock.id}
 rock={rock}
 position={getRockPosition(rock)}
 statusConfig={getStatusConfig(rock.status)}
 dependencies={dependencies.filter((d) => d.rockId === rock.id)}
 dependentRocks={getDependentRocks(rock.id)}
 allRocks={rocks}
 onClick={() => onRockClick?.(rock)}
 />
 ))}
 </div>
 )
 })
 ) : (
 // Normal View
 visibleRocks.map((rock) => (
 <RoadmapRow
 key={rock.id}
 rock={rock}
 position={getRockPosition(rock)}
 statusConfig={getStatusConfig(rock.status)}
 dependencies={dependencies.filter((d) => d.rockId === rock.id)}
 dependentRocks={getDependentRocks(rock.id)}
 allRocks={rocks}
 onClick={() => onRockClick?.(rock)}
 />
 ))
 )}

 {visibleRocks.length === 0 && (
 <div className="flex items-center justify-center h-[200px] text-slate-500 ">
 <div className="text-center">
 <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
 <p>No rocks in this time period</p>
 </div>
 </div>
 )}
 </div>

 {/* Legend */}
 <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-slate-500  bg-slate-50 ">
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusStyle("on-track").color }} />
 <span>On Track</span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusStyle("at-risk").color }} />
 <span>At Risk</span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusStyle("blocked").color }} />
 <span>Blocked</span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusStyle("completed").color }} />
 <span>Completed</span>
 </div>
 <div className="flex items-center gap-1.5 ml-auto">
 <Link2 className="h-3.5 w-3.5" />
 <span>Has dependencies</span>
 </div>
 </div>
 </CardContent>
 </Card>
 )
}

// Individual row in the roadmap
function RoadmapRow({
 rock,
 position,
 statusConfig,
 dependencies,
 dependentRocks,
 allRocks,
 onClick,
}: {
 rock: Rock
 position: number
 statusConfig: { icon: typeof CheckCircle2; style: { backgroundColor: string; color: string; borderColor: string } }
 dependencies: RockDependency[]
 dependentRocks: Rock[]
 allRocks: Rock[]
 onClick?: () => void
}) {
 const themedColors = useThemedIconColors()
 const StatusIcon = statusConfig.icon
 const hasDependencies = dependencies.length > 0

 return (
 <TooltipProvider>
 <div className="flex items-center px-4 py-2 hover:bg-slate-50  border-b last:border-b-0 cursor-pointer group">
 {/* Rock Name */}
 <div className="w-48 shrink-0 pr-4">
 <div
 className="flex items-center gap-2"
 onClick={onClick}
 >
 <StatusIcon className="h-4 w-4 shrink-0" style={{ color: statusConfig.style.color }} />
 <span className="text-sm font-medium text-slate-700  truncate group-hover:text-blue-600">
 {rock.title}
 </span>
 {hasDependencies && (
 <Link2 className="h-3.5 w-3.5 shrink-0" style={{ color: themedColors.secondary }} />
 )}
 </div>
 </div>

 {/* Timeline Bar */}
 <div className="flex-1 relative h-8">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full h-px bg-slate-200 " />
 </div>

 {/* Rock Marker */}
 <Tooltip>
 <TooltipTrigger asChild>
 <div
 className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
 style={{ left: `${position}%` }}
 onClick={onClick}
 >
 <div
 className="w-6 h-6 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
 style={{ backgroundColor: statusConfig.style.color }}
 >
 <span className="text-white text-xs font-bold">
 {rock.progress >= 100 ? "✓" : `${Math.round(rock.progress / 10)}`}
 </span>
 </div>
 </div>
 </TooltipTrigger>
 <TooltipContent side="top" className="max-w-xs">
 <div className="space-y-1.5">
 <p className="font-semibold">{rock.title}</p>
 <p className="text-xs text-slate-500">
 Due: {format(parseISO(rock.dueDate), "MMM d, yyyy")}
 </p>
 <p className="text-xs">Progress: {rock.progress}%</p>
 {hasDependencies && (
 <div className="pt-1 border-t">
 <p className="text-xs font-medium">Depends on:</p>
 {dependencies.map((dep) => {
 const depRock = allRocks.find((r) => r.id === dep.dependsOnRockId)
 return depRock ? (
 <p key={dep.id} className="text-xs text-slate-500">
 • {depRock.title}
 </p>
 ) : null
 })}
 </div>
 )}
 {dependentRocks.length > 0 && (
 <div className="pt-1 border-t">
 <p className="text-xs font-medium">Blocking:</p>
 {dependentRocks.map((r) => (
 <p key={r.id} className="text-xs text-slate-500">
 • {r.title}
 </p>
 ))}
 </div>
 )}
 </div>
 </TooltipContent>
 </Tooltip>

 {/* Progress Bar */}
 <div
 className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full opacity-30"
 style={{
 left: 0,
 width: `${position}%`,
 background: `linear-gradient(to right, transparent 80%, ${statusConfig.style.color})`,
 }}
 />
 </div>
 </div>
 </TooltipProvider>
 )
}

// Compact roadmap for dashboard
export function MiniRoadmap({
 rocks,
 maxItems = 5,
 className,
 onViewAll,
}: {
 rocks: Rock[]
 maxItems?: number
 className?: string
 onViewAll?: () => void
}) {
 const { getStatusStyle } = useBrandStatusStyles()
 const upcomingRocks = rocks
 .filter((r) => r.status !== "completed")
 .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
 .slice(0, maxItems)

 if (upcomingRocks.length === 0) {
 return null
 }

 return (
 <div className={cn("space-y-2", className)}>
 {upcomingRocks.map((rock) => {
 const dueDate = parseISO(rock.dueDate)
 const daysUntil = differenceInDays(dueDate, new Date())

 return (
 <div
 key={rock.id}
 className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 "
 >
 <div
 className="w-2 h-2 rounded-full shrink-0"
 style={{ backgroundColor: getStatusStyle(rock.status).color }}
 />
 <span className="flex-1 text-sm text-slate-700  truncate">
 {rock.title}
 </span>
 <span
 className={cn(
 "text-xs shrink-0",
 daysUntil < 0 && "text-red-600",
 daysUntil >= 0 && daysUntil <= 7 && "text-amber-600",
 daysUntil > 7 && "text-slate-500"
 )}
 >
 {daysUntil < 0
 ? `${Math.abs(daysUntil)}d overdue`
 : daysUntil === 0
 ? "Due today"
 : `${daysUntil}d`}
 </span>
 </div>
 )
 })}

 {onViewAll && rocks.length > maxItems && (
 <Button
 variant="ghost"
 size="sm"
 className="w-full text-xs"
 onClick={onViewAll}
 >
 View all {rocks.length} rocks
 </Button>
 )}
 </div>
 )
}
