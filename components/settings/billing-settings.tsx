"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Check,
  Loader2,
  ArrowRight,
  AlertCircle,
  Crown,
  Building2,
  Sparkles,
  ExternalLink,
} from "lucide-react"
import { IntegrationLogo } from "@/components/ui/integration-logo"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/contexts/app-context"
import { useToast } from "@/hooks/use-toast"

// Plan configurations matching stripe-config.ts and database
const PLANS = {
  free: {
    name: "Free",
    description: "For individuals getting started",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "5 team members",
      "Basic rocks & tasks",
      "EOD reports",
      "100 AI credits/month",
    ],
    icon: null,
  },
  pro: {
    name: "Pro",
    description: "For small teams",
    monthlyPrice: 15,
    yearlyPrice: 144,
    features: [
      "20 team members",
      "AI insights",
      "Team analytics",
      "Asana integration",
      "1,000 AI credits/month",
    ],
    icon: Sparkles,
  },
  team: {
    name: "Team",
    description: "For growing organizations",
    monthlyPrice: 25,
    yearlyPrice: 240,
    features: [
      "100 team members",
      "Everything in Pro",
      "Custom branding",
      "API access",
      "Priority support",
      "5,000 AI credits/month",
    ],
    icon: Crown,
    popular: true,
  },
  enterprise: {
    name: "Enterprise",
    description: "For large organizations",
    monthlyPrice: 75,
    yearlyPrice: 720,
    features: [
      "Unlimited team members",
      "Everything in Team",
      "SSO/SAML",
      "Dedicated support",
      "SLA guarantee",
      "Unlimited AI credits",
    ],
    icon: Building2,
  },
}

type PlanKey = keyof typeof PLANS
type BillingCycle = "monthly" | "yearly"

interface SubscriptionInfo {
  plan: PlanKey
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete"
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  billingCycle?: BillingCycle
}

