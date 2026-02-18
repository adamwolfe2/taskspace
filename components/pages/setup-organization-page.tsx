"use client"

import { OnboardingWizard, type OnboardingData } from "@/components/onboarding/onboarding-wizard"
import { useApp } from "@/lib/contexts/app-context"
import { useToast } from "@/hooks/use-toast"

interface SetupOrganizationPageProps {
  mode?: "create" | "setup"
}

export function SetupOrganizationPage({ mode = "create" }: SetupOrganizationPageProps) {
  const { currentUser, setCurrentPage, refreshSession } = useApp()
  const { toast } = useToast()

  const handleComplete = async (data: OnboardingData) => {
    // Step 1: Create organization
    const orgResponse = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      credentials: "include",
      body: JSON.stringify({
        name: data.organization.name,
        slug: data.organization.slug,
        description: data.organization.description,
      }),
    })

    if (!orgResponse.ok) {
      const error = await orgResponse.json().catch(() => ({ error: "Failed to create organization" }))
      throw new Error(error.error || "Failed to create organization")
    }

    const { data: organization } = await orgResponse.json()

    // Step 2: Create default workspace with branding
    const workspaceResponse = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
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
        faviconUrl: data.workspace.faviconUrl,
      }),
    })

    if (!workspaceResponse.ok) {
      const error = await workspaceResponse.json().catch(() => ({ error: "Failed to create workspace" }))
      // Workspace failed but org exists - user can still proceed
      // The ensure-default endpoint will create a workspace on next login
      toast({
        title: "Workspace setup incomplete",
        description: "Your organization was created but workspace setup had an issue. It will be set up automatically.",
        variant: "destructive",
      })
      // Still try to refresh session and proceed
      await refreshSession().catch(() => {})
      setCurrentPage("dashboard")
      return
    }

    const { data: workspace } = await workspaceResponse.json()

    // Step 3: Send team invitations (non-blocking)
    if (data.teamInvites.length > 0) {
      const results = await Promise.allSettled(
        data.teamInvites.map((invite) =>
          fetch("/api/invitations", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
            credentials: "include",
            body: JSON.stringify({
              email: invite.email,
              role: invite.role,
              organizationId: organization.id,
              workspaceId: workspace.id,
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const err = await res.json().catch(() => ({}))
              throw new Error(err.error || "Failed")
            }
            return invite.email
          })
        )
      )

      const succeeded = results.filter((r) => r.status === "fulfilled").length
      const failed = results.filter((r) => r.status === "rejected").length

      if (failed > 0 && succeeded > 0) {
        toast({
          title: `${succeeded} invitation${succeeded > 1 ? "s" : ""} sent`,
          description: `${failed} failed — you can resend from team settings`,
          variant: "destructive",
        })
      } else if (failed > 0 && succeeded === 0) {
        toast({
          title: "Invitations failed to send",
          description: "You can invite team members from Settings > Team",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Invitations sent",
          description: `${succeeded} team member${succeeded > 1 ? "s" : ""} invited`,
        })
      }
    }

    // Step 4: Create quarterly rocks (non-blocking)
    if (data.rocks.length > 0) {
      try {
        const quarter = `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`
        const dueDate = new Date()
        dueDate.setMonth(dueDate.getMonth() + 3)

        await Promise.allSettled(
          data.rocks.map((rock) =>
            fetch("/api/rocks", {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
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
        )
      } catch {
        // Non-critical — user can add rocks later
      }
    }

    // Step 5: Refresh session and navigate to dashboard
    await refreshSession()

    toast({
      title: "Welcome to Taskspace!",
      description: "Your workspace is ready. Let's build daily accountability.",
    })

    setTimeout(() => {
      setCurrentPage("dashboard")
    }, 1500)
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
