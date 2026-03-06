"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Sparkles, Plus, Target, User, Calendar, Loader2, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { TeamMember, Rock, SmartRockSuggestion } from "@/lib/types"

// ─── Quarter helpers ──────────────────────────────────────────────────────────

function buildQuarterOptions(): { label: string; value: string }[] {
  const now = new Date()
  const year = now.getFullYear()
  const options: { label: string; value: string }[] = []

  // Current year + next year quarters
  for (const y of [year, year + 1]) {
    for (let q = 1; q <= 4; q++) {
      options.push({ label: `Q${q} ${y}`, value: `Q${q} ${y}` })
    }
  }

  return options
}

function getCurrentQuarterValue(): string {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3) + 1
  return `Q${q} ${now.getFullYear()}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SuggestionCard extends SmartRockSuggestion {
  /** Runtime-only: the userId selected in the owner dropdown (may differ from suggestedOwnerEmail) */
  selectedOwnerId: string
  /** Runtime-only: whether this suggestion is checked for "Create Selected" */
  selected: boolean
}

interface SmartRockGeneratorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamMembers: TeamMember[]
  /** Active quarter string, e.g. "Q2 2026" — used as default */
  quarter: string
  /** Called after rocks have been created so the parent can refresh its list */
  onRockCreated: () => void
  /** Function from parent to create a rock via API */
  createRock: (rock: Partial<Rock>) => Promise<Rock>
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SmartRockGeneratorModal({
  open,
  onOpenChange,
  teamMembers,
  quarter,
  onRockCreated,
  createRock,
}: SmartRockGeneratorModalProps) {
  const { toast } = useToast()

  // Step 1: form state
  const [goal, setGoal] = useState("")
  const [selectedQuarter, setSelectedQuarter] = useState<string>(quarter || getCurrentQuarterValue())

  // Step 2: generated suggestions state
  const [suggestions, setSuggestions] = useState<SuggestionCard[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const quarterOptions = buildQuarterOptions()

  // ── Helper: find userId for a member by email ─────────────────────────────
  function resolveOwnerIdByEmail(email?: string): string {
    if (!email) return ""
    const match = teamMembers.find(
      (m) => m.email.toLowerCase() === email.toLowerCase()
    )
    return match ? (match.userId || match.id) : ""
  }

  // ── Helper: due date from quarter string ──────────────────────────────────
  function dueDateFromQuarter(q: string): string {
    // q = "Q1 2026" → last day of Q1 = March 31
    const match = q.match(/Q(\d)\s+(\d{4})/)
    if (!match) return ""
    const quarterNum = parseInt(match[1], 10)
    const year = parseInt(match[2], 10)
    const endMonth = quarterNum * 3 // 3, 6, 9, 12
    const lastDay = new Date(year, endMonth, 0)
    return lastDay.toISOString().split("T")[0]
  }

  // ── Generate ──────────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!goal.trim()) {
      toast({ title: "Enter a goal first", variant: "destructive" })
      return
    }

    setIsGenerating(true)
    setSuggestions([])

    try {
      const res = await fetch("/api/ai/rocks/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ goal: goal.trim(), quarter: selectedQuarter }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        toast({
          title: "Generation failed",
          description: json.error || "Could not generate suggestions",
          variant: "destructive",
        })
        return
      }

      const cards: SuggestionCard[] = (json.data as SmartRockSuggestion[]).map((s) => ({
        ...s,
        selectedOwnerId: resolveOwnerIdByEmail(s.suggestedOwnerEmail),
        selected: true,
      }))

      setSuggestions(cards)

      if (cards.length === 0) {
        toast({ title: "No suggestions returned. Try a more specific goal." })
      }
    } catch {
      toast({
        title: "Network error",
        description: "Failed to reach the server",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Create rocks ──────────────────────────────────────────────────────────
  async function handleCreate(mode: "all" | "selected") {
    const toCreate = mode === "all" ? suggestions : suggestions.filter((s) => s.selected)

    if (toCreate.length === 0) {
      toast({ title: "No rocks selected", variant: "destructive" })
      return
    }

    setIsCreating(true)
    let successCount = 0
    let failCount = 0

    for (const s of toCreate) {
      try {
        const dueDate = s.dueDate || dueDateFromQuarter(selectedQuarter)

        await createRock({
          title: s.title,
          description: s.description,
          dueDate,
          status: "on-track",
          userId: s.selectedOwnerId || undefined,
          quarter: selectedQuarter,
          outcome: s.outcome,
          doneWhen: s.doneWhen ? [s.doneWhen] : [],
        })

        successCount++
      } catch {
        failCount++
      }
    }

    if (successCount > 0) {
      toast({
        title: `${successCount} rock${successCount !== 1 ? "s" : ""} created`,
        description:
          failCount > 0 ? `${failCount} failed — check the rocks page` : undefined,
      })
      onRockCreated()
      handleClose()
    } else {
      toast({
        title: "Failed to create rocks",
        description: "Please try again",
        variant: "destructive",
      })
    }

    setIsCreating(false)
  }

  // ── Close / reset ─────────────────────────────────────────────────────────
  function handleClose() {
    if (isGenerating || isCreating) return
    setGoal("")
    setSelectedQuarter(quarter || getCurrentQuarterValue())
    setSuggestions([])
    onOpenChange(false)
  }

  // ── Toggle selection ──────────────────────────────────────────────────────
  function toggleSelected(idx: number) {
    setSuggestions((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, selected: !s.selected } : s))
    )
  }

  function updateOwner(idx: number, ownerId: string) {
    setSuggestions((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, selectedOwnerId: ownerId } : s))
    )
  }

  function updateTitle(idx: number, value: string) {
    setSuggestions((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, title: value } : s))
    )
  }

  function updateDescription(idx: number, value: string) {
    setSuggestions((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, description: value } : s))
    )
  }

  function updateDueDate(idx: number, value: string) {
    setSuggestions((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, dueDate: value } : s))
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const selectedCount = suggestions.filter((s) => s.selected).length
  const hasResults = suggestions.length > 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Sparkles className="h-5 w-5 text-violet-600" />
            Generate Rocks from Goal
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Describe a high-level goal and AI will suggest SMART rocks for the quarter.
            Review and edit before creating.
          </p>
        </DialogHeader>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 min-h-0">
          {/* Goal + Quarter inputs */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sg-goal" className="text-sm font-medium text-slate-700">
                <Target className="h-3.5 w-3.5 inline mr-1 text-slate-400" />
                Goal
              </Label>
              <Input
                id="sg-goal"
                placeholder="e.g. Grow MRR by 30% this quarter"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isGenerating) handleGenerate()
                }}
                disabled={isGenerating || isCreating}
                className="bg-slate-50 border-slate-200"
              />
            </div>

            <div className="flex items-end gap-3">
              <div className="space-y-1.5 flex-1">
                <Label htmlFor="sg-quarter" className="text-sm font-medium text-slate-700">
                  <Calendar className="h-3.5 w-3.5 inline mr-1 text-slate-400" />
                  Quarter
                </Label>
                <Select
                  value={selectedQuarter}
                  onValueChange={setSelectedQuarter}
                  disabled={isGenerating || isCreating}
                >
                  <SelectTrigger id="sg-quarter" className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    {quarterOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || isCreating || !goal.trim()}
                className="shrink-0"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {hasResults ? "Re-generate" : "Generate"}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Loading skeleton */}
          {isGenerating && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 animate-pulse"
                >
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-slate-200 rounded w-full mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-5/6" />
                </div>
              ))}
            </div>
          )}

          {/* Suggestion cards */}
          {!isGenerating && hasResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""} — review and edit below
                </p>
                <button
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => {
                    const allSelected = suggestions.every((s) => s.selected)
                    setSuggestions((prev) => prev.map((s) => ({ ...s, selected: !allSelected })))
                  }}
                >
                  {suggestions.every((s) => s.selected) ? "Deselect all" : "Select all"}
                </button>
              </div>

              {suggestions.map((s, idx) => (
                <Card
                  key={idx}
                  className={`border transition-all ${
                    s.selected
                      ? "border-violet-200 bg-violet-50/30"
                      : "border-slate-200 bg-white opacity-60"
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Card header: checkbox + title */}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={s.selected}
                        onCheckedChange={() => toggleSelected(idx)}
                        className="mt-0.5 shrink-0"
                        id={`sg-check-${idx}`}
                        disabled={isCreating}
                      />
                      <div className="flex-1 min-w-0">
                        <Input
                          value={s.title}
                          onChange={(e) => updateTitle(idx, e.target.value)}
                          className="font-medium text-slate-900 bg-transparent border-transparent hover:border-slate-300 focus:border-slate-400 focus:bg-white px-2 h-auto py-1 text-sm"
                          disabled={isCreating}
                        />
                      </div>
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-xs bg-violet-100 text-violet-700 border-violet-200"
                      >
                        AI
                      </Badge>
                    </div>

                    {/* Description */}
                    <div className="pl-7">
                      <Input
                        value={s.description}
                        onChange={(e) => updateDescription(idx, e.target.value)}
                        className="text-sm text-slate-600 bg-transparent border-transparent hover:border-slate-300 focus:border-slate-400 focus:bg-white px-2 h-auto py-1"
                        disabled={isCreating}
                        placeholder="Description..."
                      />
                    </div>

                    {/* Milestones */}
                    {s.milestones && s.milestones.length > 0 && (
                      <div className="pl-7">
                        <p className="text-xs font-medium text-slate-500 mb-1.5">Milestones</p>
                        <ul className="space-y-1">
                          {s.milestones.map((m, mi) => (
                            <li
                              key={mi}
                              className="flex items-start gap-1.5 text-xs text-slate-600"
                            >
                              <ChevronRight className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Owner + Due date row */}
                    <div className="pl-7 flex flex-col sm:flex-row gap-2">
                      {/* Owner dropdown */}
                      <div className="flex items-center gap-1.5 flex-1">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <Select
                          value={s.selectedOwnerId || "__unassigned__"}
                          onValueChange={(val) =>
                            updateOwner(idx, val === "__unassigned__" ? "" : val)
                          }
                          disabled={isCreating}
                        >
                          <SelectTrigger className="h-7 text-xs bg-white border-slate-200 flex-1">
                            <SelectValue placeholder="Assign owner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__">Unassigned</SelectItem>
                            {teamMembers.map((m) => (
                              <SelectItem
                                key={m.userId || m.id}
                                value={m.userId || m.id}
                              >
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Due date */}
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <Input
                          type="date"
                          value={s.dueDate || dueDateFromQuarter(selectedQuarter)}
                          onChange={(e) => updateDueDate(idx, e.target.value)}
                          className="h-7 text-xs bg-white border-slate-200 w-36"
                          disabled={isCreating}
                        />
                      </div>
                    </div>

                    {/* Outcome chip */}
                    {s.outcome && (
                      <div className="pl-7">
                        <p className="text-xs text-slate-500">
                          <span className="font-medium">Outcome:</span> {s.outcome}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {hasResults && (
          <DialogFooter className="px-6 py-4 border-t border-slate-100 flex-shrink-0 gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCreate("selected")}
              disabled={isCreating || selectedCount === 0}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Selected ({selectedCount})
            </Button>
            <Button
              onClick={() => handleCreate("all")}
              disabled={isCreating || suggestions.length === 0}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create All ({suggestions.length})
            </Button>
          </DialogFooter>
        )}

        {!hasResults && (
          <DialogFooter className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
