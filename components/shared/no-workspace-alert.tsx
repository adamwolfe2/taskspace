"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Building2 } from "lucide-react"
import { useWorkspaceStore } from "@/lib/hooks/use-workspace"

/**
 * Shows an alert when no workspace is selected.
 * Returns null if a workspace is selected, so it can be placed
 * at the top of any page that depends on workspace data.
 */
export function NoWorkspaceAlert() {
  const { currentWorkspaceId } = useWorkspaceStore()

  if (currentWorkspaceId) return null

  return (
    <Alert className="border-amber-200 bg-amber-50">
      <Building2 className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">No workspace selected</AlertTitle>
      <AlertDescription className="text-amber-700">
        Select a workspace from the switcher in the sidebar to view your data.
      </AlertDescription>
    </Alert>
  )
}
