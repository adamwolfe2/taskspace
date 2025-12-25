"use client"

import type { TeamMember, Rock } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProgressBar } from "@/components/shared/progress-bar"
import { UserInitials } from "@/components/shared/user-initials"
import { Badge } from "@/components/ui/badge"
import { formatDate, getDaysUntil } from "@/lib/utils/date-utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface RocksPageProps {
  currentUser: TeamMember
  teamMembers: TeamMember[]
  rocks: Rock[]
}

export function RocksPage({ currentUser, teamMembers, rocks }: RocksPageProps) {
  const displayRocks = currentUser.role === "admin" ? rocks : rocks.filter((r) => r.userId === currentUser.id)

  const getStatusBadge = (status: Rock["status"]) => {
    const variants = {
      "on-track": "default",
      "at-risk": "secondary",
      blocked: "destructive",
      completed: "outline",
    }
    return (
      <Badge variant={variants[status] as any} className="text-xs">
        {status.replace("-", " ").toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rock Progress</h1>
        <p className="text-muted-foreground mt-1">
          {currentUser.role === "admin" ? "View all team rocks" : "Track your quarterly goals"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Rocks ({displayRocks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {displayRocks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No rocks found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {currentUser.role === "admin" && <TableHead>Owner</TableHead>}
                    <TableHead>Rock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Left</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRocks.map((rock) => {
                    const owner = teamMembers.find((m) => m.id === rock.userId)
                    const daysLeft = getDaysUntil(rock.dueDate)

                    return (
                      <TableRow key={rock.id}>
                        {currentUser.role === "admin" && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {owner && <UserInitials name={owner.name} size="sm" />}
                              <span className="text-sm">{owner?.name}</span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div>
                            <p className="font-medium">{rock.title}</p>
                            <p className="text-xs text-muted-foreground">{rock.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(rock.status)}</TableCell>
                        <TableCell>
                          <div className="w-32">
                            <ProgressBar value={rock.progress} status={rock.status} size="sm" />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(rock.dueDate)}</TableCell>
                        <TableCell>
                          <span
                            className={`text-sm ${
                              daysLeft < 0
                                ? "text-destructive"
                                : daysLeft < 7
                                  ? "text-warning"
                                  : "text-muted-foreground"
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
        </CardContent>
      </Card>
    </div>
  )
}
