"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { useApp } from "@/lib/contexts/app-context"

import { useToast } from "@/hooks/use-toast"
import { BookOpen, ChevronDown, ChevronRight, Loader2, Plus, X, Printer, Download, Check } from "lucide-react"
import { NoWorkspaceAlert } from "@/components/shared/no-workspace-alert"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { DEMO_VTO, DEMO_READONLY_MESSAGE } from "@/lib/demo-data"

interface VTOData {
  coreValues: string[]
  coreFocus: {
    purpose?: string
    niche?: string
  }
  tenYearTarget: {
    target?: string
  }
  marketingStrategy: {
    targetMarket?: string
    threeUniques?: string
    provenProcess?: string
    guarantee?: string
  }
  threeYearPicture: {
    revenue?: string
    profit?: string
    description?: string
  }
  oneYearPlan: {
    revenue?: string
    profit?: string
    goals?: string[]
  }
  quarterlyRocks: string[]
  issuesList: string[]
  lastEditedBy: string | null
  updatedAt: string
}

interface CollapsibleSectionProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

function CollapsibleSection({ title, isOpen, onToggle, children }: CollapsibleSectionProps) {
  return (
    <Card>
      <CardHeader className="cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      {isOpen && <CardContent>{children}</CardContent>}
    </Card>
  )
}

