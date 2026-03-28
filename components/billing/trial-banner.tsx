"use client"

import { useState } from "react"
import { X, Clock, ArrowRight } from "lucide-react"
import { useApp } from "@/lib/contexts/app-context"
import { isTrialExpired, getTrialDaysRemaining } from "@/lib/billing/feature-gates"
import { UpgradeDialog } from "./upgrade-dialog"

export function TrialBanner() {
  const { currentOrganization, isDemoMode } = useApp()
  const [dismissed, setDismissed] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)

  if (isDemoMode || dismissed) return null

  // Internal orgs bypass all billing UI
  if (currentOrganization?.isInternal) return null

  const subscription = currentOrganization?.subscription
  if (!subscription) return null

  // Paid plan with past-due or canceled status — show payment failure warning
  if (subscription.plan !== "free") {
    if (subscription.status === "past_due" || subscription.status === "canceled") {
      return (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-red-800">
            <Clock className="h-4 w-4 flex-shrink-0 text-red-500" />
            <span>
              {subscription.status === "past_due"
                ? "Payment failed — please update your billing details to avoid service interruption."
                : "Your subscription has been canceled. Upgrade to restore full access."}
              {" "}
              <a
                href="/app?p=settings"
                className="font-semibold underline hover:no-underline inline-flex items-center gap-1"
              >
                Manage billing <ArrowRight className="h-3 w-3" />
              </a>
            </span>
          </div>
        </div>
      )
    }
    return null
  }

  const daysRemaining = getTrialDaysRemaining(subscription as { plan: "free"; currentPeriodEnd?: string })
  const expired = isTrialExpired(subscription as { plan: "free"; currentPeriodEnd?: string }, currentOrganization?.isInternal)

  // Don't show if trial hasn't started or has tons of time left
  if (!subscription.currentPeriodEnd) return null
  if (daysRemaining > 14 && !expired) return null

  // Expired trial - show blocking wall
  if (expired) {
    return (
      <>
        <TrialExpiredWall onUpgrade={() => setShowUpgrade(true)} />
        <UpgradeDialog
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          currentPlan="free"
          reason="general"
        />
      </>
    )
  }

  // Warning banner for <14 days remaining
  const isUrgent = daysRemaining <= 3
  const bgColor = isUrgent ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"
  const textColor = isUrgent ? "text-red-800" : "text-slate-800"
  const iconColor = isUrgent ? "text-red-500" : "text-slate-500"

  return (
    <>
      <div className={`${bgColor} border-b px-4 py-2.5 flex items-center justify-between gap-3`}>
        <div className={`flex items-center gap-2 text-sm ${textColor}`}>
          <Clock className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
          <span>
            {daysRemaining === 0
              ? "Your free trial expires today!"
              : daysRemaining === 1
                ? "Your free trial expires tomorrow!"
                : `${daysRemaining} days left in your free trial.`}
            {" "}
            <button
              onClick={() => setShowUpgrade(true)}
              className="font-semibold underline hover:no-underline inline-flex items-center gap-1"
            >
              Upgrade now <ArrowRight className="h-3 w-3" />
            </button>
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className={`${isUrgent ? "text-red-400 hover:text-red-600" : "text-slate-400 hover:text-slate-600"} p-1`}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <UpgradeDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        currentPlan="free"
        reason="general"
      />
    </>
  )
}

function TrialExpiredWall({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md max-w-md w-full p-8 text-center border border-slate-200">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Your free trial has ended
        </h2>
        <p className="text-slate-600 mb-6">
          Upgrade to continue using Taskspace with your team. Your data is safe and waiting for you.
        </p>
        <button
          onClick={onUpgrade}
          className="w-full bg-black text-white py-3 px-6 rounded-lg font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
        >
          View Plans & Upgrade <ArrowRight className="h-4 w-4" />
        </button>
        <p className="text-xs text-slate-400 mt-4">
          Plans start at $9/user/month
        </p>
      </div>
    </div>
  )
}
