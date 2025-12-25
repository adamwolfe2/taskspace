"use client"

import { useState } from "react"
import type { TeamMember, EODReport, Rock } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
        <h1 className="text-3xl font-bold">EOD History</h1>
        <p className="text-muted-foreground mt-1">View past end-of-day reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {currentUser.role === "admin" && (
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-full sm:w-48">
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
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">No EOD reports found</CardContent>
          </Card>
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
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {user && <UserInitials name={user.name} />}
                      <div>
                        <CardTitle className="text-lg">EOD Report - {formatDate(report.date)}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Submitted by {user?.name} at {new Date(report.submittedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.needsEscalation && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Escalation
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => toggleExpanded(report.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-lg mb-3">Rock Progress Update</h4>

                      {/* Tasks grouped by rock */}
                      {Object.entries(tasksByRock).map(([rockId, tasks]) => {
                        if (rockId === "general") return null
                        const rock = getRockForId(rockId)
                        if (!rock) return null

                        const rockPriorities = prioritiesByRock[rockId] || []

                        return (
                          <div key={rockId} className="mb-4 pb-4 border-b border-border last:border-b-0">
                            <div className="mb-3">
                              <h5 className="font-semibold text-primary">{rock.title}</h5>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                <span>Status: {rock.status.replace("-", " ").toUpperCase()}</span>
                                <span>Current Progress: {rock.progress}%</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-sm font-medium">Today's Key Activities:</p>
                              <ul className="list-disc list-inside space-y-1 ml-2">
                                {tasks.map((task) => (
                                  <li key={task.id} className="text-sm text-muted-foreground">
                                    {task.text}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {rockPriorities.length > 0 && (
                              <div className="space-y-2 mt-3">
                                <p className="text-sm font-medium">Tomorrow's Priorities:</p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                  {rockPriorities.map((priority) => (
                                    <li key={priority.id} className="text-sm text-muted-foreground">
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
                        <div className="mb-4 pb-4 border-b border-border">
                          <h5 className="font-semibold mb-2">General Activities:</h5>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            {tasksByRock.general.map((task) => (
                              <li key={task.id} className="text-sm text-muted-foreground">
                                {task.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Challenges */}
                    <div>
                      <h4 className="font-semibold mb-2">Challenges:</h4>
                      <p className="text-sm text-muted-foreground">{report.challenges}</p>
                    </div>

                    {/* Escalation */}
                    {report.needsEscalation && report.escalationNote && (
                      <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                        <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          ESCALATION NEEDED
                        </h4>
                        <p className="text-sm">{report.escalationNote}</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
