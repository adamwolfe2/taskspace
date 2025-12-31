"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog"
import {
 Command,
 CommandEmpty,
 CommandGroup,
 CommandInput,
 CommandItem,
 CommandList,
 CommandSeparator,
} from "@/components/ui/command"
import {
 Popover,
 PopoverContent,
 PopoverTrigger,
} from "@/components/ui/popover"
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Rock, AssignedTask } from "@/lib/types"
import {
 Plus,
 Target,
 CheckSquare,
 Calendar,
 Clock,
 Flag,
 Mic,
 MicOff,
 Sparkles,
 Command as CommandIcon,
 Hash,
 AtSign,
 ArrowUp,
 X,
} from "lucide-react"
import { format, addDays, parseISO, startOfDay } from "date-fns"

interface QuickCaptureProps {
 rocks: Rock[]
 onCreateTask: (task: {
 title: string
 description?: string
 rockId?: string
 priority?: "high" | "medium" | "normal"
 dueDate?: string
 }) => Promise<void>
 onCreateRock?: (rock: {
 title: string
 description?: string
 dueDate: string
 }) => Promise<void>
 className?: string
}

export function QuickCapture({
 rocks,
 onCreateTask,
 onCreateRock,
 className,
}: QuickCaptureProps) {
 const [open, setOpen] = useState(false)
 const [input, setInput] = useState("")
 const [selectedRock, setSelectedRock] = useState<string | null>(null)
 const [priority, setPriority] = useState<"high" | "medium" | "normal">("normal")
 const [dueDate, setDueDate] = useState<string | null>(null)
 const [isSubmitting, setIsSubmitting] = useState(false)
 const [mode, setMode] = useState<"task" | "rock">("task")
 const inputRef = useRef<HTMLInputElement>(null)

 // Parse natural language commands from input
 const parseInput = useCallback((text: string) => {
 let parsedPriority: "high" | "medium" | "normal" = "normal"
 let parsedDueDate: string | null = null
 let parsedRockId: string | null = null
 let cleanText = text

 // Parse priority: !high, !urgent, !!
 if (/!high|!urgent|!!/i.test(text)) {
 parsedPriority = "high"
 cleanText = cleanText.replace(/!high|!urgent|!!/gi, "").trim()
 } else if (/!medium|!/i.test(text)) {
 parsedPriority = "medium"
 cleanText = cleanText.replace(/!medium|!/gi, "").trim()
 }

 // Parse due date: @today, @tomorrow, @monday, @next week
 const today = startOfDay(new Date())
 if (/@today/i.test(text)) {
 parsedDueDate = format(today, "yyyy-MM-dd")
 cleanText = cleanText.replace(/@today/gi, "").trim()
 } else if (/@tomorrow/i.test(text)) {
 parsedDueDate = format(addDays(today, 1), "yyyy-MM-dd")
 cleanText = cleanText.replace(/@tomorrow/gi, "").trim()
 } else if (/@next\s*week/i.test(text)) {
 parsedDueDate = format(addDays(today, 7), "yyyy-MM-dd")
 cleanText = cleanText.replace(/@next\s*week/gi, "").trim()
 } else if (/@(\d+)\s*days?/i.test(text)) {
 const match = text.match(/@(\d+)\s*days?/i)
 if (match) {
 parsedDueDate = format(addDays(today, parseInt(match[1])), "yyyy-MM-dd")
 cleanText = cleanText.replace(/@\d+\s*days?/gi, "").trim()
 }
 }

 // Parse rock: #rockname
 const rockMatch = text.match(/#(\w+)/i)
 if (rockMatch) {
 const rockName = rockMatch[1].toLowerCase()
 const matchingRock = rocks.find(
 (r) => r.title.toLowerCase().includes(rockName)
 )
 if (matchingRock) {
 parsedRockId = matchingRock.id
 cleanText = cleanText.replace(/#\w+/gi, "").trim()
 }
 }

 return {
 title: cleanText,
 priority: parsedPriority,
 dueDate: parsedDueDate,
 rockId: parsedRockId,
 }
 }, [rocks])

 // Handle keyboard shortcut to open
 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 // Cmd/Ctrl + K to open
 if ((e.metaKey || e.ctrlKey) && e.key === "k") {
 e.preventDefault()
 setOpen(true)
 }
 // Escape to close
 if (e.key === "Escape" && open) {
 setOpen(false)
 }
 }

 document.addEventListener("keydown", handleKeyDown)
 return () => document.removeEventListener("keydown", handleKeyDown)
 }, [open])

 // Focus input when opening
 useEffect(() => {
 if (open && inputRef.current) {
 setTimeout(() => inputRef.current?.focus(), 100)
 }
 }, [open])

 const handleSubmit = async () => {
 if (!input.trim() || isSubmitting) return

 const parsed = parseInput(input)
 if (!parsed.title.trim()) return

 setIsSubmitting(true)
 try {
 if (mode === "task") {
 await onCreateTask({
 title: parsed.title,
 rockId: parsed.rockId || selectedRock || undefined,
 priority: parsed.priority !== "normal" ? parsed.priority : priority !== "normal" ? priority : undefined,
 dueDate: parsed.dueDate || dueDate || undefined,
 })
 } else if (onCreateRock) {
 await onCreateRock({
 title: parsed.title,
 dueDate: parsed.dueDate || dueDate || format(addDays(new Date(), 90), "yyyy-MM-dd"),
 })
 }

 // Reset form
 setInput("")
 setSelectedRock(null)
 setPriority("normal")
 setDueDate(null)
 setOpen(false)
 } catch (error) {
 console.error("Failed to create:", error)
 } finally {
 setIsSubmitting(false)
 }
 }

 const handleKeyDown = (e: React.KeyboardEvent) => {
 if (e.key === "Enter" && !e.shiftKey) {
 e.preventDefault()
 handleSubmit()
 }
 }

 // Quick date shortcuts
 const quickDates = [
 { label: "Today", value: format(new Date(), "yyyy-MM-dd") },
 { label: "Tomorrow", value: format(addDays(new Date(), 1), "yyyy-MM-dd") },
 { label: "Next Week", value: format(addDays(new Date(), 7), "yyyy-MM-dd") },
 ]

 return (
 <>
 {/* Trigger Button */}
 <Button
 variant="outline"
 className={cn(
 "relative h-9 w-full justify-start text-sm text-muted-foreground",
 "bg-slate-50  border-slate-200 ",
 className
 )}
 onClick={() => setOpen(true)}
 >
 <Plus className="mr-2 h-4 w-4" />
 <span className="flex-1 text-left">Quick capture...</span>
 <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
 <span className="text-xs">⌘</span>K
 </kbd>
 </Button>

 {/* Capture Dialog */}
 <Dialog open={open} onOpenChange={setOpen}>
 <DialogContent className="sm:max-w-[500px] p-0">
 <div className="p-4 space-y-4">
 {/* Mode Toggle */}
 <div className="flex items-center gap-2">
 <Button
 variant={mode === "task" ? "default" : "outline"}
 size="sm"
 onClick={() => setMode("task")}
 >
 <CheckSquare className="h-4 w-4 mr-1" />
 Task
 </Button>
 {onCreateRock && (
 <Button
 variant={mode === "rock" ? "default" : "outline"}
 size="sm"
 onClick={() => setMode("rock")}
 >
 <Target className="h-4 w-4 mr-1" />
 Rock
 </Button>
 )}
 </div>

 {/* Main Input */}
 <div className="relative">
 <Input
 ref={inputRef}
 value={input}
 onChange={(e) => setInput(e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder={mode === "task" ? "What needs to be done?" : "What's your quarterly goal?"}
 className="pr-10 text-base h-12"
 disabled={isSubmitting}
 />
 <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400" />
 </div>

 {/* Parsed Preview */}
 {input && (
 <div className="flex flex-wrap gap-2">
 {parseInput(input).priority !== "normal" && (
 <Badge variant="outline" className="bg-amber-50 text-amber-700">
 <Flag className="h-3 w-3 mr-1" />
 {parseInput(input).priority}
 </Badge>
 )}
 {parseInput(input).dueDate && (
 <Badge variant="outline" className="bg-blue-50 text-blue-700">
 <Calendar className="h-3 w-3 mr-1" />
 {format(parseISO(parseInput(input).dueDate!), "MMM d")}
 </Badge>
 )}
 {parseInput(input).rockId && (
 <Badge variant="outline" className="bg-purple-50 text-purple-700">
 <Target className="h-3 w-3 mr-1" />
 {rocks.find((r) => r.id === parseInput(input).rockId)?.title}
 </Badge>
 )}
 </div>
 )}

 {/* Quick Options */}
 <div className="space-y-3">
 {mode === "task" && (
 <>
 {/* Rock Selection */}
 <div className="flex items-center gap-2">
 <Target className="h-4 w-4 text-slate-400" />
 <Select
 value={selectedRock || "none"}
 onValueChange={(v) => setSelectedRock(v === "none" ? null : v)}
 >
 <SelectTrigger className="flex-1 h-8">
 <SelectValue placeholder="Link to rock (optional)" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">No rock</SelectItem>
 {rocks.filter((r) => r.status !== "completed").map((rock) => (
 <SelectItem key={rock.id} value={rock.id}>
 {rock.title}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Priority */}
 <div className="flex items-center gap-2">
 <Flag className="h-4 w-4 text-slate-400" />
 <div className="flex gap-1">
 {(["normal", "medium", "high"] as const).map((p) => (
 <Button
 key={p}
 variant={priority === p ? "default" : "outline"}
 size="sm"
 className={cn(
 "h-7 text-xs capitalize",
 priority === p && p === "high" && "bg-red-600 hover:bg-red-700",
 priority === p && p === "medium" && "bg-amber-600 hover:bg-amber-700"
 )}
 onClick={() => setPriority(p)}
 >
 {p}
 </Button>
 ))}
 </div>
 </div>
 </>
 )}

 {/* Due Date */}
 <div className="flex items-center gap-2">
 <Calendar className="h-4 w-4 text-slate-400" />
 <div className="flex gap-1 flex-wrap">
 {quickDates.map((date) => (
 <Button
 key={date.value}
 variant={dueDate === date.value ? "default" : "outline"}
 size="sm"
 className="h-7 text-xs"
 onClick={() => setDueDate(dueDate === date.value ? null : date.value)}
 >
 {date.label}
 </Button>
 ))}
 <Input
 type="date"
 value={dueDate || ""}
 onChange={(e) => setDueDate(e.target.value)}
 className="h-7 w-auto text-xs"
 />
 </div>
 </div>
 </div>

 {/* Syntax Help */}
 <div className="text-xs text-slate-500 space-y-1 pt-2 border-t">
 <p className="font-medium">Quick syntax:</p>
 <div className="grid grid-cols-2 gap-1">
 <span><code className="bg-slate-100  px-1 rounded">!!</code> High priority</span>
 <span><code className="bg-slate-100  px-1 rounded">@today</code> Due today</span>
 <span><code className="bg-slate-100  px-1 rounded">#rock</code> Link to rock</span>
 <span><code className="bg-slate-100  px-1 rounded">@3days</code> Due in 3 days</span>
 </div>
 </div>

 {/* Submit */}
 <div className="flex justify-end gap-2 pt-2">
 <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
 Cancel
 </Button>
 <Button
 onClick={handleSubmit}
 disabled={!input.trim() || isSubmitting}
 >
 {isSubmitting ? (
 "Creating..."
 ) : (
 <>
 Create {mode}
 <ArrowUp className="h-4 w-4 ml-1" />
 </>
 )}
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 </>
 )
}

// Floating quick capture for mobile
export function FloatingQuickCapture({
 rocks,
 onCreateTask,
 className,
}: {
 rocks: Rock[]
 onCreateTask: QuickCaptureProps["onCreateTask"]
 className?: string
}) {
 const [open, setOpen] = useState(false)
 const [input, setInput] = useState("")
 const [isSubmitting, setIsSubmitting] = useState(false)

 const handleSubmit = async () => {
 if (!input.trim() || isSubmitting) return

 setIsSubmitting(true)
 try {
 await onCreateTask({ title: input.trim() })
 setInput("")
 setOpen(false)
 } catch (error) {
 console.error("Failed to create task:", error)
 } finally {
 setIsSubmitting(false)
 }
 }

 return (
 <>
 {/* Floating Button */}
 <Button
 size="icon"
 className={cn(
 "fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40",
 "bg-blue-600 hover:bg-blue-700 text-white",
 "md:hidden",
 className
 )}
 onClick={() => setOpen(true)}
 >
 <Plus className="h-6 w-6" />
 </Button>

 {/* Quick Input Sheet */}
 {open && (
 <div className="fixed inset-0 z-50 md:hidden">
 <div
 className="fixed inset-0 bg-black/50"
 onClick={() => setOpen(false)}
 />
 <div className="fixed bottom-0 left-0 right-0 bg-white  rounded-t-2xl p-4 space-y-3 animate-slide-up">
 <div className="flex items-center gap-2">
 <Input
 value={input}
 onChange={(e) => setInput(e.target.value)}
 placeholder="Quick task..."
 className="flex-1"
 autoFocus
 />
 <Button
 size="icon"
 onClick={handleSubmit}
 disabled={!input.trim() || isSubmitting}
 >
 <ArrowUp className="h-4 w-4" />
 </Button>
 <Button
 size="icon"
 variant="ghost"
 onClick={() => setOpen(false)}
 >
 <X className="h-4 w-4" />
 </Button>
 </div>
 </div>
 </div>
 )}
 </>
 )
}

// Inline quick add for task lists
export function InlineQuickAdd({
 placeholder = "Add a task...",
 onSubmit,
 className,
}: {
 placeholder?: string
 onSubmit: (title: string) => Promise<void>
 className?: string
}) {
 const [value, setValue] = useState("")
 const [isSubmitting, setIsSubmitting] = useState(false)
 const [isFocused, setIsFocused] = useState(false)

 const handleSubmit = async () => {
 if (!value.trim() || isSubmitting) return

 setIsSubmitting(true)
 try {
 await onSubmit(value.trim())
 setValue("")
 } catch (error) {
 console.error("Failed to add:", error)
 } finally {
 setIsSubmitting(false)
 }
 }

 return (
 <div
 className={cn(
 "flex items-center gap-2 p-2 rounded-lg border border-dashed transition-colors",
 isFocused
 ? "border-blue-400 bg-blue-50 "
 : "border-slate-200  hover:border-slate-300 ",
 className
 )}
 >
 <Plus className={cn(
 "h-4 w-4 transition-colors",
 isFocused ? "text-blue-500" : "text-slate-400"
 )} />
 <Input
 value={value}
 onChange={(e) => setValue(e.target.value)}
 onFocus={() => setIsFocused(true)}
 onBlur={() => setIsFocused(false)}
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault()
 handleSubmit()
 }
 }}
 placeholder={placeholder}
 className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
 disabled={isSubmitting}
 />
 {value && (
 <Button
 size="sm"
 variant="ghost"
 className="h-6 px-2"
 onClick={handleSubmit}
 disabled={isSubmitting}
 >
 Add
 </Button>
 )}
 </div>
 )
}
