"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { useApp } from "@/lib/contexts/app-context"
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher"
import { useToast } from "@/hooks/use-toast"
import { BookOpen, ChevronDown, ChevronRight, Save, Loader2, Plus, X } from "lucide-react"
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
  const { isDemoMode } = useApp()
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
    } catch (error) {
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
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save V/TO data",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [currentWorkspaceId, toast])

  // Debounced auto-save
  const debouncedSave = useCallback(
    (data: VTOData) => {
      setHasUnsavedChanges(true)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveVTO(data)
      }, 1500)
    },
    [saveVTO]
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
    return (
      <div className="space-y-6">
        <NoWorkspaceAlert />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Vision/Traction Organizer</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            No V/TO data available
          </p>
        </div>
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
        </div>
      </div>

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
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Niche</label>
            <Textarea
              value={vtoData.coreFocus.niche || ""}
              onChange={(e) => updateCoreFocus("niche", e.target.value)}
              placeholder="What is your sweet spot?"
              rows={2}
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
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Three Uniques</label>
            <Textarea
              value={vtoData.marketingStrategy.threeUniques || ""}
              onChange={(e) => updateMarketingStrategy("threeUniques", e.target.value)}
              placeholder="What makes you unique?"
              rows={2}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Proven Process</label>
            <Textarea
              value={vtoData.marketingStrategy.provenProcess || ""}
              onChange={(e) => updateMarketingStrategy("provenProcess", e.target.value)}
              placeholder="What is your unique process?"
              rows={2}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Guarantee</label>
            <Textarea
              value={vtoData.marketingStrategy.guarantee || ""}
              onChange={(e) => updateMarketingStrategy("guarantee", e.target.value)}
              placeholder="What guarantee do you offer?"
              rows={2}
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
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Profit</label>
              <Textarea
                value={vtoData.threeYearPicture.profit || ""}
                onChange={(e) => updateThreeYearPicture("profit", e.target.value)}
                placeholder="$X million"
                rows={1}
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
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Profit</label>
              <Textarea
                value={vtoData.oneYearPlan.profit || ""}
                onChange={(e) => updateOneYearPlan("profit", e.target.value)}
                placeholder="$X million"
                rows={1}
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
            These are your top priorities for the quarter. See the Rocks page for detailed tracking.
          </p>
          {vtoData.quarterlyRocks.map((rock, index) => (
            <div key={index} className="flex gap-2">
              <Textarea
                value={rock}
                onChange={(e) => updateQuarterlyRock(index, e.target.value)}
                placeholder="Enter a quarterly rock..."
                className="flex-1"
                rows={1}
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
