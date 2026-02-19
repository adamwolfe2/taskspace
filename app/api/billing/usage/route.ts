import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { getUserWorkspaces } from "@/lib/db/workspaces"
import { PLANS, type PlanTier } from "@/lib/billing/plans"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { withAuth } from "@/lib/api/middleware"

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
    cancelAtPeriodEnd?: boolean
    trialEnd?: string
  } | null
  stripeCustomerId?: string
  invoices?: InvoiceRecord[]
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
    const isAdminOrOwner = auth.member.role === "admin" || auth.member.role === "owner"

    // Get usage data
    const members = await db.members.findByOrganizationId(org.id)
    const workspaces = await getUserWorkspaces(auth.user.id, auth.organization.id)
    const activeUsers = members.filter(m => m.status === "active").length

    // Get AI usage from subscription or database
    const subscription = await db.subscriptions.findByOrganizationId(org.id)
    const aiCreditsUsed = subscription?.aiCreditsUsed || org.subscription?.aiCreditsUsed || 0
    const aiCreditsTotal = plan.limits.aiCreditsPerUser === null
      ? -1
      : plan.limits.aiCreditsPerUser * activeUsers

    // Get invoice history for admins
    let invoices: InvoiceRecord[] = []
    if (isAdminOrOwner) {
      try {
        const { rows } = await sql<{
          id: string
          amount: number
          currency: string
          status: string
          created_at: string
          invoice_url: string | null
          billing_period_start: string | null
          billing_period_end: string | null
        }>`
          SELECT id, amount, currency, status, created_at, invoice_url,
                 billing_period_start, billing_period_end
          FROM billing_history
          WHERE organization_id = ${org.id}
          ORDER BY created_at DESC
          LIMIT 12
        `
        invoices = rows.map(r => ({
          id: r.id,
          amount: r.amount,
          currency: r.currency || "usd",
          status: r.status,
          date: r.created_at,
          invoiceUrl: r.invoice_url || undefined,
          periodStart: r.billing_period_start || undefined,
          periodEnd: r.billing_period_end || undefined,
        }))
      } catch {
        // billing_history table may not exist yet — non-critical
      }
    }

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
          cancelAtPeriodEnd: org.subscription.cancelAtPeriodEnd || undefined,
          trialEnd: org.subscription.trialEnd || org.subscription.currentPeriodEnd || undefined,
        } : null,
        stripeCustomerId: isAdminOrOwner ? org.stripeCustomerId : undefined,
        invoices: isAdminOrOwner ? invoices : undefined,
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
