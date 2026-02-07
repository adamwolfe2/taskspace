"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, X, Info, Download } from "lucide-react"
import { useApp } from "@/lib/contexts/app-context"
import { Button } from "@/components/ui/button"

// LocalStorage keys for demo mode data
const DEMO_STORAGE_KEYS = {
  teamMembers: "aims_demo_team_members",
  rocks: "aims_demo_rocks",
  tasks: "aims_demo_tasks",
  eodReports: "aims_demo_eod_reports",
  lastSaved: "aims_demo_last_saved",
}

export function DemoModeBanner() {
  const { isDemoMode, logout } = useApp()
  const [isDismissed, setIsDismissed] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  useEffect(() => {
    if (isDemoMode && typeof window !== "undefined") {
      const saved = localStorage.getItem(DEMO_STORAGE_KEYS.lastSaved)
      if (saved) {
        setLastSaved(new Date(saved).toLocaleString())
      }
    }
  }, [isDemoMode])

  if (!isDemoMode || isDismissed) {
    return null
  }

  const handleExportData = () => {
    try {
      const data = {
        teamMembers: JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.teamMembers) || "[]"),
        rocks: JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.rocks) || "[]"),
        tasks: JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.tasks) || "[]"),
        eodReports: JSON.parse(localStorage.getItem(DEMO_STORAGE_KEYS.eodReports) || "[]"),
        exportedAt: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `aims-demo-backup-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      // Export failed
    }
  }

  const handleClearDemoData = () => {
    if (confirm("Are you sure you want to clear all demo data? This will reset to the default demo data.")) {
      Object.values(DEMO_STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key)
      })
      window.location.reload()
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">
              Demo Mode Active
            </p>
            <p className="text-xs text-amber-600">
              Data is saved to your browser's local storage.
              {lastSaved && <span className="ml-1">(Last saved: {lastSaved})</span>}
              {" "}For permanent storage, <button onClick={logout} className="underline hover:text-amber-800">sign up for a free account</button>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            className="text-amber-700 border-amber-300 hover:bg-amber-100 h-7 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Export Data
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Compact version for the header
export function DemoModeIndicator() {
  const { isDemoMode } = useApp()

  if (!isDemoMode) {
    return null
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-medium">
      <Info className="h-3 w-3" />
      <span>Demo Mode</span>
    </div>
  )
}
