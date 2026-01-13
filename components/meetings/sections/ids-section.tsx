"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Lightbulb,
  MessageSquare,
  CheckCircle,
  Plus,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Trash2,
  Play,
  X,
  GripVertical,
} from "lucide-react"
import type { MeetingSection, Issue } from "@/lib/db/meetings"

interface IDSSectionProps {
  section: MeetingSection
  issues: Issue[]
  onComplete: (data: Record<string, unknown>) => void
  onResolveIssue: (issueId: string, resolution: string) => void
  onDropIssue: (issueId: string) => void
  onCreateTodo: (title: string, issueId?: string) => void
  isActive: boolean
}

type IssueWithState = Issue & {
  isDiscussing?: boolean
  resolution?: string
  todos?: string[]
}

export function IDSSection({
  section,
  issues,
  onComplete,
  onResolveIssue,
  onDropIssue,
  onCreateTodo,
  isActive,
}: IDSSectionProps) {
  const [issueList, setIssueList] = useState<IssueWithState[]>(() => {
    const savedState = section.data?.issueState as Record<string, IssueWithState> | undefined
    return issues.map((issue) => ({
      ...issue,
      ...(savedState?.[issue.id] || {}),
    }))
  })
  const [activeIssueId, setActiveIssueId] = useState<string | null>(
    (section.data?.activeIssueId as string) || null
  )
  const [newTodo, setNewTodo] = useState("")
  const [newResolution, setNewResolution] = useState("")

  const activeIssue = issueList.find((i) => i.id === activeIssueId)

  const handleStartDiscussion = (issueId: string) => {
    setActiveIssueId(issueId)
    setIssueList((prev) =>
      prev.map((i) => ({
        ...i,
        isDiscussing: i.id === issueId,
      }))
    )
    setNewResolution("")
    setNewTodo("")
  }

  const handleAddTodo = () => {
    if (!newTodo.trim() || !activeIssueId) return
    onCreateTodo(newTodo.trim(), activeIssueId)
    setIssueList((prev) =>
      prev.map((i) =>
        i.id === activeIssueId
          ? { ...i, todos: [...(i.todos || []), newTodo.trim()] }
          : i
      )
    )
    setNewTodo("")
  }

  const handleResolve = () => {
    if (!activeIssueId) return
    onResolveIssue(activeIssueId, newResolution)
    setIssueList((prev) =>
      prev.map((i) =>
        i.id === activeIssueId
          ? { ...i, status: "resolved", resolution: newResolution, isDiscussing: false }
          : i
      )
    )
    setActiveIssueId(null)
    setNewResolution("")
  }

  const handleDrop = (issueId: string) => {
    onDropIssue(issueId)
    setIssueList((prev) =>
      prev.map((i) =>
        i.id === issueId ? { ...i, status: "dropped", isDiscussing: false } : i
      )
    )
    if (activeIssueId === issueId) {
      setActiveIssueId(null)
    }
  }

  const handleMovePriority = (issueId: string, direction: "up" | "down") => {
    setIssueList((prev) => {
      const idx = prev.findIndex((i) => i.id === issueId)
      if (idx === -1) return prev
      const newIdx = direction === "up" ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const newList = [...prev]
      ;[newList[idx], newList[newIdx]] = [newList[newIdx], newList[idx]]
      return newList
    })
  }

  const handleComplete = () => {
    const resolved = issueList.filter((i) => i.status === "resolved").length
    const dropped = issueList.filter((i) => i.status === "dropped").length
    const remaining = issueList.filter((i) => i.status === "open").length

    onComplete({
      issueState: Object.fromEntries(issueList.map((i) => [i.id, i])),
      resolved,
      dropped,
      remaining,
      totalTodos: issueList.reduce((sum, i) => sum + (i.todos?.length || 0), 0),
    })
  }

  const openIssues = issueList.filter((i) => i.status === "open" || i.status === "discussing")
  const resolvedIssues = issueList.filter((i) => i.status === "resolved" || i.status === "dropped")

  if (!isActive && section.completed) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg">IDS (Issues)</CardTitle>
            </div>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
              Completed
            </Badge>
          </div>
          <CardDescription>Identify, Discuss, Solve</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-600">
            {resolvedIssues.length} issues addressed
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isActive) {
    return (
      <Card className="opacity-60">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-slate-400" />
            <CardTitle className="text-lg text-slate-500">IDS (Issues)</CardTitle>
          </div>
          <CardDescription>Identify, Discuss, Solve</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-primary/30 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-lg">IDS (Issues)</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{openIssues.length} open</Badge>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
              {resolvedIssues.length} resolved
            </Badge>
          </div>
        </div>
        <CardDescription>
          Identify the real issue, Discuss solutions, Solve with action items
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Discussion */}
        {activeIssue && (
          <div className="p-4 border-2 border-primary rounded-lg bg-primary/5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <Badge className="mb-2">Discussing</Badge>
                <h4 className="font-semibold">{activeIssue.title}</h4>
                {activeIssue.description && (
                  <p className="text-sm text-slate-600 mt-1">{activeIssue.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveIssueId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* IDS Steps */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-blue-100 rounded">
                <Lightbulb className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                <span className="font-medium">Identify</span>
              </div>
              <div className="p-2 bg-purple-100 rounded">
                <MessageSquare className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                <span className="font-medium">Discuss</span>
              </div>
              <div className="p-2 bg-emerald-100 rounded">
                <CheckCircle className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
                <span className="font-medium">Solve</span>
              </div>
            </div>

            {/* Add Todo */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Action Items (To-Dos)</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a to-do from this discussion..."
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTodo()
                  }}
                />
                <Button onClick={handleAddTodo} disabled={!newTodo.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {activeIssue.todos && activeIssue.todos.length > 0 && (
                <div className="space-y-1">
                  {activeIssue.todos.map((todo, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-slate-50 rounded">
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                      {todo}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resolution */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Resolution Summary (optional)</label>
              <Textarea
                placeholder="Summarize how this was resolved..."
                value={newResolution}
                onChange={(e) => setNewResolution(e.target.value)}
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleResolve} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Solve (Mark Resolved)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDrop(activeIssue.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Drop
              </Button>
            </div>
          </div>
        )}

        {/* Issue Queue */}
        {!activeIssue && openIssues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-700">Issue Queue (by priority)</h4>
            {openIssues.map((issue, idx) => (
              <div
                key={issue.id}
                className="flex items-center gap-2 p-2 border rounded-lg hover:bg-slate-50"
              >
                <GripVertical className="h-4 w-4 text-slate-400" />
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleMovePriority(issue.id, "up")}
                    disabled={idx === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleMovePriority(issue.id, "down")}
                    disabled={idx === openIssues.length - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{issue.title}</div>
                  {issue.ownerName && (
                    <div className="text-xs text-slate-500">{issue.ownerName}</div>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  #{idx + 1}
                </Badge>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleStartDiscussion(issue.id)}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Discuss
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDrop(issue.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {openIssues.length === 0 && !activeIssue && (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
            <p className="font-medium text-emerald-700">All issues addressed!</p>
            <p className="text-sm text-slate-500">
              {resolvedIssues.length} issue{resolvedIssues.length !== 1 ? "s" : ""} resolved this session
            </p>
          </div>
        )}

        {/* Resolved Issues Summary */}
        {resolvedIssues.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Resolved This Meeting</h4>
            <div className="space-y-1">
              {resolvedIssues.map((issue) => (
                <div key={issue.id} className="flex items-center gap-2 text-sm p-2 bg-emerald-50 rounded">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="truncate">{issue.title}</span>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {issue.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button onClick={handleComplete} className="w-full" disabled={!!activeIssue}>
          Complete IDS
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  )
}
