"use client"

import { useState, useMemo } from "react"
import { useTaskPool } from "@/lib/hooks/use-task-pool"
import { useApp } from "@/lib/contexts/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Trash2, RefreshCw, Users2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TaskPoolItem } from "@/lib/types"

const PRIORITY_ORDER: Record<TaskPoolItem["priority"], number> = { high: 0, medium: 1, normal: 2 }

const PRIORITY_CONFIG: Record<
  TaskPoolItem["priority"],
  { label: string; className: string }
> = {
  high: { label: "High", className: "bg-red-100 text-red-700 border-red-200" },
  medium: { label: "Medium", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  normal: { label: "Normal", className: "bg-slate-100 text-slate-600 border-slate-200" },
}

function PriorityBadge({ priority }: { priority: TaskPoolItem["priority"] }) {
  const config = PRIORITY_CONFIG[priority]
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  )
}

function AddTaskDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (data: { title: string; description?: string; priority: TaskPoolItem["priority"] }) => Promise<unknown>
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TaskPoolItem["priority"]>("normal")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    await onAdd({ title: title.trim(), description: description.trim() || undefined, priority })
    setLoading(false)
    setTitle("")
    setDescription("")
    setPriority("normal")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task to Pool</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Task title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              maxLength={500}
            />
          </div>
          <div>
            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              className="resize-none"
            />
          </div>
          <div>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as TaskPoolItem["priority"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || loading}>
              {loading ? "Adding…" : "Add Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TaskCard({
  task,
  currentMemberId,
  isAdmin,
  onClaim,
  onUnclaim,
  onDelete,
}: {
  task: TaskPoolItem
  currentMemberId: string
  isAdmin: boolean
  onClaim: (id: string) => void
  onUnclaim: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const isClaimed = task.isClaimedToday
  const isMyTask = task.claimedById === currentMemberId

  const handleAction = async (fn: () => void) => {
    setLoading(true)
    await fn()
    setLoading(false)
  }

  return (
    <div
      className={cn(
        "p-4 rounded-lg border bg-white transition-all",
        isClaimed
          ? "border-slate-200 opacity-70"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <PriorityBadge priority={task.priority} />
          </div>
          <p
            className={cn(
              "text-sm font-medium text-slate-900 leading-snug",
              isClaimed && "line-through text-slate-400"
            )}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">{task.description}</p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Added by {task.createdByName}
          </p>
          {isClaimed && task.claimedByName && (
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Claimed by {task.claimedByName}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!isClaimed ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={loading}
              onClick={() => handleAction(() => onClaim(task.id))}
            >
              Claim
            </Button>
          ) : (isMyTask || isAdmin) ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-slate-500 hover:text-slate-700"
              disabled={loading}
              onClick={() => handleAction(() => onUnclaim(task.id))}
            >
              Unclaim
            </Button>
          ) : null}

          {isAdmin && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
              disabled={loading}
              onClick={() => handleAction(() => onDelete(task.id))}
              aria-label="Delete task"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function TaskPoolPage() {
  const { currentUser } = useApp()
  const { tasks, isLoading, addTask, claim, unclaim, deleteTask, refresh } = useTaskPool()
  const [addOpen, setAddOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const isAdmin =
    currentUser?.role === "admin" || currentUser?.role === "owner"
  const currentMemberId = currentUser?.id || ""

  const available = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return tasks
      .filter((t) => !t.isClaimedToday)
      .filter((t) => !q || t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q))
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
  }, [tasks, searchQuery])

  const claimedToday = useMemo(
    () => tasks.filter((t) => t.isClaimedToday),
    [tasks]
  )

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-28" />
        </div>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Users2 className="h-5 w-5 text-slate-500" />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">General Task Pool</h1>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Auto-refreshing every 10s
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Search */}
      {tasks.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search tasks…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-slate-50 border-slate-200"
          />
        </div>
      )}

      {/* Available section */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Available ({available.length})
        </h2>
        {available.length === 0 ? (
          <div className="text-center py-10 rounded-lg border border-dashed border-slate-200">
            <p className="text-sm text-slate-400">No available tasks right now</p>
            <p className="text-xs text-slate-300 mt-1">Be the first to add one!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {available.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                currentMemberId={currentMemberId}
                isAdmin={isAdmin}
                onClaim={claim}
                onUnclaim={unclaim}
                onDelete={deleteTask}
              />
            ))}
          </div>
        )}
      </section>

      {/* Claimed Today section */}
      {claimedToday.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Claimed Today ({claimedToday.length})
          </h2>
          <div className="space-y-2">
            {claimedToday.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                currentMemberId={currentMemberId}
                isAdmin={isAdmin}
                onClaim={claim}
                onUnclaim={unclaim}
                onDelete={deleteTask}
              />
            ))}
          </div>
        </section>
      )}

      <AddTaskDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={addTask}
      />
    </div>
  )
}
