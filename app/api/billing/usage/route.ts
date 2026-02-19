import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserWorkspaces } from "@/lib/db/workspaces"
import { PLANS, type PlanTier } from "@/lib/billing/plans"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { withAuth } from "@/lib/api/middleware"

interface BillingUsageResponse {
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

/**
 * GET /api/billing/usage
 * Get billing and usage statistics for the organization
 */
export const GET = withAuth(async (request, auth) => {
  try {
    const org = auth.organization
    const currentPlan = (org.subscription?.plan || "free") as PlanTier
    const plan = PLANS[currentPlan]

    // Get usage data
    const members = await db.members.findByOrganizationId(org.id)
    const workspaces = await getUserWorkspaces(auth.user.id)
    const activeUsers = members.filter(m => m.status === "active").length

    // Get AI usage from subscription or database
    const subscription = await db.subscriptions.findByOrganizationId(org.id)
    const aiCreditsUsed = subscription?.aiCreditsUsed || org.subscription?.aiCreditsUsed || 0
    const aiCreditsTotal = plan.limits.aiCreditsPerUser === null
      ? -1
      : plan.limits.aiCreditsPerUser * activeUsers

    return NextResponse.json<ApiResponse<BillingUsageResponse>>({
      success: true,
      data: {
        currentPlan,
        activeUsers,
        workspaces: workspaces.length,
        managers: members.filter(m => m.role === "admin").length,
        aiCreditsUsed,
        aiCreditsTotal,
        subscription: org.subscription ? {
          status: org.subscription.status,
          billingCycle: org.subscription.billingCycle || undefined,
          currentPeriodEnd: org.subscription.currentPeriodEnd || undefined,
        } : null,
        stripeCustomerId: auth.member.role === "admin" || auth.member.role === "owner" ? org.stripeCustomerId : undefined,
      },
    })
  } catch (error) {
    logError(logger, "Get usage error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get usage statistics" },
      { status: 500 }
    )
  }
})
