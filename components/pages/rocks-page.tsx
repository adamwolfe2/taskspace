"use client"

import type { TeamMember, Rock } from "@/lib/types"
import { ProgressBar } from "@/components/shared/progress-bar"
import { UserInitials } from "@/components/shared/user-initials"
import { formatDate, getDaysUntil } from "@/lib/utils/date-utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Target } from "lucide-react"

interface RocksPageProps {
  currentUser: TeamMember
  teamMembers: TeamMember[]
  rocks: Rock[]
}

export function RocksPage({ currentUser, teamMembers, rocks }: RocksPageProps) {
  const displayRocks = currentUser.role === "admin" ? rocks : rocks.filter((r) => r.userId === currentUser.id)

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rock Progress</h1>
        <p className="text-slate-500 mt-1">
          {currentUser.role === "admin" ? "View all team rocks" : "Track your quarterly goals"}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Target className="h-5 w-5 text-slate-500" />
          <h3 className="font-semibold text-slate-900">All Rocks ({displayRocks.length})</h3>
        </div>
        <div className="p-5">
          {displayRocks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No rocks found</p>
              <p className="text-sm text-slate-400 mt-1">Rocks will appear here when created</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100">
                    {currentUser.role === "admin" && <TableHead className="text-slate-500 font-medium">Owner</TableHead>}
                    <TableHead className="text-slate-500 font-medium">Rock</TableHead>
                    <TableHead className="text-slate-500 font-medium">Status</TableHead>
                    <TableHead className="text-slate-500 font-medium">Progress</TableHead>
                    <TableHead className="text-slate-500 font-medium">Due Date</TableHead>
                    <TableHead className="text-slate-500 font-medium">Days Left</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRocks.map((rock) => {
                    const owner = teamMembers.find((m) => m.id === rock.userId)
                    const daysLeft = getDaysUntil(rock.dueDate)
                    const statusConfig = getStatusConfig(rock.status)

                    return (
                      <TableRow key={rock.id} className="border-slate-100 hover:bg-slate-50/50">
                        {currentUser.role === "admin" && (
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
  )
}
