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
import { Check, Loader2, Sparkles, Crown, Building2, ArrowRight, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan?: string
  reason?: "credits" | "seats" | "feature" | "general"
  featureName?: string
}

const PLANS = {
  starter: {
    name: "Starter",
    description: "For small teams",
    monthlyPrice: 29,
    yearlyPrice: 290,
    aiCredits: 500,
    maxSeats: 15,
    features: [
      "15 team members",
      "500 AI credits/month",
      "Email notifications",
      "Basic analytics",
      "Email support",
    ],
    icon: Sparkles,
  },
  professional: {
    name: "Professional",
    description: "For growing organizations",
    monthlyPrice: 79,
    yearlyPrice: 790,
    aiCredits: 2000,
    maxSeats: 50,
    features: [
      "50 team members",
      "2,000 AI credits/month",
      "Advanced analytics",
      "AI insights",
      "Custom branding",
      "API access",
      "Priority support",
    ],
    icon: Crown,
    popular: true,
  },
  enterprise: {
    name: "Enterprise",
    description: "For large organizations",
    monthlyPrice: 199,
    yearlyPrice: 1990,
    aiCredits: -1,
    maxSeats: null,
    features: [
      "Unlimited team members",
      "Unlimited AI credits",
      "SSO/SAML",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
    ],
    icon: Building2,
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingCycle }),
      })

      const data = await response.json()

      if (data.success && data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl
      } else {
        throw new Error(data.error || "Failed to create checkout session")
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

  // Filter plans to only show upgrades from current plan
  const availablePlans = Object.entries(PLANS).filter(([key]) => {
    const planOrder = ["free", "starter", "professional", "enterprise"]
    return planOrder.indexOf(key) > planOrder.indexOf(currentPlan)
  }) as [PlanKey, typeof PLANS[PlanKey]][]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
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
              <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                Save 17%
              </Badge>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className={cn(
          "grid gap-4",
          availablePlans.length === 1 ? "grid-cols-1 max-w-md mx-auto" :
          availablePlans.length === 2 ? "grid-cols-2" : "grid-cols-3"
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
                    ? "border-blue-300 bg-blue-50/30 ring-1 ring-blue-200"
                    : "border-slate-200"
                )}
              >
                {isPopular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600">
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
                  <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-1.5 text-sm text-blue-800">
                      <span className="font-medium">
                        {plan.maxSeats === null ? "Unlimited" : plan.maxSeats} team members
                      </span>
                    </div>
                  </div>
                )}

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
                    isPopular ? "bg-blue-600 hover:bg-blue-700" : ""
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
