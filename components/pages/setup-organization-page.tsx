"use client"

import { useState } from "react"
import { OnboardingWizard, type OnboardingData } from "@/components/onboarding/onboarding-wizard"
import { useApp } from "@/lib/contexts/app-context"
import { api } from "@/lib/api/client"
import { useToast } from "@/hooks/use-toast"

interface SetupOrganizationPageProps {
  mode?: "create" | "setup"
}

export function SetupOrganizationPage({ mode = "create" }: SetupOrganizationPageProps) {
  const { currentUser, setCurrentPage, refreshSession } = useApp()
  const { toast } = useToast()

  const handleComplete = async (data: OnboardingData) => {
    try {
      // Step 1: Create organization
      const orgResponse = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.organization.name,
          slug: data.organization.slug,
          description: data.organization.description,
        }),
      })

      if (!orgResponse.ok) {
        const error = await orgResponse.json()
        throw new Error(error.error || "Failed to create organization")
      }

      const { data: organization } = await orgResponse.json()

      // Step 2: Create default workspace with branding
      const workspaceResponse = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organizationId: organization.id,
          name: data.workspace.name,
          slug: data.organization.slug,
          isDefault: true,
          primaryColor: data.workspace.primaryColor,
          secondaryColor: data.workspace.secondaryColor,
          accentColor: data.workspace.accentColor,
          logoUrl: data.workspace.logoUrl,
        }),
      })

      if (!workspaceResponse.ok) {
        const error = await workspaceResponse.json()
        throw new Error(error.error || "Failed to create workspace")
      }

      const { data: workspace } = await workspaceResponse.json()

      // Step 3: Send team invitations
      if (data.teamInvites.length > 0) {
        try {
          const invitePromises = data.teamInvites.map((invite) =>
            fetch("/api/invitations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                email: invite.email,
                role: invite.role,
                organizationId: organization.id,
                workspaceId: workspace.id,
              }),
            })
          )

          await Promise.all(invitePromises)

          toast({
            title: "Invitations sent",
            description: `${data.teamInvites.length} team member${data.teamInvites.length > 1 ? "s" : ""} invited`,
          })
        } catch (error) {
          console.error("Failed to send invitations:", error)
          toast({
            title: "Some invitations failed",
            description: "You can resend them from team settings",
            variant: "destructive",
          })
        }
      }

      // Step 4: Create quarterly rocks
      if (data.rocks.length > 0) {
        try {
          const quarter = `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`
          const dueDate = new Date()
          dueDate.setMonth(dueDate.getMonth() + 3)

          const rockPromises = data.rocks.map((rock) =>
            fetch("/api/rocks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                title: rock.title,
                description: rock.description,
                quarter,
                dueDate: dueDate.toISOString().split("T")[0],
                status: "on-track",
                progress: 0,
                assignedTo: currentUser?.id,
                workspaceId: workspace.id,
              }),
            })
          )

          await Promise.all(rockPromises)

          toast({
            title: "Rocks created",
            description: `${data.rocks.length} quarterly goal${data.rocks.length > 1 ? "s" : ""} added`,
          })
        } catch (error) {
          console.error("Failed to create rocks:", error)
          toast({
            title: "Some rocks failed to create",
            description: "You can add them from the Rocks page",
            variant: "destructive",
          })
        }
      }

      // Step 5: Refresh session and navigate to dashboard
      await refreshSession()

      toast({
        title: "Welcome to Align! 🎉",
        description: "Your workspace is ready. Let's build daily accountability.",
      })

      setTimeout(() => {
        setCurrentPage("dashboard")
      }, 1500)
    } catch (error) {
      console.error("Setup failed:", error)
      toast({
        title: "Setup failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
      throw error
    }
  }

  return (
    <OnboardingWizard
      onComplete={handleComplete}
      currentUser={{
        email: currentUser?.email || "",
        name: currentUser?.name || "",
      }}
    />
  )
}
