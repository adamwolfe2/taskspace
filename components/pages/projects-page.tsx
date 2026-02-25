"use client"

import { FeatureGate } from "@/components/shared/feature-gate"
import { useState, useMemo, useEffect, useCallback } from "react"
import type { Project, Client, TeamMember, Rock, AssignedTask, ProjectMember } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, FolderKanban, MoreHorizontal, Pencil, Trash2, Calendar, Users, CheckCircle2, X, ArrowUpDown, RefreshCw, UserPlus, LayoutList, Kanban } from "lucide-react"
import { format, parseISO } from "date-fns"
import { EmptyState } from "@/components/shared/empty-state"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/utils"
import { NoWorkspaceAlert } from "@/components/shared/no-workspace-alert"
import { ProjectKanbanBoard } from "@/components/projects/project-kanban-board"

import { useBrandStatusStyles } from "@/lib/hooks/use-brand-status-styles"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface ProjectsPageProps {
  currentUser: TeamMember
  teamMembers: TeamMember[]
  projects: Project[]
  clients: Client[]
  rocks: Rock[]
  assignedTasks: AssignedTask[]
  createProject: (project: Partial<Project>) => Promise<Project>
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  updateTask: (id: string, updates: Partial<AssignedTask>) => Promise<AssignedTask>
}


function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ""
  try {
    const d = parseISO(dateStr)
    return format(d, "MMM d, yyyy")
  } catch {
    return dateStr
  }
}

