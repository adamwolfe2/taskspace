"use client"

import { Info } from "lucide-react"
import { useApp } from "@/lib/contexts/app-context"

export function DemoModeBanner() {
  const { isDemoMode, logout } = useApp()

  if (!isDemoMode) {
    return null
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Info className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">
              Demo Mode — Read Only
            </p>
            <p className="text-xs text-amber-600">
              You&apos;re viewing a demo with sample data. {" "}
              <button onClick={logout} className="underline hover:text-amber-800 font-medium">
                Sign up for a free account
              </button>
              {" "}to create your own workspace.
            </p>
          </div>
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
      <span>Demo</span>
    </div>
  )
}
