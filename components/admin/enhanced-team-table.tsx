"use client"

import { useState } from "react"
import type { TeamMember } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  Pencil,
  Trash2,
  Target,
  Users,
} from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/utils/date-utils"

interface EnhancedTeamTableProps {
  teamMembers: TeamMember[]
  onEditMember: (member: TeamMember) => void
  onDeleteMember?: (member: TeamMember) => void
  onManageRocks?: (member: TeamMember) => void
}

export function EnhancedTeamTable({
  teamMembers,
  onEditMember,
  onDeleteMember,
  onManageRocks,
}: EnhancedTeamTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  // Get unique departments
  const departments = Array.from(
    new Set(teamMembers.map((m) => m.department).filter(Boolean))
  )

  // Filter members
  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch =
      !searchQuery ||
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDepartment =
      departmentFilter === "all" || member.department === departmentFilter

    const matchesRole = roleFilter === "all" || member.role === roleFilter

    return matchesSearch && matchesDepartment && matchesRole
  })

  const getRoleConfig = (role: TeamMember["role"]) => {
    const configs = {
      owner: {
        label: "Owner",
        className: "bg-slate-800 text-white border-slate-800",
      },
      admin: {
        label: "Admin",
        className: "bg-slate-100 text-slate-700 border-slate-200",
      },
      manager: {
        label: "Manager",
        className: "bg-slate-100 text-slate-700 border-slate-200",
      },
      member: {
        label: "Member",
        className: "bg-slate-100 text-slate-700 border-slate-200",
      },
    }
    return configs[role]
  }

  const getStatusIcon = (lastActive?: string) => {
    if (!lastActive) return <Clock className="h-4 w-4 text-muted-foreground" />

    const daysSinceActive = Math.floor(
      (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceActive < 1) {
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    } else if (daysSinceActive < 7) {
      return <Clock className="h-4 w-4 text-amber-500" />
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Roles</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="member">Member</option>
        </select>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-border bg-card">
          <p className="text-xs text-muted-foreground font-medium">Total Members</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {filteredMembers.length}
          </p>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-700 font-medium">Active</p>
          <p className="text-2xl font-bold text-slate-700 mt-1">
            {
              filteredMembers.filter((m) => {
                if (!m.lastActive) return false
                const days = Math.floor(
                  (Date.now() - new Date(m.lastActive).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
                return days < 1
              }).length
            }
          </p>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-700 font-medium">Admins</p>
          <p className="text-2xl font-bold text-slate-700 mt-1">
            {filteredMembers.filter((m) => m.role === "admin" || m.role === "owner").length}
          </p>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-700 font-medium">Departments</p>
          <p className="text-2xl font-bold text-slate-700 mt-1">
            {departments.length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[200px] lg:w-[300px]">Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={Users}
                    title="No members found"
                    description={searchQuery ? `No matches for "${searchQuery}". Try a different search term.` : "No team members match the current filters"}
                    size="sm"
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((member) => {
                const roleConfig = getRoleConfig(member.role)
                return (
                  <TableRow key={member.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-background">
                          <AvatarFallback className="bg-slate-700 text-white font-semibold">
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {member.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border", roleConfig.className)}>
                        {roleConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">
                        {member.department || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(member.lastActive)}
                        <span className="text-xs text-muted-foreground">
                          {member.lastActive
                            ? formatDate(member.lastActive)
                            : "Never"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {member.createdAt ? formatDate(member.createdAt) : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Member actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onEditMember(member)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Member
                          </DropdownMenuItem>
                          {onManageRocks && (
                            <DropdownMenuItem onClick={() => onManageRocks(member)}>
                              <Target className="h-4 w-4 mr-2" />
                              Manage Rocks
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {onDeleteMember && (
                            <DropdownMenuItem
                              onClick={() => onDeleteMember(member)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Member
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
