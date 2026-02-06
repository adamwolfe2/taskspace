/**
 * Feature Disabled Empty State
 *
 * Shown when a user accesses a page for a disabled feature
 */

"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Settings, Mail } from "lucide-react"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import Link from "next/link"

interface FeatureDisabledProps {
  featureName: string
  description: string
  icon?: React.ReactNode
}

export function FeatureDisabled({
  featureName,
  description,
  icon,
}: FeatureDisabledProps) {
  const { isAdmin, currentWorkspace } = useWorkspaces()

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            {icon || <AlertTriangle className="h-8 w-8 text-muted-foreground" />}
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold mb-2">Feature Disabled</h2>

          {/* Feature Name */}
          <p className="text-sm text-muted-foreground mb-1">
            <span className="font-medium">{featureName}</span> is not enabled for this workspace.
          </p>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-6">{description}</p>

          {/* Actions */}
          <div className="flex flex-col gap-2 w-full">
            {isAdmin ? (
              <>
                <Button asChild>
                  <Link href="/settings?tab=features">
                    <Settings className="h-4 w-4 mr-2" />
                    Enable in Settings
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  Contact your workspace admin to enable this feature.
                </p>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
              </>
            )}
          </div>

          {/* Data preservation notice */}
          <p className="text-xs text-muted-foreground mt-6">
            Your data is preserved. Re-enabling this feature will restore full access.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
