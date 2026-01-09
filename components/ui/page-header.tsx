import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

/**
 * Consistent page header component for all pages.
 *
 * Usage:
 * <PageHeader
 *   icon={<BarChart3 className="h-5 w-5" />}
 *   title="Team Analytics"
 *   subtitle="Insights and metrics from your team's performance"
 *   actions={<Button>Action</Button>}
 * />
 */
export function PageHeader({ icon, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 mb-6", className)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="flex-shrink-0 p-2 bg-red-50 rounded-lg text-red-600">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

interface PageHeaderActionsProps {
  children: React.ReactNode
  className?: string
}

/**
 * Container for page header actions with responsive layout.
 */
export function PageHeaderActions({ children, className }: PageHeaderActionsProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {children}
    </div>
  )
}

interface PageHeaderTabsProps {
  children: React.ReactNode
  className?: string
}

/**
 * Scrollable container for tabs in page headers.
 * Handles horizontal overflow on mobile.
 */
export function PageHeaderTabs({ children, className }: PageHeaderTabsProps) {
  return (
    <div className={cn(
      "flex overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0",
      className
    )}>
      <div className="flex gap-1 min-w-max">
        {children}
      </div>
    </div>
  )
}
