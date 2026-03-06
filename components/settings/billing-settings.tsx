"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Check,
  Loader2,
  ArrowRight,
  AlertCircle,
  Crown,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  Link2,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { IntegrationLogo } from "@/components/ui/integration-logo"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/contexts/app-context"
import { useToast } from "@/hooks/use-toast"
import { STRIPE_PAYMENT_LINKS, AI_CREDIT_PAYMENT_LINKS } from "@/lib/integrations/stripe-config"

// Plan configurations matching plans.ts and stripe-config.ts
const PLANS = {
  free: {
    name: "Free",
    description: "For individuals getting started",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "3 team members",
      "EOD reports",
      "Rocks & tasks",
      "50 AI credits/user/month",
    ],
    icon: null,
  },
  team: {
    name: "Team",
    description: "For teams running on EOS",
    monthlyPrice: 9,
    yearlyPrice: 86.40,
    features: [
      "25 team members",
      "L10 meetings & IDS board",
      "Scorecard & analytics",
      "Slack, Asana & Calendar sync",
      "200 AI credits/user/month",
    ],
    icon: Sparkles,
    popular: true,
  },
  business: {
    name: "Business",
    description: "For scaling organizations",
    monthlyPrice: 19,
    yearlyPrice: 182.40,
    features: [
      "Unlimited team members",
      "Everything in Team",
      "Custom branding",
      "API access & SSO/SAML",
      "Priority support",
      "Unlimited AI credits",
    ],
    icon: Crown,
  },
}

type PlanKey = keyof typeof PLANS
type BillingCycle = "monthly" | "yearly"

interface SubscriptionInfo {
  plan: PlanKey
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete"
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  billingCycle?: BillingCycle
  maxSeats: number | null
  usedSeats: number
  stripeConfigured: boolean
}

