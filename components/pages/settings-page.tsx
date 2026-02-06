"use client"

import React, { useState, useEffect } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import { Building, Bell, Users, CreditCard, Key, Download, Sparkles, Briefcase, Sliders } from "lucide-react"
import { api } from "@/lib/api/client"
import type { TeamMember } from "@/lib/types"
import { WorkspaceSwitcher } from "@/components/workspace"
import {
  OrganizationSettingsTab,
  TeamManagementTab,
  WorkspaceSettingsTab,
  NotificationsTab,
  IntegrationsApiTab,
  DataExportTab,
  BillingSettings,
} from "@/components/settings"
import { WorkspaceFeaturesTab } from "@/components/settings/workspace-features-tab"
import { AIInbox } from "@/components/ai/ai-inbox"
import { AIBudgetControls } from "@/components/ai/ai-budget-controls"

export function SettingsPage() {
  const { currentUser, currentOrganization } = useApp()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  const isOwner = currentUser?.role === "owner"
  const isAdmin = currentUser?.role === "admin" || isOwner

  // Load team members
  useEffect(() => {
    const loadTeamData = async () => {
      try {
        const members = await api.members.list()
        setTeamMembers(members)
      } catch (err) {
        console.error("Failed to load team data:", err)
      }
    }
    loadTeamData()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your organization settings and preferences</p>
        </div>
        <WorkspaceSwitcher className="w-full sm:w-auto" />
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        {/* Scrollable tabs container for mobile */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex min-w-max bg-gray-100/80">
            <TabsTrigger value="general" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
              <Building className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              General
            </TabsTrigger>

            {isAdmin && (
              <TabsTrigger value="workspace" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Workspace
              </TabsTrigger>
            )}

            {isAdmin && (
              <TabsTrigger value="features" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <Sliders className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Features
              </TabsTrigger>
            )}

            {isAdmin && (
              <TabsTrigger value="team" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Team
              </TabsTrigger>
            )}

            <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Alerts</span>
            </TabsTrigger>

            {isAdmin && (
              <TabsTrigger value="integrations" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Integrations</span>
                <span className="sm:hidden">Integ.</span>
              </TabsTrigger>
            )}

            {isAdmin && (
              <TabsTrigger value="ai" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">AI Command Center</span>
                <span className="sm:hidden">AI</span>
              </TabsTrigger>
            )}

            {isAdmin && (
              <TabsTrigger value="data" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Data & Export</span>
                <span className="sm:hidden">Export</span>
              </TabsTrigger>
            )}

            {isOwner && (
              <TabsTrigger value="billing" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Billing
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* General Tab - Organization details + branding */}
        <TabsContent value="general" className="space-y-6">
          <OrganizationSettingsTab />
        </TabsContent>

        {/* Workspace Tab - Workspace members & settings */}
        {isAdmin && (
          <TabsContent value="workspace" className="space-y-6">
            <WorkspaceSettingsTab teamMembers={teamMembers} />
          </TabsContent>
        )}

        {/* Features Tab - Workspace feature toggles */}
        {isAdmin && (
          <TabsContent value="features" className="space-y-6">
            <WorkspaceFeaturesTab />
          </TabsContent>
        )}

        {/* Team Tab - Invitations + team limits */}
        {isAdmin && (
          <TabsContent value="team" className="space-y-6">
            <TeamManagementTab />
          </TabsContent>
        )}

        {/* Notifications Tab - Personal + org-wide notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <NotificationsTab teamMembers={teamMembers} setTeamMembers={setTeamMembers} />
        </TabsContent>

        {/* Integrations Tab - Email, API keys, MCP, Asana, Google Calendar */}
        {isAdmin && (
          <TabsContent value="integrations" className="space-y-6">
            <IntegrationsApiTab teamMembers={teamMembers} />
          </TabsContent>
        )}

        {/* AI Command Center Tab */}
        {isAdmin && currentOrganization && (
          <TabsContent value="ai" className="space-y-6">
            <AIBudgetControls organizationId={currentOrganization.id} />
            <AIInbox organizationId={currentOrganization.id} teamMembers={teamMembers} />
          </TabsContent>
        )}

        {/* Data & Export Tab */}
        {isAdmin && (
          <TabsContent value="data" className="space-y-6">
            <DataExportTab />
          </TabsContent>
        )}

        {/* Billing Tab */}
        {isOwner && (
          <TabsContent value="billing" className="space-y-6">
            <BillingSettings />
          </TabsContent>
        )}
      </Tabs>

      <Toaster />
    </div>
  )
}
