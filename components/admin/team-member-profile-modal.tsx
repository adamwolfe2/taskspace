"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { UserInitials } from "@/components/shared/user-initials"
import type { TeamMember, Rock, AssignedTask, EODReport } from "@/lib/types"
import { calculateAccountabilityScore, calculateUserStats } from "@/lib/utils/stats-calculator"
import { Target, CheckSquare, FileText, Flame, TrendingUp, TrendingDown, Award, Send, MessageCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useWorkspaceStore } from "@/lib/hooks/use-workspace"

interface TeamMemberProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: TeamMember
  rocks: Rock[]
  tasks: AssignedTask[]
  eodReports: EODReport[]
}

export function TeamMemberProfileModal({
  open,
  onOpenChange,
  member,
  rocks,
  tasks,
  eodReports,
}: TeamMemberProfileModalProps) {
  const { toast } = useToast()
  const { currentWorkspaceId } = useWorkspaceStore()
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [sendingNote, setSendingNote] = useState(false)

  const handleSendNote = async () => {
    if (!noteText.trim() || !member.userId) return
    setSendingNote(true)
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          userId: member.userId,
          type: "general",
          title: "Note from your manager",
          message: noteText.trim(),
          workspaceId: currentWorkspaceId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send note")
      toast({ title: "Note sent", description: `${member.name} will see it in their notifications` })
      setNoteText("")
      setShowNoteForm(false)
    } catch {
      toast({ title: "Failed to send note", description: "Please try again", variant: "destructive" })
    } finally {
      setSendingNote(false)
    }
  }

  const uid = member.userId || member.id
  const accountability = calculateAccountabilityScore(uid, rocks, tasks, eodReports)
  const stats = calculateUserStats(uid, rocks, tasks, eodReports)

  const memberRocks = rocks.filter((r) => r.userId === uid && r.status !== "completed")
  const completedRocks = rocks.filter((r) => r.userId === uid && r.status === "completed")
  const memberTasks = tasks.filter((t) => t.assigneeId === uid)
  const pendingTasks = memberTasks.filter((t) => t.status === "pending")
  const completedTasks = memberTasks.filter((t) => t.status === "completed")

  const scoreBg =
    accountability.score >= 80
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : accountability.score >= 60
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-red-100 text-red-800 border-red-200"

  const statusColors: Record<string, string> = {
    "on-track": "bg-emerald-100 text-emerald-700",
    "at-risk": "bg-amber-100 text-amber-700",
    blocked: "bg-red-100 text-red-700",
    completed: "bg-slate-100 text-slate-600",
  }
  const statusLabels: Record<string, string> = {
    "on-track": "On Track",
    "at-risk": "At Risk",
    blocked: "Blocked",
    completed: "Completed",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <UserInitials name={member.name} size="lg" />
            <div>
              <DialogTitle className="text-xl">{member.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {member.department || "—"}{member.jobTitle ? ` · ${member.jobTitle}` : ""}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
            </div>
            <div className={`ml-auto flex flex-col items-center px-3 py-2 rounded-xl border ${scoreBg}`}>
              <span className="text-2xl font-black leading-none">{accountability.grade}</span>
              <span className="text-xs font-medium mt-0.5">{accountability.score}/100</span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Accountability Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-3">
              <Award className="h-4 w-4 text-amber-500" />
              Accountability Breakdown
            </h3>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">EOD Consistency (4wk)</span>
                  <span className="font-medium">{accountability.breakdown.eodConsistency}%</span>
                </div>
                <Progress value={accountability.breakdown.eodConsistency} className="h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Rock Health</span>
                  <span className="font-medium">{accountability.breakdown.rockHealth}%</span>
                </div>
                <Progress value={accountability.breakdown.rockHealth} className="h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Task Completion</span>
                  <span className="font-medium">{accountability.breakdown.taskCompletion}%</span>
                </div>
                <Progress value={accountability.breakdown.taskCompletion} className="h-1.5" />
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 border-y border-slate-100">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
              </div>
              <p className="font-bold text-sm">{stats.eodStreak}d</p>
              <p className="text-xs text-slate-500">EOD streak</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Target className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <p className="font-bold text-sm">{stats.activeRocks}</p>
              <p className="text-xs text-slate-500">Active rocks</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <CheckSquare className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <p className="font-bold text-sm">{completedTasks.length}/{memberTasks.length}</p>
              <p className="text-xs text-slate-500">Tasks done</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <p className="font-bold text-sm">{accountability.breakdown.eodConsistency}%</p>
              <p className="text-xs text-slate-500">EOD rate</p>
            </div>
          </div>

          {/* Active Rocks */}
          {memberRocks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
                <Target className="h-4 w-4 text-slate-400" />
                Active Rocks ({memberRocks.length})
              </h3>
              <div className="space-y-2">
                {memberRocks.map((rock) => (
                  <div key={rock.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{rock.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-500 rounded-full" style={{ width: `${rock.progress}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">{rock.progress}%</span>
                      </div>
                    </div>
                    <Badge className={`text-xs ${statusColors[rock.status] || "bg-slate-100 text-slate-600"}`} variant="outline">
                      {statusLabels[rock.status] || rock.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Rocks */}
          {completedRocks.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg p-2.5">
              <TrendingUp className="h-4 w-4 flex-shrink-0" />
              <span><strong>{completedRocks.length}</strong> rock{completedRocks.length !== 1 ? "s" : ""} completed this quarter</span>
            </div>
          )}

          {/* Pending Tasks */}
          {pendingTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
                <CheckSquare className="h-4 w-4 text-slate-400" />
                Pending Tasks ({pendingTasks.length})
              </h3>
              <div className="space-y-1.5">
                {pendingTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-sm text-slate-700 p-2 bg-slate-50 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                    <span className="truncate">{task.title}</span>
                    {task.priority === "high" && (
                      <Badge variant="destructive" className="ml-auto text-xs">High</Badge>
                    )}
                  </div>
                ))}
                {pendingTasks.length > 5 && (
                  <p className="text-xs text-slate-500 pl-2">+{pendingTasks.length - 5} more tasks</p>
                )}
              </div>
            </div>
          )}

          {memberRocks.length === 0 && pendingTasks.length === 0 && (
            <div className="text-center py-4 text-slate-500 text-sm">
              <TrendingDown className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
              No active rocks or pending tasks
            </div>
          )}

          {/* Send Note */}
          {member.userId && (
            <div className="border-t pt-4">
              {showNoteForm ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Send a note to {member.name}
                  </p>
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="e.g. Great work on the Q1 rock! Let's sync this week."
                    rows={3}
                    autoFocus
                    className="text-sm resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowNoteForm(false); setNoteText("") }}>
                      Cancel
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSendNote} disabled={!noteText.trim() || sendingNote}>
                      <Send className="h-3 w-3" />
                      {sendingNote ? "Sending…" : "Send Note"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => setShowNoteForm(true)}>
                  <MessageCircle className="h-3.5 w-3.5" />
                  Send Note to {member.name}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
