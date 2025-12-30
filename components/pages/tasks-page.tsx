"use client"

import { useState, useMemo } from "react"
import type { AssignedTask, Rock, TeamMember } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TaskCard } from "@/components/tasks/task-card"
import { AddTaskModal } from "@/components/tasks/add-task-modal"
import { Plus, ClipboardList, UserCheck, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { addDays, addWeeks, addMonths } from "date-fns"

interface TasksPageProps {
  currentUser: TeamMember
  assignedTasks: AssignedTask[]
  setAssignedTasks: (tasks: AssignedTask[]) => void
  rocks: Rock[]
  createTask: (task: Partial<AssignedTask>) => Promise<AssignedTask>
  updateTask: (id: string, updates: Partial<AssignedTask>) => Promise<AssignedTask>
  deleteTask: (id: string) => Promise<void>
}

export function TasksPage({
  currentUser,
  assignedTasks,
  setAssignedTasks,
  rocks,
  createTask,
  updateTask,
  deleteTask,
}: TasksPageProps) {
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<AssignedTask | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const { toast } = useToast()

  const userTasks = assignedTasks.filter((t) => t.assigneeId === currentUser.id)

  const filteredTasks = useMemo(() => {
    return userTasks.filter((task) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = task.title.toLowerCase().includes(query)
        const matchesDescription = task.description?.toLowerCase().includes(query)
        if (!matchesTitle && !matchesDescription) return false
      }

      // Priority filter
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false

      return true
    })
  }, [userTasks, searchQuery, priorityFilter])

  const assignedByAdmin = filteredTasks.filter((t) => t.type === "assigned" && t.status !== "completed")
  const personalTasks = filteredTasks.filter((t) => t.type === "personal" && t.status !== "completed")
  const completedTasks = filteredTasks.filter((t) => t.status === "completed")

  const userRocks = rocks.filter((r) => r.userId === currentUser.id)

  const calculateNextDueDate = (currentDueDate: string, recurrence: NonNullable<AssignedTask["recurrence"]>): Date => {
    const current = new Date(currentDueDate)
    switch (recurrence.type) {
      case "daily":
        return addDays(current, recurrence.interval)
      case "weekly":
        return addWeeks(current, recurrence.interval)
      case "monthly":
        return addMonths(current, recurrence.interval)
      default:
        return addDays(current, 1)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      const completedTask = userTasks.find((t) => t.id === taskId)

      await updateTask(taskId, {
        status: "completed",
        completedAt: new Date().toISOString(),
      })

      // If this is a recurring task, create the next instance
      if (completedTask?.recurrence) {
        const nextDueDate = calculateNextDueDate(completedTask.dueDate, completedTask.recurrence)

        // Check if we've passed the end date
        if (!completedTask.recurrence.endDate || nextDueDate <= new Date(completedTask.recurrence.endDate)) {
          await createTask({
            title: completedTask.title,
            description: completedTask.description,
            assigneeId: completedTask.assigneeId,
            rockId: completedTask.rockId,
            priority: completedTask.priority,
            dueDate: nextDueDate.toISOString().split("T")[0],
            recurrence: completedTask.recurrence,
            parentRecurringTaskId: completedTask.parentRecurringTaskId || completedTask.id,
          })

          toast({
            title: "Task completed!",
            description: `Added to today's EOD report. Next occurrence created for ${nextDueDate.toLocaleDateString()}`,
          })
          return
        }
      }

      toast({
        title: "Task completed!",
        description: "Added to today's EOD report",
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to complete task",
        variant: "destructive",
      })
    }
  }

  const handleAddTask = async (taskData: {
    title: string
    description: string
    rockId: string | null
    rockTitle: string | null
    priority: "high" | "medium" | "normal"
    dueDate: string
    recurrence?: AssignedTask["recurrence"]
  }) => {
    try {
      await createTask({
        title: taskData.title,
        description: taskData.description,
        assigneeId: currentUser.id,
        rockId: taskData.rockId,
        priority: taskData.priority,
        dueDate: taskData.dueDate,
        recurrence: taskData.recurrence,
      })
      toast({
        title: "Task created",
        description: taskData.recurrence
          ? `Recurring task created (${taskData.recurrence.type})`
          : "Your personal task has been added",
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create task",
        variant: "destructive",
      })
    }
  }

  const handleEditTask = (task: AssignedTask) => {
    setEditingTask(task)
    setShowAddTaskModal(true)
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId)
      toast({
        title: "Task deleted",
        description: "Your task has been removed",
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete task",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage your daily tasks and to-dos</p>
        </div>
        <Button onClick={() => setShowAddTaskModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-36 bg-slate-50 border-slate-200">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">My Tasks ({assignedByAdmin.length + personalTasks.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {assignedByAdmin.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-blue-500" />
                  Assigned by Admin
                </CardTitle>
                <CardDescription>Priority tasks assigned to you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignedByAdmin.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleCompleteTask}
                    onUpdateTask={updateTask}
                    rocks={rocks}
                    currentUser={currentUser}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                My Personal Tasks
              </CardTitle>
              <CardDescription>Tasks you've created for yourself</CardDescription>
            </CardHeader>
            <CardContent>
              {personalTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No personal tasks yet</p>
                  <p className="text-sm mt-1">Click "+ Add Task" to create your first to-do</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {personalTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={handleCompleteTask}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onUpdateTask={updateTask}
                      rocks={rocks}
                      currentUser={currentUser}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedTasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">No completed tasks yet</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                  onUpdateTask={updateTask}
                  rocks={rocks}
                  currentUser={currentUser}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddTaskModal
        open={showAddTaskModal}
        onOpenChange={setShowAddTaskModal}
        onSubmit={handleAddTask}
        userRocks={userRocks}
      />
    </div>
  )
}
