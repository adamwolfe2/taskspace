"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { SuggestionCard } from "./suggestion-card"
import {
  Inbox,
  Loader2,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  MessageSquare,
  Target,
  Zap,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { AISuggestion, TeamMember, SuggestionStats } from "@/lib/types"

interface AIInboxProps {
  organizationId: string
  teamMembers: TeamMember[]
}

type SuggestionFilter = "all" | "task" | "follow_up" | "blocker" | "alert" | "rock_update"

const filterConfig: Record<SuggestionFilter, { label: string; icon: React.ElementType }> = {
  all: { label: "All", icon: Inbox },
  task: { label: "Tasks", icon: Zap },
  follow_up: { label: "Follow-ups", icon: MessageSquare },
  blocker: { label: "Blockers", icon: AlertCircle },
  alert: { label: "Alerts", icon: AlertCircle },
  rock_update: { label: "Rock Updates", icon: Target },
}

export function AIInbox({ organizationId, teamMembers }: AIInboxProps) {
  const { toast } = useToast()

  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [stats, setStats] = useState<SuggestionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filter, setFilter] = useState<SuggestionFilter>("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [showAll, setShowAll] = useState(false)

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (showRefreshState = false) => {
    if (showRefreshState) setIsRefreshing(true)
    try {
      const params = new URLSearchParams({
        status: "pending",
        limit: "100",
      })
      if (filter !== "all") {
        params.set("type", filter)
      }

      const response = await fetch(`/api/ai/suggestions?${params}`)
      const data = await response.json()

      if (data.success) {
        setSuggestions(data.data.suggestions || [])
        setStats(data.data.stats || null)
      } else {
        throw new Error(data.error || "Failed to fetch suggestions")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load suggestions",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [filter, toast])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  // Handle approve
  const handleApprove = async (id: string, updates?: Partial<AISuggestion>) => {
    try {
      const response = await fetch(`/api/ai/suggestions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })

      const data = await response.json()

      if (data.success) {
        setSuggestions((prev) => prev.filter((s) => s.id !== id))
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        toast({
          title: "Suggestion approved",
          description: data.data?.createdEntity
            ? `Created ${data.data.createdEntity.type}`
            : "Suggestion has been processed",
        })
      } else {
        throw new Error(data.error || "Failed to approve")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve suggestion",
        variant: "destructive",
      })
      throw error
    }
  }

  // Handle reject
  const handleReject = async (id: string, reason?: string) => {
    try {
      const response = await fetch(`/api/ai/suggestions/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })

      const data = await response.json()

      if (data.success) {
        setSuggestions((prev) => prev.filter((s) => s.id !== id))
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        toast({
          title: "Suggestion rejected",
        })
      } else {
        throw new Error(data.error || "Failed to reject")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject suggestion",
        variant: "destructive",
      })
      throw error
    }
  }

  // Bulk approve
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return

    setIsBulkProcessing(true)
    try {
      const response = await fetch("/api/ai/suggestions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          suggestionIds: Array.from(selectedIds),
        }),
      })

      const data = await response.json()

      if (data.success) {
        const { succeeded, failed } = data.data
        setSuggestions((prev) => prev.filter((s) => !selectedIds.has(s.id)))
        setSelectedIds(new Set())
        toast({
          title: "Bulk approve complete",
          description: `${succeeded} approved${failed > 0 ? `, ${failed} failed` : ""}`,
        })
      } else {
        throw new Error(data.error || "Bulk approve failed")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Bulk approve failed",
        variant: "destructive",
      })
    } finally {
      setIsBulkProcessing(false)
    }
  }

  // Bulk reject
  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return

    setIsBulkProcessing(true)
    try {
      const response = await fetch("/api/ai/suggestions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          suggestionIds: Array.from(selectedIds),
        }),
      })

      const data = await response.json()

      if (data.success) {
        const { succeeded, failed } = data.data
        setSuggestions((prev) => prev.filter((s) => !selectedIds.has(s.id)))
        setSelectedIds(new Set())
        toast({
          title: "Bulk reject complete",
          description: `${succeeded} rejected${failed > 0 ? `, ${failed} failed` : ""}`,
        })
      } else {
        throw new Error(data.error || "Bulk reject failed")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Bulk reject failed",
        variant: "destructive",
      })
    } finally {
      setIsBulkProcessing(false)
    }
  }

  // Toggle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredSuggestions.map((s) => s.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  // Handle individual selection
  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  // Filter suggestions
  const filteredSuggestions =
    filter === "all"
      ? suggestions
      : suggestions.filter((s) => s.suggestionType === filter)

  const displaySuggestions = showAll ? filteredSuggestions : filteredSuggestions.slice(0, 10)

  // Calculate type counts
  const typeCounts = suggestions.reduce(
    (acc, s) => {
      acc[s.suggestionType] = (acc[s.suggestionType] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Suggestions Inbox
            {suggestions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {suggestions.length} pending
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Review AI-generated suggestions before they're applied to your workspace
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchSuggestions(true)}
          disabled={isRefreshing}
          className="gap-1"
        >
          {isRefreshing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Refresh
        </Button>
      </CardHeader>

      <CardContent>
        {suggestions.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Inbox is empty</h3>
            <p className="text-sm text-muted-foreground">
              AI suggestions will appear here as your team submits EOD reports
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats summary */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">{stats.approvedToday}</p>
                  <p className="text-xs text-muted-foreground">Approved Today</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{stats.rejectedToday}</p>
                  <p className="text-xs text-muted-foreground">Rejected Today</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {stats.avgConfidence ? Math.round(stats.avgConfidence * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Confidence</p>
                </div>
              </div>
            )}

            {/* Filter tabs */}
            <Tabs value={filter} onValueChange={(v) => setFilter(v as SuggestionFilter)}>
              <TabsList className="flex-wrap h-auto gap-1">
                {Object.entries(filterConfig).map(([key, config]) => {
                  const Icon = config.icon
                  const count = key === "all" ? suggestions.length : typeCounts[key] || 0
                  return (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="gap-1.5"
                      disabled={key !== "all" && count === 0}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {config.label}
                      {count > 0 && (
                        <Badge variant="secondary" className="text-xs ml-1">
                          {count}
                        </Badge>
                      )}
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              <TabsContent value={filter} className="mt-4">
                {/* Bulk actions bar */}
                {filteredSuggestions.length > 0 && (
                  <div className="flex items-center justify-between mb-4 p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={
                          selectedIds.size === filteredSuggestions.length &&
                          filteredSuggestions.length > 0
                        }
                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {selectedIds.size > 0
                          ? `${selectedIds.size} selected`
                          : "Select all"}
                      </span>
                    </div>

                    {selectedIds.size > 0 && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={handleBulkApprove}
                          disabled={isBulkProcessing}
                          className="gap-1 bg-success hover:bg-success/90"
                        >
                          {isBulkProcessing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Approve ({selectedIds.size})
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleBulkReject}
                          disabled={isBulkProcessing}
                          className="gap-1"
                        >
                          {isBulkProcessing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                          Reject ({selectedIds.size})
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Suggestions list */}
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {displaySuggestions.map((suggestion) => (
                      <SuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        teamMembers={teamMembers}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        isLoading={isBulkProcessing}
                        showCheckbox
                        selected={selectedIds.has(suggestion.id)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </ScrollArea>

                {/* Show more/less */}
                {filteredSuggestions.length > 10 && (
                  <Button
                    variant="ghost"
                    className="w-full mt-4"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show {filteredSuggestions.length - 10} More
                      </>
                    )}
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
