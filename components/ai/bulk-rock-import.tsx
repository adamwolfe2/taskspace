"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  Sparkles,
  Mountain,
  Upload,
  CheckCircle2,
  XCircle,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import type { TeamMember } from "@/lib/types"
import { useWorkspaceStore } from "@/lib/hooks/use-workspace"

interface ParsedRock {
  title: string
  description: string
  milestones: string[]
  suggestedQuarter?: string
  assigneeName?: string
}

interface ParsedMetric {
  assigneeName: string
  metricName: string
  weeklyGoal: number
}

interface BulkRockImportProps {
  teamMembers: TeamMember[]
}

export function BulkRockImport({ teamMembers }: BulkRockImportProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [rawText, setRawText] = useState("")
  const [parsedRocks, setParsedRocks] = useState<ParsedRock[]>([])
  const [parsedMetrics, setParsedMetrics] = useState<ParsedMetric[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedRock, setExpandedRock] = useState<number | null>(null)
  const { currentWorkspaceId } = useWorkspaceStore()
  const { toast } = useToast()

  const handleParse = async () => {
    if (!rawText.trim()) {
      setError("Please paste some rock text to parse")
      return
    }

    setIsParsing(true)
    setError(null)

    try {
      const response = await fetch("/api/rocks/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to parse rocks")
      }

      setParsedRocks(data.data.rocks)
      setParsedMetrics(data.data.metrics || [])

      if (data.data.rocks.length === 0 && (data.data.metrics?.length || 0) === 0) {
        setError("No rocks or metrics found in the text. Please check the formatting and try again.")
      } else {
        const metricsMsg = data.data.metrics?.length > 0
          ? ` and ${data.data.metrics.length} metric(s)`
          : ""
        toast({
          title: "Content parsed",
          description: `Found ${data.data.rocks.length} rock(s)${metricsMsg}`,
        })
        // Expand first rock by default
        if (data.data.rocks.length > 0) {
          setExpandedRock(0)
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsParsing(false)
    }
  }

  const handleCreateAll = async () => {
    if (!selectedUserId) {
      setError("Please select a team member first")
      return
    }

    if (parsedRocks.length === 0) {
      setError("No rocks to create")
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch("/api/rocks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          workspaceId: currentWorkspaceId,
          rocks: parsedRocks.map((rock) => ({
            title: rock.title,
            description: rock.description,
            milestones: rock.milestones,
            quarter: rock.suggestedQuarter,
          })),
          metrics: parsedMetrics, // Pass parsed metrics to the API
        }),
      })

      const data = await response.json()

      if (!data.success || !data.data) {
        // Build a detailed error message from failed rocks
        let errorMsg = data.error || "Failed to create rocks"
        if (data.data?.failed?.length > 0) {
          const failedDetails = data.data.failed
            .slice(0, 3) // Show first 3 failures
            .map((f: { title: string; error: string }) => `"${f.title}": ${f.error}`)
            .join("; ")
          errorMsg = failedDetails
        }
        throw new Error(errorMsg)
      }

      const selectedMember = teamMembers.find((m) => m.id === selectedUserId)
      const metricsSetMsg = data.data.metricsSet > 0
        ? ` and ${data.data.metricsSet} metric(s) set`
        : ""

      toast({
        title: "Rocks created!",
        description: `Created ${data.data.created.length} rock(s) for ${selectedMember?.name || "team member"}${metricsSetMsg}`,
      })

      // Reset form
      setRawText("")
      setParsedRocks([])
      setParsedMetrics([])
      setExpandedRock(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsCreating(false)
    }
  }

  const updateRock = (index: number, updates: Partial<ParsedRock>) => {
    setParsedRocks((prev) =>
      prev.map((rock, i) => (i === index ? { ...rock, ...updates } : rock))
    )
  }

  const removeRock = (index: number) => {
    setParsedRocks((prev) => prev.filter((_, i) => i !== index))
  }

  const addMilestone = (rockIndex: number) => {
    setParsedRocks((prev) =>
      prev.map((rock, i) =>
        i === rockIndex
          ? { ...rock, milestones: [...rock.milestones, "New milestone"] }
          : rock
      )
    )
  }

  const updateMilestone = (rockIndex: number, milestoneIndex: number, value: string) => {
    setParsedRocks((prev) =>
      prev.map((rock, i) =>
        i === rockIndex
          ? {
              ...rock,
              milestones: rock.milestones.map((m, j) =>
                j === milestoneIndex ? value : m
              ),
            }
          : rock
      )
    )
  }

  const removeMilestone = (rockIndex: number, milestoneIndex: number) => {
    setParsedRocks((prev) =>
      prev.map((rock, i) =>
        i === rockIndex
          ? { ...rock, milestones: rock.milestones.filter((_, j) => j !== milestoneIndex) }
          : rock
      )
    )
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Rocks from Text
          </CardTitle>
          <CardDescription>
            Paste quarterly rocks in any format and AI will parse them into structured goals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-member">Assign to Team Member</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="team-member">
                <SelectValue placeholder="Select team member..." />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <span className="flex items-center gap-2">
                      {member.name}
                      <span className="text-muted-foreground">({member.email})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rock-text">Rock Text</Label>
            <Textarea
              id="rock-text"
              placeholder={`Paste your rocks here. Example format:

Rock 1: Deploy AI Voice Dialers
- Connect Med Pros account to GHL
- Configure AI voice dialer settings
- QA test deployments

Rock 2: Launch New Product
- Design MVP features
- Build prototype
- User testing`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleParse}
            disabled={isParsing || !rawText.trim()}
            className="w-full"
          >
            {isParsing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Parsing with AI...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Parse with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Parsed Rocks Preview */}
      {parsedRocks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mountain className="h-5 w-5" />
                  Parsed Rocks ({parsedRocks.length})
                </CardTitle>
                <CardDescription>
                  Review and edit before creating
                </CardDescription>
              </div>
              <Button
                onClick={handleCreateAll}
                disabled={isCreating || !selectedUserId}
                size="lg"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Create All Rocks
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {parsedRocks.map((rock, index) => (
              <Card key={index} className="border-l-4 border-l-primary">
                <CardHeader
                  className="py-3 cursor-pointer"
                  onClick={() => setExpandedRock(expandedRock === index ? null : index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Rock {index + 1}</Badge>
                      <span className="font-medium">{rock.title}</span>
                      {rock.suggestedQuarter && (
                        <Badge variant="secondary">{rock.suggestedQuarter}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {rock.milestones.length} milestones
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeRock(index)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      {expandedRock === index ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {expandedRock === index && (
                  <CardContent className="pt-0 space-y-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={rock.title}
                        onChange={(e) => updateRock(index, { title: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={rock.description}
                        onChange={(e) => updateRock(index, { description: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Quarter</Label>
                      <Input
                        value={rock.suggestedQuarter || ""}
                        onChange={(e) =>
                          updateRock(index, { suggestedQuarter: e.target.value })
                        }
                        placeholder="e.g., Q1 2025"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Milestones (Done When)</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addMilestone(index)}
                        >
                          + Add Milestone
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {rock.milestones.map((milestone, mIndex) => (
                          <div key={mIndex} className="flex items-center gap-2">
                            <span className="text-muted-foreground text-sm w-6">
                              {mIndex + 1}.
                            </span>
                            <Input
                              value={milestone}
                              onChange={(e) =>
                                updateMilestone(index, mIndex, e.target.value)
                              }
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeMilestone(index, mIndex)}
                            >
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Parsed Metrics Preview */}
      {parsedMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Weekly Scorecard Metrics ({parsedMetrics.length})
            </CardTitle>
            <CardDescription>
              These metrics will be set for each team member's weekly scorecard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {parsedMetrics.map((metric, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg"
                >
                  <div>
                    <span className="font-medium text-purple-900">{metric.assigneeName}</span>
                    <span className="text-purple-600 mx-2">→</span>
                    <span className="text-purple-800">{metric.metricName}</span>
                  </div>
                  <Badge variant="outline" className="bg-white text-purple-700 border-purple-300">
                    Goal: {metric.weeklyGoal}/week
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
