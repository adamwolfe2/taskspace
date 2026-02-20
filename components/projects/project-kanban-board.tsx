"use client"

import type { AssignedTask } from "@/lib/types"
import { KanbanBoard } from "@/components/tasks/kanban-board"
import { FolderKanban } from "lucide-react"

interface ProjectKanbanBoardProps {
  projectId: string
  tasks: AssignedTask[]
  onTaskStatusChange: (taskId: string, newStatus: AssignedTask["status"]) => void
  onTaskClick?: (task: AssignedTask) => void
}

export function ProjectKanbanBoard({
  projectId: _projectId,
  tasks,
  onTaskStatusChange,
  onTaskClick,
}: ProjectKanbanBoardProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FolderKanban className="h-10 w-10 mb-3 opacity-20" />
        <p className="text-sm">No tasks linked to this project yet.</p>
        <p className="text-xs mt-1">Create tasks and link them to this project to see them here.</p>
      </div>
    )
  }

  return (
    <KanbanBoard
      tasks={tasks}
      onTaskStatusChange={onTaskStatusChange}
      onTaskClick={onTaskClick}
    />
  )
}
