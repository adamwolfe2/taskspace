"use client"

import Link from "next/link"
import { ArrowUpIcon, CheckCircleIcon, ExclamationTriangleIcon, ArrowRightIcon } from "@heroicons/react/24/outline"
import { PLANS, formatPrice, type PlanTier } from "@/lib/billing/plans"
import { getUsagePercentage, isApproachingLimit } from "@/lib/billing/feature-gates"

interface UsageStat {
  label: string
  current: number
  limit: number | null
  unit: string
}

interface PlanUsageCardProps {
  currentPlan: PlanTier
  usage: {
    activeUsers: number
    workspaces: number
    managers: number
    aiCreditsUsed: number
    aiCreditsTotal: number
  }
}

export function PlanUsageCard({ currentPlan, usage }: PlanUsageCardProps) {
  const plan = PLANS[currentPlan]

  const usageStats: UsageStat[] = [
    {
      label: "Team Members",
      current: usage.activeUsers,
      limit: plan.limits.maxUsers,
      unit: "users",
    },
    {
      label: "Workspaces",
      current: usage.workspaces,
      limit: plan.limits.maxWorkspaces,
      unit: "workspaces",
    },
    {
      label: "AI Credits",
      current: usage.aiCreditsUsed,
      limit: usage.aiCreditsTotal,
      unit: "credits",
    },
  ]

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{plan.name} Plan</h3>
          <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatPrice(plan.priceYearly / 12)}
            <span className="text-sm font-normal text-slate-600">/user/month</span>
          </p>
        </div>
        {currentPlan !== "business" && (
          <Link
            href="/settings/billing"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            <ArrowUpIcon className="h-4 w-4" />
            Upgrade
          </Link>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {usageStats.map((stat) => {
          const percentage = getUsagePercentage(stat.current, stat.limit)
          const approaching = isApproachingLimit(stat.current, stat.limit)
          const unlimited = stat.limit === null

          return (
            <div key={stat.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{stat.label}</span>
                <span className="text-slate-600">
                  {stat.current} {unlimited ? "" : `/ ${stat.limit}`} {stat.unit}
                </span>
              </div>
              {!unlimited && (
                <div className="mt-2">
                  <div className="h-2 w-full rounded-full bg-slate-200">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        percentage >= 100
                          ? "bg-red-600"
                          : approaching
                            ? "bg-yellow-500"
                            : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  {approaching && percentage < 100 && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-yellow-600">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      Approaching limit
                    </p>
                  )}
                  {percentage >= 100 && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      Limit reached - upgrade to continue
                    </p>
                  )}
                </div>
              )}
              {unlimited && (
                <p className="mt-1 flex items-center gap-1 text-xs text-primary">
                  <CheckCircleIcon className="h-4 w-4" />
                  Unlimited
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <Link href="/pricing" className="text-sm font-medium text-primary hover:text-primary/80">
          <span className="inline-flex items-center gap-1">Compare all plans <ArrowRightIcon className="inline h-3.5 w-3.5" /></span>
        </Link>
      </div>
    </div>
  )
}
