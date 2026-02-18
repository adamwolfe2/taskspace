"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
 DialogTrigger,
} from "@/components/ui/dialog"
import {
 Tooltip,
 TooltipContent,
 TooltipProvider,
 TooltipTrigger,
} from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { TimeEntry, AssignedTask, Rock } from "@/lib/types"
import {
 Play,
 Pause,
 Square,
 Clock,
 Timer,
 Plus,
 Trash2,
 DollarSign,
 Edit2,
 Check,
 X,
} from "lucide-react"
import { format, differenceInMinutes, differenceInSeconds, parseISO } from "date-fns"
import { useThemedIconColors } from "@/lib/hooks/use-themed-icon-colors"

interface TimeTrackerProps {
 taskId: string
 taskTitle: string
 timeEntries: TimeEntry[]
 activeEntry?: TimeEntry
 onStartTimer: () => Promise<void>
 onStopTimer: (description?: string) => Promise<void>
 onAddManualEntry: (entry: {
 startedAt: string
 endedAt: string
 description?: string
 billable: boolean
 }) => Promise<void>
 onDeleteEntry: (entryId: string) => Promise<void>
 onUpdateEntry: (entryId: string, updates: Partial<TimeEntry>) => Promise<void>
 disabled?: boolean
 className?: string
}

export function TimeTracker({
 taskId,
 taskTitle,
 timeEntries,
 activeEntry,
 onStartTimer,
 onStopTimer,
 onAddManualEntry,
 onDeleteEntry,
 onUpdateEntry,
 disabled = false,
 className,
}: TimeTrackerProps) {
 const [isTracking, setIsTracking] = useState(!!activeEntry)
 const [elapsed, setElapsed] = useState(0)
 const [description, setDescription] = useState("")
 const [isSubmitting, setIsSubmitting] = useState(false)
 const [showAddDialog, setShowAddDialog] = useState(false)
 const intervalRef = useRef<NodeJS.Timeout | null>(null)

 // Calculate elapsed time for active entry
 useEffect(() => {
 if (activeEntry) {
 setIsTracking(true)
 const startTime = parseISO(activeEntry.startedAt)
 setElapsed(differenceInSeconds(new Date(), startTime))

 intervalRef.current = setInterval(() => {
 setElapsed(differenceInSeconds(new Date(), startTime))
 }, 1000)
 } else {
 setIsTracking(false)
 setElapsed(0)
 }

 return () => {
 if (intervalRef.current) {
 clearInterval(intervalRef.current)
 }
 }
 }, [activeEntry])

 const handleStartTimer = async () => {
 if (isSubmitting) return
 setIsSubmitting(true)
 try {
 await onStartTimer()
 } catch (_error) {
   /* silently ignore */
 } finally {
 setIsSubmitting(false)
 }
 }

 const handleStopTimer = async () => {
 if (isSubmitting) return
 setIsSubmitting(true)
 try {
 await onStopTimer(description || undefined)
 setDescription("")
 } catch (_error) {
   /* silently ignore */
 } finally {
 setIsSubmitting(false)
 }
 }

 // Calculate total time tracked
 const totalMinutes = timeEntries.reduce((sum, entry) => {
 if (entry.durationMinutes) {
 return sum + entry.durationMinutes
 }
 if (entry.endedAt) {
 return sum + differenceInMinutes(parseISO(entry.endedAt), parseISO(entry.startedAt))
 }
 return sum
 }, 0)

 const formatDuration = (seconds: number) => {
 const hrs = Math.floor(seconds / 3600)
 const mins = Math.floor((seconds % 3600) / 60)
 const secs = seconds % 60
 if (hrs > 0) {
 return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
 }
 return `${mins}:${secs.toString().padStart(2, "0")}`
 }

 const formatMinutes = (minutes: number) => {
 const hrs = Math.floor(minutes / 60)
 const mins = minutes % 60
 if (hrs > 0) {
 return `${hrs}h ${mins}m`
 }
 return `${mins}m`
 }

 return (
 <div className={cn("space-y-4", className)}>
 {/* Timer Controls */}
 <div className="flex items-center gap-3">
 {isTracking ? (
 <>
 <div className="flex-1 flex items-center gap-3">
 <div className="flex items-center gap-2 bg-red-50  text-red-700  px-3 py-2 rounded-lg">
 <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
 <Timer className="h-4 w-4" />
 <span className="font-mono font-semibold">{formatDuration(elapsed)}</span>
 </div>
 <Input
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="What are you working on?"
 className="flex-1"
 disabled={disabled}
 aria-label="Time entry description"
 />
 </div>
 <Button
 variant="destructive"
 size="sm"
 onClick={handleStopTimer}
 disabled={disabled || isSubmitting}
 >
 <Square className="h-4 w-4 mr-1 fill-current" />
 Stop
 </Button>
 </>
 ) : (
 <>
 <Button
 variant="default"
 size="sm"
 onClick={handleStartTimer}
 disabled={disabled || isSubmitting}
 className="bg-emerald-600 hover:bg-emerald-700"
 >
 <Play className="h-4 w-4 mr-1 fill-current" />
 Start Timer
 </Button>
 <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
 <DialogTrigger asChild>
 <Button variant="outline" size="sm" disabled={disabled}>
 <Plus className="h-4 w-4 mr-1" />
 Add Manual
 </Button>
 </DialogTrigger>
 <ManualTimeEntryDialog
 onSubmit={async (entry) => {
 await onAddManualEntry(entry)
 setShowAddDialog(false)
 }}
 onCancel={() => setShowAddDialog(false)}
 />
 </Dialog>
 {totalMinutes > 0 && (
 <Badge variant="secondary" className="ml-auto">
 <Clock className="h-3.5 w-3.5 mr-1" />
 Total: {formatMinutes(totalMinutes)}
 </Badge>
 )}
 </>
 )}
 </div>

 {/* Time Entries List */}
 {timeEntries.length > 0 && (
 <div className="space-y-2">
 <h4 className="text-sm font-medium text-slate-700 ">
 Time Entries
 </h4>
 <div className="space-y-1">
 {timeEntries.map((entry) => (
 <TimeEntryRow
 key={entry.id}
 entry={entry}
 onDelete={() => onDeleteEntry(entry.id)}
 onUpdate={(updates) => onUpdateEntry(entry.id, updates)}
 disabled={disabled}
 />
 ))}
 </div>
 </div>
 )}
 </div>
 )
}

