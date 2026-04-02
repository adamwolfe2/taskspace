/**
 * Feature Toggle Component — App Store Card Style
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
  Lock,
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
  if (impact?.navigation) impactBadges.push("Nav")
  if (impact?.dashboard) impactBadges.push("Dashboard")
  if (impact?.api) impactBadges.push("API")

  const card = (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border p-4 gap-3 transition-all",
        enabled
          ? "bg-white border-slate-200 shadow-sm"
          : "bg-slate-50 border-slate-200",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "hover:shadow-md hover:border-slate-300 cursor-pointer"
      )}
      onClick={() => !disabled && onChange(!enabled)}
    >
      {/* Lock badge for plan-gated features */}
      {disabled && reason && (
        <div className="absolute top-3 right-3">
          <Lock className="h-3.5 w-3.5 text-slate-400" />
        </div>
      )}

      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
          enabled ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-400"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold leading-tight", enabled ? "text-slate-900" : "text-slate-500")}>
          {name}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{description}</p>
      </div>

      {/* Footer: badges + toggle */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-slate-100">
        <div className="flex flex-wrap gap-1">
          {impactBadges.map((badge) => (
            <span key={badge} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
              {badge}
            </span>
          ))}
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => { onChange(v) }}
          disabled={disabled}
          aria-label={`Toggle ${name}`}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )

  if (reason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-sm">{reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return card
}
