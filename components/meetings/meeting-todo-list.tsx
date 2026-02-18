"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ListChecks,
  Plus,
  CheckCircle2,
  Circle,
  ArrowRight,
  Calendar,
  User,
  Loader2,
} from "lucide-react"
import type { MeetingTodo } from "@/lib/db/meetings"
import type { AssignedTask } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

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
      console.error("Failed to load todos:", err)
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
      console.error("Failed to load tasks:", err)
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

  const incompleteTodos = todos.filter((t) => !t.completed)
  const completedTodos = todos.filter((t) => t.completed)
  const availableTasks = tasks.filter((t) => !t.completedAt && t.status !== "completed")

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
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
                        Linked to Task
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openConvertDialog(todo)}
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Convert to Task
                      </Button>
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
            <DialogTitle>Convert Todo to Task</DialogTitle>
            <DialogDescription>
              Link this todo to an existing task in your workspace
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
                  Converting...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Convert to Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
