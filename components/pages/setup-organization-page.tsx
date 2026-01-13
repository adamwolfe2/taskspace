"use client"

import { useState } from "react"
import { OnboardingWizard, OnboardingData } from "@/components/onboarding/onboarding-wizard"
import { useApp } from "@/lib/contexts/app-context"
import { api } from "@/lib/api/client"
import { useToast } from "@/hooks/use-toast"

interface SetupOrganizationPageProps {
  mode?: "create" | "setup" // create = new org, setup = configure existing
  organizationId?: string
  organizationName?: string
}

export function SetupOrganizationPage({
  mode = "create",
  organizationId,
  organizationName,
}: SetupOrganizationPageProps) {
  const { setCurrentPage, refreshSession } = useApp()
  const { toast } = useToast()
  const [isComplete, setIsComplete] = useState(false)

  const handleComplete = async (data: OnboardingData) => {
    try {
      let orgId = organizationId

      // Step 1: Create organization if needed
      if (mode === "create") {
        const orgResponse = await api.user.createOrganization(data.organizationName)
        orgId = orgResponse.id
      }

      if (!orgId) {
        throw new Error("Organization ID not available")
      }

      // Step 2: Upload logo if provided
      let logoUrl: string | undefined
      if (data.logoFile) {
        const formData = new FormData()
        formData.append("file", data.logoFile)
        formData.append("type", "logo")

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          logoUrl = uploadResult.data?.url
        }
      }

      // Step 3: Update organization settings with branding
      await api.organizations.updateSettings({
        logoUrl: logoUrl,
        primaryColor: data.brandColors.primary,
        secondaryColor: data.brandColors.secondary,
        settings: {
          timezone: data.timezone,
          customBranding: {
            logo: logoUrl,
            primaryColor: data.brandColors.primary,
            secondaryColor: data.brandColors.secondary,
            accentColor: data.brandColors.accent,
          },
        },
      })

      // Step 4: Send invitations if any
      if (data.inviteEmails.length > 0) {
        try {
          await api.invitations.bulkCreate(data.inviteEmails)
          toast({
            title: "Invitations sent",
            description: `${data.inviteEmails.length} team member(s) have been invited`,
          })
        } catch (error) {
          console.error("Failed to send invitations:", error)
          toast({
            title: "Some invitations failed",
            description: "You can resend them from the team settings",
            variant: "destructive",
          })
        }
      }

      // Step 5: Refresh session to get updated organization data
      await refreshSession()

      setIsComplete(true)

      // Navigate to dashboard after a brief delay
      setTimeout(() => {
        setCurrentPage("dashboard")
      }, 2000)
    } catch (error) {
      console.error("Setup failed:", error)
      throw error
    }
  }

  return (
    <OnboardingWizard
      onComplete={handleComplete}
      initialData={{
        organizationName: organizationName || "",
      }}
    />
  )
}
