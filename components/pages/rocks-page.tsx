"use client"

import { FeatureGate } from "@/components/shared/feature-gate"
import { useState, useMemo } from "react"
import type { TeamMember, Rock } from "@/lib/types"
import { ProgressBar } from "@/components/shared/progress-bar"
import { UserInitials } from "@/components/shared/user-initials"
import { formatDate, getDaysUntil } from "@/lib/utils/date-utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target, Search, Calendar } from "lucide-react"

interface RocksPageProps {
  currentUser: TeamMember
  teamMembers: TeamMember[]
  rocks: Rock[]
}

export function RocksPage({ currentUser, teamMembers, rocks }: RocksPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [ownerFilter, setOwnerFilter] = useState<string>("all")
  const [quarterFilter, setQuarterFilter] = useState<string>("Q1 2025") // Default to current quarter

  const isAdmin = currentUser.role === "admin" || currentUser.role === "owner"
  const baseRocks = isAdmin ? rocks : rocks.filter((r) => r.userId === currentUser.id)

  // Get unique quarters from rocks for filter options
  const availableQuarters = useMemo(() => {
    const quarters = new Set<string>()
    baseRocks.forEach((rock) => {
      if (rock.quarter) quarters.add(rock.quarter)
    })
    // Ensure Q1 2025 is always available
    quarters.add("Q1 2025")
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

      // Status filter
      if (statusFilter !== "all" && rock.status !== statusFilter) return false

      // Owner filter (admin only)
      if (isAdmin && ownerFilter !== "all" && rock.userId !== ownerFilter) return false

      return true
    })
  }, [baseRocks, searchQuery, statusFilter, ownerFilter, quarterFilter, isAdmin])

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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rock Progress</h1>
        <p className="text-slate-500 mt-1">
          {isAdmin ? "View all team rocks" : "Track your quarterly goals"}
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-card p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search rocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
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
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-slate-50 border-slate-200">
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Target className="h-5 w-5 text-slate-500" />
          <h3 className="font-semibold text-slate-900">
            Rocks ({displayRocks.length}{baseRocks.length !== displayRocks.length ? ` of ${baseRocks.length}` : ""})
          </h3>
        </div>
        <div className="p-5">
          {displayRocks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No rocks found</p>
              <p className="text-sm text-slate-400 mt-1">
                {searchQuery || statusFilter !== "all" || ownerFilter !== "all" || quarterFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : `No rocks assigned for ${quarterFilter}`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                    const owner = teamMembers.find((m) => m.userId === rock.userId)
                    const daysLeft = getDaysUntil(rock.dueDate)
                    const statusConfig = getStatusConfig(rock.status)

                    return (
                      <TableRow key={rock.id} className="border-slate-100 hover:bg-slate-50/50">
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
                          <span className={`status-pill ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                            {statusConfig.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="w-32">
                            <ProgressBar value={rock.progress} status={rock.status} size="sm" />
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
          )}
        </div>
      </div>
    </div>
    </FeatureGate>
  )
}
