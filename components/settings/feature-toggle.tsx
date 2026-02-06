/**
 * Feature Toggle Component
 *
 * Reusable component for displaying and toggling workspace features
 */

"use client"

import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  CheckSquare,
  Target,
  FileText,
  BarChart3,
  Calendar,
  AlertCircle,
  Network,
  Clock,
  Zap,
  Flame,
  Award,
  Link,
  MessageSquare,
  Webhook,
  Bot,
  TrendingUp,
  LayoutDashboard,
  Code,
  Users,
  Database,
  Palette,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

const ICON_MAP: Record<string, LucideIcon> = {
  CheckSquare,
  Target,
  FileText,
  BarChart3,
  Calendar,
  AlertCircle,
  Network,
  Clock,
  Zap,
  Flame,
  Award,
  Link,
  MessageSquare,
  Webhook,
  Bot,
  TrendingUp,
  LayoutDashboard,
  Code,
  Users,
  Database,
  Palette,
}

interface FeatureToggleProps {
  name: string
  description: string
  icon: string
  enabled: boolean
  disabled?: boolean
  reason?: string
  impact?: {
    navigation?: boolean
    dashboard?: boolean
    api?: boolean
  }
  onChange: (enabled: boolean) => void
}

export function FeatureToggle({
  name,
  description,
  icon,
  enabled,
  disabled = false,
  reason,
  impact,
  onChange,
}: FeatureToggleProps) {
  const Icon = ICON_MAP[icon] || Info

  const impactBadges = []
  if (impact?.navigation) impactBadges.push("Navigation")
  if (impact?.dashboard) impactBadges.push("Dashboard")
  if (impact?.api) impactBadges.push("API")

  const content = (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg border transition-colors",
        enabled ? "bg-background border-border" : "bg-muted/50 border-muted",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
          enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1">
            <h4 className="text-sm font-medium">{name}</h4>
            {reason && (
              <p className="text-xs text-muted-foreground mt-1">{reason}</p>
            )}
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onChange}
            disabled={disabled}
            aria-label={`Toggle ${name}`}
          />
        </div>

        <p className="text-sm text-muted-foreground mb-2">{description}</p>

        {/* Impact Badges */}
        {impactBadges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {impactBadges.map((badge) => (
              <Badge
                key={badge}
                variant="outline"
                className="text-xs font-normal"
              >
                {badge}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  if (reason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <p className="text-sm">{reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}
