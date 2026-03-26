/**
 * Feature Disabled Empty State
 *
 * Shown when a user accesses a page for a disabled feature.
 * Supports two modes:
 *   1. Admin-disabled: feature was toggled off in settings (default)
 *   2. Plan-gated: feature requires a higher billing plan (`requiredPlan` prop)
 */

"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ArrowUpCircle, Settings, Sparkles } from "lucide-react"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import Link from "next/link"
import type { PlanTier } from "@/lib/billing/plans"

const PLAN_DETAILS: Record<
  Exclude<PlanTier, "free">,
  { label: string; price: string; pitch: string }
> = {
  team: {
    label: "Team",
    price: "$9/user/mo",
    pitch: "Unlock L10 meetings, analytics, integrations, and AI digest for your whole team.",
  },
  business: {
    label: "Business",
    price: "$19/user/mo",
    pitch: "Get custom branding, API access, SSO, and unlimited AI for your organization.",
  },
}

interface FeatureDisabledProps {
  featureName: string
  description: string
  icon?: React.ReactNode
  /** When set, shows an upgrade prompt instead of the "Enable in Settings" button. */
  requiredPlan?: "team" | "business"
}

export function FeatureDisabled({
  featureName,
  description,
  icon,
  requiredPlan,
}: FeatureDisabledProps) {
  const { isAdmin } = useWorkspaces()

  const planInfo = requiredPlan ? PLAN_DETAILS[requiredPlan] : null

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            {icon || (requiredPlan
              ? <Sparkles className="h-8 w-8 text-primary" />
              : <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold mb-2">
            {requiredPlan ? "Upgrade to Unlock" : "Feature Disabled"}
          </h2>

          {/* Feature Name */}
          <p className="text-sm text-muted-foreground mb-1">
            <span className="font-medium">{featureName}</span>{" "}
            {requiredPlan
              ? `requires the ${planInfo?.label} plan.`
              : "is not enabled for this workspace."}
          </p>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-6">{description}</p>

          {/* Actions */}
          <div className="flex flex-col gap-2 w-full">
            {requiredPlan && planInfo ? (
              /* ---- Plan-gated path ---- */
              isAdmin ? (
                <>
                  {/* Plan pitch + price */}
                  <div className="rounded-lg border bg-muted/50 p-4 mb-2">
                    <p className="text-sm font-medium mb-1">
                      {planInfo.label} Plan &mdash; {planInfo.price}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {planInfo.pitch}
                    </p>
                  </div>

                  <Button asChild>
                    <Link href="/pricing">
                      <ArrowUpCircle className="h-4 w-4 mr-2" />
                      Upgrade to {planInfo.label}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/app?page=dashboard">Back to Dashboard</Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    This feature requires the {planInfo.label} plan. Ask your workspace admin to upgrade.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/app?page=dashboard">Back to Dashboard</Link>
                  </Button>
                </>
              )
            ) : (
              /* ---- Admin-disabled path (existing behavior) ---- */
              isAdmin ? (
                <>
                  <Button asChild>
                    <Link href="/app?page=settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Enable in Settings
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/app?page=dashboard">Back to Dashboard</Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    Contact your workspace admin to enable this feature.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/app?page=dashboard">Back to Dashboard</Link>
                  </Button>
                </>
              )
            )}
          </div>

          {/* Data preservation notice */}
          <p className="text-xs text-muted-foreground mt-6">
            {requiredPlan
              ? "Your data is safe. Upgrading will instantly unlock this feature."
              : "Your data is preserved. Re-enabling this feature will restore full access."}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
