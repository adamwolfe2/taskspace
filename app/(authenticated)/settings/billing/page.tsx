"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { PlanUsageCard } from "@/components/billing/plan-usage-card"
import { PLANS, type PlanTier, formatPrice } from "@/lib/billing/plans"
import { UpgradeDialog } from "@/components/billing/upgrade-dialog"
import {
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  ExternalLink,
  AlertTriangle,
} from "lucide-react"
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
    cancelAtPeriodEnd?: boolean
    trialEnd?: string
  } | null
  hasStripeAccount?: boolean
  invoices?: InvoiceRecord[]
}

interface InvoiceRecord {
  id: string
  amount: number
  currency: string
  status: string
  date: string
  invoiceUrl?: string
  periodStart?: string
  periodEnd?: string
}

export default function BillingSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    }>
      <BillingSettingsContent />
    </Suspense>
  )
}

function BillingSettingsContent() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [billingToast, setBillingToast] = useState<"success" | "canceled" | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [changePlanLoading, setChangePlanLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  // Show success/cancel toast from checkout redirect
  useEffect(() => {
    const billingParam = searchParams.get("billing")
    if (billingParam === "success") {
      setBillingToast("success")
    } else if (billingParam === "canceled") {
      setBillingToast("canceled")
    }
  }, [searchParams])

  const fetchBillingData = useCallback(async () => {
    try {
      const response = await fetch("/api/billing/usage", {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
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
  }, [])

  useEffect(() => {
    fetchBillingData()
  }, [fetchBillingData])

  const openCustomerPortal = async () => {
    setPortalLoading(true)
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ action: "portal" }),
      })
      const result = await response.json()
      if (result.success && result.data?.portalUrl) {
        window.location.href = result.data.portalUrl
      } else {
        throw new Error(result.error || "Failed to open billing portal")
      }
    } catch {
      // Fallback: try the direct portal route
      try {
        const response = await fetch("/api/billing/portal", {
          method: "POST",
          headers: { "X-Requested-With": "XMLHttpRequest" },
        })
        if (response.redirected) {
          window.location.href = response.url
        }
      } catch {
        setError("Failed to open billing portal. Please try again.")
      }
    } finally {
      setPortalLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel? Your subscription will remain active until the end of the current billing period.")) {
      return
    }
    setCancelLoading(true)
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ action: "cancel" }),
      })
      const result = await response.json()
      if (result.success) {
        await fetchBillingData()
      } else {
        throw new Error(result.error || "Failed to cancel subscription")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel subscription")
    } finally {
      setCancelLoading(false)
    }
  }

  const handleResumeSubscription = async () => {
    setCancelLoading(true)
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ action: "resume" }),
      })
      const result = await response.json()
      if (result.success) {
        await fetchBillingData()
      } else {
        throw new Error(result.error || "Failed to resume subscription")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume subscription")
    } finally {
      setCancelLoading(false)
    }
  }

  const handleChangePlan = async (plan: "team" | "business", billingCycle: "monthly" | "yearly") => {
    setChangePlanLoading(true)
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ action: "change_plan", plan, billingCycle }),
      })
      const result = await response.json()
      if (result.success) {
        await fetchBillingData()
      } else {
        throw new Error(result.error || "Failed to change plan")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change plan")
    } finally {
      setChangePlanLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
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
  const isActive = data.subscription?.status === "active" || data.subscription?.status === "trialing"
  const isTrial = data.subscription?.status === "trialing"
  const isPastDue = data.subscription?.status === "past_due"
  const isCanceled = data.subscription?.status === "canceled"
  const isCanceling = data.subscription?.cancelAtPeriodEnd

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Billing toast notification */}
        {billingToast === "success" && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm font-medium text-green-800">
                Subscription activated! Your 14-day free trial has started.
              </p>
            </div>
            <button onClick={() => setBillingToast(null)} className="text-green-400 hover:text-green-600 text-sm" aria-label="Dismiss">
              Dismiss
            </button>
          </div>
        )}
        {billingToast === "canceled" && (
          <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <p className="text-sm font-medium text-yellow-800">
                Checkout was canceled. No charges were made.
              </p>
            </div>
            <button onClick={() => setBillingToast(null)} className="text-yellow-400 hover:text-yellow-600 text-sm" aria-label="Dismiss">
              Dismiss
            </button>
          </div>
        )}

        {/* Past due warning */}
        {isPastDue && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Payment failed</p>
                <p className="text-sm text-red-700">Please update your payment method to avoid service interruption.</p>
              </div>
            </div>
            <button onClick={openCustomerPortal} disabled={portalLoading} className="text-sm font-medium text-red-700 hover:text-red-900 whitespace-nowrap">
              {portalLoading ? "Opening..." : "Update Payment →"}
            </button>
          </div>
        )}

        {/* Canceled subscription notice */}
        {isCanceled && currentPlan === "free" && (
          <div className="mb-6 rounded-lg bg-slate-50 border border-slate-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-slate-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-800">Your subscription was canceled</p>
                <p className="text-sm text-slate-600">You&apos;re on the Free plan. Upgrade anytime to restore paid features.</p>
              </div>
            </div>
            <button
              onClick={() => setShowUpgrade(true)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
            >
              Resubscribe →
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Billing & Usage</h1>
          <p className="mt-2 text-slate-600">
            Manage your subscription, view usage, and update payment information
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
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
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Billing Status</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isActive ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : isPastDue ? (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-slate-400" />
                    )}
                    <div>
                      <p className="font-medium text-slate-900">
                        {isTrial ? "Free Trial" :
                         isPastDue ? "Payment Past Due" :
                         isCanceled ? "Subscription Canceled" :
                         isActive ? "Active Subscription" :
                         isCanceling ? "Canceling at Period End" :
                         "No Active Subscription"}
                      </p>
                      <p className="text-sm text-slate-600">
                        {isTrial
                          ? `${plan.name} plan trial · Billed ${data.subscription?.billingCycle || "monthly"} after trial`
                          : isActive
                            ? `${plan.name} plan · Billed ${data.subscription?.billingCycle || "monthly"}`
                            : currentPlan === "free"
                              ? "Start a paid plan to unlock more features"
                              : `${plan.name} plan`}
                      </p>
                    </div>
                  </div>
                </div>

                {data.subscription?.trialEnd && isTrial && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-blue-400" />
                      <div>
                        <p className="font-medium text-slate-900">Trial Ends</p>
                        <p className="text-sm text-slate-600">
                          {new Date(data.subscription.trialEnd).toLocaleDateString("en-US", {
                            year: "numeric", month: "long", day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {data.subscription?.currentPeriodEnd && !isTrial && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-900">
                          {isCanceling ? "Access Until" : "Next Billing Date"}
                        </p>
                        <p className="text-sm text-slate-600">
                          {new Date(data.subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                            year: "numeric", month: "long", day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {data.hasStripeAccount && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-900">Payment Method</p>
                        <p className="text-sm text-slate-600">Manage via Stripe Customer Portal</p>
                      </div>
                    </div>
                    <button
                      onClick={openCustomerPortal}
                      disabled={portalLoading}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      {portalLoading ? "Opening..." : "Manage →"}
                    </button>
                  </div>
                )}

                {/* Cancel / Resume actions */}
                {currentPlan !== "free" && (
                  <div className="border-t border-slate-100 pt-4">
                    {isCanceling ? (
                      <button
                        onClick={handleResumeSubscription}
                        disabled={cancelLoading}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                      >
                        {cancelLoading ? "Resuming..." : "Resume Subscription"}
                      </button>
                    ) : (
                      <button
                        onClick={handleCancelSubscription}
                        disabled={cancelLoading}
                        className="text-sm text-slate-500 hover:text-red-600 disabled:opacity-50"
                      >
                        {cancelLoading ? "Processing..." : "Cancel Subscription"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Change Plan Section */}
            {currentPlan !== "free" && (
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Change Plan</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(["team", "business"] as const).filter(p => p !== currentPlan).map((planKey) => {
                    const targetPlan = PLANS[planKey]
                    const isUpgrade = planKey === "business"
                    return (
                      <div key={planKey} className={`rounded-lg border p-4 ${isUpgrade ? "border-blue-200 bg-blue-50/30" : "border-slate-200"}`}>
                        <h3 className="font-semibold text-slate-900">{targetPlan.name}</h3>
                        <p className="text-sm text-slate-600 mt-1">{targetPlan.description}</p>
                        <p className="text-xl font-bold text-slate-900 mt-2">
                          {formatPrice(targetPlan.priceMonthly)}
                          <span className="text-sm font-normal text-slate-500">/user/mo</span>
                        </p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleChangePlan(planKey, "monthly")}
                            disabled={changePlanLoading}
                            className={`flex-1 text-xs py-2 px-3 rounded-lg font-medium disabled:opacity-50 transition-colors ${
                              isUpgrade
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {changePlanLoading ? "..." : "Monthly"}
                          </button>
                          <button
                            onClick={() => handleChangePlan(planKey, "yearly")}
                            disabled={changePlanLoading}
                            className={`flex-1 text-xs py-2 px-3 rounded-lg font-medium disabled:opacity-50 transition-colors ${
                              isUpgrade
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {changePlanLoading ? "..." : "Yearly (Save 20%)"}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* AI Usage Details */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">AI Usage This Month</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">Credits Used</span>
                  <span className="font-semibold text-slate-900">{data.aiCreditsUsed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">Credits Remaining</span>
                  <span className="font-semibold text-slate-900">
                    {plan.limits.aiCreditsPerUser === null
                      ? "Unlimited"
                      : Math.max(0, data.aiCreditsTotal - data.aiCreditsUsed)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-slate-700">Monthly Allowance</span>
                  <span className="font-semibold text-slate-900">
                    {plan.limits.aiCreditsPerUser === null
                      ? "Unlimited"
                      : `${data.aiCreditsTotal} (${plan.limits.aiCreditsPerUser} per user)`}
                  </span>
                </div>
              </div>

              {currentPlan !== "business" && data.aiCreditsUsed > data.aiCreditsTotal * 0.8 && (
                <div className="mt-4 rounded-lg bg-yellow-50 p-4 border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    You&apos;re using {Math.round((data.aiCreditsUsed / data.aiCreditsTotal) * 100)}% of your monthly AI credits.
                    Consider upgrading to get more credits.
                  </p>
                </div>
              )}
            </div>

            {/* Invoice History */}
            {data.invoices && data.invoices.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Invoice History</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead>
                      <tr>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase pb-3">Date</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase pb-3">Amount</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase pb-3">Status</th>
                        <th className="text-right text-xs font-medium text-slate-500 uppercase pb-3">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="py-3 text-sm text-slate-900">
                            {new Date(invoice.date).toLocaleDateString("en-US", {
                              year: "numeric", month: "short", day: "numeric",
                            })}
                          </td>
                          <td className="py-3 text-sm font-medium text-slate-900">
                            ${(invoice.amount / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              invoice.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : invoice.status === "open"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-slate-100 text-slate-700"
                            }`}>
                              {invoice.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {invoice.invoiceUrl && (
                              <a
                                href={invoice.invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                              >
                                <FileText className="h-4 w-4" />
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.hasStripeAccount && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={openCustomerPortal}
                      disabled={portalLoading}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View all invoices in Stripe Portal →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upgrade CTA */}
            {currentPlan !== "business" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  {currentPlan === "free" ? "Upgrade Your Plan" : "Upgrade to Business"}
                </h3>
                <p className="text-sm text-blue-700 mb-4">
                  {currentPlan === "free"
                    ? "Get access to L10 meetings, integrations, analytics, and more AI credits."
                    : "Unlock custom branding, unlimited AI credits, API access, and SSO."}
                </p>
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {currentPlan === "free" ? "Start Free Trial" : "Upgrade"}
                </button>
              </div>
            )}

            {/* Quick Stats */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-600">Team Members</p>
                  <p className="text-2xl font-bold text-slate-900">{data.activeUsers}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Workspaces</p>
                  <p className="text-2xl font-bold text-slate-900">{data.workspaces}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">AI Operations</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {data.aiCreditsUsed > 0 ? Math.ceil(data.aiCreditsUsed / 5) : 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Need Help */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Need Help?</h3>
              <p className="text-sm text-slate-600 mb-4">
                Questions about billing or your subscription? We&apos;re here to help.
              </p>
              <Link
                href="/contact"
                className="block w-full rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Dialog */}
      <UpgradeDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        currentPlan={currentPlan}
        reason="general"
      />
    </div>
  )
}
