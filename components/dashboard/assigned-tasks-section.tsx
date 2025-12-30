"use client"

import { useState, useEffect } from "react"
import type { AssignedTask } from "@/lib/types"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils/date-utils"
import { CheckSquare, ArrowRight, Circle, RefreshCw, Link2, Unlink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AssignedTasksSectionProps {
  tasks: AssignedTask[]
  onToggleTask: (taskId: string) => void
  onTasksUpdated?: () => void
}

export function AssignedTasksSection({ tasks, onToggleTask, onTasksUpdated }: AssignedTasksSectionProps) {
  const { toast } = useToast()
  const [asanaConnected, setAsanaConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)

  const pendingTasks = tasks.filter((t) => t.status !== "completed")
  const completedTasks = tasks.filter((t) => t.status === "completed")

  // Check if user has Asana connected
  useEffect(() => {
    const checkAsanaConnection = async () => {
      try {
        const response = await fetch("/api/asana/me/connect")
        const data = await response.json()
        if (data.success) {
          setAsanaConnected(data.data.connected)
        }
      } catch (err) {
        console.error("Failed to check Asana connection:", err)
      } finally {
        setIsCheckingConnection(false)
      }
    }
    checkAsanaConnection()
  }, [])

  const handleSyncAsana = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/asana/me/sync", {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        const result = data.data
        if (result.tasksImported > 0 || result.tasksCompleted > 0) {
          toast({
            title: "Sync complete",
            description: `Imported ${result.tasksImported} new tasks${result.tasksCompleted > 0 ? `, ${result.tasksCompleted} marked complete` : ""}`,
          })
          // Trigger refresh of tasks
          onTasksUpdated?.()
        } else {
          toast({
            title: "Already up to date",
            description: "No new tasks to sync from Asana",
          })
        }
      } else {
        toast({
          title: "Sync failed",
          description: data.error || "Failed to sync with Asana",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Sync failed",
        description: "Failed to connect to Asana",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "high":
        return { bgColor: "bg-red-50", textColor: "text-red-700" }
      case "medium":
        return { bgColor: "bg-amber-50", textColor: "text-amber-700" }
      default:
        return { bgColor: "bg-slate-100", textColor: "text-slate-700" }
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-card">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-slate-900">My Tasks</h3>
            <span className="text-sm text-slate-500">({tasks.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {!isCheckingConnection && asanaConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncAsana}
                disabled={isSyncing}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Sync Asana"}
              </Button>
            )}
            {tasks.length > 0 && (
              <button className="text-sm text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-5">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No tasks assigned yet</p>
            <p className="text-sm text-slate-400 mt-1">Tasks assigned to you will appear here</p>
            {!isCheckingConnection && asanaConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncAsana}
                disabled={isSyncing}
                className="mt-4 gap-1.5"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Import from Asana"}
              </Button>
            )}
            {!isCheckingConnection && !asanaConnected && (
              <p className="text-xs text-slate-400 mt-4">
                <a href="/settings#integrations" className="text-blue-500 hover:underline">
                  Connect Asana
                </a>{" "}
                to sync your tasks
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Circle className="h-2 w-2 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Pending ({pendingTasks.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {pendingTasks.map((task) => {
                    const priorityConfig = getPriorityConfig(task.priority)
                    return (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors duration-200"
                      >
                        <Checkbox
                          checked={false}
                          onCheckedChange={() => onToggleTask(task.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-slate-900">{task.title}</p>
                            <span className={`status-pill ${priorityConfig.bgColor} ${priorityConfig.textColor}`}>
                              {task.priority}
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            {task.dueDate && (
                              <span className="text-xs text-slate-400">Due: {formatDate(task.dueDate)}</span>
                            )}
                            {task.rockTitle && (
                              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                {task.rockTitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Completed ({completedTasks.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {completedTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 border border-slate-100 rounded-lg bg-slate-50/50"
                    >
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => onToggleTask(task.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="font-medium line-through text-slate-400">{task.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
