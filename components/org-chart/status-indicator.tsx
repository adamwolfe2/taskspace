"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Wifi, WifiOff, RefreshCw } from "lucide-react"

interface StatusIndicatorProps {
  className?: string
}

export function StatusIndicator({ className }: StatusIndicatorProps) {
  const [status, setStatus] = useState<{
    airtable: boolean
    openai: boolean
    loading: boolean
  }>({
    airtable: false,
    openai: false,
    loading: true,
  })

  const checkStatus = async () => {
    setStatus(prev => ({ ...prev, loading: true }))
    try {
      const response = await fetch("/api/org-chart/status")
      const data = await response.json()
      setStatus({
        airtable: data.airtable,
        openai: data.openai,
        loading: false,
      })
    } catch {
      setStatus({
        airtable: false,
        openai: false,
        loading: false,
      })
    }
  }

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [])

  const isConnected = status.airtable

  return (
    <button
      onClick={checkStatus}
      disabled={status.loading}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
        isConnected
          ? "bg-emerald-100 text-emerald-700"
          : "bg-amber-100 text-amber-700",
        status.loading && "opacity-50",
        className
      )}
      title={
        status.loading
          ? "Checking connection..."
          : isConnected
          ? "Connected to Airtable"
          : "Using fallback data"
      }
    >
      {status.loading ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : isConnected ? (
        <Wifi className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      <span>{isConnected ? "Connected" : "Offline Mode"}</span>
    </button>
  )
}
