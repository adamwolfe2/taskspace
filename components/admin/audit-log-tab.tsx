"use client"

import { useEffect, useState, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, ShieldAlert, Info, AlertTriangle, Activity } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface AuditEntry {
  id: string
  action: string
  actor_id: string | null
  actor_type: string | null
  resource_type: string | null
  resource_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  severity: "info" | "warning" | "error" | "critical"
  created_at: string
}

const SEVERITY_ICON = {
  info: <Info className="h-3.5 w-3.5 text-slate-400" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  error: <ShieldAlert className="h-3.5 w-3.5 text-red-500" />,
  critical: <ShieldAlert className="h-3.5 w-3.5 text-red-700" />,
}

const SEVERITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  info: "secondary",
  warning: "outline",
  error: "destructive",
  critical: "destructive",
}

export function AuditLogTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const limit = 25

  const fetchLogs = useCallback(async (resetPage?: boolean) => {
    const currentPage = resetPage ? 1 : page
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
      })
      if (severityFilter !== "all") params.set("severity", severityFilter)

      const res = await fetch(`/api/audit?${params}`)
      if (!res.ok) throw new Error("Failed to load audit log")
      const data = await res.json()

      const logs: AuditEntry[] = data.data?.logs || data.data?.items || data.data || []
      if (resetPage) {
        setEntries(logs)
        setPage(1)
      } else {
        setEntries(logs)
      }
      setHasMore(data.data?.hasMore ?? logs.length === limit)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit log")
    } finally {
      setIsLoading(false)
    }
  }, [page, severityFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleSeverityChange = (value: string) => {
    setSeverityFilter(value)
    setPage(1)
  }

  const formatAction = (action: string) => {
    return action.replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ShieldAlert className="h-8 w-8 mb-3 opacity-40" />
        <p className="text-sm font-medium">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchLogs()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={severityFilter} onValueChange={handleSeverityChange}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="All severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severity</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => fetchLogs(true)} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Table */}
      {isLoading && entries.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Activity className="h-8 w-8 mb-3 opacity-20" />
          <p className="text-sm">No audit log entries found.</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden md:table-cell">Resource</TableHead>
                  <TableHead className="hidden lg:table-cell">IP</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} className="text-sm">
                    <TableCell className="py-2">
                      {SEVERITY_ICON[entry.severity] ?? SEVERITY_ICON.info}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatAction(entry.action)}</span>
                        {entry.severity !== "info" && (
                          <Badge variant={SEVERITY_VARIANT[entry.severity]} className="text-xs py-0 h-5">
                            {entry.severity}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 hidden md:table-cell text-muted-foreground">
                      {entry.resource_type && (
                        <span>{entry.resource_type}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 hidden lg:table-cell text-xs text-muted-foreground font-mono">
                      {entry.ip_address || "—"}
                    </TableCell>
                    <TableCell className="py-2 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              Showing {entries.length} entries
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
              )}
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
