"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building, Bell, Users, CreditCard, Key, Download, Sparkles, Briefcase, Sliders, User, Palette, Shield } from "lucide-react"
import { api } from "@/lib/api/client"
import type { TeamMember } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
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
import { WorkspaceBrandingSettings } from "@/components/settings/workspace-branding-settings"
import { ProfileSettingsTab } from "@/components/settings/profile-settings-tab"
import { SecuritySettingsTab } from "@/components/settings/security-settings-tab"
import { AIInbox } from "@/components/ai/ai-inbox"
import { AIBudgetControls } from "@/components/ai/ai-budget-controls"
import { ErrorBoundary, CompactErrorBoundary } from "@/components/shared/error-boundary"

export function SettingsPage() {
  const { currentUser, currentOrganization } = useApp()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [activeTab, setActiveTab] = useState("profile")

  const { toast } = useToast()
  const isOwner = currentUser?.role === "owner"
  const isAdmin = currentUser?.role === "admin" || isOwner

  // Check for onboarding navigation hint
  useEffect(() => {
    const tab = localStorage.getItem("settings-tab")
    if (tab) {
      setActiveTab(tab)
      localStorage.removeItem("settings-tab")
    }
  }, [])

  // Load team members
  useEffect(() => {
    const loadTeamData = async () => {
      try {
        const members = await api.members.list()
        setTeamMembers(members.map(m => ({
          ...m,
          joinDate: m.joinedAt,
          userId: m.userId ?? undefined,
        })))
      } catch (err) {
        toast({ title: "Failed to load team data", description: err instanceof Error ? err.message : "Some settings may be incomplete. Try refreshing.", variant: "destructive" })
      }
    }
    loadTeamData()
  }, [])

  return (
    <ErrorBoundary>
    <div className="space-y-3 sm:space-y-4 w-full max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Manage your account, organization, and workspace preferences</p>
        </div>
        <WorkspaceSwitcher className="w-full sm:w-auto" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4">
        {/* Tabs container - wraps into rows */}
        <div className="w-full">
          <TabsList className="flex flex-wrap gap-2 h-auto bg-slate-100/80 p-2">
            <TabsTrigger value="profile" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap min-h-[40px] sm:min-h-[36px]">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Profile
            </TabsTrigger>

            <TabsTrigger value="general" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap min-h-[40px] sm:min-h-[36px]">
              <Building className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Organization</span>
              <span className="sm:hidden">Org</span>
            </TabsTrigger>

            {isAdmin && (
              <TabsTrigger value="workspace" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap min-h-[40px] sm:min-h-[36px]">
                <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Workspace
              </TabsTrigger>
            )}

            {isAdmin && (
              <TabsTrigger value="features" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap min-h-[40px] sm:min-h-[36px]">
                <Sliders className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Features
              </TabsTrigger>
            )}

            {isAdmin && (
              <TabsTrigger value="branding" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap min-h-[40px] sm:min-h-[36px]">
                <Palette className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Branding
              </TabsTrigger>
            )}

            {isAdmin && (
              <TabsTrigger value="team" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap min-h-[40px] sm:min-h-[36px]">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Team
              </TabsTrigger>
            )}

            <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap min-h-[40px] sm:min-h-[36px]">
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Security
            </TabsTrigger>

            <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap min-h-[40px] sm:min-h-[36px]">
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Alerts</span>
            </TabsTrigger>

            {isAdmin && (
              <TabsTrigger value="integrations" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap min-h-[40px] sm:min-h-[36px]">
                <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Integrations</span>
                <span className="sm:hidden">Integ.</span>
              </TabsTrigger>
            )}

            {isAdmin && (
              <TabsTrigger value="ai" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap min-h-[40px] sm:min-h-[36px]">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">AI Command Center</span>
                <span className="sm:hidden">AI</span>
              </TabsTrigger>
            )}

            {isAdmin && (
              <TabsTrigger value="data" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap min-h-[40px] sm:min-h-[36px]">
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Import & Export</span>
                <span className="sm:hidden">Import</span>
              </TabsTrigger>
            )}

            {isOwner && (
              <TabsTrigger value="billing" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap min-h-[40px] sm:min-h-[36px]">
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Billing
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Profile Tab - User profile settings */}
        <TabsContent value="profile" className="space-y-4">
          <CompactErrorBoundary section="Profile">
            <ProfileSettingsTab />
          </CompactErrorBoundary>
        </TabsContent>

        {/* Security Tab - Password, 2FA, account deletion */}
        <TabsContent value="security" className="space-y-4">
          <CompactErrorBoundary section="Security">
            <SecuritySettingsTab />
          </CompactErrorBoundary>
        </TabsContent>

        {/* General Tab - Organization details + branding */}
        <TabsContent value="general" className="space-y-4">
          <CompactErrorBoundary section="General">
            <OrganizationSettingsTab />
          </CompactErrorBoundary>
        </TabsContent>

        {/* Workspace Tab - Workspace members & settings */}
        {isAdmin && (
          <TabsContent value="workspace" className="space-y-4">
            <CompactErrorBoundary section="Workspace">
              <WorkspaceSettingsTab teamMembers={teamMembers} />
            </CompactErrorBoundary>
          </TabsContent>
        )}

        {/* Features Tab - Workspace feature toggles */}
        {isAdmin && (
          <TabsContent value="features" className="space-y-4">
            <CompactErrorBoundary section="Features">
              <WorkspaceFeaturesTab />
            </CompactErrorBoundary>
          </TabsContent>
        )}

        {/* Branding Tab - Workspace colors and logo */}
        {isAdmin && (
          <TabsContent value="branding" className="space-y-4">
            <CompactErrorBoundary section="Branding">
              <WorkspaceBrandingSettings />
            </CompactErrorBoundary>
          </TabsContent>
        )}

        {/* Team Tab - Invitations + team limits */}
        {isAdmin && (
          <TabsContent value="team" className="space-y-4">
            <CompactErrorBoundary section="Team">
              <TeamManagementTab />
            </CompactErrorBoundary>
          </TabsContent>
        )}

        {/* Notifications Tab - Personal + org-wide notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <CompactErrorBoundary section="Notifications">
            <NotificationsTab teamMembers={teamMembers} setTeamMembers={setTeamMembers} />
          </CompactErrorBoundary>
        </TabsContent>

        {/* Integrations Tab - Email, API keys, MCP, Asana, Google Calendar */}
        {isAdmin && (
          <TabsContent value="integrations" className="space-y-4">
            <CompactErrorBoundary section="Integrations">
              <IntegrationsApiTab teamMembers={teamMembers} />
            </CompactErrorBoundary>
          </TabsContent>
        )}

        {/* AI Command Center Tab */}
        {isAdmin && currentOrganization && (
          <TabsContent value="ai" className="space-y-4">
            <CompactErrorBoundary section="AI">
              <AIBudgetControls organizationId={currentOrganization.id} />
              <AIInbox organizationId={currentOrganization.id} teamMembers={teamMembers} />
            </CompactErrorBoundary>
          </TabsContent>
        )}

        {/* Data & Export Tab */}
        {isAdmin && (
          <TabsContent value="data" className="space-y-4">
            <CompactErrorBoundary section="Import & Export">
              <DataExportTab />
            </CompactErrorBoundary>
          </TabsContent>
        )}

        {/* Billing Tab */}
        {isOwner && (
          <TabsContent value="billing" className="space-y-4">
            <CompactErrorBoundary section="Billing">
              <BillingSettings />
            </CompactErrorBoundary>
          </TabsContent>
        )}
      </Tabs>
    </div>
    </ErrorBoundary>
  )
}