export function VTOPage() {
  const { currentWorkspaceId } = useWorkspaces()
  const { isDemoMode, setCurrentPage } = useApp()
  const { toast } = useToast()
  const [vtoData, setVtoData] = useState<VTOData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    coreValues: true,
    coreFocus: false,
    tenYearTarget: false,
    marketingStrategy: false,
    threeYearPicture: false,
    oneYearPlan: false,
    quarterlyRocks: false,
    issuesList: false,
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Fetch VTO data
  const fetchVTO = useCallback(async () => {
    if (isDemoMode) {
      setVtoData(DEMO_VTO as unknown as VTOData)
      setIsLoading(false)
      return
    }
    if (!currentWorkspaceId) return

    try {
      setIsLoading(true)
      const res = await fetch(`/api/vto?workspaceId=${currentWorkspaceId}`)
      const json = await res.json()

      if (json.success) {
        setVtoData(json.data)
      } else {
        toast({
          title: "Error loading V/TO",
          description: json.error || "Failed to load V/TO data",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch V/TO data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [isDemoMode, currentWorkspaceId, toast])

  useEffect(() => {
    fetchVTO()
  }, [fetchVTO])

  // Auto-save with debounce
  const saveVTO = useCallback(async (data: VTOData) => {
    if (isDemoMode) {
      toast({ title: "Demo Mode", description: DEMO_READONLY_MESSAGE })
      return
    }
    if (!currentWorkspaceId) return

    try {
      setIsSaving(true)
      const res = await fetch("/api/vto", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          workspaceId: currentWorkspaceId,
          ...data,
        }),
      })

      const json = await res.json()

      if (json.success) {
        setVtoData(json.data)
        setHasUnsavedChanges(false)
        toast({
          title: "Saved",
          description: "V/TO updated successfully",
        })
      } else {
        toast({
          title: "Error saving V/TO",
          description: json.error || "Failed to save V/TO data",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to save V/TO data",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [currentWorkspaceId, toast, isDemoMode])

  // Debounced auto-save
  const debouncedSave = useCallback(
    (data: VTOData) => {
      if (isDemoMode) return
      setHasUnsavedChanges(true)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveVTO(data)
      }, 1500)
    },
    [isDemoMode, saveVTO]
  )

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Warn user about unsaved changes before navigating away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Update functions for different data types
  const updateCoreValues = (index: number, value: string) => {
    if (!vtoData) return
    const newValues = [...vtoData.coreValues]
    newValues[index] = value
    const newData = { ...vtoData, coreValues: newValues }
    setVtoData(newData)
    debouncedSave(newData)
  }

  const addCoreValue = () => {
    if (!vtoData) return
    if (vtoData.coreValues.some((v) => !v.trim())) return
    const newData = { ...vtoData, coreValues: [...vtoData.coreValues, ""] }
    setVtoData(newData)
    debouncedSave(newData)
  }

  const removeCoreValue = (index: number) => {
    if (!vtoData) return
    const newValues = vtoData.coreValues.filter((_, i) => i !== index)
    const newData = { ...vtoData, coreValues: newValues }
    setVtoData(newData)
    debouncedSave(newData)
  }

  const updateCoreFocus = (field: keyof VTOData["coreFocus"], value: string) => {
    if (!vtoData) return
    const newData = {
      ...vtoData,
      coreFocus: { ...vtoData.coreFocus, [field]: value },
    }
    setVtoData(newData)
    debouncedSave(newData)
  }

  const updateTenYearTarget = (value: string) => {
    if (!vtoData) return
    const newData = {
      ...vtoData,
      tenYearTarget: { target: value },
    }
    setVtoData(newData)
    debouncedSave(newData)
  }

  const updateMarketingStrategy = (field: keyof VTOData["marketingStrategy"], value: string) => {
    if (!vtoData) return
    const newData = {
      ...vtoData,
      marketingStrategy: { ...vtoData.marketingStrategy, [field]: value },
    }
    setVtoData(newData)
    debouncedSave(newData)
  }

  const updateThreeYearPicture = (field: keyof VTOData["threeYearPicture"], value: string) => {
    if (!vtoData) return
    const newData = {
      ...vtoData,
      threeYearPicture: { ...vtoData.threeYearPicture, [field]: value },
    }
    setVtoData(newData)
    debouncedSave(newData)
  }

  const updateOneYearPlan = (field: "revenue" | "profit", value: string) => {
    if (!vtoData) return
    const newData = {
      ...vtoData,
      oneYearPlan: { ...vtoData.oneYearPlan, [field]: value },
    }
    setVtoData(newData)
    debouncedSave(newData)
  }

  const updateOneYearGoal = (index: number, value: string) => {
    if (!vtoData) return
    const newGoals = [...(vtoData.oneYearPlan.goals || [])]
    newGoals[index] = value
    const newData = {
      ...vtoData,
      oneYearPlan: { ...vtoData.oneYearPlan, goals: newGoals },
    }
    setVtoData(newData)
    debouncedSave(newData)
  }

  const addOneYearGoal = () => {
    if (!vtoData) return
    if ((vtoData.oneYearPlan.goals || []).some((g) => !g.trim())) return
    const newData = {
      ...vtoData,
      oneYearPlan: {
        ...vtoData.oneYearPlan,
        goals: [...(vtoData.oneYearPlan.goals || []), ""],
      },
    }
    setVtoData(newData)
    debouncedSave(newData)
  }

  const removeOneYearGoal = (index: number) => {
    if (!vtoData) return
    const newGoals = (vtoData.oneYearPlan.goals || []).filter((_, i) => i !== index)
    const newData = {
      ...vtoData,
      oneYearPlan: { ...vtoData.oneYearPlan, goals: newGoals },
    }
    setVtoData(newData)
    debouncedSave(newData)
  }

  const updateQuarterlyRock = (index: number, value: string) => {
    if (!vtoData) return
    const newRocks = [...vtoData.quarterlyRocks]
    newRocks[index] = value
    const newData = { ...vtoData, quarterlyRocks: newRocks }
    setVtoData(newData)
    debouncedSave(newData)
  }

  const addQuarterlyRock = () => {
    if (!vtoData) return
    if (vtoData.quarterlyRocks.some((r) => !r.trim())) return
    const newData = { ...vtoData, quarterlyRocks: [...vtoData.quarterlyRocks, ""] }
    setVtoData(newData)
    debouncedSave(newData)
  }

  const removeQuarterlyRock = (index: number) => {
    if (!vtoData) return
    const newRocks = vtoData.quarterlyRocks.filter((_, i) => i !== index)
    const newData = { ...vtoData, quarterlyRocks: newRocks }
    setVtoData(newData)
    debouncedSave(newData)
  }

  const updateIssue = (index: number, value: string) => {
    if (!vtoData) return
    const newIssues = [...vtoData.issuesList]
    newIssues[index] = value
    const newData = { ...vtoData, issuesList: newIssues }
    setVtoData(newData)
    debouncedSave(newData)
  }

  const addIssue = () => {
    if (!vtoData) return
    if (vtoData.issuesList.some((i) => !i.trim())) return
    const newData = { ...vtoData, issuesList: [...vtoData.issuesList, ""] }
    setVtoData(newData)
    debouncedSave(newData)
  }

  const removeIssue = (index: number) => {
    if (!vtoData) return
    const newIssues = vtoData.issuesList.filter((_, i) => i !== index)
    const newData = { ...vtoData, issuesList: newIssues }
    setVtoData(newData)
    debouncedSave(newData)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <NoWorkspaceAlert />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Vision/Traction Organizer</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            Define your company vision and track traction
          </p>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (!vtoData) {
    const initializeVTO = () => {
      const emptyVTO: VTOData = {
        coreValues: [],
        coreFocus: {},
        tenYearTarget: {},
        marketingStrategy: {},
        threeYearPicture: {},
        oneYearPlan: { goals: [] },
        quarterlyRocks: [],
        issuesList: [],
        lastEditedBy: null,
        updatedAt: "",
      }
      setVtoData(emptyVTO)
    }

    return (
      <div className="space-y-6">
        <NoWorkspaceAlert />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Vision/Traction Organizer
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            Define your company vision, core values, and strategic plan
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No V/TO Document Yet</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md">
              The Vision/Traction Organizer helps you define your company&apos;s core values,
              focus, targets, and strategic plan. Start building yours now.
            </p>
            <Button onClick={initializeVTO}>
              <Plus className="h-4 w-4 mr-2" />
              Create V/TO Document
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ErrorBoundary>
    <div className="space-y-6">
      <NoWorkspaceAlert />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Vision/Traction Organizer
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            Define your company vision and track traction
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </div>
          )}
          {hasUnsavedChanges && !isSaving && (
            <div className="text-sm text-amber-600">Unsaved changes</div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs hidden sm:flex"
            onClick={() => {
              const lines: string[] = ["VISION/TRACTION ORGANIZER", "=".repeat(40), ""]
              if (vtoData.coreValues.length) {
                lines.push("CORE VALUES", "-".repeat(20))
                vtoData.coreValues.forEach((v) => v.trim() && lines.push(`• ${v}`))
                lines.push("")
              }
              if (vtoData.coreFocus.purpose || vtoData.coreFocus.niche) {
                lines.push("CORE FOCUS", "-".repeat(20))
                if (vtoData.coreFocus.purpose) lines.push(`Purpose: ${vtoData.coreFocus.purpose}`)
                if (vtoData.coreFocus.niche) lines.push(`Niche: ${vtoData.coreFocus.niche}`)
                lines.push("")
              }
              if (vtoData.tenYearTarget.target) {
                lines.push("10-YEAR TARGET", "-".repeat(20))
                lines.push(vtoData.tenYearTarget.target)
                lines.push("")
              }
              const ms = vtoData.marketingStrategy
              if (ms.targetMarket || ms.threeUniques || ms.provenProcess || ms.guarantee) {
                lines.push("MARKETING STRATEGY", "-".repeat(20))
                if (ms.targetMarket) lines.push(`Target Market: ${ms.targetMarket}`)
                if (ms.threeUniques) lines.push(`3 Uniques: ${ms.threeUniques}`)
                if (ms.provenProcess) lines.push(`Proven Process: ${ms.provenProcess}`)
                if (ms.guarantee) lines.push(`Guarantee: ${ms.guarantee}`)
                lines.push("")
              }
              const ty = vtoData.threeYearPicture
              if (ty.revenue || ty.profit || ty.description) {
                lines.push("3-YEAR PICTURE", "-".repeat(20))
                if (ty.revenue) lines.push(`Revenue: ${ty.revenue}`)
                if (ty.profit) lines.push(`Profit: ${ty.profit}`)
                if (ty.description) lines.push(ty.description)
                lines.push("")
              }
              const oy = vtoData.oneYearPlan
              if (oy.revenue || oy.profit || (oy.goals && oy.goals.length)) {
                lines.push("1-YEAR PLAN", "-".repeat(20))
                if (oy.revenue) lines.push(`Revenue: ${oy.revenue}`)
                if (oy.profit) lines.push(`Profit: ${oy.profit}`)
                oy.goals?.forEach((g) => g.trim() && lines.push(`• ${g}`))
                lines.push("")
              }
              if (vtoData.quarterlyRocks.length) {
                lines.push("QUARTERLY ROCKS", "-".repeat(20))
                vtoData.quarterlyRocks.forEach((r) => r.trim() && lines.push(`• ${r}`))
                lines.push("")
              }
              if (vtoData.issuesList.length) {
                lines.push("ISSUES LIST", "-".repeat(20))
                vtoData.issuesList.forEach((i) => i.trim() && lines.push(`• ${i}`))
              }
              const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8;" })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = "vto.txt"
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print
          </Button>
        </div>
      </div>

      {/* VTO Completeness strip */}
      {(() => {
        const sections = [
          { label: "Core Values", filled: vtoData.coreValues.some((v) => v.trim()) },
          { label: "Core Focus", filled: !!(vtoData.coreFocus.purpose?.trim() || vtoData.coreFocus.niche?.trim()) },
          { label: "10-Year Target", filled: !!(vtoData.tenYearTarget.target?.trim()) },
          { label: "Marketing", filled: !!(vtoData.marketingStrategy.targetMarket?.trim() || vtoData.marketingStrategy.threeUniques?.trim()) },
          { label: "3-Year Picture", filled: !!(vtoData.threeYearPicture.revenue?.trim() || vtoData.threeYearPicture.description?.trim()) },
          { label: "1-Year Plan", filled: !!(vtoData.oneYearPlan.revenue?.trim() || (vtoData.oneYearPlan.goals && vtoData.oneYearPlan.goals.some((g) => g.trim()))) },
          { label: "Q-Rocks", filled: vtoData.quarterlyRocks.some((r) => r.trim()) },
          { label: "Issues", filled: vtoData.issuesList.some((i) => i.trim()) },
        ]
        const filled = sections.filter((s) => s.filled).length
        const pct = Math.round((filled / sections.length) * 100)
        const barColor = pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-slate-300"
        return (
          <div className="bg-white rounded-lg border border-slate-100 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-600">V/TO Completeness</span>
              <span className={`text-xs font-bold ${pct === 100 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-slate-500"}`}>{filled}/{sections.length} sections · {pct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2">
              <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex flex-wrap gap-1">
              {sections.map((s) => (
                <span key={s.label} className={`text-[10px] px-1.5 py-0.5 rounded border ${s.filled ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                  {s.filled && <Check className="inline h-3 w-3 mr-0.5" />}{s.label}
                </span>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Last edited info */}
      {vtoData.updatedAt && (
        <div className="text-xs text-slate-500">
          Last edited: {new Date(vtoData.updatedAt).toLocaleString()}
          {vtoData.lastEditedBy && ` by ${vtoData.lastEditedBy}`}
        </div>
      )}

      {/* Core Values */}
      <CollapsibleSection
        title="Core Values"
        isOpen={expandedSections.coreValues}
        onToggle={() => toggleSection("coreValues")}
      >
        <div className="space-y-3">
          {vtoData.coreValues.map((value, index) => (
            <div key={index} className="flex gap-2">
              <Textarea
                value={value}
                onChange={(e) => updateCoreValues(index, e.target.value)}
                placeholder="Enter a core value..."
                className="flex-1"
                rows={1}
                maxLength={200}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeCoreValue(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addCoreValue}>
            <Plus className="h-4 w-4 mr-2" />
            Add Core Value
          </Button>
        </div>
      </CollapsibleSection>

      {/* Core Focus */}
      <CollapsibleSection
        title="Core Focus"
        isOpen={expandedSections.coreFocus}
        onToggle={() => toggleSection("coreFocus")}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Purpose</label>
            <Textarea
              value={vtoData.coreFocus.purpose || ""}
              onChange={(e) => updateCoreFocus("purpose", e.target.value)}
              placeholder="Why does your company exist?"
              rows={2}
              maxLength={1000}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Niche</label>
            <Textarea
              value={vtoData.coreFocus.niche || ""}
              onChange={(e) => updateCoreFocus("niche", e.target.value)}
              placeholder="What is your sweet spot?"
              rows={2}
              maxLength={1000}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* 10-Year Target */}
      <CollapsibleSection
        title="10-Year Target"
        isOpen={expandedSections.tenYearTarget}
        onToggle={() => toggleSection("tenYearTarget")}
      >
        <Textarea
          value={vtoData.tenYearTarget.target || ""}
          onChange={(e) => updateTenYearTarget(e.target.value)}
          placeholder="What does your company look like in 10 years?"
          rows={3}
          maxLength={2000}
        />
      </CollapsibleSection>

      {/* Marketing Strategy */}
      <CollapsibleSection
        title="Marketing Strategy"
        isOpen={expandedSections.marketingStrategy}
        onToggle={() => toggleSection("marketingStrategy")}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Target Market</label>
            <Textarea
              value={vtoData.marketingStrategy.targetMarket || ""}
              onChange={(e) => updateMarketingStrategy("targetMarket", e.target.value)}
              placeholder="Who is your ideal customer?"
              rows={2}
              maxLength={1000}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Three Uniques</label>
            <Textarea
              value={vtoData.marketingStrategy.threeUniques || ""}
              onChange={(e) => updateMarketingStrategy("threeUniques", e.target.value)}
              placeholder="What makes you unique?"
              rows={2}
              maxLength={1000}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Proven Process</label>
            <Textarea
              value={vtoData.marketingStrategy.provenProcess || ""}
              onChange={(e) => updateMarketingStrategy("provenProcess", e.target.value)}
              placeholder="What is your unique process?"
              rows={2}
              maxLength={1000}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Guarantee</label>
            <Textarea
              value={vtoData.marketingStrategy.guarantee || ""}
              onChange={(e) => updateMarketingStrategy("guarantee", e.target.value)}
              placeholder="What guarantee do you offer?"
              rows={2}
              maxLength={1000}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* 3-Year Picture */}
      <CollapsibleSection
        title="3-Year Picture"
        isOpen={expandedSections.threeYearPicture}
        onToggle={() => toggleSection("threeYearPicture")}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Revenue</label>
              <Textarea
                value={vtoData.threeYearPicture.revenue || ""}
                onChange={(e) => updateThreeYearPicture("revenue", e.target.value)}
                placeholder="$X million"
                rows={1}
                maxLength={100}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Profit</label>
              <Textarea
                value={vtoData.threeYearPicture.profit || ""}
                onChange={(e) => updateThreeYearPicture("profit", e.target.value)}
                placeholder="$X million"
                rows={1}
                maxLength={100}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Description</label>
            <Textarea
              value={vtoData.threeYearPicture.description || ""}
              onChange={(e) => updateThreeYearPicture("description", e.target.value)}
              placeholder="Describe what your business looks like in 3 years..."
              rows={4}
              maxLength={2000}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* 1-Year Plan */}
      <CollapsibleSection
        title="1-Year Plan"
        isOpen={expandedSections.oneYearPlan}
        onToggle={() => toggleSection("oneYearPlan")}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Revenue</label>
              <Textarea
                value={vtoData.oneYearPlan.revenue || ""}
                onChange={(e) => updateOneYearPlan("revenue", e.target.value)}
                placeholder="$X million"
                rows={1}
                maxLength={100}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Profit</label>
              <Textarea
                value={vtoData.oneYearPlan.profit || ""}
                onChange={(e) => updateOneYearPlan("profit", e.target.value)}
                placeholder="$X million"
                rows={1}
                maxLength={100}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Goals</label>
            <div className="space-y-3">
              {(vtoData.oneYearPlan.goals || []).map((goal, index) => (
                <div key={index} className="flex gap-2">
                  <Textarea
                    value={goal}
                    onChange={(e) => updateOneYearGoal(index, e.target.value)}
                    placeholder="Enter a goal..."
                    className="flex-1"
                    rows={1}
                    maxLength={500}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeOneYearGoal(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addOneYearGoal}>
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Quarterly Rocks */}
      <CollapsibleSection
        title="Quarterly Rocks"
        isOpen={expandedSections.quarterlyRocks}
        onToggle={() => toggleSection("quarterlyRocks")}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            These are your top priorities for the quarter.{" "}
            <button
              type="button"
              onClick={() => setCurrentPage("rocks")}
              className="underline hover:text-slate-700"
            >
              See the Rocks page
            </button>{" "}
            for detailed tracking.
          </p>
          {vtoData.quarterlyRocks.map((rock, index) => (
            <div key={index} className="flex gap-2">
              <Textarea
                value={rock}
                onChange={(e) => updateQuarterlyRock(index, e.target.value)}
                placeholder="Enter a quarterly rock..."
                className="flex-1"
                rows={1}
                maxLength={500}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeQuarterlyRock(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addQuarterlyRock}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rock
          </Button>
        </div>
      </CollapsibleSection>

      {/* Issues List */}
      <CollapsibleSection
        title="Issues List"
        isOpen={expandedSections.issuesList}
        onToggle={() => toggleSection("issuesList")}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Track key issues and obstacles that need to be addressed.
          </p>
          {vtoData.issuesList.map((issue, index) => (
            <div key={index} className="flex gap-2">
              <Textarea
                value={issue}
                onChange={(e) => updateIssue(index, e.target.value)}
                placeholder="Enter an issue..."
                className="flex-1"
                rows={1}
                maxLength={500}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeIssue(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addIssue}>
            <Plus className="h-4 w-4 mr-2" />
            Add Issue
          </Button>
        </div>
      </CollapsibleSection>
    </div>
    </ErrorBoundary>
  )
}
