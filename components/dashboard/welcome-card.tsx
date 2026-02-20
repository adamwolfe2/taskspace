"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Target, ClipboardList, FileText, Settings, Sparkles } from "lucide-react"
import { useApp } from "@/lib/contexts/app-context"
import { cn } from "@/lib/utils"

interface WelcomeCardProps {
  userName: string
  orgName?: string
  hasRocks: boolean
  hasTasks: boolean
  hasEodReports: boolean
}

const DISMISS_KEY = "taskspace_welcome_dismissed"

export function WelcomeCard({ userName, orgName, hasRocks, hasTasks, hasEodReports }: WelcomeCardProps) {
  const { setCurrentPage } = useApp()
  const [dismissed, setDismissed] = useState(true) // Start hidden to prevent flash

  useEffect(() => {
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY)
      if (dismissedAt) {
        // Auto-expire after 14 days
        const dismissDate = new Date(dismissedAt)
        const daysSince = (Date.now() - dismissDate.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSince < 14) {
          setDismissed(true)
          return
        }
      }
      setDismissed(false)
    } catch {
      setDismissed(false)
    }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, new Date().toISOString())
    } catch {
      // Ignore storage errors
    }
  }

  // Don't show if everything is done or card is dismissed
  const allDone = hasRocks && hasTasks && hasEodReports
  if (dismissed || allDone) return null

  const steps = [
    {
      label: "Create your first rock",
      description: "Set a quarterly goal to track",
      done: hasRocks,
      icon: Target,
      action: () => setCurrentPage("rocks"),
    },
    {
      label: "Add a task",
      description: "Track your daily work items",
      done: hasTasks,
      icon: ClipboardList,
      action: () => setCurrentPage("tasks"),
    },
    {
      label: "Submit an EOD report",
      description: "Share what you accomplished today",
      done: hasEodReports,
      icon: FileText,
      action: () => {/* scroll handled by dashboard */},
    },
  ]

  const completedCount = steps.filter((s) => s.done).length
  const firstName = userName?.split(" ")[0] || "there"

  return (
    <Card className="border-slate-200 bg-slate-50/50 relative overflow-hidden">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors z-10"
        aria-label="Dismiss welcome card"
      >
        <X className="w-4 h-4" />
      </button>

      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Welcome{orgName ? ` to ${orgName}` : ""}, {firstName}!
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {completedCount === 0
                ? "Get started with these quick steps to make the most of your workspace."
                : `${completedCount} of ${steps.length} complete — keep going!`}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {steps.map((step, index) => {
            const StepIcon = step.icon
            return (
              <button
                key={index}
                onClick={step.action}
                disabled={step.done}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                  step.done
                    ? "bg-slate-50 cursor-default"
                    : "bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 cursor-pointer"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                  step.done ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
                )}>
                  <StepIcon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    step.done ? "text-slate-500 line-through" : "text-slate-900"
                  )}>
                    {step.label}
                  </p>
                  {!step.done && (
                    <p className="text-xs text-slate-500">{step.description}</p>
                  )}
                </div>
                {!step.done && (
                  <span className="text-xs text-primary font-medium flex-shrink-0">Go →</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage("settings")}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
          >
            <Settings className="w-3 h-3" />
            Enable more features
          </button>
          <button
            onClick={handleDismiss}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
