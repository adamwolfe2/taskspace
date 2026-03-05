"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { FileText, Sparkles, Loader2, Copy, Download, Send, Trash2, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { CompanyDigest } from "@/lib/types"

export function CompanyDigestGenerator() {
  const { currentWorkspace } = useWorkspaces()
  const { toast } = useToast()
  const [digests, setDigests] = useState<CompanyDigest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [selectedDigest, setSelectedDigest] = useState<CompanyDigest | null>(null)

  // Generate form
  const [periodType, setPeriodType] = useState("quarterly")
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")

  const workspaceId = currentWorkspace?.id

  const fetchDigests = useCallback(async () => {
    if (!workspaceId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/company-digests?workspaceId=${workspaceId}`)
      const data = await res.json()
      if (data.success) setDigests(data.data || [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { fetchDigests() }, [fetchDigests])

  const handleGenerate = async () => {
    if (!workspaceId || !periodStart || !periodEnd) return
    setIsGenerating(true)
    try {
      const res = await fetch("/api/company-digests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, periodType, periodStart, periodEnd }),
      })
      const data = await res.json()
      if (data.success) {
        setShowGenerate(false)
        fetchDigests()
        toast({ title: "Digest generated", description: "Your company digest is ready." })
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate digest", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = (digest: CompanyDigest) => {
    const text = [
      digest.content.title,
      "",
      digest.content.executiveSummary,
      "",
      "Rock Update:",
      digest.content.rockUpdate,
      "",
      "Key Metrics:",
      ...digest.content.keyMetrics.map(m => `- ${m.name}: ${m.value} (${m.trend || ""})`),
      "",
      "Team Highlights:",
      ...digest.content.teamHighlights.map(h => `- ${h}`),
      "",
      "Challenges:",
      ...digest.content.challenges.map(c => `- ${c}`),
      "",
      "Outlook:",
      digest.content.outlook,
    ].join("\n")
    navigator.clipboard.writeText(text)
    toast({ title: "Copied", description: "Digest copied to clipboard" })
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/company-digests/${id}`, { method: "DELETE" })
      fetchDigests()
      if (selectedDigest?.id === id) setSelectedDigest(null)
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Company Digests</h2>
          <p className="text-sm text-muted-foreground">AI-generated updates for boards, investors, or all-hands</p>
        </div>
        <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Generate Digest</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Company Digest</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Period Type</label>
                <Select value={periodType} onValueChange={setPeriodType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleGenerate} disabled={isGenerating || !periodStart || !periodEnd} className="w-full">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : digests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No digests generated yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Digest List */}
          <div className="space-y-2">
            {digests.map(d => (
              <Card
                key={d.id}
                className={`cursor-pointer transition-colors ${selectedDigest?.id === d.id ? "border-primary" : "hover:border-muted-foreground/30"}`}
                onClick={() => setSelectedDigest(d)}
              >
                <CardContent className="py-3 px-4">
                  <p className="font-medium text-sm">{d.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{d.periodType}</Badge>
                    <span className="text-xs text-muted-foreground">{d.periodStart}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Digest Preview */}
          <div className="lg:col-span-2">
            {selectedDigest ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{selectedDigest.content.title}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(selectedDigest)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(selectedDigest.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="font-medium mb-1">Executive Summary</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedDigest.content.executiveSummary}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="font-medium mb-1">Rock Update</p>
                    <p className="text-muted-foreground">{selectedDigest.content.rockUpdate}</p>
                  </div>
                  {selectedDigest.content.keyMetrics.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="font-medium mb-2">Key Metrics</p>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedDigest.content.keyMetrics.map((m, i) => (
                            <div key={i} className="bg-muted/50 rounded p-2">
                              <p className="text-xs text-muted-foreground">{m.name}</p>
                              <p className="font-medium">{m.value}</p>
                              {m.trend && <Badge variant="outline" className="text-[10px] mt-0.5">{m.trend}</Badge>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {selectedDigest.content.outlook && (
                    <>
                      <Separator />
                      <div>
                        <p className="font-medium mb-1">Outlook</p>
                        <p className="text-muted-foreground">{selectedDigest.content.outlook}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>Select a digest to preview</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
