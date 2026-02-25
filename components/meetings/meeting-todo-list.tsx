"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ListChecks,
  CheckCircle2,
  Circle,
  ArrowRight,
  Calendar,
  User,
  Loader2,
  Plus,
  Link2,
} from "lucide-react"
import type { MeetingTodo } from "@/lib/db/meetings"
import type { AssignedTask } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

interface MeetingTodoListProps {
  meetingId: string
  workspaceId: string
}

export function MeetingTodoList({ meetingId, workspaceId }: MeetingTodoListProps) {
  const { toast } = useToast()
  const [todos, setTodos] = useState<MeetingTodo[]>([])
  const [tasks, setTasks] = useState<AssignedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState<string | null>(null)
  const [creatingTask, setCreatingTask] = useState<string | null>(null)
  const [selectedTodo, setSelectedTodo] = useState<MeetingTodo | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string>("")
  const [showConvertDialog, setShowConvertDialog] = useState(false)

  // Load todos
  const loadTodos = async () => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}/todos`)
      const data = await res.json()
      if (data.success) {
        setTodos(data.data)
      }
    } catch (err) {
      toast({ title: "Failed to load todos", description: err instanceof Error ? err.message : "An error occurred", variant: "destructive" })
    }
  }

  // Load available tasks
  const loadTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?workspaceId=${workspaceId}`)
      const data = await res.json()
      if (data.success) {
        setTasks(data.data)
      }
    } catch (err) {
      toast({ title: "Failed to load tasks", description: err instanceof Error ? err.message : "An error occurred", variant: "destructive" })
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([loadTodos(), loadTasks()])
      setLoading(false)
    }
    load()
  }, [meetingId, workspaceId])

  // Toggle todo completion
  const toggleTodoCompletion = async (todo: MeetingTodo) => {
    if (todo.completed) {
      // Already completed, can't uncomplete
      return
    }

    try {
      const res = await fetch(`/api/meetings/${meetingId}/todos?todoId=${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ completed: true }),
      })

      const data = await res.json()
      if (data.success) {
        setTodos((prev) =>
          prev.map((t) => (t.id === todo.id ? { ...t, completed: true } : t))
        )
        toast({
          title: "Todo completed",
          description: "The todo has been marked as complete.",
        })
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update todo",
        variant: "destructive",
      })
    }
  }

  // Open convert dialog
  const openConvertDialog = (todo: MeetingTodo) => {
    setSelectedTodo(todo)
    setSelectedTaskId("")
    setShowConvertDialog(true)
  }

  // Convert todo to task
  const convertToTask = async () => {
    if (!selectedTodo || !selectedTaskId) return

    setConverting(selectedTodo.id)
    try {
      const res = await fetch(`/api/meetings/${meetingId}/todos/${selectedTodo.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ taskId: selectedTaskId }),
      })

      const data = await res.json()
      if (data.success) {
        setTodos((prev) =>
          prev.map((t) => (t.id === selectedTodo.id ? data.data : t))
        )
        toast({
          title: "Todo converted",
          description: "The todo has been linked to the selected task.",
        })
        setShowConvertDialog(false)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to convert todo",
        variant: "destructive",
      })
    } finally {
      setConverting(null)
    }
  }

  // Create a brand-new task directly from a todo action item
  const createTaskFromTodo = async (todo: MeetingTodo) => {
    setCreatingTask(todo.id)
    try {
      // Step 1: Create the task
      const taskPayload: Record<string, unknown> = {
        title: todo.title,
        workspaceId,
        priority: "normal",
      }
      if (todo.assigneeId) taskPayload.assigneeId = todo.assigneeId
      if (todo.dueDate) taskPayload.dueDate = todo.dueDate

      const createRes = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify(taskPayload),
        credentials: "include",
      })
      const createData = await createRes.json()
      if (!createData.success) {
        throw new Error(createData.error || "Failed to create task")
      }
      const newTaskId = createData.data.id

      // Step 2: Link todo to the newly created task
      const linkRes = await fetch(`/api/meetings/${meetingId}/todos/${todo.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ taskId: newTaskId }),
      })
      const linkData = await linkRes.json()
      if (linkData.success) {
        setTodos((prev) =>
          prev.map((t) => (t.id === todo.id ? linkData.data : t))
        )
      }

      toast({
        title: "Task created",
        description: `"${todo.title}" has been added as a task${todo.assigneeName ? ` for ${todo.assigneeName}` : ""}.`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create task",
        variant: "destructive",
      })
    } finally {
      setCreatingTask(null)
    }
  }

  const incompleteTodos = todos.filter((t) => !t.completed)
  const completedTodos = todos.filter((t) => t.completed)
  const availableTasks = tasks.filter((t) => !t.completedAt && t.status !== "completed")

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-blue-500" />
              <CardTitle>Meeting Action Items</CardTitle>
            </div>
            <Badge variant="secondary">
              {incompleteTodos.length} pending
            </Badge>
          </div>
          <CardDescription>
            Track todos from this meeting and convert them to tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Incomplete Todos */}
          {incompleteTodos.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-700">Pending Action Items</h4>
              <div className="space-y-2">
                {incompleteTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => toggleTodoCompletion(todo)}
                      disabled={todo.completed}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{todo.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        {todo.assigneeName && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {todo.assigneeName}
                          </div>
                        )}
                        {todo.dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(todo.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    {todo.taskId ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                        Task Created
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => createTaskFromTodo(todo)}
                          disabled={creatingTask === todo.id || converting === todo.id}
                          title="Create a new task from this action item"
                        >
                          {creatingTask === todo.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Plus className="h-3 w-3 mr-1" />
                          )}
                          Create Task
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openConvertDialog(todo)}
                          disabled={creatingTask === todo.id || converting === todo.id}
                          title="Link to an existing task"
                          className="px-2"
                        >
                          <Link2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">
              <Circle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No pending action items</p>
            </div>
          )}

          {/* Completed Todos */}
          {completedTodos.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-sm font-medium text-slate-700">
                Completed ({completedTodos.length})
              </h4>
              <div className="space-y-2">
                {completedTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-through text-slate-500">{todo.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        {todo.assigneeName && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {todo.assigneeName}
                          </div>
                        )}
                        {todo.completedAt && (
                          <span>
                            Completed {new Date(todo.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {todo.taskId && (
                      <Badge variant="outline" className="text-xs">
                        Linked
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Convert to Task Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Existing Task</DialogTitle>
            <DialogDescription>
              Connect this action item to a task that already exists in your workspace
            </DialogDescription>
          </DialogHeader>
          {selectedTodo && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium">{selectedTodo.title}</p>
                {selectedTodo.assigneeName && (
                  <p className="text-xs text-slate-500 mt-1">
                    Assigned to: {selectedTodo.assigneeName}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Task</label>
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a task..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTasks.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500">
                        No available tasks found
                      </div>
                    ) : (
                      availableTasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          <div className="flex flex-col">
                            <span>{task.title}</span>
                            <span className="text-xs text-slate-500">
                              {task.assigneeName && `${task.assigneeName} - `}
                              {task.priority}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConvertDialog(false)}
              disabled={converting !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={convertToTask}
              disabled={!selectedTaskId || converting !== null}
            >
              {converting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Link to Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