export function BillingSettings() {
  const { currentOrganization, refreshSession } = useApp()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly")
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)
  const [isManaging, setIsManaging] = useState(false)

  const currentPlan = subscription?.plan || "free"

  // Fetch current subscription status
  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch("/api/billing/subscription")
        const data = await response.json()

        if (data.success && data.data) {
          setSubscription(data.data)
          if (data.data.billingCycle) {
            setBillingCycle(data.data.billingCycle)
          }
        }
      } catch (error) {
        console.error("Failed to fetch subscription:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSubscription()
  }, [])

  const handleUpgrade = async (plan: PlanKey) => {
    if (plan === "free" || plan === currentPlan) return

    setProcessingPlan(plan)
    try {
      // If on free plan, go to checkout
      if (currentPlan === "free") {
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, billingCycle }),
        })

        const data = await response.json()

        if (data.success && data.data?.url) {
          window.location.href = data.data.url
        } else {
          throw new Error(data.error || "Failed to create checkout session")
        }
      } else {
        // Already subscribed - upgrade/downgrade
        const response = await fetch("/api/billing/subscription", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "change_plan",
            plan,
            billingCycle,
          }),
        })

        const data = await response.json()

        if (data.success) {
          toast({
            title: "Plan updated",
            description: `Your subscription has been updated to ${PLANS[plan].name}`,
          })
          await refreshSession()
          setSubscription((prev) => prev ? { ...prev, plan } : null)
        } else {
          throw new Error(data.error || "Failed to update plan")
        }
      }
    } catch (error) {
      console.error("Upgrade failed:", error)
      toast({
        title: "Upgrade failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setProcessingPlan(null)
    }
  }

  const handleManageBilling = async () => {
    setIsManaging(true)
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "portal" }),
      })

      const data = await response.json()

      if (data.success && data.data?.url) {
        window.location.href = data.data.url
      } else {
        throw new Error(data.error || "Failed to open billing portal")
      }
    } catch (error) {
      console.error("Portal failed:", error)
      toast({
        title: "Error",
        description: "Failed to open billing portal",
        variant: "destructive",
      })
    } finally {
      setIsManaging(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You'll retain access until the end of your billing period.")) {
      return
    }

    setIsManaging(true)
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Subscription canceled",
          description: "Your subscription will end at the current billing period",
        })
        setSubscription((prev) => prev ? { ...prev, cancelAtPeriodEnd: true } : null)
      } else {
        throw new Error(data.error || "Failed to cancel subscription")
      }
    } catch (error) {
      console.error("Cancel failed:", error)
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      })
    } finally {
      setIsManaging(false)
    }
  }

  const handleResumeSubscription = async () => {
    setIsManaging(true)
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Subscription resumed",
          description: "Your subscription has been reactivated",
        })
        setSubscription((prev) => prev ? { ...prev, cancelAtPeriodEnd: false } : null)
      } else {
        throw new Error(data.error || "Failed to resume subscription")
      }
    } catch (error) {
      console.error("Resume failed:", error)
      toast({
        title: "Error",
        description: "Failed to resume subscription",
        variant: "destructive",
      })
    } finally {
      setIsManaging(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IntegrationLogo integration="stripe" size="md" />
            Subscription
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{PLANS[currentPlan].name}</span>
                {subscription?.status === "active" && (
                  <Badge variant="default" className="bg-emerald-500">Active</Badge>
                )}
                {subscription?.status === "trialing" && (
                  <Badge variant="default" className="bg-blue-500">Trial</Badge>
                )}
                {subscription?.status === "past_due" && (
                  <Badge variant="destructive">Past Due</Badge>
                )}
                {subscription?.cancelAtPeriodEnd && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    Canceling
                  </Badge>
                )}
              </div>
              {subscription?.currentPeriodEnd && currentPlan !== "free" && (
                <p className="text-sm text-slate-500 mt-1">
                  {subscription.cancelAtPeriodEnd
                    ? `Access until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                    : `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
                </p>
              )}
            </div>

            {currentPlan !== "free" && (
              <div className="flex gap-2">
                {subscription?.cancelAtPeriodEnd ? (
                  <Button
                    variant="outline"
                    onClick={handleResumeSubscription}
                    disabled={isManaging}
                  >
                    {isManaging ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Resume Subscription
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleManageBilling}
                      disabled={isManaging}
                    >
                      {isManaging ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ExternalLink className="h-4 w-4 mr-2" />
                      )}
                      Manage Billing
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleCancelSubscription}
                      disabled={isManaging}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {subscription?.status === "past_due" && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Payment failed</p>
                <p className="text-sm text-red-600">
                  Please update your payment method to maintain access.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 border-red-300 text-red-700 hover:bg-red-100"
                  onClick={handleManageBilling}
                >
                  Update Payment Method
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Plans</CardTitle>
              <CardDescription>Choose the plan that fits your team</CardDescription>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  billingCycle === "monthly"
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-600 hover:text-slate-900"
                )}
                onClick={() => setBillingCycle("monthly")}
              >
                Monthly
              </button>
              <button
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                  billingCycle === "yearly"
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-600 hover:text-slate-900"
                )}
                onClick={() => setBillingCycle("yearly")}
              >
                Yearly
                <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                  Save 20%
                </Badge>
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(Object.entries(PLANS) as [PlanKey, typeof PLANS[PlanKey]][]).map(([key, plan]) => {
              const Icon = plan.icon
              const isCurrentPlan = key === currentPlan
              const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice
              const isPopular = "popular" in plan && plan.popular

              return (
                <div
                  key={key}
                  className={cn(
                    "relative rounded-xl border p-5 transition-all",
                    isCurrentPlan
                      ? "border-emerald-300 bg-emerald-50/50 ring-1 ring-emerald-200"
                      : isPopular
                      ? "border-blue-300 bg-blue-50/30"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  {isPopular && !isCurrentPlan && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600">
                      Most Popular
                    </Badge>
                  )}
                  {isCurrentPlan && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-600">
                      Current Plan
                    </Badge>
                  )}

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      {Icon && <Icon className="h-5 w-5 text-slate-600" />}
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                    </div>
                    <p className="text-sm text-slate-500">{plan.description}</p>
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold">
                      ${billingCycle === "yearly" ? Math.round(price / 12) : price}
                    </span>
                    <span className="text-slate-500">/month</span>
                    {billingCycle === "yearly" && price > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        ${price} billed annually
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={cn(
                      "w-full",
                      isCurrentPlan
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : key === "free"
                        ? ""
                        : isPopular
                        ? "bg-blue-600 hover:bg-blue-700"
                        : ""
                    )}
                    variant={isCurrentPlan ? "default" : key === "free" ? "outline" : "default"}
                    disabled={isCurrentPlan || processingPlan !== null}
                    onClick={() => handleUpgrade(key)}
                  >
                    {processingPlan === key ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      "Current Plan"
                    ) : key === "free" ? (
                      "Downgrade"
                    ) : currentPlan === "free" ? (
                      <>
                        Get Started <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      <>
                        {PLANS[key].monthlyPrice > PLANS[currentPlan].monthlyPrice
                          ? "Upgrade"
                          : "Change Plan"}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
