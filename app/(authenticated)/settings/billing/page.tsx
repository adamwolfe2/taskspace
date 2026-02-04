"use client"

import { useEffect, useState } from "react"
import { PlanUsageCard } from "@/components/billing/plan-usage-card"
import { PLANS, type PlanTier } from "@/lib/billing/plans"
import { CreditCardIcon, ClockIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from "@heroicons/react/24/outline"
import Link from "next/link"

interface BillingData {
  currentPlan: PlanTier
  activeUsers: number
  workspaces: number
  managers: number
  aiCreditsUsed: number
  aiCreditsTotal: number
  subscription: {
    status: string
    billingCycle?: string
    currentPeriodEnd?: string
  } | null
  stripeCustomerId?: string
}

export default function BillingSettingsPage() {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBillingData() {
      try {
        const response = await fetch("/api/billing/usage")
        if (!response.ok) throw new Error("Failed to load billing data")
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        } else {
          throw new Error(result.error || "Failed to load billing data")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }
    fetchBillingData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-red-50 p-4 text-red-800">
            {error || "Failed to load billing data"}
          </div>
        </div>
      </div>
    )
  }

  const currentPlan = data.currentPlan
  const plan = PLANS[currentPlan]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing & Usage</h1>
          <p className="mt-2 text-gray-600">
            Manage your subscription, view usage, and update payment information
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content - Current Plan */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plan Card */}
            <PlanUsageCard
              currentPlan={currentPlan}
              usage={{
                activeUsers: data.activeUsers,
                workspaces: data.workspaces,
                managers: data.managers,
                aiCreditsUsed: data.aiCreditsUsed,
                aiCreditsTotal: data.aiCreditsTotal,
              }}
            />

            {/* Billing Status */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Status</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {data.subscription?.status === "active" ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {data.subscription?.status === "active" ? "Active Subscription" : "No Active Subscription"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {data.subscription?.status === "active"
                          ? `Billed ${data.subscription.billingCycle || "monthly"}`
                          : "Start a paid plan to unlock more features"}
                      </p>
                    </div>
                  </div>
                </div>

                {data.subscription?.currentPeriodEnd && (
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-3">
                      <ClockIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Next Billing Date</p>
                        <p className="text-sm text-gray-600">
                          {new Date(data.subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {data.stripeCustomerId && (
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-3">
                      <CreditCardIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Payment Method</p>
                        <p className="text-sm text-gray-600">Manage via Stripe Customer Portal</p>
                      </div>
                    </div>
                    <form action="/api/billing/portal" method="POST">
                      <button
                        type="submit"
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Manage →
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* AI Usage Details */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Usage This Month</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Credits Used</span>
                  <span className="font-semibold text-gray-900">{data.aiCreditsUsed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Credits Remaining</span>
                  <span className="font-semibold text-gray-900">
                    {plan.limits.aiCreditsPerUser === null
                      ? "Unlimited"
                      : Math.max(0, data.aiCreditsTotal - data.aiCreditsUsed)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-gray-700">Monthly Allowance</span>
                  <span className="font-semibold text-gray-900">
                    {plan.limits.aiCreditsPerUser === null
                      ? "Unlimited"
                      : `${data.aiCreditsTotal} (${plan.limits.aiCreditsPerUser} per user)`}
                  </span>
                </div>
              </div>

              {currentPlan !== "enterprise" && data.aiCreditsUsed > data.aiCreditsTotal * 0.8 && (
                <div className="mt-4 rounded-lg bg-yellow-50 p-4 border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    You're using {Math.round((data.aiCreditsUsed / data.aiCreditsTotal) * 100)}% of your monthly AI credits.
                    Consider upgrading to get more credits.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Quick Actions */}
          <div className="space-y-6">
            {/* Upgrade CTA */}
            {currentPlan !== "enterprise" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  {currentPlan === "free" ? "Start Your Trial" : "Upgrade Your Plan"}
                </h3>
                <p className="text-sm text-blue-700 mb-4">
                  {currentPlan === "free"
                    ? "Get access to unlimited workspaces, more AI credits, and premium integrations."
                    : "Unlock unlimited features and AI credits with Enterprise."}
                </p>
                <Link
                  href="/pricing"
                  className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
                >
                  View Plans
                </Link>
              </div>
            )}

            {/* Quick Stats */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-600">Team Members</p>
                  <p className="text-2xl font-bold text-gray-900">{data.activeUsers}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Workspaces</p>
                  <p className="text-2xl font-bold text-gray-900">{data.workspaces}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">AI Operations</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.aiCreditsUsed > 0 ? Math.ceil(data.aiCreditsUsed / 5) : 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Need Help */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Questions about billing or your subscription? We're here to help.
              </p>
              <Link
                href="/contact"
                className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