// Individual time entry row
function TimeEntryRow({
 entry,
 onDelete,
 onUpdate,
 disabled,
}: {
 entry: TimeEntry
 onDelete: () => void
 onUpdate: (updates: Partial<TimeEntry>) => void
 disabled?: boolean
}) {
 const [isEditing, setIsEditing] = useState(false)
 const [editDescription, setEditDescription] = useState(entry.description || "")
 const themedColors = useThemedIconColors()

 const duration = entry.durationMinutes ||
 (entry.endedAt
 ? differenceInMinutes(parseISO(entry.endedAt), parseISO(entry.startedAt))
 : 0)

 const formatMinutes = (minutes: number) => {
 const hrs = Math.floor(minutes / 60)
 const mins = minutes % 60
 if (hrs > 0) {
 return `${hrs}h ${mins}m`
 }
 return `${mins}m`
 }

 const handleSave = () => {
 onUpdate({ description: editDescription })
 setIsEditing(false)
 }

 return (
 <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50  group">
 <Clock className="h-4 w-4 shrink-0" style={{ color: themedColors.secondary }} />
 <div className="flex-1 min-w-0">
 {isEditing ? (
 <div className="flex items-center gap-1">
 <Input
 value={editDescription}
 onChange={(e) => setEditDescription(e.target.value)}
 className="h-7 text-sm"
 placeholder="Description..."
 autoFocus
 />
 <Button
 size="icon"
 variant="ghost"
 className="h-6 w-6"
 onClick={handleSave}
 aria-label="Save description"
 >
 <Check className="h-3.5 w-3.5" />
 </Button>
 <Button
 size="icon"
 variant="ghost"
 className="h-6 w-6"
 onClick={() => {
 setEditDescription(entry.description || "")
 setIsEditing(false)
 }}
 aria-label="Cancel editing"
 >
 <X className="h-3.5 w-3.5" />
 </Button>
 </div>
 ) : (
 <div className="flex items-center gap-2">
 <span className="text-sm text-slate-700  truncate">
 {entry.description || "No description"}
 </span>
 {entry.billable && (
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger>
 <DollarSign className="h-3.5 w-3.5 text-green-600" />
 </TooltipTrigger>
 <TooltipContent>Billable</TooltipContent>
 </Tooltip>
 </TooltipProvider>
 )}
 </div>
 )}
 <p className="text-xs text-slate-500">
 {format(parseISO(entry.startedAt), "MMM d, h:mm a")}
 {entry.endedAt && ` - ${format(parseISO(entry.endedAt), "h:mm a")}`}
 </p>
 </div>
 <Badge variant="outline" className="shrink-0">
 {formatMinutes(duration)}
 </Badge>
 {!disabled && !isEditing && (
 <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
 <Button
 size="icon"
 variant="ghost"
 className="h-6 w-6"
 onClick={() => setIsEditing(true)}
 aria-label="Edit time entry"
 >
 <Edit2 className="h-3.5 w-3.5" />
 </Button>
 <Button
 size="icon"
 variant="ghost"
 className="h-6 w-6 text-red-500 hover:text-red-600"
 onClick={onDelete}
 aria-label="Delete time entry"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </Button>
 </div>
 )}
 </div>
 )
}

