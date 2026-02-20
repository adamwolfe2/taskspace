"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileJson, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ExportButtonProps {
  type: "rocks" | "tasks" | "eod-reports" | "team"
  filters?: {
    userId?: string
    startDate?: string
    endDate?: string
  }
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "icon"
}

export function ExportButton({ type, filters, variant = "outline", size = "sm" }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const handleExport = async (format: "csv" | "json") => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams({ type, format })
      if (filters?.userId) params.set("userId", filters.userId)
      if (filters?.startDate) params.set("startDate", filters.startDate)
      if (filters?.endDate) params.set("endDate", filters.endDate)

      const response = await fetch(`/api/export?${params.toString()}`, {
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        if (response.status === 404 && errorData?.error) {
          toast({
            title: "Nothing to export",
            description: errorData.error,
          })
          return
        }
        throw new Error(errorData?.error || "Export failed")
      }

      // Get the filename from the content-disposition header
      const disposition = response.headers.get("content-disposition")
      const filenameMatch = disposition?.match(/filename="(.+?)"/)
      const filename = filenameMatch?.[1] || `${type}-export.${format}`

      // Download the file
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Export complete",
        description: `${type} exported as ${format.toUpperCase()}`,
      })
    } catch {
      toast({
        title: "Export failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Download className="h-4 w-4 mr-1" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>
          <FileJson className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
