"use client"

import { FeatureGate } from "@/components/shared/feature-gate"
import { useState, useMemo, useCallback } from "react"
import type { Client, Project, TeamMember } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Building2, MoreHorizontal, Pencil, Trash2, Mail, Phone, Globe, FolderKanban, Copy, ExternalLink, RefreshCcw, ChevronDown, ChevronUp } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/utils"
import { useBrandStatusStyles } from "@/lib/hooks/use-brand-status-styles"
import { NoWorkspaceAlert } from "@/components/shared/no-workspace-alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { api } from "@/lib/api/client"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { useApp } from "@/lib/contexts/app-context"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://trytaskspace.com"

interface ClientsPageProps {
  currentUser: TeamMember
  clients: Client[]
  projects: Project[]
  members?: TeamMember[]
  createClient: (client: Partial<Client>) => Promise<Client>
  updateClient: (id: string, updates: Partial<Client>) => Promise<Client>
  deleteClient: (id: string) => Promise<void>
}


export function ClientsPage({
  currentUser,
  clients,
  projects,
  members = [],
  createClient,
  updateClient,
  deleteClient,
}: ClientsPageProps) {
  const isAdmin = currentUser.role === "admin" || currentUser.role === "owner"
  const { isFeatureEnabled } = useWorkspaces()
  const { currentOrganization } = useApp()
  const orgSlug = currentOrganization?.slug ?? ""
  const { toast } = useToast()
  const { getStatusStyle } = useBrandStatusStyles()

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("name-asc")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [detailClient, setDetailClient] = useState<Client | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<string | null>(null)

  // Portal state
  const [portalSectionOpen, setPortalSectionOpen] = useState<string | null>(null) // clientId
  const [portalSaving, setPortalSaving] = useState(false)
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [localClients, setLocalClients] = useState<Record<string, Client>>({})

  // Helper to get latest client data (local overrides prop)
  const getClient = useCallback((id: string) => localClients[id] ?? clients.find(c => c.id === id) ?? null, [localClients, clients])

  const handlePortalToggle = async (client: Client, enabled: boolean) => {
    setPortalSaving(true)
    try {
      const updated = await api.clients.updatePortal(client.id, { portalEnabled: enabled })
      setLocalClients(prev => ({ ...prev, [client.id]: updated }))
      if (detailClient?.id === client.id) setDetailClient(updated)
      toast({ title: enabled ? "Portal enabled" : "Portal disabled" })
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    } finally {
      setPortalSaving(false)
    }
  }

  const handleMemberFilterChange = async (client: Client, userId: string, checked: boolean) => {
    const currentFilter = (getClient(client.id) ?? client).portalMemberFilter
    let newFilter: string[] | null
    if (checked) {
      newFilter = currentFilter ? [...currentFilter, userId] : [userId]
    } else {
      newFilter = currentFilter ? currentFilter.filter(id => id !== userId) : null
      if (newFilter && newFilter.length === 0) newFilter = null
    }
    try {
      const updated = await api.clients.updatePortal(client.id, { portalMemberFilter: newFilter })
      setLocalClients(prev => ({ ...prev, [client.id]: updated }))
      if (detailClient?.id === client.id) setDetailClient(updated)
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    }
  }

  const handleRegenerateToken = async (client: Client) => {
    setPortalSaving(true)
    try {
      const updated = await api.clients.updatePortal(client.id, { regenerateToken: true })
      setLocalClients(prev => ({ ...prev, [client.id]: updated }))
      if (detailClient?.id === client.id) setDetailClient(updated)
      toast({ title: "Portal link regenerated" })
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    } finally {
      setPortalSaving(false)
      setShowRegenerateDialog(false)
    }
  }

  const copyPortalUrl = (client: Client) => {
    if (!client.portalToken) return
    const url = `${APP_URL}/client/${orgSlug}/${client.portalToken}`
    navigator.clipboard.writeText(url)
    toast({ title: "Portal URL copied" })
  }

  const getPortalUrl = (token: string) =>
    `${APP_URL}/client/${orgSlug}/${token}`

  // Form state
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formContactName, setFormContactName] = useState("")
  const [formContactEmail, setFormContactEmail] = useState("")
  const [formContactPhone, setFormContactPhone] = useState("")
  const [formWebsite, setFormWebsite] = useState("")
  const [formIndustry, setFormIndustry] = useState("")
  const [formStatus, setFormStatus] = useState<Client["status"]>("active")
  const [formNotes, setFormNotes] = useState("")

  // Filtered and sorted clients
  const filteredClients = useMemo(() => {
    const filtered = clients.filter(c => {
      const matchesSearch = !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || c.status === statusFilter
      return matchesSearch && matchesStatus
    })

    const sorted = [...filtered]
    const [sortField, sortDir] = sortBy.split("-") as [string, string]
    sorted.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "status":
          comparison = (a.status || "").localeCompare(b.status || "")
          break
        case "industry":
          comparison = (a.industry || "").localeCompare(b.industry || "")
          break
        case "createdAt":
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
          break
        case "projects":
          comparison = (a.projectCount ?? 0) - (b.projectCount ?? 0)
          break
      }
      return sortDir === "desc" ? -comparison : comparison
    })
    return sorted
  }, [clients, searchQuery, statusFilter, sortBy])

  // Stats
  const activeCount = clients.filter(c => c.status === "active").length
  const prospectCount = clients.filter(c => c.status === "prospect").length

  const resetForm = () => {
    setFormName("")
    setFormDescription("")
    setFormContactName("")
    setFormContactEmail("")
    setFormContactPhone("")
    setFormWebsite("")
    setFormIndustry("")
    setFormStatus("active")
    setFormNotes("")
  }

  const openCreateModal = () => {
    resetForm()
    setEditingClient(null)
    setShowCreateModal(true)
  }

  const openEditModal = (client: Client) => {
    setFormName(client.name)
    setFormDescription(client.description || "")
    setFormContactName(client.contactName || "")
    setFormContactEmail(client.contactEmail || "")
    setFormContactPhone(client.contactPhone || "")
    setFormWebsite(client.website || "")
    setFormIndustry(client.industry || "")
    setFormStatus(client.status)
    setFormNotes(client.notes || "")
    setEditingClient(client)
    setShowCreateModal(true)
  }

  const handleSubmit = async () => {
    if (!formName.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      if (editingClient) {
        await updateClient(editingClient.id, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          contactName: formContactName.trim() || undefined,
          contactEmail: formContactEmail.trim() || undefined,
          contactPhone: formContactPhone.trim() || undefined,
          website: formWebsite.trim() || undefined,
          industry: formIndustry.trim() || undefined,
          status: formStatus,
          notes: formNotes.trim() || undefined,
        })
        toast({ title: "Client updated" })
      } else {
        await createClient({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          contactName: formContactName.trim() || undefined,
          contactEmail: formContactEmail.trim() || undefined,
          contactPhone: formContactPhone.trim() || undefined,
          website: formWebsite.trim() || undefined,
          industry: formIndustry.trim() || undefined,
          status: formStatus,
          notes: formNotes.trim() || undefined,
        })
        toast({ title: "Client created" })
      }
      setShowCreateModal(false)
      resetForm()
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (client: Client) => {
    setClientToDelete(client.id)
  }

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return
    try {
      await deleteClient(clientToDelete)
      setDetailClient(null)
      toast({ title: "Client deleted" })
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    } finally {
      setClientToDelete(null)
    }
  }

  // Get client projects for detail view
  const clientProjects = detailClient ? projects.filter(p => p.clientId === detailClient.id) : []

  return (
    <FeatureGate feature="core.clients">
      <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
        <NoWorkspaceAlert />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
            <p className="text-sm text-muted-foreground">
              {activeCount} active, {prospectCount} prospects
            </p>
          </div>
          <Button onClick={openCreateModal} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Client
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="status-asc">Status</SelectItem>
              <SelectItem value="industry-asc">Industry</SelectItem>
              <SelectItem value="createdAt-desc">Newest First</SelectItem>
              <SelectItem value="createdAt-asc">Oldest First</SelectItem>
              <SelectItem value="projects-desc">Most Projects</SelectItem>
              <SelectItem value="projects-asc">Fewest Projects</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clients List */}
        {filteredClients.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-12 w-12 text-muted-foreground" />}
            title="No clients found"
            description={clients.length === 0 ? "Add your first client to get started." : "Try adjusting your filters."}
            action={clients.length === 0 ? { label: "Add Client", onClick: openCreateModal } : undefined}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map(client => (
              <Card
                key={client.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setDetailClient(client)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{client.name}</h3>
                        <Badge variant="outline" style={getStatusStyle(client.status)}>
                          {client.status}
                        </Badge>
                      </div>
                      {client.industry && (
                        <p className="text-xs text-muted-foreground mt-0.5">{client.industry}</p>
                      )}
                      {client.contactName && (
                        <p className="text-sm mt-2">{client.contactName}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {client.contactEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {client.contactEmail}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <FolderKanban className="h-3 w-3" />
                        <span>{client.projectCount ?? 0} projects ({client.activeProjectCount ?? 0} active)</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 touch-target" aria-label="Client actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditModal(client) }}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDelete(client) }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        <Dialog open={showCreateModal} onOpenChange={(open) => { setShowCreateModal(open); if (!open) { resetForm(); setEditingClient(null) } }}>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Edit Client" : "New Client"}</DialogTitle>
              <DialogDescription>
                {editingClient ? "Update client details." : "Add a new client to your workspace."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <div className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Client name" maxLength={200} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Brief description" rows={2} maxLength={1000} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Contact Name</Label>
                    <Input value={formContactName} onChange={(e) => setFormContactName(e.target.value)} placeholder="John Doe" />
                  </div>
                  <div>
                    <Label>Contact Email</Label>
                    <Input type="email" value={formContactEmail} onChange={(e) => setFormContactEmail(e.target.value)} placeholder="john@example.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Phone</Label>
                    <Input value={formContactPhone} onChange={(e) => setFormContactPhone(e.target.value)} placeholder="(555) 123-4567" />
                  </div>
                  <div>
                    <Label>Industry</Label>
                    <Input value={formIndustry} onChange={(e) => setFormIndustry(e.target.value)} placeholder="Real Estate" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Website</Label>
                    <Input value={formWebsite} onChange={(e) => setFormWebsite(e.target.value)} placeholder="https://example.com" />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formStatus} onValueChange={(v) => setFormStatus(v as Client["status"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" disabled={!formName.trim() || isSubmitting}>
                  {isSubmitting ? "Saving..." : editingClient ? "Save Changes" : "Add Client"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Client?</AlertDialogTitle>
              <AlertDialogDescription>
                {(() => {
                  const client = clients.find(c => c.id === clientToDelete)
                  const linkedProjects = projects.filter(p => p.clientId === clientToDelete)
                  if (!client) return "This action cannot be undone."
                  return linkedProjects.length > 0
                    ? `This will permanently delete "${client.name}". ${linkedProjects.length} project(s) will be unlinked. This action cannot be undone.`
                    : `This will permanently delete "${client.name}". This action cannot be undone.`
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={confirmDeleteClient}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Detail Sheet */}
        <Sheet open={!!detailClient} onOpenChange={(open) => !open && setDetailClient(null)}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            {detailClient && (
              <>
                <SheetHeader>
                  <SheetTitle>{detailClient.name}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="flex gap-2">
                    <Badge variant="outline" style={getStatusStyle(detailClient.status)}>{detailClient.status}</Badge>
                    {detailClient.industry && <Badge variant="outline">{detailClient.industry}</Badge>}
                  </div>
                  {detailClient.description && (
                    <p className="text-sm text-muted-foreground">{detailClient.description}</p>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Contact Information</h4>
                    {detailClient.contactName && (
                      <p className="text-sm">{detailClient.contactName}</p>
                    )}
                    {detailClient.contactEmail && (
                      <p className="text-sm flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <a href={`mailto:${detailClient.contactEmail}`} className="text-primary hover:underline">{detailClient.contactEmail}</a>
                      </p>
                    )}
                    {detailClient.contactPhone && (
                      <p className="text-sm flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {detailClient.contactPhone}
                      </p>
                    )}
                    {detailClient.website && /^https?:\/\//i.test(detailClient.website) && (
                      <p className="text-sm flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <a href={detailClient.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{detailClient.website}</a>
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  {detailClient.notes && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Notes</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detailClient.notes}</p>
                    </div>
                  )}

                  {/* Linked Projects */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Projects ({clientProjects.length})</h4>
                    {clientProjects.length > 0 ? (
                      <div className="space-y-2">
                        {clientProjects.map(project => (
                          <div key={project.id} className="flex items-center justify-between text-sm px-3 py-2.5 rounded-md bg-muted/50">
                            <span>{project.name}</span>
                            <Badge variant="outline" className="text-xs">{project.status}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No projects linked to this client.</p>
                    )}
                  </div>

                  {/* Client Portal — admin only, feature must be enabled */}
                  {isAdmin && isFeatureEnabled("advanced.clientPortal") && (() => {
                    const c = getClient(detailClient.id) ?? detailClient
                    const portalOpen = portalSectionOpen === c.id
                    const portalUrl = c.portalToken ? getPortalUrl(c.portalToken) : null
                    const memberFilter = c.portalMemberFilter
                    return (
                      <div className="border rounded-md overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
                          onClick={() => setPortalSectionOpen(portalOpen ? null : c.id)}
                        >
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Client Portal</span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${c.portalEnabled ? "border-emerald-500/50 text-emerald-600" : "border-slate-400/50 text-slate-500"}`}
                            >
                              {c.portalEnabled ? "Active" : "Off"}
                            </Badge>
                          </div>
                          {portalOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>

                        {portalOpen && (
                          <div className="px-4 pb-4 space-y-4 border-t">
                            {/* Enable toggle */}
                            <div className="flex items-center justify-between pt-3">
                              <Label htmlFor={`portal-toggle-${c.id}`} className="text-sm cursor-pointer">
                                Enable Client Portal
                              </Label>
                              <Switch
                                id={`portal-toggle-${c.id}`}
                                checked={c.portalEnabled}
                                onCheckedChange={(checked) => handlePortalToggle(c, checked)}
                                disabled={portalSaving}
                              />
                            </div>

                            {/* Portal URL */}
                            {portalUrl && c.portalEnabled && (
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Portal URL</Label>
                                <div className="flex gap-1.5">
                                  <Input
                                    readOnly
                                    value={portalUrl}
                                    className="text-xs h-8 font-mono bg-muted/50 flex-1"
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => copyPortalUrl(c)}
                                    title="Copy URL"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => window.open(portalUrl, "_blank")}
                                    title="Open portal"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Visible members */}
                            {members.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">
                                  Visible team members
                                  <span className="ml-1 text-muted-foreground/70">(all = none selected)</span>
                                </Label>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                  {members.filter(m => m.userId).map(member => (
                                    <div key={member.id} className="flex items-center gap-2">
                                      <Checkbox
                                        id={`member-${c.id}-${member.id}`}
                                        checked={memberFilter ? memberFilter.includes(member.userId!) : false}
                                        onCheckedChange={(checked) =>
                                          handleMemberFilterChange(c, member.userId!, checked === true)
                                        }
                                      />
                                      <label
                                        htmlFor={`member-${c.id}-${member.id}`}
                                        className="text-sm cursor-pointer"
                                      >
                                        {member.name}
                                        <span className="ml-1.5 text-xs text-muted-foreground capitalize">{member.role}</span>
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Regenerate link */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-xs"
                              onClick={() => setShowRegenerateDialog(true)}
                              disabled={portalSaving}
                            >
                              <RefreshCcw className="h-3 w-3 mr-1.5" />
                              Regenerate Link
                            </Button>

                            {/* Regenerate confirmation */}
                            <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Regenerate Portal Link?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    The old link will stop working immediately. Anyone using it will see &quot;Portal Unavailable.&quot; You&apos;ll need to share the new URL.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRegenerateToken(c)}>
                                    Regenerate
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => { setDetailClient(null); openEditModal(detailClient) }}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(detailClient)}>
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