export function BillingSettings() {
  const { currentUser, refreshSession } = useApp()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly")
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)
  const [isManaging, setIsManaging] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [claimSessionId, setClaimSessionId] = useState("")
  const [isClaiming, setIsClaiming] = useState(false)

  const currentPlan = subscription?.plan || "free"
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "owner"

  // Fetch current subscription status
  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch("/api/billing/subscription")
        const data = await response.json()

        if (data.success && data.data) {
          setSubscription({
            ...data.data,
            stripeConfigured: data.data.stripeConfigured ?? true,
          })
          if (data.data.billingCycle) {
            setBillingCycle(data.data.billingCycle)
          }
        }
      } catch {
        // Error fetching subscription
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
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify({ plan, billingCycle }),
        })

        const data = await response.json()

        if (data.success && data.data?.checkoutUrl) {
          window.location.href = data.data.checkoutUrl
        } else {
          // Fall back to payment links if Stripe API checkout fails
          const paymentLink = STRIPE_PAYMENT_LINKS[plan]?.[billingCycle]
          if (paymentLink) {
            window.location.href = paymentLink
          } else {
            throw new Error(data.error || "Failed to create checkout session")
          }
        }
      } else {
        // Already subscribed - upgrade/downgrade
        const response = await fetch("/api/billing/subscription", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
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
      // Last resort: try payment link before showing error
      const paymentLink = STRIPE_PAYMENT_LINKS[plan]?.[billingCycle]
      if (paymentLink && currentPlan === "free") {
        window.location.href = paymentLink
        return
      }
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
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ action: "portal" }),
      })

      const data = await response.json()

      if (data.success && data.data?.url) {
        window.location.href = data.data.url
      } else {
        throw new Error(data.error || "Failed to open billing portal")
      }
    } catch {
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
    setIsManaging(true)
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ action: "cancel" }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Subscription canceled",
          description: "Your subscription will remain active until the end of your current billing period.",
        })
        setSubscription((prev) => prev ? { ...prev, cancelAtPeriodEnd: true } : null)
        setShowCancelDialog(false)
      } else {
        throw new Error(data.error || "Failed to cancel subscription")
      }
    } catch {
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
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
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
    } catch {
      toast({
        title: "Error",
        description: "Failed to resume subscription",
        variant: "destructive",
      })
    } finally {
      setIsManaging(false)
    }
  }

  const handleClaimSubscription = async () => {
    const sessionId = claimSessionId.trim()
    if (!sessionId.startsWith("cs_")) {
      toast({
        title: "Invalid session ID",
        description: "Stripe session IDs start with cs_. Find it in your confirmation email.",
        variant: "destructive",
      })
      return
    }
    setIsClaiming(true)
    try {
      const response = await fetch("/api/billing/claim-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: JSON.stringify({ sessionId }),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Subscription activated", description: "Your subscription has been linked to this organization." })
        setClaimSessionId("")
        // Refresh subscription data
        const res = await fetch("/api/billing/subscription")
        const subData = await res.json()
        if (subData.success && subData.data) {
          setSubscription({ ...subData.data, stripeConfigured: subData.data.stripeConfigured ?? true })
        }
      } else {
        toast({ title: "Could not claim subscription", description: data.error || "Please contact support.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to claim subscription. Please try again.", variant: "destructive" })
    } finally {
      setIsClaiming(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Plan card skeleton */}
        <Card>
          <CardContent className="py-8 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>
        {/* Usage bar skeletons */}
        <Card>
          <CardContent className="py-8 space-y-4">
            <Skeleton className="h-6 w-24" />
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const trialDaysLeft = subscription?.status === "trialing" && subscription.currentPeriodEnd
    ? Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="space-y-4">
      {/* Stripe not configured warning */}
      {subscription && !subscription.stripeConfigured && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Billing is not fully configured. Contact{" "}
            <a href="mailto:support@trytaskspace.com" className="underline font-medium">
              support@trytaskspace.com
            </a>{" "}
            for assistance.
          </AlertDescription>
        </Alert>
      )}

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
                  <Badge variant="default" className="bg-primary">Active</Badge>
                )}
                {subscription?.status === "trialing" && (
                  <>
                    <Badge variant="secondary">Trial</Badge>
                    {trialDaysLeft !== null && (
                      <span className={cn("text-sm font-medium ml-1",
                        trialDaysLeft <= 3 ? "text-red-600" : "text-amber-600")}>
                        {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left
                      </span>
                    )}
                  </>
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

            {currentPlan !== "free" && isAdmin && (
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
                      onClick={() => setShowCancelDialog(true)}
                      disabled={isManaging}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Seat usage bar */}
          {subscription && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-slate-600 font-medium">Team seats</span>
                <span className="text-slate-900 font-semibold">
                  {subscription.usedSeats}
                  {subscription.maxSeats !== null ? ` / ${subscription.maxSeats}` : " / ∞"}
                </span>
              </div>
              {subscription.maxSeats !== null && (
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      subscription.usedSeats >= subscription.maxSeats
                        ? "bg-red-500"
                        : subscription.usedSeats / subscription.maxSeats >= 0.8
                        ? "bg-amber-400"
                        : "bg-primary"
                    )}
                    style={{ width: `${Math.min(100, (subscription.usedSeats / subscription.maxSeats) * 100)}%` }}
                  />
                </div>
              )}
              {subscription.maxSeats !== null && subscription.usedSeats >= subscription.maxSeats && (
                <p className="text-xs text-red-600 mt-1">Seat limit reached — upgrade to add more members.</p>
              )}
            </div>
          )}

          {currentPlan !== "free" && !isAdmin && (
            <p className="mt-2 text-sm text-slate-500">
              Contact an admin to manage billing and subscriptions.
            </p>
          )}

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

      {/* Claim pending subscription — for users who paid via Payment Link before signing up */}
      {currentPlan === "free" && isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4 text-slate-500" />
              Already paid?
            </CardTitle>
            <CardDescription>
              If you purchased a plan via a payment link before signing up, enter your Stripe session ID to activate it.
              Your session ID starts with <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">cs_</code> and can be found in your payment confirmation email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                type="text"
                value={claimSessionId}
                onChange={(e) => setClaimSessionId(e.target.value)}
                placeholder="cs_live_..."
                className="flex-1 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleClaimSubscription}
                disabled={isClaiming || !claimSessionId.trim()}
                className="shrink-0"
              >
                {isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                  Save 20%
                </Badge>
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
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
                      ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20"
                      : isPopular
                      ? "border-primary/30 bg-primary/5"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  {isPopular && !isCurrentPlan && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary">
                      Most Popular
                    </Badge>
                  )}
                  {isCurrentPlan && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary">
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
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={cn(
                      "w-full",
                      isCurrentPlan
                        ? "bg-primary hover:bg-primary/90"
                        : key === "free"
                        ? ""
                        : isPopular
                        ? "bg-primary hover:bg-primary/90"
                        : ""
                    )}
                    variant={isCurrentPlan ? "default" : key === "free" ? "outline" : "default"}
                    disabled={isCurrentPlan || processingPlan !== null || !isAdmin || (key !== "free" && !subscription?.stripeConfigured)}
                    onClick={() => handleUpgrade(key)}
                  >
                    {processingPlan === key ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      "Current Plan"
                    ) : !isAdmin ? (
                      "Admin Only"
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

      {/* AI Credit Add-ons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            AI Credit Add-ons
          </CardTitle>
          <CardDescription>
            Purchase additional AI credits for your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { name: "500 Credits", price: "$10", link: AI_CREDIT_PAYMENT_LINKS.credits_500, savings: null },
              { name: "2,000 Credits", price: "$30", link: AI_CREDIT_PAYMENT_LINKS.credits_2000, savings: "Save $10" },
              { name: "5,000 Credits", price: "$60", link: AI_CREDIT_PAYMENT_LINKS.credits_5000, savings: "Save $40" },
            ].map((pack) => (
              <div
                key={pack.name}
                className="rounded-xl border border-slate-200 p-4 text-center hover:border-slate-300 transition-colors"
              >
                <h4 className="font-semibold">{pack.name}</h4>
                <p className="text-2xl font-bold mt-1">{pack.price}</p>
                <p className="text-xs text-slate-500 mt-0.5">one-time purchase</p>
                {pack.savings && (
                  <Badge variant="secondary" className="mt-2 bg-primary/10 text-primary text-xs">
                    {pack.savings}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => {
                    if (pack.link) {
                      window.open(pack.link, "_blank")
                    } else {
                      toast({
                        title: "Not available",
                        description: "AI credit purchases are not yet configured. Please contact support.",
                        variant: "destructive",
                      })
                    }
                  }}
                >
                  Buy Credits
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Subscription Confirmation */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Cancel your subscription?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Your <strong>{PLANS[currentPlan].name}</strong> plan will remain active until the end of your current billing period
                {subscription?.currentPeriodEnd && (
                  <> ({new Date(subscription.currentPeriodEnd).toLocaleDateString()})</>
                )}.
              </p>
              <p>
                After that, your account will be downgraded to the Free plan. You will lose access to premium features including AI insights, advanced analytics, and integrations.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isManaging}>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={isManaging}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isManaging ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Subscription"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