export function ProjectsPage({
  currentUser: _currentUser,
  teamMembers,
  projects,
  clients,
  rocks,
  assignedTasks,
  createProject,
  updateProject,
  deleteProject,
  updateTask,
}: ProjectsPageProps) {
  const { toast } = useToast()
  const { getStatusStyle, getPriorityStyle } = useBrandStatusStyles()

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("name-asc")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [detailProject, setDetailProject] = useState<Project | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)
  const [tasksView, setTasksView] = useState<"list" | "kanban">("list")

  // Project members state
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [addMemberUserId, setAddMemberUserId] = useState<string>("")

  // Form state
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formClientId, setFormClientId] = useState<string>("")
  const [formStatus, setFormStatus] = useState<Project["status"]>("active")
  const [formPriority, setFormPriority] = useState<Project["priority"]>("normal")
  const [formStartDate, setFormStartDate] = useState("")
  const [formDueDate, setFormDueDate] = useState("")
  const [formOwnerId, setFormOwnerId] = useState<string>("")

  // Filtered + sorted projects
  const filteredProjects = useMemo(() => {
    const filtered = projects.filter(p => {
      const matchesSearch = !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || p.status === statusFilter
      const matchesClient = clientFilter === "all" || p.clientId === clientFilter
      return matchesSearch && matchesStatus && matchesClient
    })

    const sorted = [...filtered]
    const [sortField, sortDir] = sortBy.split("-")
    const dir = sortDir === "desc" ? -1 : 1

    const statusOrder: Record<string, number> = { active: 0, planning: 1, "on-hold": 2, completed: 3, cancelled: 4 }
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, normal: 2, low: 3 }

    sorted.sort((a, b) => {
      switch (sortField) {
        case "name":
          return dir * a.name.localeCompare(b.name)
        case "status":
          return dir * ((statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99))
        case "priority":
          return dir * ((priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99))
        case "dueDate": {
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
          return dir * (aDate - bDate)
        }
        case "progress":
          return dir * ((a.progress ?? 0) - (b.progress ?? 0))
        case "createdAt":
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        default:
          return 0
      }
    })

    return sorted
  }, [projects, searchQuery, statusFilter, clientFilter, sortBy])

  // Stats
  const activeCount = projects.filter(p => p.status === "active").length
  const planningCount = projects.filter(p => p.status === "planning").length
  const completedCount = projects.filter(p => p.status === "completed").length

  const resetForm = () => {
    setFormName("")
    setFormDescription("")
    setFormClientId("")
    setFormStatus("active")
    setFormPriority("normal")
    setFormStartDate("")
    setFormDueDate("")
    setFormOwnerId("")
  }

  const openCreateModal = () => {
    resetForm()
    setEditingProject(null)
    setShowCreateModal(true)
  }

  const openEditModal = (project: Project) => {
    setFormName(project.name)
    setFormDescription(project.description || "")
    setFormClientId(project.clientId || "")
    setFormStatus(project.status)
    setFormPriority(project.priority)
    setFormStartDate(project.startDate || "")
    setFormDueDate(project.dueDate || "")
    setFormOwnerId(project.ownerId || "")
    setEditingProject(project)
    setShowCreateModal(true)
  }

  const handleSubmit = async () => {
    if (!formName.trim()) return
    setIsSubmitting(true)
    try {
      if (editingProject) {
        await updateProject(editingProject.id, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          clientId: formClientId || null,
          status: formStatus,
          priority: formPriority,
          startDate: formStartDate || null,
          dueDate: formDueDate || null,
          ownerId: formOwnerId || null,
        })
        toast({ title: "Project updated" })
      } else {
        await createProject({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          clientId: formClientId || null,
          status: formStatus,
          priority: formPriority,
          startDate: formStartDate || null,
          dueDate: formDueDate || null,
          ownerId: formOwnerId || null,
        })
        toast({ title: "Project created" })
      }
      setShowCreateModal(false)
      resetForm()
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (project: Project) => {
    setProjectToDelete(project.id)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return
    try {
      await deleteProject(projectToDelete)
      setDetailProject(null)
      toast({ title: "Project deleted" })
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    } finally {
      setProjectToDelete(null)
    }
  }

  const handleStatusChange = async (project: Project, status: Project["status"]) => {
    try {
      await updateProject(project.id, { status })
      toast({ title: `Project marked as ${status}` })
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    }
  }

  // Project member management
  const loadProjectMembers = useCallback(async (projectId: string) => {
    setIsLoadingMembers(true)
    try {
      const res = await fetch(`/api/projects/members?projectId=${projectId}`)
      const data = await res.json()
      if (data.success) setProjectMembers(data.data || [])
      else setProjectMembers([])
    } catch {
      setProjectMembers([])
    } finally {
      setIsLoadingMembers(false)
    }
  }, [])

  useEffect(() => {
    if (detailProject) {
      loadProjectMembers(detailProject.id)
    } else {
      setProjectMembers([])
      setAddMemberUserId("")
    }
  }, [detailProject?.id, loadProjectMembers])

  const addProjectMember = async (projectId: string, userId: string, role: string = "member") => {
    try {
      const res = await fetch("/api/projects/members", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ projectId, userId, role }),
      })
      const data = await res.json()
      if (data.success) {
        await loadProjectMembers(projectId)
        setAddMemberUserId("")
        toast({ title: "Member added" })
      } else {
        toast({ title: "Error", description: data.error || "Failed to add member", variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    }
  }

  const updateMemberRole = async (projectId: string, userId: string, role: string) => {
    try {
      const res = await fetch("/api/projects/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ projectId, userId, role }),
      })
      const data = await res.json()
      if (data.success) {
        await loadProjectMembers(projectId)
        toast({ title: "Role updated" })
      } else {
        toast({ title: "Error", description: data.error || "Failed to update role", variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    }
  }

  const removeProjectMember = async (projectId: string, userId: string) => {
    try {
      const res = await fetch(`/api/projects/members?projectId=${projectId}&userId=${userId}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      const data = await res.json()
      if (data.success) {
        await loadProjectMembers(projectId)
        toast({ title: "Member removed" })
      } else {
        toast({ title: "Error", description: data.error || "Failed to remove member", variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    }
  }

  // Get project tasks/rocks for detail view
  const projectTasks = detailProject ? assignedTasks.filter(t => t.projectId === detailProject.id) : []
  const projectRocks = detailProject ? rocks.filter(r => r.projectId === detailProject.id) : []

  // Auto-progress calculation from linked tasks
  const autoProgress = projectTasks.length > 0
    ? Math.round((projectTasks.filter(t => t.status === "completed").length / projectTasks.length) * 100)
    : 0

  // Team members not already in the project (for add member dropdown)
  const availableMembers = teamMembers.filter(
    m => m.userId && m.status === "active" && !projectMembers.some(pm => pm.userId === m.userId)
  )

  return (
    <FeatureGate feature="core.projects">
      <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
        <NoWorkspaceAlert />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground">
              {activeCount} active, {planningCount} planning, {completedCount} completed
            </p>
          </div>
          <Button onClick={openCreateModal} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Project
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="dueDate-asc">Due Date (Earliest)</SelectItem>
              <SelectItem value="dueDate-desc">Due Date (Latest)</SelectItem>
              <SelectItem value="progress-asc">Progress (Low-High)</SelectItem>
              <SelectItem value="progress-desc">Progress (High-Low)</SelectItem>
              <SelectItem value="priority-desc">Priority (High-Low)</SelectItem>
              <SelectItem value="createdAt-desc">Newest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Projects List */}
        {filteredProjects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-12 w-12 text-muted-foreground" />}
            title="No projects found"
            description={projects.length === 0 ? "Create your first project to get started." : "Try adjusting your filters."}
            action={projects.length === 0 ? { label: "Create Project", onClick: openCreateModal } : undefined}
          />
        ) : (
          <div className="grid gap-3">
            {filteredProjects.map(project => {
              const client = clients.find(c => c.id === project.clientId)
              const owner = teamMembers.find(m => m.userId === project.ownerId)
              return (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setDetailProject(project)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{project.name}</h3>
                          <Badge variant="outline" style={getStatusStyle(project.status)}>
                            {project.status}
                          </Badge>
                          <Badge variant="outline" style={getPriorityStyle(project.priority)}>
                            {project.priority}
                          </Badge>
                        </div>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{project.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {client && (
                            <span className="flex items-center gap-1">
                              Client: {client.name}
                            </span>
                          )}
                          {owner && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {owner.name}
                            </span>
                          )}
                          {project.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {formatDate(project.dueDate)}
                            </span>
                          )}
                          {project.taskCount !== undefined && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> {project.completedTaskCount ?? 0}/{project.taskCount} tasks
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24">
                          <Progress value={project.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground text-center mt-0.5">{project.progress}%</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 touch-target" aria-label="Project actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditModal(project) }}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            {project.status !== "completed" && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(project, "completed") }}>
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Complete
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleDelete(project) }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingProject ? "Edit Project" : "New Project"}</DialogTitle>
              <DialogDescription>
                {editingProject ? "Update project details." : "Create a new project to track work."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <div className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Project name" maxLength={200} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Brief description" rows={2} maxLength={1000} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Client</Label>
                    <Select value={formClientId || "none"} onValueChange={(v) => setFormClientId(v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="No client" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {clients.filter(c => c.status === "active").map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Owner</Label>
                    <Select value={formOwnerId || "none"} onValueChange={(v) => setFormOwnerId(v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {teamMembers.filter(m => m.status === "active" && m.userId).map(m => (
                          <SelectItem key={m.userId!} value={m.userId!}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={formStatus} onValueChange={(v) => setFormStatus(v as Project["status"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={formPriority} onValueChange={(v) => setFormPriority(v as Project["priority"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" disabled={!formName.trim() || isSubmitting}>
                  {isSubmitting ? "Saving..." : editingProject ? "Save Changes" : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project?</AlertDialogTitle>
              <AlertDialogDescription>
                {(() => {
                  const project = projects.find(p => p.id === projectToDelete)
                  if (!project) return "This action cannot be undone."
                  return `This will permanently delete "${project.name}". Linked tasks and rocks will be unlinked. This action cannot be undone.`
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={confirmDeleteProject}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Detail Sheet */}
        <Sheet open={!!detailProject} onOpenChange={(open) => !open && setDetailProject(null)}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto px-6">
            {detailProject && (
              <>
                <SheetHeader className="px-0">
                  <SheetTitle>{detailProject.name}</SheetTitle>
                </SheetHeader>
                <div className="space-y-5 pb-6">
                  <div className="flex gap-2">
                    <Badge variant="outline" style={getStatusStyle(detailProject.status)}>{detailProject.status}</Badge>
                    <Badge variant="outline" style={getPriorityStyle(detailProject.priority)}>{detailProject.priority}</Badge>
                  </div>
                  {detailProject.description && (
                    <p className="text-sm text-muted-foreground">{detailProject.description}</p>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium">Progress</h4>
                      {projectTasks.length > 0 && autoProgress !== detailProject.progress && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => updateProject(detailProject.id, { progress: autoProgress })}
                        >
                          <RefreshCw className="h-3 w-3" />
                          Sync from Tasks
                        </Button>
                      )}
                    </div>
                    <Progress value={detailProject.progress} className="h-2" />
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground">Manual: {detailProject.progress}%</p>
                      {projectTasks.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Task-based: {autoProgress}% ({projectTasks.filter(t => t.status === "completed").length}/{projectTasks.length})
                        </p>
                      )}
                    </div>
                  </div>
                  {detailProject.clientName && (
                    <div>
                      <h4 className="text-sm font-medium">Client</h4>
                      <p className="text-sm text-muted-foreground">{detailProject.clientName}</p>
                    </div>
                  )}
                  {detailProject.ownerName && (
                    <div>
                      <h4 className="text-sm font-medium">Owner</h4>
                      <p className="text-sm text-muted-foreground">{detailProject.ownerName}</p>
                    </div>
                  )}
                  {(detailProject.startDate || detailProject.dueDate) && (
                    <div className="flex gap-4">
                      {detailProject.startDate && (
                        <div>
                          <h4 className="text-sm font-medium">Start</h4>
                          <p className="text-sm text-muted-foreground">{formatDate(detailProject.startDate)}</p>
                        </div>
                      )}
                      {detailProject.dueDate && (
                        <div>
                          <h4 className="text-sm font-medium">Due</h4>
                          <p className="text-sm text-muted-foreground">{formatDate(detailProject.dueDate)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Members Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">Team Members ({projectMembers.length})</h4>
                    </div>
                    {isLoadingMembers ? (
                      <p className="text-xs text-muted-foreground">Loading members...</p>
                    ) : (
                      <>
                        {projectMembers.length > 0 ? (
                          <div className="space-y-1">
                            {projectMembers.map(member => (
                              <div key={member.id} className="flex items-center justify-between py-1.5">
                                <span className="text-sm">{member.userName || member.userEmail || member.userId}</span>
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={member.role}
                                    onValueChange={(newRole) => updateMemberRole(detailProject.id, member.userId, newRole)}
                                  >
                                    <SelectTrigger className="h-6 w-[90px] text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="owner">Owner</SelectItem>
                                      <SelectItem value="lead">Lead</SelectItem>
                                      <SelectItem value="member">Member</SelectItem>
                                      <SelectItem value="viewer">Viewer</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 touch-target"
                                    onClick={() => removeProjectMember(detailProject.id, member.userId)}
                                    aria-label="Remove member"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mb-2">No members assigned yet.</p>
                        )}
                        {/* Add member */}
                        {availableMembers.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <Select value={addMemberUserId} onValueChange={setAddMemberUserId}>
                              <SelectTrigger className="h-8 flex-1 text-xs">
                                <SelectValue placeholder="Add a member..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableMembers.map(m => (
                                  <SelectItem key={m.userId!} value={m.userId!}>{m.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              disabled={!addMemberUserId}
                              onClick={() => addMemberUserId && addProjectMember(detailProject.id, addMemberUserId)}
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Linked Tasks */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">Linked Tasks ({projectTasks.length})</h4>
                      {projectTasks.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-6 w-6 ${tasksView === "list" ? "bg-accent" : ""}`}
                            onClick={() => setTasksView("list")}
                            aria-label="List view"
                          >
                            <LayoutList className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-6 w-6 ${tasksView === "kanban" ? "bg-accent" : ""}`}
                            onClick={() => setTasksView("kanban")}
                            aria-label="Kanban view"
                          >
                            <Kanban className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {tasksView === "kanban" ? (
                      <ProjectKanbanBoard
                        projectId={detailProject.id}
                        tasks={projectTasks}
                        onTaskStatusChange={(taskId, newStatus) => updateTask(taskId, { status: newStatus })}
                      />
                    ) : projectTasks.length > 0 ? (
                      <div className="space-y-1">
                        {projectTasks.map(task => (
                          <div key={task.id} className="flex items-center gap-2 text-sm py-1">
                            <CheckCircle2 className={`h-3.5 w-3.5 ${task.status === "completed" ? "text-green-500" : "text-muted-foreground"}`} />
                            <span className={task.status === "completed" ? "line-through text-muted-foreground" : ""}>{task.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No tasks linked to this project yet.</p>
                    )}
                  </div>

                  {/* Linked Rocks */}
                  {projectRocks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Linked Rocks ({projectRocks.length})</h4>
                      <div className="space-y-1">
                        {projectRocks.map(rock => (
                          <div key={rock.id} className="flex items-center gap-2 text-sm py-1">
                            <span>{rock.title}</span>
                            <Badge variant="outline" className="text-xs">{rock.progress}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => { setDetailProject(null); openEditModal(detailProject) }}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(detailProject)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </FeatureGate>
  )
}
