"use client"

import { useState, useEffect, useCallback } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import {
  ChevronUp,
  ChevronDown,
  Check,
  Circle,
  ArrowRight,
  X,
  Rocket,
  PartyPopper,
} from "lucide-react"
import type { PageType } from "@/lib/types"

interface ChecklistItem {
  id: string
  label: string
  description: string
  completed: boolean
  page: string
  settingsTab?: string
  adminOnly: boolean
}

interface OnboardingStatus {
  items: ChecklistItem[]
  completedCount: number
  totalCount: number
  dismissed: boolean
  completedAt: string | null
}

const CLIENT_TRACKED_ITEMS = ["calendar", "features"]

function getClientCompletions(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const stored = localStorage.getItem("onboarding-completed-items")
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function setClientCompletion(itemId: string) {
  if (typeof window === "undefined") return
  const completions = getClientCompletions()
  completions.add(itemId)
  localStorage.setItem("onboarding-completed-items", JSON.stringify([...completions]))
}

interface GettingStartedChecklistProps {
  onNavigate?: (page: PageType) => void
}

export function GettingStartedChecklist({ onNavigate }: GettingStartedChecklistProps) {
  const { currentUser, setCurrentPage, currentPage } = useApp()
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [celebrating, setCelebrating] = useState(false)
  const [hidden, setHidden] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding")
      if (!res.ok) return
      const data = await res.json()
      if (data.success && data.data) {
        const onboardingData = data.data as OnboardingStatus
        // Merge client-side completions
        const clientCompletions = getClientCompletions()
        const mergedItems = onboardingData.items.map((item) => {
          if (CLIENT_TRACKED_ITEMS.includes(item.id) && clientCompletions.has(item.id)) {
            return { ...item, completed: true }
          }
          return item
        })
        const completedCount = mergedItems.filter((i) => i.completed).length
        setStatus({
          ...onboardingData,
          items: mergedItems,
          completedCount,
        })
      }
    } catch {
      // Silently fail — don't break the sidebar
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Re-fetch when page changes (user may have completed an action)
  useEffect(() => {
    if (!loading) {
      fetchStatus()
    }
  }, [fetchStatus, currentPage, loading])

  // Track client-side page visits
  useEffect(() => {
    if (!status) return
    if (currentPage === "calendar") {
      const completions = getClientCompletions()
      if (!completions.has("calendar")) {
        setClientCompletion("calendar")
        // Update local state immediately
        setStatus((prev) => {
          if (!prev) return prev
          const items = prev.items.map((item) =>
            item.id === "calendar" ? { ...item, completed: true } : item
          )
          return { ...prev, items, completedCount: items.filter((i) => i.completed).length }
        })
      }
    }
  }, [currentPage, status])

  // Check for all-complete celebration
  useEffect(() => {
    if (!status) return
    if (status.completedCount === status.totalCount && status.totalCount > 0 && !status.dismissed && !status.completedAt) {
      setCelebrating(true)
      // Auto-dismiss after celebration
      const timer = setTimeout(async () => {
        try {
          const res = await fetch("/api/onboarding", {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
            body: JSON.stringify({ completed: true }),
          })
          // Only hide if the completion was persisted successfully
          if (res.ok) {
            setCelebrating(false)
            setHidden(true)
          } else {
            setCelebrating(false)
          }
        } catch {
          setCelebrating(false)
        }
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [status])

  const handleDismiss = async () => {
    try {
      await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ dismissed: true }),
      })
    } catch {
      // ignore
    }
    setHidden(true)
  }

  const handleNavigate = (item: ChecklistItem) => {
    // Track features page visit client-side
    if (item.id === "features") {
      setClientCompletion("features")
      setStatus((prev) => {
        if (!prev) return prev
        const items = prev.items.map((i) =>
          i.id === "features" ? { ...i, completed: true } : i
        )
        return { ...prev, items, completedCount: items.filter((i) => i.completed).length }
      })
    }

    // Set settings tab hint for settings navigation
    if (item.settingsTab) {
      localStorage.setItem("settings-tab", item.settingsTab)
    }

    setCurrentPage(item.page as PageType)
    onNavigate?.(item.page as PageType)
  }

  // Don't render if loading, dismissed, completed, or hidden
  if (loading || !status || status.dismissed || status.completedAt || hidden) {
    return null
  }

  // Don't show if no user
  if (!currentUser) return null

  const progressPercent = status.totalCount > 0
    ? Math.round((status.completedCount / status.totalCount) * 100)
    : 0

  // Celebration state
  if (celebrating) {
    return (
      <div className="px-3 pb-2">
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
          <PartyPopper className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-emerald-800">All done!</p>
          <p className="text-xs text-emerald-600 mt-1">You&apos;re all set up. Nice work!</p>
        </div>
      </div>
    )
  }

  // Collapsed state — pill showing progress
  if (!expanded) {
    return (
      <div className="px-3 pb-2">
        <button
          onClick={() => setExpanded(true)}
          className="w-full group flex items-center gap-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2.5 transition-all duration-200"
        >
          <Rocket className="h-4 w-4 text-slate-500 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-medium text-slate-700">Getting Started</p>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={progressPercent} className="h-1.5 flex-1" />
              <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
                {status.completedCount}/{status.totalCount}
              </span>
            </div>
          </div>
          <ChevronUp className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
        </button>
      </div>
    )
  }

  // Expanded state — full checklist
  return (
    <div className="px-3 pb-2">
      <div className="rounded-lg bg-white border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">Getting Started</span>
            <span className="text-[10px] text-slate-400 font-medium">
              {status.completedCount}/{status.totalCount}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDismiss}
              className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              title="Dismiss checklist"
              aria-label="Dismiss checklist"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Collapse checklist"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-3 pt-2.5 pb-1">
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        {/* Items */}
        <div className="px-1.5 py-1.5 max-h-[280px] overflow-y-auto">
          {status.items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md group",
                item.completed
                  ? "opacity-60"
                  : "hover:bg-slate-50"
              )}
            >
              {item.completed ? (
                <div className="h-4 w-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Check className="h-2.5 w-2.5 text-emerald-600" />
                </div>
              ) : (
                <Circle className="h-4 w-4 text-slate-300 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-xs font-medium leading-tight",
                    item.completed ? "text-slate-400 line-through" : "text-slate-700"
                  )}
                >
                  {item.label}
                </p>
                {!item.completed && (
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    {item.description}
                  </p>
                )}
              </div>
              {!item.completed && (
                <button
                  onClick={() => handleNavigate(item)}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-[10px] font-medium text-primary hover:text-primary/80 transition-all flex-shrink-0"
                >
                  Go
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-slate-100">
          <button
            onClick={handleDismiss}
            className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            Hide checklist
          </button>
        </div>
      </div>
    </div>
  )
}
