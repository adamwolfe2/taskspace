"use client"

import { FeatureGate } from "@/components/shared/feature-gate"
import { ExportButton } from "@/components/shared/export-button"
import { useState, useMemo, useEffect } from "react"
import type { TeamMember, Rock } from "@/lib/types"
import { ProgressBar } from "@/components/shared/progress-bar"
import { UserInitials } from "@/components/shared/user-initials"
import { formatDate, getDaysUntil } from "@/lib/utils/date-utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target, Search, Calendar, AlertTriangle } from "lucide-react"
import { isRockBehindSchedule } from "@/lib/utils/stats-calculator"
import { EmptyState } from "@/components/shared/empty-state"
import { NoWorkspaceAlert } from "@/components/shared/no-workspace-alert"
import { useApp } from "@/lib/contexts/app-context"
import { RockDetailModal } from "@/components/rocks/rock-detail-modal"

interface RocksPageProps {
  currentUser: TeamMember
  teamMembers: TeamMember[]
  rocks: Rock[]
  initialOwnerFilter?: string // Pre-set owner filter (e.g., from manager drill-down)
  onFilterConsumed?: () => void  // Callback to clear the filter after consuming it
  updateRock?: (id: string, updates: Partial<Rock>) => Promise<Rock>
}

export function RocksPage({ currentUser, teamMembers, rocks, initialOwnerFilter, onFilterConsumed, updateRock }: RocksPageProps) {
  const { setCurrentPage } = useApp()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [ownerFilter, setOwnerFilter] = useState<string>(initialOwnerFilter || "all")
  const [selectedRock, setSelectedRock] = useState<Rock | null>(null)

  // Apply initial filter from navigation (e.g., manager dashboard drill-down)
  useEffect(() => {
    if (initialOwnerFilter) {
      setOwnerFilter(initialOwnerFilter)
      onFilterConsumed?.()
    }
  }, [initialOwnerFilter, onFilterConsumed])
  const [quarterFilter, setQuarterFilter] = useState<string>(() => {
    const now = new Date()
    const quarter = Math.floor(now.getMonth() / 3) + 1
    return `Q${quarter} ${now.getFullYear()}`
  })

  const isAdmin = currentUser.role === "admin" || currentUser.role === "owner"
  // Use users.id (not org_members.id) for filtering rocks
  const effectiveUserId = currentUser.userId || currentUser.id
  // When navigating from manager drill-down with an owner filter, show all rocks so the filter works
  const hasManagerFilter = !!initialOwnerFilter
  const baseRocks = (isAdmin || hasManagerFilter) ? rocks : rocks.filter((r) => r.userId === effectiveUserId)

  // Get unique quarters from rocks for filter options
  const availableQuarters = useMemo(() => {
    const quarters = new Set<string>()
    baseRocks.forEach((rock) => {
      if (rock.quarter) quarters.add(rock.quarter)
    })
    // Ensure current quarter is always available
    quarters.add(quarterFilter)
    return Array.from(quarters).sort((a, b) => {
      // Sort by year then quarter
      const [qA, yearA] = a.split(" ")
      const [qB, yearB] = b.split(" ")
      if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB)
      return qA.localeCompare(qB)
    })
  }, [baseRocks])

  const displayRocks = useMemo(() => {
    return baseRocks.filter((rock) => {
      // Quarter filter
      if (quarterFilter !== "all") {
        const rockQuarter = rock.quarter || ""
        if (rockQuarter !== quarterFilter) return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = rock.title.toLowerCase().includes(query)
        const matchesDescription = rock.description?.toLowerCase().includes(query)
        if (!matchesTitle && !matchesDescription) return false
      }

      // Status filter — "behind-pace" is a virtual filter
      if (statusFilter === "behind-pace") {
        if (!isRockBehindSchedule(rock)) return false
      } else if (statusFilter !== "all" && rock.status !== statusFilter) {
        return false
      }

      // Owner filter (admin or manager drill-down)
      if ((isAdmin || hasManagerFilter) && ownerFilter !== "all" && rock.userId !== ownerFilter) return false

      return true
    })
  }, [baseRocks, searchQuery, statusFilter, ownerFilter, quarterFilter, isAdmin, hasManagerFilter])

  const getStatusConfig = (status: Rock["status"]) => {
    const configs = {
      "on-track": { bgColor: "bg-emerald-50", textColor: "text-emerald-700", label: "On Track" },
      "at-risk": { bgColor: "bg-amber-50", textColor: "text-amber-700", label: "At Risk" },
      blocked: { bgColor: "bg-red-50", textColor: "text-red-700", label: "Blocked" },
      completed: { bgColor: "bg-slate-100", textColor: "text-slate-700", label: "Completed" },
    }
    return configs[status]
  }

  return (
    <FeatureGate feature="core.rocks">
      <div className="space-y-6">
      <NoWorkspaceAlert />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Rock Progress</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            {isAdmin ? "View all team rocks" : "Track your quarterly goals"}
          </p>
        </div>
        <ExportButton type="rocks" />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-card p-3 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search rocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 w-full"
            />
          </div>
          <Select value={quarterFilter} onValueChange={setQuarterFilter}>
            <SelectTrigger className="w-full sm:w-36 bg-slate-50 border-slate-200">
              <Calendar className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Quarter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quarters</SelectItem>
              {availableQuarters.map((quarter) => (
                <SelectItem key={quarter} value={quarter}>
                  {quarter}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-slate-50 border-slate-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="on-track">On Track</SelectItem>
              <SelectItem value="at-risk">At Risk</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="behind-pace">⚠ Behind Pace</SelectItem>
            </SelectContent>
          </Select>
          {(isAdmin || hasManagerFilter) && (
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-slate-50 border-slate-200">
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.userId || member.id} value={member.userId || member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex items-center gap-2">
          <Target className="h-5 w-5 text-slate-500 flex-shrink-0" />
          <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
            Rocks ({displayRocks.length}{baseRocks.length !== displayRocks.length ? ` of ${baseRocks.length}` : ""})
          </h3>
        </div>
        <div className="p-3 sm:p-5">
          {displayRocks.length === 0 ? (
            baseRocks.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No quarterly rocks yet"
                description="Rocks are your 3-7 most important goals for the quarter — the big bets that move the needle. Create rocks from the dashboard or AI Command Center to start tracking progress."
                size="md"
                action={{
                  label: "Go to Dashboard",
                  onClick: () => setCurrentPage("dashboard"),
                }}
              />
            ) : (
              <EmptyState
                icon={Search}
                title="No rocks match your filters"
                description="Try adjusting your search query, status filter, or selected quarter to find what you're looking for."
                size="sm"
                action={{
                  label: "Clear all filters",
                  onClick: () => {
                    setSearchQuery("")
                    setStatusFilter("all")
                    setOwnerFilter("all")
                  },
                }}
              />
            )
          ) : (
            <>
              {/* Mobile card layout */}
              <div className="md:hidden space-y-3">
                {displayRocks.map((rock) => {
                  const owner = rock.userId ? teamMembers.find((m) => m.userId === rock.userId) : (rock.ownerEmail ? teamMembers.find((m) => m.email?.toLowerCase() === rock.ownerEmail?.toLowerCase()) : undefined)
                  const daysLeft = getDaysUntil(rock.dueDate)
                  const statusConfig = getStatusConfig(rock.status)

                  return (
                    <div key={rock.id} className="border border-slate-200 rounded-lg p-3 space-y-2.5 cursor-pointer hover:border-slate-300 transition-colors" onClick={() => setSelectedRock(rock)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 text-sm leading-snug">{rock.title}</p>
                          {rock.description && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{rock.description}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                          <span className={`status-pill text-xs ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                            {statusConfig.label}
                          </span>
                          {isRockBehindSchedule(rock) && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-orange-600 font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              Behind
                            </span>
                          )}
                        </div>
                      </div>
                      {isAdmin && owner && (
                        <div className="flex items-center gap-1.5">
                          <UserInitials name={owner.name} size="sm" />
                          <span className="text-xs text-slate-600">{owner.name}</span>
                        </div>
                      )}
                      <div className="w-full space-y-1">
                        <ProgressBar value={rock.progress} status={rock.status} size="sm" />
                        {rock.milestones && rock.milestones.length > 0 && (
                          <p className="text-xs text-slate-500">
                            {rock.milestones.filter((m) => m.completed).length}/{rock.milestones.length} milestones
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-3">
                          {rock.quarter && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                              {rock.quarter}
                            </span>
                          )}
                          <span>{formatDate(rock.dueDate)}</span>
                        </div>
                        <span
                          className={`font-medium ${
                            daysLeft < 0
                              ? "text-red-600"
                              : daysLeft < 7
                                ? "text-amber-600"
                                : "text-slate-500"
                          }`}
                        >
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop table layout */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100">
                      {isAdmin && <TableHead className="text-slate-500 font-medium">Owner</TableHead>}
                      <TableHead className="text-slate-500 font-medium">Rock</TableHead>
                      <TableHead className="text-slate-500 font-medium">Quarter</TableHead>
                      <TableHead className="text-slate-500 font-medium">Status</TableHead>
                      <TableHead className="text-slate-500 font-medium">Progress</TableHead>
                      <TableHead className="text-slate-500 font-medium">Due Date</TableHead>
                      <TableHead className="text-slate-500 font-medium">Days Left</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayRocks.map((rock) => {
                      const owner = rock.userId ? teamMembers.find((m) => m.userId === rock.userId) : (rock.ownerEmail ? teamMembers.find((m) => m.email?.toLowerCase() === rock.ownerEmail?.toLowerCase()) : undefined)
                      const daysLeft = getDaysUntil(rock.dueDate)
                      const statusConfig = getStatusConfig(rock.status)

                      return (
                        <TableRow key={rock.id} className="border-slate-100 hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelectedRock(rock)}>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {owner && <UserInitials name={owner.name} size="sm" />}
                                <span className="text-sm text-slate-700">{owner?.name}</span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-900">{rock.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{rock.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {rock.quarter ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                {rock.quarter}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className={`status-pill ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                                {statusConfig.label}
                              </span>
                              {isRockBehindSchedule(rock) && (
                                <span className="inline-flex items-center gap-0.5 text-xs text-orange-600 font-medium">
                                  <AlertTriangle className="h-3 w-3" />
                                  Behind pace
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="w-32">
                                <ProgressBar value={rock.progress} status={rock.status} size="sm" />
                              </div>
                              {rock.milestones && rock.milestones.length > 0 && (
                                <span className="text-xs text-slate-500">
                                  {rock.milestones.filter((m) => m.completed).length}/{rock.milestones.length} milestones
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">{formatDate(rock.dueDate)}</TableCell>
                          <TableCell>
                            <span
                              className={`text-sm font-medium ${
                                daysLeft < 0
                                  ? "text-red-600"
                                  : daysLeft < 7
                                    ? "text-amber-600"
                                    : "text-slate-500"
                              }`}
                            >
                              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

    {selectedRock && updateRock && (
      <RockDetailModal
        open={!!selectedRock}
        onOpenChange={(open) => { if (!open) setSelectedRock(null) }}
        rock={selectedRock}
        onUpdateRock={updateRock}
      />
    )}
    </FeatureGate>
  )
}
