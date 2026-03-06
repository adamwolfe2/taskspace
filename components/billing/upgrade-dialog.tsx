"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2, Sparkles, Crown, ArrowRight, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { STRIPE_PAYMENT_LINKS } from "@/lib/integrations/stripe-config"

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan?: string
  reason?: "credits" | "seats" | "feature" | "general"
  featureName?: string
}

const PLANS = {
  team: {
    name: "Team",
    description: "For teams running on EOS",
    monthlyPrice: 9,
    yearlyPrice: 86.40,
    aiCredits: 200,
    maxSeats: 25,
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
    aiCredits: -1,
    maxSeats: null,
    features: [
      "Unlimited team members",
      "Unlimited AI credits",
      "Custom branding & API access",
      "SSO/SAML",
      "Priority support",
    ],
    icon: Crown,
  },
}

type PlanKey = keyof typeof PLANS

export function UpgradeDialog({
  open,
  onOpenChange,
  currentPlan = "free",
  reason = "general",
  featureName,
}: UpgradeDialogProps) {
  const { toast } = useToast()
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly")
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)

  const getDialogTitle = () => {
    switch (reason) {
      case "credits":
        return "Need More AI Credits?"
      case "seats":
        return "Need More Team Members?"
      case "feature":
        return `Unlock ${featureName || "This Feature"}`
      default:
        return "Upgrade Your Plan"
    }
  }

  const getDialogDescription = () => {
    switch (reason) {
      case "credits":
        return "Upgrade to get more AI credits and unlock powerful features for your team."
      case "seats":
        return "Upgrade to add more team members to your workspace."
      case "feature":
        return `${featureName || "This feature"} requires an upgraded plan. Choose the best option for your team.`
      default:
        return "Choose the plan that best fits your team's needs."
    }
  }

  const handleUpgrade = async (plan: PlanKey) => {
    setProcessingPlan(plan)
    try {
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
    } catch (error) {
      // Last resort: try payment link before showing error
      const paymentLink = STRIPE_PAYMENT_LINKS[plan]?.[billingCycle]
      if (paymentLink) {
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

  // Filter plans to only show upgrades from current plan
  const availablePlans = Object.entries(PLANS).filter(([key]) => {
    const planOrder = ["free", "team", "business"]
    return planOrder.indexOf(key) > planOrder.indexOf(currentPlan)
  }) as [PlanKey, typeof PLANS[PlanKey]][]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center py-4">
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

        {/* Plans Grid */}
        <div className={cn(
          "grid gap-4",
          availablePlans.length === 1 ? "grid-cols-1 max-w-sm mx-auto" :
          availablePlans.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"
        )}>
          {availablePlans.map(([key, plan]) => {
            const Icon = plan.icon
            const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice
            const isPopular = "popular" in plan && plan.popular

            return (
              <div
                key={key}
                className={cn(
                  "relative rounded-xl border p-5 transition-all",
                  isPopular
                    ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20"
                    : "border-slate-200"
                )}
              >
                {isPopular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary">
                    Recommended
                  </Badge>
                )}

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-5 w-5 text-slate-600" />
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                  </div>
                  <p className="text-sm text-slate-500">{plan.description}</p>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold">
                    ${billingCycle === "yearly" ? Math.round(price / 12) : price}
                  </span>
                  <span className="text-slate-500">/month</span>
                  {billingCycle === "yearly" && (
                    <p className="text-xs text-slate-500 mt-1">
                      ${price} billed annually
                    </p>
                  )}
                </div>

                {/* Highlight relevant feature based on reason */}
                {reason === "credits" && (
                  <div className="mb-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-1.5 text-sm text-amber-800">
                      <Zap className="h-4 w-4" />
                      <span className="font-medium">
                        {plan.aiCredits === -1 ? "Unlimited" : plan.aiCredits.toLocaleString()} AI credits/mo
                      </span>
                    </div>
                  </div>
                )}

                {reason === "seats" && (
                  <div className="mb-3 p-2 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-1.5 text-sm text-primary">
                      <span className="font-medium">
                        {plan.maxSeats === null ? "Unlimited" : plan.maxSeats} team members
                      </span>
                    </div>
                  </div>
                )}

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
                    isPopular ? "bg-primary hover:bg-primary/90" : ""
                  )}
                  disabled={processingPlan !== null}
                  onClick={() => handleUpgrade(key)}
                >
                  {processingPlan === key ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Upgrade to {plan.name}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-500 mt-4">
          All plans include a 14-day money-back guarantee. Cancel anytime.
        </p>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook to show upgrade dialog easily
 */
export function useUpgradeDialog() {
  const [state, setState] = useState<{
    open: boolean
    reason?: "credits" | "seats" | "feature" | "general"
    featureName?: string
  }>({ open: false })

  const showUpgradeDialog = (
    reason?: "credits" | "seats" | "feature" | "general",
    featureName?: string
  ) => {
    setState({ open: true, reason, featureName })
  }

  const hideUpgradeDialog = () => {
    setState({ open: false })
  }

  return {
    ...state,
    showUpgradeDialog,
    hideUpgradeDialog,
    setOpen: (open: boolean) => setState((prev) => ({ ...prev, open })),
  }
}
