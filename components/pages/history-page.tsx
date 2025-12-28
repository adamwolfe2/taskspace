"use client"

import { useState } from "react"
import type { TeamMember, EODReport, Rock } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserInitials } from "@/components/shared/user-initials"
import { formatDate } from "@/lib/utils/date-utils"
import { Search, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface HistoryPageProps {
  currentUser: TeamMember
  teamMembers: TeamMember[]
  eodReports: EODReport[]
  rocks: Rock[]
}

export function HistoryPage({ currentUser, teamMembers, eodReports, rocks }: HistoryPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [userFilter, setUserFilter] = useState<string>("all")
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set())

  const toggleExpanded = (reportId: string) => {
    const newExpanded = new Set(expandedReports)
    if (newExpanded.has(reportId)) {
      newExpanded.delete(reportId)
    } else {
      newExpanded.add(reportId)
    }
    setExpandedReports(newExpanded)
  }

  const filteredReports = eodReports
    .filter((report) => {
      if (currentUser.role !== "admin" && userFilter === "all") {
        return report.userId === currentUser.id
      }
      if (userFilter !== "all") {
        return report.userId === userFilter
      }
      return true
    })
    .filter((report) => {
      if (!searchQuery) return true
      const user = teamMembers.find((m) => m.id === report.userId)
      const searchLower = searchQuery.toLowerCase()
      return (
        user?.name.toLowerCase().includes(searchLower) ||
        report.tasks.some((t) => t.text.toLowerCase().includes(searchLower)) ||
        report.challenges.toLowerCase().includes(searchLower) ||
        report.tomorrowPriorities.some((p) => p.text.toLowerCase().includes(searchLower))
      )
    })
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

  const getRockForId = (rockId: string | null) => {
    if (!rockId) return null
    return rocks.find((r) => r.id === rockId)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">EOD History</h1>
        <p className="text-slate-500 mt-1">View past end-of-day reports</p>
      </div>

      <div className="bg-white rounded-xl shadow-card p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>
          {currentUser.role === "admin" && (
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-slate-50 border-slate-200">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Team Members</SelectItem>
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

      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card py-16 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No EOD reports found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const user = teamMembers.find((m) => m.id === report.userId)
            const isExpanded = expandedReports.has(report.id)

            // Group tasks by rock
            const tasksByRock = (report.tasks || []).reduce(
              (acc, task) => {
                const key = task.rockId || "general"
                if (!acc[key]) acc[key] = []
                acc[key].push(task)
                return acc
              },
              {} as Record<string, typeof report.tasks>,
            )

            const prioritiesByRock = (report.tomorrowPriorities || []).reduce(
              (acc, priority) => {
                const key = priority.rockId || "general"
                if (!acc[key]) acc[key] = []
                acc[key].push(priority)
                return acc
              },
              {} as Record<string, typeof report.tomorrowPriorities>,
            )

            return (
              <div key={report.id} className="bg-white rounded-xl shadow-card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {user && <UserInitials name={user.name} />}
                      <div>
                        <h3 className="font-semibold text-slate-900">EOD Report - {formatDate(report.date)}</h3>
                        <p className="text-sm text-slate-500">
                          Submitted by {user?.name} at {new Date(report.submittedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.needsEscalation && (
                        <span className="status-pill bg-red-50 text-red-700 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Escalation
                        </span>
                      )}
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600" onClick={() => toggleExpanded(report.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-5 space-y-6">
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Rock Progress Update</h4>

                      {/* Tasks grouped by rock */}
                      {Object.entries(tasksByRock).map(([rockId, tasks]) => {
                        if (rockId === "general") return null
                        const rock = getRockForId(rockId)
                        if (!rock) return null

                        const rockPriorities = prioritiesByRock[rockId] || []

                        return (
                          <div key={rockId} className="mb-4 pb-4 border-b border-slate-100 last:border-b-0">
                            <div className="mb-3">
                              <h5 className="font-semibold text-slate-900">{rock.title}</h5>
                              <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                <span className="status-pill bg-slate-100 text-slate-600">{rock.status.replace("-", " ")}</span>
                                <span>Progress: {rock.progress}%</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-sm font-medium text-slate-700">Today's Key Activities:</p>
                              <ul className="list-disc list-inside space-y-1 ml-2">
                                {tasks.map((task) => (
                                  <li key={task.id} className="text-sm text-slate-600">
                                    {task.text}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {rockPriorities.length > 0 && (
                              <div className="space-y-2 mt-3">
                                <p className="text-sm font-medium text-slate-700">Tomorrow's Priorities:</p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                  {rockPriorities.map((priority) => (
                                    <li key={priority.id} className="text-sm text-slate-600">
                                      {priority.text}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* General activities */}
                      {tasksByRock.general && (
                        <div className="mb-4 pb-4 border-b border-slate-100">
                          <h5 className="font-semibold text-slate-700 mb-2">General Activities:</h5>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            {tasksByRock.general.map((task) => (
                              <li key={task.id} className="text-sm text-slate-600">
                                {task.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Challenges */}
                    <div>
                      <h4 className="font-semibold text-slate-700 mb-2">Challenges:</h4>
                      <p className="text-sm text-slate-600">{report.challenges}</p>
                    </div>

                    {/* Escalation */}
                    {report.needsEscalation && report.escalationNote && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          ESCALATION NEEDED
                        </h4>
                        <p className="text-sm text-red-600">{report.escalationNote}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
