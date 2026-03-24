"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { FeatureGate } from "@/components/shared/feature-gate"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { Plus, Sparkles, Calendar, User, CheckCircle, Loader2, Star, MessageSquare } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { TeamMember, OneOnOne, OneOnOnePrep } from "@/lib/types"

interface OneOnOnePageProps {
  currentUser: { id: string; userId?: string; role: string; name: string }
  teamMembers: TeamMember[]
}

export function OneOnOnePage({ currentUser, teamMembers }: OneOnOnePageProps) {
  const { currentWorkspace } = useWorkspaces()
  const { toast } = useToast()
  const [oneOnOnes, setOneOnOnes] = useState<OneOnOne[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newReportId, setNewReportId] = useState("")
  const [newDate, setNewDate] = useState("")
  const [isGeneratingPrep, setIsGeneratingPrep] = useState(false)
  const [prep, setPrep] = useState<OneOnOnePrep | null>(null)

  const userId = currentUser.userId || currentUser.id
  const workspaceId = currentWorkspace?.id

  const fetchOneOnOnes = useCallback(async () => {
    if (!workspaceId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/one-on-ones?workspaceId=${workspaceId}`)
      const data = await res.json()
      if (data.success) setOneOnOnes(data.data || [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { fetchOneOnOnes() }, [fetchOneOnOnes])

  const selected = oneOnOnes.find(o => o.id === selectedId)

  const handleCreate = async () => {
    if (!workspaceId || !newReportId) return
    try {
      const res = await fetch("/api/one-on-ones", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          workspaceId,
          managerId: userId,
          reportId: newReportId,
          scheduledAt: newDate ? new Date(newDate).toISOString() : undefined,
        }),
      })
      if (!res.ok) {
        toast({ title: "Failed to create 1-on-1", variant: "destructive" })
        return
      }
      const data = await res.json()
      if (data.success) {
        setShowCreate(false)
        setNewReportId("")
        setNewDate("")
        fetchOneOnOnes()
      }
    } catch {
      toast({ title: "Failed to create 1-on-1", variant: "destructive" })
    }
  }

  const handleGeneratePrep = async (oneOnOne: OneOnOne) => {
    setIsGeneratingPrep(true)
    try {
      const res = await fetch("/api/ai/one-on-ones/prep", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ reportId: oneOnOne.reportId, workspaceId }),
      })
      if (!res.ok) {
        toast({ title: "Failed to generate prep", variant: "destructive" })
        return
      }
      const data = await res.json()
      if (data.success) {
        setPrep(data.data)
        fetchOneOnOnes()
      }
    } catch {
      toast({ title: "Failed to generate prep", variant: "destructive" })
    } finally {
      setIsGeneratingPrep(false)
    }
  }

  const handleComplete = async (id: string) => {
    try {
      const res = await fetch(`/api/one-on-ones/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ status: "completed", completedAt: new Date().toISOString() }),
      })
      if (!res.ok) {
        toast({ title: "Failed to complete 1-on-1", variant: "destructive" })
        return
      }
      fetchOneOnOnes()
    } catch {
      toast({ title: "Failed to complete 1-on-1", variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/one-on-ones/${id}`, { method: "DELETE", headers: { "X-Requested-With": "XMLHttpRequest" } })
      if (!res.ok) {
        toast({ title: "Failed to delete 1-on-1", variant: "destructive" })
        return
      }
      if (selectedId === id) setSelectedId(null)
      fetchOneOnOnes()
    } catch {
      toast({ title: "Failed to delete 1-on-1", variant: "destructive" })
    }
  }

  const getMemberName = (id: string) => teamMembers.find(m => m.id === id)?.name || "Unknown"

  return (
    <FeatureGate feature="advanced.oneOnOnes">
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">1-on-1 Meetings</h1>
              <p className="text-muted-foreground">Structured meetings with AI-powered preparation</p>
            </div>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />New 1-on-1</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule 1-on-1</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium">Direct Report</label>
                    <Select value={newReportId} onValueChange={setNewReportId}>
                      <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                      <SelectContent>
                        {teamMembers.filter(m => m.id !== userId).map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Date</label>
                    <Input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} />
                  </div>
                  <Button onClick={handleCreate} disabled={!newReportId} className="w-full">
                    Create 1-on-1
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : oneOnOnes.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No 1-on-1s scheduled yet</p>
                  </CardContent>
                </Card>
              ) : (
                oneOnOnes.map(o => (
                  <Card
                    key={o.id}
                    className={`cursor-pointer transition-colors ${selectedId === o.id ? "border-primary" : "hover:border-muted-foreground/30"}`}
                    onClick={() => { setSelectedId(o.id); setPrep(o.aiPrep || null) }}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{getMemberName(o.reportId)}</p>
                          <p className="text-xs text-muted-foreground">
                            {o.scheduledAt ? new Date(o.scheduledAt).toLocaleDateString() : "Unscheduled"}
                          </p>
                        </div>
                        <Badge variant={o.status === "completed" ? "default" : o.status === "in_progress" ? "secondary" : "outline"}>
                          {o.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Detail */}
            <div className="lg:col-span-2">
              {selected ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>1-on-1 with {getMemberName(selected.reportId)}</CardTitle>
                        <CardDescription>
                          {selected.scheduledAt ? new Date(selected.scheduledAt).toLocaleString() : "Unscheduled"}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {selected.status !== "completed" && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleGeneratePrep(selected)} disabled={isGeneratingPrep}>
                              {isGeneratingPrep ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                              AI Prep
                            </Button>
                            <Button size="sm" onClick={() => handleComplete(selected.id)}>
                              <CheckCircle className="h-4 w-4 mr-1" />Complete
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(selected.id)}>Delete</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* AI Prep Section */}
                    {(prep || selected.aiPrep) && (
                      <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />AI Preparation
                        </h3>
                        {(() => {
                          const p = prep || selected.aiPrep!
                          return (
                            <div className="space-y-3">
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-sm font-medium mb-1">Performance Summary</p>
                                <p className="text-sm text-muted-foreground">{p.performanceSummary}</p>
                              </div>
                              {p.talkingPoints.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium mb-1">Talking Points</p>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {p.talkingPoints.map((tp, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <MessageSquare className="h-3 w-3 mt-1 flex-shrink-0" />
                                        {tp}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {p.recognitionOpportunities.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium mb-1">Recognition Opportunities</p>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {p.recognitionOpportunities.map((r, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <Star className="h-3 w-3 mt-1 flex-shrink-0 text-yellow-500" />
                                        {r}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {p.suggestedQuestions.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium mb-1">Suggested Questions</p>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {p.suggestedQuestions.map((q, i) => (
                                      <li key={i} className="text-sm italic">&ldquo;{q}&rdquo;</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                        <Separator />
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <h3 className="font-semibold mb-2">Notes</h3>
                      <Textarea
                        placeholder="Meeting notes..."
                        defaultValue={selected.notes || ""}
                        rows={6}
                        onBlur={async (e) => {
                          if (e.target.value !== (selected.notes || "")) {
                            await fetch(`/api/one-on-ones/${selected.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
                              body: JSON.stringify({ notes: e.target.value }),
                            })
                          }
                        }}
                      />
                    </div>

                    {/* Action Items */}
                    {selected.actionItems.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Action Items</h3>
                        <ul className="space-y-2">
                          {selected.actionItems.map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <CheckCircle className={`h-4 w-4 ${item.completed ? "text-green-500" : "text-muted-foreground"}`} />
                              <span className={item.completed ? "line-through text-muted-foreground" : ""}>{item.text}</span>
                              {item.assignee && <Badge variant="outline" className="text-xs">{item.assignee}</Badge>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Rating */}
                    {selected.status === "completed" && selected.rating && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Meeting Rating:</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`h-4 w-4 ${s <= (selected.rating || 0) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Select a 1-on-1 to view details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </FeatureGate>
  )
}
