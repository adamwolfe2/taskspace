"use client"

import { useState, useEffect, useMemo } from "react"
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import {
 Calendar,
 CheckCircle2,
 Target,
 TrendingUp,
 Smile,
 Meh,
 Frown,
 Plus,
 X,
 Loader2,
 Save,
 Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { EODReport, AssignedTask, Rock, WeeklyReview } from "@/lib/types"
import { startOfWeek, endOfWeek, format, parseISO, isWithinInterval } from "date-fns"

interface WeeklyReviewModalProps {
 open: boolean
 onOpenChange: (open: boolean) => void
 weekStart?: Date
 eodReports: EODReport[]
 tasks: AssignedTask[]
 rocks: Rock[]
 existingReview?: WeeklyReview
 onSave: (review: Partial<WeeklyReview>) => Promise<void>
 userId: string
}

export function WeeklyReviewModal({
 open,
 onOpenChange,
 weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }),
 eodReports,
 tasks,
 rocks,
 existingReview,
 onSave,
 userId,
}: WeeklyReviewModalProps) {
 const [isSaving, setIsSaving] = useState(false)

 // Form state
 const [wentWell, setWentWell] = useState(existingReview?.wentWell || "")
 const [couldImprove, setCouldImprove] = useState(existingReview?.couldImprove || "")
 const [notes, setNotes] = useState(existingReview?.notes || "")
 const [mood, setMood] = useState<"positive" | "neutral" | "negative">(
 existingReview?.mood || "neutral"
 )
 const [energyLevel, setEnergyLevel] = useState(existingReview?.energyLevel || 3)
 const [productivityRating, setProductivityRating] = useState(
 existingReview?.productivityRating || 3
 )
 const [nextWeekGoals, setNextWeekGoals] = useState<{ text: string; priority?: string }[]>(
 existingReview?.nextWeekGoals || []
 )
 const [newGoal, setNewGoal] = useState("")

 const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

 // Calculate week's accomplishments from EOD reports
 const weeklyAccomplishments = useMemo(() => {
 return eodReports
 .filter((r) => {
 const reportDate = parseISO(r.date)
 return (
 r.userId === userId &&
 isWithinInterval(reportDate, { start: weekStart, end: weekEnd })
 )
 })
 .flatMap((r) =>
 (r.tasks || []).map((t) => ({
 text: t.text,
 date: r.date,
 rockTitle: t.rockTitle,
 }))
 )
 }, [eodReports, userId, weekStart, weekEnd])

 // Calculate task stats for the week
 const taskStats = useMemo(() => {
 const weekTasks = tasks.filter((t) => {
 if (t.assigneeId !== userId) return false
 if (!t.completedAt) return false
 const completedDate = parseISO(t.completedAt)
 return isWithinInterval(completedDate, { start: weekStart, end: weekEnd })
 })
 return {
 completed: weekTasks.length,
 total: tasks.filter((t) => t.assigneeId === userId).length,
 }
 }, [tasks, userId, weekStart, weekEnd])

 // Calculate rock progress
 const rockProgress = useMemo(() => {
 const userRocks = rocks.filter((r) => r.userId === userId && r.status !== "completed")
 const avgProgress = userRocks.length > 0
 ? Math.round(userRocks.reduce((sum, r) => sum + r.progress, 0) / userRocks.length)
 : 0
 return { count: userRocks.length, avgProgress }
 }, [rocks, userId])

 const handleAddGoal = () => {
 if (!newGoal.trim()) return
 setNextWeekGoals([...nextWeekGoals, { text: newGoal.trim() }])
 setNewGoal("")
 }

 const handleRemoveGoal = (index: number) => {
 setNextWeekGoals(nextWeekGoals.filter((_, i) => i !== index))
 }

 const handleSave = async () => {
 setIsSaving(true)
 try {
 await onSave({
 userId,
 weekStart: format(weekStart, "yyyy-MM-dd"),
 weekEnd: format(weekEnd, "yyyy-MM-dd"),
 accomplishments: weeklyAccomplishments,
 wentWell,
 couldImprove,
 nextWeekGoals,
 notes,
 mood,
 energyLevel,
 productivityRating,
 })
 onOpenChange(false)
 } catch (error) {
 console.error("Failed to save review:", error)
 } finally {
 setIsSaving(false)
 }
 }

 const moodOptions = [
 { value: "positive", icon: Smile, label: "Great", color: "text-green-500" },
 { value: "neutral", icon: Meh, label: "Okay", color: "text-amber-500" },
 { value: "negative", icon: Frown, label: "Rough", color: "text-red-500" },
 ] as const

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <Calendar className="h-5 w-5 text-indigo-500" />
 Weekly Review
 </DialogTitle>
 <DialogDescription>
 Week of {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-6">
 {/* Week Summary Stats */}
 <div className="grid grid-cols-3 gap-3">
 <Card>
 <CardContent className="pt-4 text-center">
 <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-1" />
 <p className="text-2xl font-bold">{taskStats.completed}</p>
 <p className="text-xs text-slate-500">Tasks Done</p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-4 text-center">
 <Target className="h-6 w-6 text-purple-500 mx-auto mb-1" />
 <p className="text-2xl font-bold">{rockProgress.avgProgress}%</p>
 <p className="text-xs text-slate-500">Avg Rock Progress</p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-4 text-center">
 <TrendingUp className="h-6 w-6 text-blue-500 mx-auto mb-1" />
 <p className="text-2xl font-bold">{weeklyAccomplishments.length}</p>
 <p className="text-xs text-slate-500">Accomplishments</p>
 </CardContent>
 </Card>
 </div>

 {/* Accomplishments */}
 {weeklyAccomplishments.length > 0 && (
 <div>
 <Label className="flex items-center gap-2 mb-2">
 <Sparkles className="h-4 w-4 text-amber-500" />
 Week's Accomplishments
 </Label>
 <div className="bg-slate-50  rounded-lg p-3 max-h-40 overflow-y-auto">
 <ul className="space-y-1 text-sm">
 {weeklyAccomplishments.slice(0, 10).map((acc, i) => (
 <li key={i} className="flex items-start gap-2">
 <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
 <span className="text-slate-700 ">{acc.text}</span>
 {acc.rockTitle && (
 <Badge variant="outline" className="text-xs shrink-0">
 {acc.rockTitle}
 </Badge>
 )}
 </li>
 ))}
 {weeklyAccomplishments.length > 10 && (
 <li className="text-slate-400 text-xs">
 +{weeklyAccomplishments.length - 10} more...
 </li>
 )}
 </ul>
 </div>
 </div>
 )}

 <Separator />

 {/* Mood & Energy */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="mb-2 block">How was your week?</Label>
 <div className="flex gap-2">
 {moodOptions.map((option) => (
 <button
 key={option.value}
 onClick={() => setMood(option.value)}
 className={cn(
 "flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
 mood === option.value
 ? "border-indigo-500 bg-indigo-50 "
 : "border-slate-200  hover:bg-slate-50 "
 )}
 >
 <option.icon
 className={cn("h-6 w-6", mood === option.value ? option.color : "text-slate-400")}
 />
 <span className="text-xs">{option.label}</span>
 </button>
 ))}
 </div>
 </div>
 <div>
 <Label className="mb-2 block">Energy Level</Label>
 <div className="px-2">
 <Slider
 value={[energyLevel]}
 onValueChange={([v]) => setEnergyLevel(v)}
 min={1}
 max={5}
 step={1}
 />
 <div className="flex justify-between text-xs text-slate-400 mt-1">
 <span>Low</span>
 <span>{energyLevel}/5</span>
 <span>High</span>
 </div>
 </div>
 </div>
 </div>

 {/* Reflections */}
 <div className="space-y-4">
 <div>
 <Label htmlFor="wentWell">What went well?</Label>
 <Textarea
 id="wentWell"
 value={wentWell}
 onChange={(e) => setWentWell(e.target.value)}
 placeholder="Celebrate your wins..."
 className="mt-1"
 rows={3}
 />
 </div>
 <div>
 <Label htmlFor="couldImprove">What could improve?</Label>
 <Textarea
 id="couldImprove"
 value={couldImprove}
 onChange={(e) => setCouldImprove(e.target.value)}
 placeholder="Areas for growth..."
 className="mt-1"
 rows={3}
 />
 </div>
 </div>

 {/* Next Week Goals */}
 <div>
 <Label className="mb-2 block">Goals for Next Week</Label>
 <div className="space-y-2">
 {nextWeekGoals.map((goal, index) => (
 <div
 key={index}
 className="flex items-center gap-2 bg-slate-50  rounded-lg px-3 py-2"
 >
 <Target className="h-4 w-4 text-purple-500 shrink-0" />
 <span className="flex-1 text-sm">{goal.text}</span>
 <button
 onClick={() => handleRemoveGoal(index)}
 className="text-slate-400 hover:text-red-500"
 >
 <X className="h-4 w-4" />
 </button>
 </div>
 ))}
 <div className="flex gap-2">
 <Input
 value={newGoal}
 onChange={(e) => setNewGoal(e.target.value)}
 onKeyDown={(e) => e.key === "Enter" && handleAddGoal()}
 placeholder="Add a goal..."
 className="flex-1"
 />
 <Button variant="outline" size="icon" onClick={handleAddGoal} aria-label="Add goal">
 <Plus className="h-4 w-4" />
 </Button>
 </div>
 </div>
 </div>

 {/* Private Notes */}
 <div>
 <Label htmlFor="notes" className="flex items-center gap-2">
 Private Notes
 <Badge variant="secondary" className="text-xs">Only you can see</Badge>
 </Label>
 <Textarea
 id="notes"
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Any personal reflections..."
 className="mt-1"
 rows={2}
 />
 </div>
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={() => onOpenChange(false)}>
 Cancel
 </Button>
 <Button onClick={handleSave} disabled={isSaving}>
 {isSaving ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 Saving...
 </>
 ) : (
 <>
 <Save className="mr-2 h-4 w-4" />
 Save Review
 </>
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 )
}