// Manual time entry dialog
function ManualTimeEntryDialog({
 onSubmit,
 onCancel,
}: {
 onSubmit: (entry: {
 startedAt: string
 endedAt: string
 description?: string
 billable: boolean
 }) => Promise<void>
 onCancel: () => void
}) {
 const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
 const [startTime, setStartTime] = useState("09:00")
 const [endTime, setEndTime] = useState("10:00")
 const [description, setDescription] = useState("")
 const [billable, setBillable] = useState(false)
 const [isSubmitting, setIsSubmitting] = useState(false)

 const handleSubmit = async () => {
 if (isSubmitting) return

 const startedAt = new Date(`${date}T${startTime}:00`).toISOString()
 const endedAt = new Date(`${date}T${endTime}:00`).toISOString()

 if (new Date(endedAt) <= new Date(startedAt)) {
 return
 }

 setIsSubmitting(true)
 try {
 await onSubmit({
 startedAt,
 endedAt,
 description: description || undefined,
 billable,
 })
 } catch (_error) {
   /* silently ignore */
 } finally {
 setIsSubmitting(false)
 }
 }

 return (
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Add Manual Time Entry</DialogTitle>
 <DialogDescription>
 Record time you've already spent on this task
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-4">
 <div className="grid grid-cols-3 gap-3">
 <div className="space-y-2">
 <Label>Date</Label>
 <Input
 type="date"
 value={date}
 onChange={(e) => setDate(e.target.value)}
 />
 </div>
 <div className="space-y-2">
 <Label>Start Time</Label>
 <Input
 type="time"
 value={startTime}
 onChange={(e) => setStartTime(e.target.value)}
 />
 </div>
 <div className="space-y-2">
 <Label>End Time</Label>
 <Input
 type="time"
 value={endTime}
 onChange={(e) => setEndTime(e.target.value)}
 />
 </div>
 </div>

 <div className="space-y-2">
 <Label>Description (optional)</Label>
 <Input
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="What did you work on?"
 />
 </div>

 <div className="flex items-center gap-2">
 <Checkbox
 id="billable"
 checked={billable}
 onCheckedChange={(checked) => setBillable(checked === true)}
 />
 <Label htmlFor="billable" className="cursor-pointer">
 Mark as billable
 </Label>
 </div>

 <div className="flex justify-end gap-2 pt-2">
 <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
 Cancel
 </Button>
 <Button onClick={handleSubmit} disabled={isSubmitting}>
 {isSubmitting ? "Adding..." : "Add Entry"}
 </Button>
 </div>
 </div>
 </DialogContent>
 )
}

