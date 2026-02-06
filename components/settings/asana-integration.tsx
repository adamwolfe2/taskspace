"use client"

import React, { useState, useEffect } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Users,
  ArrowRightLeft,
  Settings2,
} from "lucide-react"
import { IntegrationLogo } from "@/components/ui/integration-logo"
import { useToast } from "@/hooks/use-toast"
import type { TeamMember, AsanaUserMapping } from "@/lib/types"

interface AsanaUser {
  gid: string
  name: string
  email: string
}

interface AsanaProject {
  gid: string
  name: string
}

interface AsanaWorkspace {
  gid: string
  name: string
}

interface AsanaStatus {
  connected: boolean
  configured: boolean
  user?: AsanaUser
  workspaces?: AsanaWorkspace[]
  message?: string
}

interface AsanaIntegrationProps {
  teamMembers: TeamMember[]
}

export function AsanaIntegration({ teamMembers }: AsanaIntegrationProps) {
  const { currentOrganization, setCurrentOrganization } = useApp()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [asanaStatus, setAsanaStatus] = useState<AsanaStatus | null>(null)
  const [projects, setProjects] = useState<AsanaProject[]>([])
  const [asanaUsers, setAsanaUsers] = useState<AsanaUser[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("")
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [userMappings, setUserMappings] = useState<AsanaUserMapping[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load initial Asana status
  useEffect(() => {
    checkAsanaStatus()
  }, [])

  // Load saved settings from organization
  useEffect(() => {
    if (currentOrganization?.settings?.asanaIntegration) {
      const config = currentOrganization.settings.asanaIntegration
      setIsEnabled(config.enabled)
      setSelectedWorkspace(config.workspaceGid)
      setSelectedProject(config.projectGid)
      setUserMappings(config.userMappings || [])
    }
  }, [currentOrganization])

  // Load projects when workspace changes
  useEffect(() => {
    if (selectedWorkspace) {
      loadProjects(selectedWorkspace)
      loadAsanaUsers(selectedWorkspace)
    }
  }, [selectedWorkspace])

  const checkAsanaStatus = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/asana/status")
      const data = await response.json()
      setAsanaStatus(data)

      if (data.connected && data.workspaces?.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(data.workspaces[0].gid)
      }
    } catch (error) {
      console.error("Failed to check Asana status:", error)
      setAsanaStatus({ connected: false, configured: false })
    } finally {
      setIsLoading(false)
    }
  }

  const loadProjects = async (workspaceGid: string) => {
    try {
      const response = await fetch(`/api/asana/projects?workspace=${workspaceGid}`)
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error("Failed to load projects:", error)
    }
  }

  const loadAsanaUsers = async (workspaceGid: string) => {
    try {
      const response = await fetch(`/api/asana/users?workspace=${workspaceGid}`)
      const data = await response.json()
      setAsanaUsers(data.users || [])
    } catch (error) {
      console.error("Failed to load Asana users:", error)
    }
  }

  const handleUserMapping = (aimsUserId: string, asanaUserGid: string) => {
    const aimsUser = teamMembers.find(m => m.id === aimsUserId)
    const asanaUser = asanaUsers.find(u => u.gid === asanaUserGid)

    if (!aimsUser || !asanaUser) return

    setUserMappings(prev => {
      const existing = prev.findIndex(m => m.aimsUserId === aimsUserId)
      const newMapping: AsanaUserMapping = {
        aimsUserId: aimsUser.id,
        aimsUserEmail: aimsUser.email,
        aimsUserName: aimsUser.name,
        asanaUserGid: asanaUser.gid,
        asanaUserEmail: asanaUser.email,
        asanaUserName: asanaUser.name,
      }

      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = newMapping
        return updated
      }
      return [...prev, newMapping]
    })
  }

  const removeUserMapping = (aimsUserId: string) => {
    setUserMappings(prev => prev.filter(m => m.aimsUserId !== aimsUserId))
  }

  const saveSettings = async () => {
    if (!currentOrganization) return

    setIsSaving(true)
    try {
      const selectedProjectData = projects.find(p => p.gid === selectedProject)
      const selectedWorkspaceData = asanaStatus?.workspaces?.find(w => w.gid === selectedWorkspace)

      const response = await fetch("/api/organizations/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asanaIntegration: {
            enabled: isEnabled,
            projectGid: selectedProject,
            projectName: selectedProjectData?.name || "",
            workspaceGid: selectedWorkspace,
            workspaceName: selectedWorkspaceData?.name || "",
            userMappings,
            syncTasks: true,
            syncRocks: true,
            lastSyncAt: currentOrganization.settings?.asanaIntegration?.lastSyncAt || null,
          },
        }),
      })

      if (!response.ok) throw new Error("Failed to save settings")

      const data = await response.json()
      setCurrentOrganization(data.organization)

      toast({
        title: "Settings saved",
        description: "Asana integration settings have been updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save Asana settings.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const triggerSync = async (direction: "to_asana" | "from_asana" | "both" = "both") => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/asana/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Sync failed")

      toast({
        title: "Sync complete",
        description: `Created ${data.result.tasksCreatedInAsana} in Asana, ${data.result.tasksCreatedInAims} in Taskspace. Updated ${data.result.tasksUpdatedInAsana + data.result.tasksUpdatedInAims} tasks.`,
      })

    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync with Asana",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IntegrationLogo integration="asana" size="md" />
          Asana Integration
        </CardTitle>
        <CardDescription>
          Two-way sync tasks between Taskspace and Asana for your team members
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className={`flex items-center gap-3 p-4 rounded-lg ${
          asanaStatus?.connected
            ? 'bg-green-50 border border-green-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          {asanaStatus?.connected ? (
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          ) : (
            <XCircle className="h-6 w-6 text-amber-600" />
          )}
          <div className="flex-1">
            <p className={`font-medium ${asanaStatus?.connected ? 'text-green-800' : 'text-amber-800'}`}>
              {asanaStatus?.connected
                ? `Connected as ${asanaStatus.user?.name}`
                : 'Asana not connected'}
            </p>
            <p className={`text-sm ${asanaStatus?.connected ? 'text-green-600' : 'text-amber-600'}`}>
              {asanaStatus?.connected
                ? asanaStatus.user?.email
                : asanaStatus?.message || 'Add ASANA_ACCESS_TOKEN to environment variables'}
            </p>
          </div>
          {asanaStatus?.connected && (
            <Badge className="bg-green-500">Connected</Badge>
          )}
          <Button size="sm" variant="outline" onClick={checkAsanaStatus}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {asanaStatus?.connected && (
          <>
            <Separator />

            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Asana Sync</Label>
                <p className="text-sm text-muted-foreground">
                  Sync tasks between Taskspace and Asana
                </p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
              />
            </div>

            {isEnabled && (
              <>
                <Separator />

                {/* Workspace Selection */}
                <div className="space-y-2">
                  <Label>Asana Workspace</Label>
                  <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      {asanaStatus.workspaces?.map((ws) => (
                        <SelectItem key={ws.gid} value={ws.gid}>
                          {ws.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Project Selection */}
                <div className="space-y-2">
                  <Label>Asana Project</Label>
                  <p className="text-xs text-muted-foreground">
                    Tasks will sync to/from this project
                  </p>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.gid} value={project.gid}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* User Mappings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <Label>User Mappings</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Map Taskspace team members to their Asana accounts. Only mapped users will have tasks synced.
                  </p>

                  <div className="space-y-3">
                    {teamMembers.filter(m => m.status === 'active').map((member) => {
                      const currentMapping = userMappings.find(m => m.aimsUserId === member.id)

                      return (
                        <div key={member.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                          <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <Select
                              value={currentMapping?.asanaUserGid || ""}
                              onValueChange={(value) => {
                                if (value === "none") {
                                  removeUserMapping(member.id)
                                } else {
                                  handleUserMapping(member.id, value)
                                }
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Asana user" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  <span className="text-muted-foreground">Not mapped</span>
                                </SelectItem>
                                {asanaUsers.map((user) => (
                                  <SelectItem key={user.gid} value={user.gid}>
                                    {user.name} ({user.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {userMappings.length > 0 && (
                    <p className="text-sm text-green-600">
                      {userMappings.length} user(s) mapped
                    </p>
                  )}
                </div>

                <Separator />

                {/* Save & Sync Actions */}
                <div className="flex flex-wrap gap-3">
                  <Button onClick={saveSettings} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Settings2 className="mr-2 h-4 w-4" />
                        Save Settings
                      </>
                    )}
                  </Button>

                  {currentOrganization?.settings?.asanaIntegration?.enabled && (
                    <Button
                      variant="outline"
                      onClick={() => triggerSync("both")}
                      disabled={isSyncing || userMappings.length === 0}
                    >
                      {isSyncing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Sync Now
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {currentOrganization?.settings?.asanaIntegration?.lastSyncAt && (
                  <p className="text-xs text-muted-foreground">
                    Last synced: {new Date(currentOrganization.settings.asanaIntegration.lastSyncAt).toLocaleString()}
                  </p>
                )}
              </>
            )}
          </>
        )}

        {!asanaStatus?.connected && (
          <div className="space-y-3">
            <Separator />
            <h4 className="font-medium">Setup Instructions</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Go to <a href="https://app.asana.com/0/my-apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">Asana Developer Console</a></li>
              <li>Create a Personal Access Token</li>
              <li>Add these environment variables to Vercel:</li>
            </ol>
            <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono">
{`ASANA_ACCESS_TOKEN=your_personal_access_token
ASANA_DEFAULT_PROJECT_ID=1210828318029713`}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
