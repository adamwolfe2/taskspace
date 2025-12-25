"use client"

import { useState } from "react"
import type { AssignedTask, Rock, TeamMember } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TaskCard } from "@/components/tasks/task-card"
import { AddTaskModal } from "@/components/tasks/add-task-modal"
import { Plus, ClipboardList, UserCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TasksPageProps {
  currentUser: TeamMember
  assignedTasks: AssignedTask[]
  setAssignedTasks: (tasks: AssignedTask[]) => void
  rocks: Rock[]
}

export function TasksPage({ currentUser, assignedTasks, setAssignedTasks, rocks }: TasksPageProps) {
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<AssignedTask | null>(null)
  const { toast } = useToast()

  const userTasks = assignedTasks.filter((t) => t.assigneeId === currentUser.id)
  const assignedByAdmin = userTasks.filter((t) => t.type === "assigned" && t.status === "pending")
  const personalTasks = userTasks.filter((t) => t.type === "personal" && t.status === "pending")
  const completedTasks = userTasks.filter((t) => t.status === "completed")

  const userRocks = rocks.filter((r) => r.userId === currentUser.id)

  const handleCompleteTask = (taskId: string) => {
    const updatedTasks = assignedTasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status: "completed" as const,
            completedAt: new Date().toISOString(),
          }
        : task,
    )
    setAssignedTasks(updatedTasks)

    toast({
      title: "Task completed!",
      description: "Added to today's EOD report",
    })
  }

  const handleAddTask = (taskData: {
    title: string
    description: string
    rockId: string | null
    rockTitle: string | null
    priority: "high" | "medium" | "normal"
    dueDate: string
  }) => {
    const newTask: AssignedTask = {
      id: `task-${Date.now()}`,
      ...taskData,
      assigneeId: currentUser.id,
      assigneeName: currentUser.name,
      assignedById: null,
      assignedByName: null,
      type: "personal",
      createdAt: new Date().toISOString(),
      status: "pending",
      completedAt: null,
      addedToEOD: false,
      eodReportId: null,
    }
    setAssignedTasks([...assignedTasks, newTask])

    toast({
      title: "Task created",
      description: "Your personal task has been added",
    })
  }

  const handleEditTask = (task: AssignedTask) => {
    setEditingTask(task)
    setShowAddTaskModal(true)
  }

  const handleDeleteTask = (taskId: string) => {
    setAssignedTasks(assignedTasks.filter((t) => t.id !== taskId))
    toast({
      title: "Task deleted",
      description: "Your task has been removed",
    })
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
                  <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} rocks={rocks} />
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
                      rocks={rocks}
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
                <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} rocks={rocks} />
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
