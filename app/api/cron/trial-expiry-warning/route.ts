import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/sql"
import { isEmailConfigured, sendBillingAlertEmail } from "@/lib/integrations/email"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { verifyCronSecret } from "@/lib/api/cron-auth"

// Runs daily at 10 AM UTC — configured in vercel.json
// Sends trial expiry warning to free-plan orgs expiring within 7 days
// Skips orgs with an active Stripe subscription (they get the Stripe trial_will_end webhook)

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isEmailConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Email not configured" },
        { status: 503 }
      )
    }

    logger.info({ timestamp: new Date().toISOString() }, "Running trial expiry warning cron")

    // Find free-plan orgs expiring within the next 7 days
    // Skip orgs with an active Stripe subscription (they get the Stripe trial_will_end webhook)
    const { rows: expiringOrgs } = await sql<{
      id: string
      name: string
      subscription: Record<string, unknown>
    }>`
      SELECT id, name, subscription
      FROM organizations
      WHERE stripe_subscription_id IS NULL
        AND is_internal = false
        AND (subscription->>'plan' = 'free' OR subscription->>'plan' IS NULL)
        AND (subscription->>'currentPeriodEnd') IS NOT NULL
        AND (subscription->>'currentPeriodEnd')::timestamptz > NOW()
        AND (subscription->>'currentPeriodEnd')::timestamptz <= NOW() + INTERVAL '7 days'
    `

    logger.info({ count: expiringOrgs.length }, "Found orgs with expiring trials")

    const results: { orgId: string; orgName: string; status: string }[] = []

    for (const org of expiringOrgs) {
      try {
        const trialEnd = org.subscription?.currentPeriodEnd as string | null
        const trialEndDate = trialEnd
          ? new Date(trialEnd).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
          : "soon"

        const { rows: adminUsers } = await sql`
          SELECT u.email, u.name
          FROM users u
          JOIN organization_members om ON om.user_id = u.id
          WHERE om.organization_id = ${org.id}
            AND (om.role = 'admin' OR om.role = 'owner')
            AND u.email IS NOT NULL
        `

        if (adminUsers.length === 0) {
          results.push({ orgId: org.id, orgName: org.name, status: "no_admins" })
          continue
        }

        await sendBillingAlertEmail({
          to: adminUsers.map(u => u.email as string),
          subject: `Your ${org.name} free trial expires ${trialEndDate}`,
          alertType: "trial_ending",
          organizationName: org.name,
          message: "Your free trial is ending soon.",
          details: `Your trial expires on ${trialEndDate}. Upgrade to a paid plan to keep access to all Taskspace features.`,
        })

        logger.info({ orgId: org.id, orgName: org.name, adminCount: adminUsers.length }, "Trial expiry warning sent")
        results.push({ orgId: org.id, orgName: org.name, status: "sent" })
      } catch (orgError) {
        logError(logger, `Trial expiry warning failed for org ${org.id}`, orgError)
        results.push({ orgId: org.id, orgName: org.name, status: "error" })
      }
    }

    const sent = results.filter(r => r.status === "sent").length
    return NextResponse.json<ApiResponse<{ results: typeof results }>>({
      success: true,
      data: { results },
      message: `Sent ${sent} trial expiry warnings out of ${expiringOrgs.length} expiring orgs`,
    })
  } catch (error) {
    logError(logger, "Trial expiry warning cron error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to run trial expiry warning cron" },
      { status: 500 }
    )
  }
}
