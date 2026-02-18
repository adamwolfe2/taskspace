"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select"
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
 Play,
 Pause,
 Square,
 RotateCcw,
 Clock,
 Coffee,
 Zap,
 Target,
 Volume2,
 VolumeX,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AssignedTask, Rock } from "@/lib/types"

interface FocusTimerProps {
 tasks?: AssignedTask[]
 rocks?: Rock[]
 onSessionComplete?: (session: {
 taskId?: string
 rockId?: string
 durationMinutes: number
 sessionType: "pomodoro" | "custom" | "deep_work"
 }) => void
 className?: string
}

type TimerState = "idle" | "focus" | "break" | "paused"

const POMODORO_FOCUS = 25 * 60 // 25 minutes in seconds
const POMODORO_SHORT_BREAK = 5 * 60 // 5 minutes
const POMODORO_LONG_BREAK = 15 * 60 // 15 minutes
const DEEP_WORK_DURATION = 90 * 60 // 90 minutes

export function FocusTimer({
 tasks = [],
 rocks = [],
 onSessionComplete,
 className,
}: FocusTimerProps) {
 const [timerState, setTimerState] = useState<TimerState>("idle")
 const [timeRemaining, setTimeRemaining] = useState(POMODORO_FOCUS)
 const [totalTime, setTotalTime] = useState(POMODORO_FOCUS)
 const [sessionType, setSessionType] = useState<"pomodoro" | "custom" | "deep_work">("pomodoro")
 const [pomodoroCount, setPomodoroCount] = useState(0)
 const [selectedTaskId, setSelectedTaskId] = useState<string>("")
 const [selectedRockId, setSelectedRockId] = useState<string>("")
 const [soundEnabled, setSoundEnabled] = useState(true)
 const [showCompleteDialog, setShowCompleteDialog] = useState(false)

 const intervalRef = useRef<NodeJS.Timeout | null>(null)
 const audioRef = useRef<HTMLAudioElement | null>(null)

 // Format time as MM:SS
 const formatTime = (seconds: number) => {
 const mins = Math.floor(seconds / 60)
 const secs = seconds % 60
 return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
 }

 // Progress percentage
 const progressPercent = ((totalTime - timeRemaining) / totalTime) * 100

 // Play notification sound
 const playSound = useCallback(() => {
 if (soundEnabled && audioRef.current) {
 audioRef.current.play().catch(() => {})
 }
 }, [soundEnabled])

 // Handle timer completion
 const handleTimerComplete = useCallback(() => {
 playSound()

 if (timerState === "focus") {
 // Focus session completed
 const newCount = pomodoroCount + 1
 setPomodoroCount(newCount)

 // Save session
 if (onSessionComplete) {
 onSessionComplete({
 taskId: selectedTaskId || undefined,
 rockId: selectedRockId || undefined,
 durationMinutes: Math.round(totalTime / 60),
 sessionType,
 })
 }

 setShowCompleteDialog(true)

 // Auto-start break
 if (sessionType === "pomodoro") {
 const breakDuration = newCount % 4 === 0 ? POMODORO_LONG_BREAK : POMODORO_SHORT_BREAK
 setTimeRemaining(breakDuration)
 setTotalTime(breakDuration)
 setTimerState("break")
 } else {
 setTimerState("idle")
 setTimeRemaining(totalTime)
 }
 } else if (timerState === "break") {
 // Break completed, ready for next focus
 setTimerState("idle")
 setTimeRemaining(POMODORO_FOCUS)
 setTotalTime(POMODORO_FOCUS)
 }
 }, [
 timerState,
 pomodoroCount,
 totalTime,
 sessionType,
 selectedTaskId,
 selectedRockId,
 onSessionComplete,
 playSound,
 ])

 // Timer tick effect
 useEffect(() => {
 if (timerState === "focus" || timerState === "break") {
 intervalRef.current = setInterval(() => {
 setTimeRemaining((prev) => {
 if (prev <= 1) {
 handleTimerComplete()
 return 0
 }
 return prev - 1
 })
 }, 1000)
 }

 return () => {
 if (intervalRef.current) {
 clearInterval(intervalRef.current)
 }
 }
 }, [timerState, handleTimerComplete])

 // Start timer
 const startTimer = () => {
 if (timerState === "idle") {
 setTimerState("focus")
 } else if (timerState === "paused") {
 setTimerState("focus")
 }
 }

 // Pause timer
 const pauseTimer = () => {
 setTimerState("paused")
 }

 // Stop timer
 const stopTimer = () => {
 setTimerState("idle")
 setTimeRemaining(sessionType === "deep_work" ? DEEP_WORK_DURATION : POMODORO_FOCUS)
 setTotalTime(sessionType === "deep_work" ? DEEP_WORK_DURATION : POMODORO_FOCUS)
 }

 // Reset timer
 const resetTimer = () => {
 stopTimer()
 setPomodoroCount(0)
 }

 // Change session type
 const handleSessionTypeChange = (type: "pomodoro" | "custom" | "deep_work") => {
 setSessionType(type)
 const duration = type === "deep_work" ? DEEP_WORK_DURATION : POMODORO_FOCUS
 setTimeRemaining(duration)
 setTotalTime(duration)
 setTimerState("idle")
 }

 const pendingTasks = tasks.filter((t) => t.status !== "completed")

 return (
 <>
 {/* Hidden audio element for notifications */}
 <audio ref={audioRef} src="/sounds/bell.mp3" preload="auto" />

 <Card className={cn("", className)}>
 <CardHeader className="pb-2">
 <CardTitle className="flex items-center justify-between text-base">
 <div className="flex items-center gap-2">
 <Clock className="h-5 w-5 text-amber-500" />
 Focus Timer
 </div>
 <div className="flex items-center gap-2">
 <Button
 variant="ghost"
 size="icon"
 className="h-8 w-8"
 onClick={() => setSoundEnabled(!soundEnabled)}
 aria-label={soundEnabled ? "Mute sound" : "Unmute sound"}
 aria-pressed={soundEnabled}
 >
 {soundEnabled ? (
 <Volume2 className="h-4 w-4" />
 ) : (
 <VolumeX className="h-4 w-4" />
 )}
 </Button>
 {pomodoroCount > 0 && (
 <Badge variant="secondary" className="gap-1">
 <Zap className="h-3 w-3" />
 {pomodoroCount}
 </Badge>
 )}
 </div>
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 {/* Timer Display */}
 <div className="flex flex-col items-center">
 <div
 className={cn(
 "text-5xl font-mono font-bold tabular-nums",
 timerState === "break"
 ? "text-green-600 "
 : timerState === "focus"
 ? "text-amber-600 "
 : "text-slate-700 "
 )}
 >
 {formatTime(timeRemaining)}
 </div>
 <div className="flex items-center gap-2 mt-2">
 {timerState === "focus" && (
 <Badge variant="secondary" className="bg-amber-100 text-amber-700  ">
 <Zap className="h-3 w-3 mr-1" />
 Focus
 </Badge>
 )}
 {timerState === "break" && (
 <Badge variant="secondary" className="bg-green-100 text-green-700  ">
 <Coffee className="h-3 w-3 mr-1" />
 Break
 </Badge>
 )}
 {timerState === "paused" && (
 <Badge variant="secondary">Paused</Badge>
 )}
 </div>
 </div>

 {/* Progress Bar */}
 <Progress value={progressPercent} className="h-2" />

 {/* Controls */}
 <div className="flex items-center justify-center gap-2">
 {timerState === "idle" || timerState === "paused" ? (
 <Button onClick={startTimer} className="gap-2">
 <Play className="h-4 w-4" />
 {timerState === "paused" ? "Resume" : "Start"}
 </Button>
 ) : (
 <Button onClick={pauseTimer} variant="secondary" className="gap-2">
 <Pause className="h-4 w-4" />
 Pause
 </Button>
 )}
 <Button onClick={stopTimer} variant="outline" size="icon" aria-label="Stop timer">
 <Square className="h-4 w-4" />
 </Button>
 <Button onClick={resetTimer} variant="ghost" size="icon" aria-label="Reset timer">
 <RotateCcw className="h-4 w-4" />
 </Button>
 </div>

 {/* Session Type Selector */}
 {timerState === "idle" && (
 <div className="space-y-3 pt-2 border-t">
 <div className="flex gap-2">
 <Button
 variant={sessionType === "pomodoro" ? "default" : "outline"}
 size="sm"
 onClick={() => handleSessionTypeChange("pomodoro")}
 className="flex-1"
 >
 Pomodoro
 </Button>
 <Button
 variant={sessionType === "deep_work" ? "default" : "outline"}
 size="sm"
 onClick={() => handleSessionTypeChange("deep_work")}
 className="flex-1"
 >
 Deep Work
 </Button>
 </div>

 {/* Task/Rock Selection */}
 <div className="space-y-2">
 <Select value={selectedTaskId || "none"} onValueChange={(v) => setSelectedTaskId(v === "none" ? "" : v)}>
 <SelectTrigger className="h-9">
 <SelectValue placeholder="Link to task (optional)" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">No task</SelectItem>
 {pendingTasks.map((task) => (
 <SelectItem key={task.id} value={task.id}>
 {task.title}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>

 <Select value={selectedRockId || "none"} onValueChange={(v) => setSelectedRockId(v === "none" ? "" : v)}>
 <SelectTrigger className="h-9">
 <SelectValue placeholder="Link to rock (optional)" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">No rock</SelectItem>
 {rocks
 .filter((r) => r.status !== "completed")
 .map((rock) => (
 <SelectItem key={rock.id} value={rock.id}>
 <div className="flex items-center gap-2">
 <Target className="h-3 w-3" />
 {rock.title}
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Session Complete Dialog */}
 <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <Zap className="h-5 w-5 text-amber-500" />
 Focus Session Complete!
 </DialogTitle>
 <DialogDescription>
 Great work! You completed a {Math.round(totalTime / 60)} minute focus session.
 {sessionType === "pomodoro" && " Time for a break."}
 </DialogDescription>
 </DialogHeader>
 <div className="py-4 text-center">
 <div className="text-4xl mb-2">
 {pomodoroCount % 4 === 0 ? "🎉" : "✨"}
 </div>
 <p className="text-sm text-slate-500">
 Total sessions today: {pomodoroCount}
 </p>
 </div>
 <DialogFooter>
 <Button onClick={() => setShowCompleteDialog(false)}>
 {timerState === "break" ? "Start Break" : "Done"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </>
 )
}

// Compact timer for header/sidebar
export function CompactFocusTimer({
 timeRemaining,
 isActive,
 isPaused,
 onToggle,
 className,
}: {
 timeRemaining: number
 isActive: boolean
 isPaused: boolean
 onToggle: () => void
 className?: string
}) {
 const mins = Math.floor(timeRemaining / 60)
 const secs = timeRemaining % 60

 return (
 <button
 onClick={onToggle}
 className={cn(
 "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
 isActive && !isPaused
 ? "bg-amber-100 text-amber-700   animate-pulse"
 : isPaused
 ? "bg-slate-100 text-slate-600  "
 : "bg-slate-100 text-slate-600   hover:bg-slate-200 ",
 className
 )}
 aria-label={`Focus timer: ${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")} ${isActive && !isPaused ? "(active)" : isPaused ? "(paused)" : ""}`}
 >
 {isActive ? (
 <Zap className="h-4 w-4" aria-hidden="true" />
 ) : (
 <Clock className="h-4 w-4" aria-hidden="true" />
 )}
 <span className="font-mono">
 {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
 </span>
 </button>
 )
}
