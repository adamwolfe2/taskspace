"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Database, Wifi, WifiOff, RefreshCw } from "lucide-react"

interface StatusIndicatorProps {
  className?: string
}

export function StatusIndicator({ className }: StatusIndicatorProps) {
  const [status, setStatus] = useState<{
    connected: boolean
    source: string
    employeeCount: number
    loading: boolean
  }>({
    connected: false,
    source: "fallback",
    employeeCount: 0,
    loading: true,
  })

  const checkStatus = async () => {
    setStatus(prev => ({ ...prev, loading: true }))
    try {
      const response = await fetch("/api/org-chart/status")
      const data = await response.json()
      setStatus({
        connected: data.connected || data.database || data.airtable,
        source: data.source || "fallback",
        employeeCount: data.employeeCount || 0,
        loading: false,
      })
    } catch {
      setStatus({
        connected: false,
        source: "fallback",
        employeeCount: 0,
        loading: false,
      })
    }
  }

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [])

  const isConnected = status.connected
  const isDatabase = status.source === "database"

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
          ? `Connected to ${status.source} (${status.employeeCount} employees)`
          : "Using fallback data"
      }
    >
      {status.loading ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : isConnected ? (
        isDatabase ? <Database className="h-3 w-3" /> : <Wifi className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      <span>
        {status.loading
          ? "Checking..."
          : isConnected
          ? `${status.employeeCount} Employees`
          : "Offline Mode"}
      </span>
    </button>
  )
}
