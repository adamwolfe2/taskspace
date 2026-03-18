"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

import { Loader2, FileText, Target, CheckSquare, MessageSquare, Send } from "lucide-react"

interface PortalData {
  client: { name: string; company?: string }
  branding: { orgName: string; orgPrimaryColor?: string }
  eods: { id: string; date: string; userName: string; content: string }[]
  rocks: { id: string; title: string; status: string; progress: number; ownerName: string }[]
  tasks: { id: string; title: string; status: string; assigneeName: string; dueDate?: string }[]
}

export default function ClientPortalPage() {
  const params = useParams()
  const token = params.token as string
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<"updates" | "rocks" | "tasks">("updates")
  const [commentEodId, setCommentEodId] = useState<string | null>(null)
  const [commentName, setCommentName] = useState("")
  const [commentContent, setCommentContent] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchPortal() {
      try {
        const res = await fetch(`/api/portal/${token}`)
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        } else {
          setError(json.error || "Portal not found")
        }
      } catch {
        setError("Failed to load portal")
      } finally {
        setLoading(false)
      }
    }
    if (token) fetchPortal()
  }, [token])

  const handleComment = async (eodId: string) => {
    if (!commentName.trim() || !commentContent.trim()) return
    setSubmitting(true)
    try {
      await fetch(`/api/portal/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eodReportId: eodId, authorName: commentName, content: commentContent }),
      })
      setCommentEodId(null)
      setCommentName("")
      setCommentContent("")
    } catch {
      // ignore
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{error || "Portal not available"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const primaryColor = data.branding.orgPrimaryColor || "#000000"

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: primaryColor }}>{data.branding.orgName}</h1>
            <p className="text-sm text-muted-foreground">Client Portal — {data.client.name}{data.client.company ? ` (${data.client.company})` : ""}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <div className="flex gap-2">
          <Button variant={tab === "updates" ? "default" : "outline"} size="sm" onClick={() => setTab("updates")}>
            <FileText className="h-4 w-4 mr-1" />Updates
          </Button>
          {data.rocks.length > 0 && (
            <Button variant={tab === "rocks" ? "default" : "outline"} size="sm" onClick={() => setTab("rocks")}>
              <Target className="h-4 w-4 mr-1" />Rocks
            </Button>
          )}
          {data.tasks.length > 0 && (
            <Button variant={tab === "tasks" ? "default" : "outline"} size="sm" onClick={() => setTab("tasks")}>
              <CheckSquare className="h-4 w-4 mr-1" />Tasks
            </Button>
          )}
        </div>

        {tab === "updates" && (
          <div className="space-y-4">
            {data.eods.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No updates yet</CardContent></Card>
            ) : (
              data.eods.map(eod => (
                <Card key={eod.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{eod.userName} — {eod.date}</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setCommentEodId(commentEodId === eod.id ? null : eod.id)}>
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{eod.content}</p>
                    {commentEodId === eod.id && (
                      <div className="mt-3 space-y-2 border-t pt-3">
                        <Input placeholder="Your name" value={commentName} onChange={e => setCommentName(e.target.value)} />
                        <Textarea placeholder="Leave a comment..." value={commentContent} onChange={e => setCommentContent(e.target.value)} rows={2} />
                        <Button size="sm" onClick={() => handleComment(eod.id)} disabled={submitting}>
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                          Send
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === "rocks" && (
          <div className="space-y-3">
            {data.rocks.map(rock => (
              <Card key={rock.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{rock.title}</p>
                      <p className="text-xs text-muted-foreground">{rock.ownerName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={rock.status === "completed" ? "default" : "outline"}>{rock.status}</Badge>
                      <span className="text-sm font-medium">{rock.progress}%</span>
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${rock.progress}%` }} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {tab === "tasks" && (
          <div className="space-y-3">
            {data.tasks.map(task => (
              <Card key={task.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.assigneeName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{task.status}</Badge>
                      {task.dueDate && <span className="text-xs text-muted-foreground">{task.dueDate}</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