// Compact time display for task cards
export function TaskTimeDisplay({
 timeEntries,
 isTracking = false,
 className,
}: {
 timeEntries: TimeEntry[]
 isTracking?: boolean
 className?: string
}) {
 const totalMinutes = timeEntries.reduce((sum, entry) => {
 if (entry.durationMinutes) {
 return sum + entry.durationMinutes
 }
 if (entry.endedAt) {
 return sum + differenceInMinutes(parseISO(entry.endedAt), parseISO(entry.startedAt))
 }
 return sum
 }, 0)

 if (totalMinutes === 0 && !isTracking) return null

 const formatMinutes = (minutes: number) => {
 const hrs = Math.floor(minutes / 60)
 const mins = minutes % 60
 if (hrs > 0) {
 return `${hrs}h ${mins}m`
 }
 return `${mins}m`
 }

 return (
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger asChild>
 <Badge
 variant="outline"
 className={cn(
 "text-xs",
 isTracking && "bg-red-50 text-red-700 border-red-200  ",
 className
 )}
 >
 {isTracking && (
 <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse mr-1.5" />
 )}
 <Clock className="h-3 w-3 mr-1" />
 {formatMinutes(totalMinutes)}
 </Badge>
 </TooltipTrigger>
 <TooltipContent>
 <p>
 {isTracking ? "Timer running - " : ""}
 {totalMinutes} minutes tracked
 </p>
 </TooltipContent>
 </Tooltip>
 </TooltipProvider>
 )
}

// Time tracking summary for reports
export function TimeTrackingSummary({
 timeEntries,
 groupBy = "day",
 className,
}: {
 timeEntries: TimeEntry[]
 groupBy?: "day" | "week" | "task"
 className?: string
}) {
 const grouped = timeEntries.reduce((acc, entry) => {
 let key: string

 if (groupBy === "task") {
 key = entry.taskId || "No task"
 } else {
 const date = parseISO(entry.startedAt)
 key = groupBy === "week"
 ? format(date, "'Week of' MMM d")
 : format(date, "MMM d, yyyy")
 }

 if (!acc[key]) {
 acc[key] = { entries: [], totalMinutes: 0 }
 }

 const duration = entry.durationMinutes ||
 (entry.endedAt
 ? differenceInMinutes(parseISO(entry.endedAt), parseISO(entry.startedAt))
 : 0)

 acc[key].entries.push(entry)
 acc[key].totalMinutes += duration

 return acc
 }, {} as Record<string, { entries: TimeEntry[]; totalMinutes: number }>)

 const formatMinutes = (minutes: number) => {
 const hrs = Math.floor(minutes / 60)
 const mins = minutes % 60
 if (hrs > 0) {
 return `${hrs}h ${mins}m`
 }
 return `${mins}m`
 }

 return (
 <div className={cn("space-y-3", className)}>
 {Object.entries(grouped).map(([key, { entries, totalMinutes }]) => (
 <div key={key} className="space-y-1">
 <div className="flex items-center justify-between">
 <span className="text-sm font-medium text-slate-700 ">
 {key}
 </span>
 <Badge variant="secondary">
 {formatMinutes(totalMinutes)}
 </Badge>
 </div>
 <div className="h-2 bg-slate-100  rounded-full overflow-hidden">
 <div
 className="h-full bg-blue-500 rounded-full"
 style={{ width: `${Math.min(100, (totalMinutes / 480) * 100)}%` }}
 />
 </div>
 </div>
 ))}
 </div>
 )
}
