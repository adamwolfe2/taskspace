/**
 * Canonical trial & subscription status checks.
 *
 * Single source of truth — used by both API middleware and feature gates
 * to avoid divergent trial-expiry logic.
 */

export interface SubscriptionInfo {
  plan: string
  status: string
  currentPeriodEnd?: string | null
}

/**
 * Returns true when the org is on an active trial that has NOT expired.
 *
 * Covers both representations:
 *  1. Stripe "trialing" status with a currentPeriodEnd in the future
 *  2. Free plan with a trial-end date still in the future
 */
export function isTrialActive(
  subscription?: SubscriptionInfo | null,
  isInternal?: boolean
): boolean {
  if (isInternal) return false // Internal orgs don't trial
  if (!subscription) return false

  // Stripe trialing status
  if (subscription.status === "trialing") {
    if (!subscription.currentPeriodEnd) return true // No end date → still valid
    return new Date(subscription.currentPeriodEnd) > new Date()
  }

  // Free plan with a trial window
  if (subscription.plan === "free" && subscription.currentPeriodEnd) {
    return new Date(subscription.currentPeriodEnd) > new Date()
  }

  return false
}

/**
 * Returns true when the org had a trial that has now expired.
 */
export function isTrialExpired(
  subscription?: SubscriptionInfo | null,
  isInternal?: boolean
): boolean {
  if (isInternal) return false
  if (!subscription) return false

  // Stripe trialing status with expired period
  if (subscription.status === "trialing" && subscription.currentPeriodEnd) {
    return new Date(subscription.currentPeriodEnd) <= new Date()
  }

  // Free plan with expired trial window
  if (subscription.plan === "free" && subscription.currentPeriodEnd) {
    return new Date(subscription.currentPeriodEnd) <= new Date()
  }

  return false
}

/**
 * Returns true when the subscription is in a usable state
 * (active, past_due in dunning, or valid trial).
 */
export function isSubscriptionActive(
  subscription?: SubscriptionInfo | null,
  isInternal?: boolean
): boolean {
  if (isInternal) return true
  if (!subscription) return false

  // Free plan always has access (feature gates handle limits)
  if (subscription.plan === "free" && !subscription.currentPeriodEnd) return true

  // Active or dunning
  if (subscription.status === "active" || subscription.status === "past_due") return true

  // Active trial
  if (isTrialActive(subscription)) return true

  return false
}

/**
 * Days remaining in trial (0 if not trialing or expired).
 */
export function getTrialDaysRemaining(
  subscription?: SubscriptionInfo | null
): number {
  if (!subscription?.currentPeriodEnd) return 0

  const isTrialing =
    subscription.status === "trialing" ||
    (subscription.plan === "free" && !!subscription.currentPeriodEnd)

  if (!isTrialing) return 0

  const diffMs = new Date(subscription.currentPeriodEnd).getTime() - Date.now()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}
