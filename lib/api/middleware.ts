/**
 * API Route Middleware
 *
 * Reusable middleware wrappers for API routes to handle:
 * - Authentication (session + API key)
 * - Authorization (role-based access)
 * - Workspace validation
 * - Error handling
 *
 * Usage:
 * ```typescript
 * // Standard auth - requires any authenticated user
 * export const GET = withAuth(async (request, auth) => {
 *   // auth is guaranteed to exist here
 *   return NextResponse.json({ data: "..." })
 * })
 *
 * // Admin-only route
 * export const POST = withAdmin(async (request, auth) => {
 *   // auth.member.role is "owner" or "admin"
 *   return NextResponse.json({ data: "..." })
 * })
 *
 * // Owner-only route
 * export const DELETE = withOwner(async (request, auth) => {
 *   // auth.member.role is "owner"
 *   return NextResponse.json({ data: "..." })
 * })
 *
 * // Workspace access validation (for multi-tenant routes)
 * export const GET = withWorkspaceAccess(async (request, auth, workspaceId) => {
 *   // User access to workspaceId is guaranteed
 *   return NextResponse.json({ data: "..." })
 * })
 * ```
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, getUserAuthContext, isAdmin, isOwner, type AuthContext, type UserAuthContext } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess, getUserWorkspaceRole } from "@/lib/db/workspaces"
import { handleError } from "@/lib/api/errors"
import { checkOrgRateLimit, getRateLimitHeaders } from "@/lib/auth/rate-limit"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { isTrialExpired as checkTrialExpired } from "@/lib/billing/trial"

/**
 * API paths that must remain accessible regardless of subscription status.
 * Users need billing routes to upgrade, auth routes to log in/out.
 */
const SUBSCRIPTION_EXEMPT_PREFIXES = [
  "/api/billing",
  "/api/auth",
  "/api/health",
  "/api/cron",
  "/api/onboarding",
]

/**
 * Enforce subscription status server-side. Returns a 402 response if the
 * org's paid trial has expired or subscription was canceled before the
 * webhook could downgrade the plan to free.
 *
 * Free-plan orgs always pass through — feature gating handles their limits.
 * Past-due orgs keep access during the dunning grace period.
 *
 * Returns null if access should be allowed, or a 402 NextResponse to return immediately.
 */
function checkSubscriptionOrRespond(
  request: NextRequest,
  auth: AuthContext
): NextResponse<ApiResponse<null>> | null {
  const sub = auth.organization.subscription

  // Free plan without a trial window always has access — feature gating handles limits
  if (!sub || (sub.plan === "free" && !sub.currentPeriodEnd)) return null

  // Active and past_due subscriptions are allowed
  // (past_due enters dunning — access continues until subscription.deleted fires)
  if (sub.status === "active" || sub.status === "past_due") return null

  // Determine if the request path is exempt from enforcement
  const pathname = new URL(request.url).pathname
  if (SUBSCRIPTION_EXEMPT_PREFIXES.some(p => pathname.startsWith(p))) return null

  // Canonical trial expiry check — covers both "trialing" status and free-plan trials
  if (checkTrialExpired(sub)) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "Your free trial has expired. Please upgrade to continue using Taskspace.",
        code: "TRIAL_EXPIRED",
      },
      { status: 402 }
    )
  }

  // Still in an active trial
  if (sub.status === "trialing") return null

  // Canceled: webhook should have set plan to "free", but guard anyway
  if (sub.status === "canceled") {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "Your subscription has been canceled. Please renew to continue.",
        code: "SUBSCRIPTION_CANCELED",
      },
      { status: 402 }
    )
  }

  return null
}

/**
 * Check org-level rate limit and return 429 response if exceeded.
 * Returns null if within limits, or a NextResponse to return immediately.
 */
function checkOrgRateLimitOrRespond(auth: AuthContext): NextResponse<ApiResponse<null>> | null {
  // Allow bypassing rate limits in E2E/Playwright test environments
  if (process.env.PLAYWRIGHT_TEST === "true") return null
  const plan = auth.organization.subscription?.plan || "free"
  const result = checkOrgRateLimit(auth.organization.id, plan)
  if (!result.success) {
    const headers = getRateLimitHeaders(result)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Organization rate limit exceeded. Please try again later." },
      { status: 429, headers }
    )
  }
  return null
}

/**
 * CSRF protection via custom header check.
 *
 * For state-changing requests (POST/PUT/PATCH/DELETE) using cookie auth,
 * require the X-Requested-With header. Cross-origin requests cannot set
 * custom headers without a CORS preflight, and our server does not include
 * CORS headers allowing other origins — so this blocks cross-site request forgery.
 *
 * Safe methods (GET/HEAD/OPTIONS) and API key requests are exempt.
 */
function verifyCsrfHeader(request: NextRequest): boolean {
  const safeMethod = ["GET", "HEAD", "OPTIONS"].includes(request.method)
  if (safeMethod) return true
  // API key requests use Authorization header, not cookies — CSRF not applicable
  if (request.headers.get("authorization")?.startsWith("Bearer ")) return true
  return request.headers.get("x-requested-with") === "XMLHttpRequest"
}

/**
 * Type for authenticated API route handler
 * context is optional - only present for dynamic routes (e.g., /api/foo/[id])
 */
export type AuthenticatedHandler<T = unknown> = (
  request: NextRequest,
  auth: AuthContext,
  context?: RouteContext
) => Promise<NextResponse<T>>

/**
 * Type for workspace-scoped API route handler
 */
export type WorkspaceHandler<T = unknown> = (
  request: NextRequest,
  auth: AuthContext,
  workspaceId: string
) => Promise<NextResponse<T>>

/**
 * Type for route context (for dynamic routes)
 * Next.js 16+ uses async params
 */
export type RouteContext = {
  params: Promise<Record<string, string>>
}

/**
 * Standard auth wrapper - requires any authenticated user
 *
 * @example
 * export const GET = withAuth(async (request, auth) => {
 *   const data = await db.query(auth.organization.id)
 *   return NextResponse.json({ success: true, data })
 * })
 */
export function withAuth(
  handler: AuthenticatedHandler<ApiResponse<unknown>>
): (request: NextRequest, context?: RouteContext) => Promise<NextResponse<ApiResponse<unknown>>> {
  return async (request: NextRequest, context?: RouteContext) => {
    try {
      if (!verifyCsrfHeader(request)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Forbidden: Missing CSRF header" },
          { status: 403 }
        )
      }

      const auth = await getAuthContext(request)

      if (!auth) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        )
      }

      const scopeResponse = enforceApiKeyScopes(request, auth)
      if (scopeResponse) return scopeResponse

      const orgLimitResponse = checkOrgRateLimitOrRespond(auth)
      if (orgLimitResponse) return orgLimitResponse

      const subResponse = checkSubscriptionOrRespond(request, auth)
      if (subResponse) return subResponse

      return await handler(request, auth, context)
    } catch (error) {
      return handleError(error)
    }
  }
}

/**
 * User-only auth wrapper - requires authenticated user but NOT organization membership.
 * Used during onboarding when the user has a session but hasn't created an org yet.
 *
 * @example
 * export const POST = withUserAuth(async (request, auth) => {
 *   // auth.user is guaranteed, but no organization or member
 *   return NextResponse.json({ success: true })
 * })
 */
export type UserAuthHandler<T = unknown> = (
  request: NextRequest,
  auth: UserAuthContext,
  context?: RouteContext
) => Promise<NextResponse<T>>

export function withUserAuth(
  handler: UserAuthHandler<ApiResponse<unknown>>
): (request: NextRequest, context?: RouteContext) => Promise<NextResponse<ApiResponse<unknown>>> {
  return async (request: NextRequest, context?: RouteContext) => {
    try {
      if (!verifyCsrfHeader(request)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Forbidden: Missing CSRF header" },
          { status: 403 }
        )
      }

      const auth = await getUserAuthContext(request)

      if (!auth) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        )
      }

      return await handler(request, auth, context)
    } catch (error) {
      return handleError(error)
    }
  }
}

/**
 * Admin-only wrapper - requires "owner" or "admin" role
 *
 * @example
 * export const POST = withAdmin(async (request, auth) => {
 *   // Only admins can reach here
 *   await db.performAdminAction()
 *   return NextResponse.json({ success: true })
 * })
 */
export function withAdmin(
  handler: AuthenticatedHandler<ApiResponse<unknown>>
): (request: NextRequest, context?: RouteContext) => Promise<NextResponse<ApiResponse<unknown>>> {
  return async (request: NextRequest, context?: RouteContext) => {
    try {
      if (!verifyCsrfHeader(request)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Forbidden: Missing CSRF header" },
          { status: 403 }
        )
      }

      const auth = await getAuthContext(request)

      if (!auth) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        )
      }

      if (!isAdmin(auth)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Forbidden: Admin access required" },
          { status: 403 }
        )
      }

      const scopeResponse = enforceApiKeyScopes(request, auth)
      if (scopeResponse) return scopeResponse

      const orgLimitResponse = checkOrgRateLimitOrRespond(auth)
      if (orgLimitResponse) return orgLimitResponse

      const subResponse = checkSubscriptionOrRespond(request, auth)
      if (subResponse) return subResponse

      return await handler(request, auth, context)
    } catch (error) {
      return handleError(error)
    }
  }
}

/**
 * Owner-only wrapper - requires "owner" role
 *
 * @example
 * export const DELETE = withOwner(async (request, auth) => {
 *   // Only workspace owner can reach here
 *   await db.deleteOrganization(auth.organization.id)
 *   return NextResponse.json({ success: true })
 * })
 */
export function withOwner(
  handler: AuthenticatedHandler<ApiResponse<unknown>>
): (request: NextRequest, context?: RouteContext) => Promise<NextResponse<ApiResponse<unknown>>> {
  return async (request: NextRequest, context?: RouteContext) => {
    try {
      if (!verifyCsrfHeader(request)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Forbidden: Missing CSRF header" },
          { status: 403 }
        )
      }

      const auth = await getAuthContext(request)

      if (!auth) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        )
      }

      if (!isOwner(auth)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Forbidden: Owner access required" },
          { status: 403 }
        )
      }

      const scopeResponse = enforceApiKeyScopes(request, auth)
      if (scopeResponse) return scopeResponse

      const orgLimitResponse = checkOrgRateLimitOrRespond(auth)
      if (orgLimitResponse) return orgLimitResponse

      const subResponse = checkSubscriptionOrRespond(request, auth)
      if (subResponse) return subResponse

      return await handler(request, auth, context)
    } catch (error) {
      return handleError(error)
    }
  }
}

/**
 * Owner-only wrapper for dangerous admin operations (migrations, DDL, force-updates).
 * Requires owner role + ADMIN_OPS_SECRET env var in production.
 * Blocks API key access entirely.
 */
export function withDangerousAdmin(
  handler: AuthenticatedHandler<ApiResponse<unknown>>
): (request: NextRequest, context?: RouteContext) => Promise<NextResponse<ApiResponse<unknown>>> {
  return async (request: NextRequest, context?: RouteContext) => {
    try {
      if (!verifyCsrfHeader(request)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Forbidden: Missing CSRF header" },
          { status: 403 }
        )
      }

      const auth = await getAuthContext(request)

      if (!auth) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        )
      }

      // Block API key access — dangerous ops require a real session
      if (auth.isApiKey) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Forbidden: API keys cannot access admin operations" },
          { status: 403 }
        )
      }

      if (!isOwner(auth)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Forbidden: Owner access required" },
          { status: 403 }
        )
      }

      // In production, require ADMIN_OPS_SECRET env var to be set
      if (process.env.NODE_ENV === "production") {
        const secret = process.env.ADMIN_OPS_SECRET
        if (!secret) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "Admin operations are disabled in production (ADMIN_OPS_SECRET not configured)" },
            { status: 403 }
          )
        }
        const headerSecret = request.headers.get("x-admin-secret")
        if (headerSecret !== secret) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "Forbidden: Invalid or missing admin secret" },
            { status: 403 }
          )
        }
      }

      return await handler(request, auth, context)
    } catch (error) {
      return handleError(error)
    }
  }
}

/**
 * Super admin wrapper - requires is_super_admin flag on user record.
 * Used for cross-org read operations (portfolio dashboard, org drill-down).
 * Blocks API key access entirely.
 */
export function withSuperAdmin(
  handler: AuthenticatedHandler<ApiResponse<unknown>>
): (request: NextRequest, context?: RouteContext) => Promise<NextResponse<ApiResponse<unknown>>> {
  return async (request: NextRequest, context?: RouteContext) => {
    try {
      if (!verifyCsrfHeader(request)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Forbidden: Missing CSRF header" },
          { status: 403 }
        )
      }

      const auth = await getAuthContext(request)

      if (!auth) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        )
      }

      if (auth.isApiKey) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Forbidden: API keys cannot access super admin operations" },
          { status: 403 }
        )
      }

      if (!auth.isSuperAdmin) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Forbidden: Super admin access required" },
          { status: 403 }
        )
      }

      return await handler(request, auth, context)
    } catch (error) {
      return handleError(error)
    }
  }
}

/**
 * Check if request method is state-changing (not safe/read-only)
 */
function isWriteMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method)
}

/**
 * Enforce API key scopes against the request method.
 * Returns null if allowed, or a 403 response if the scope is insufficient.
 *
 * Scope mapping:
 * - "read"  → GET, HEAD, OPTIONS
 * - "write" → POST, PUT, PATCH, DELETE
 */
function enforceApiKeyScopes(request: NextRequest, auth: AuthContext): NextResponse<ApiResponse<null>> | null {
  // SECURITY: If not an API key request, skip scope checking
  if (!auth.isApiKey) return null

  // SECURITY: API keys MUST have explicit scopes - no null defaults
  if (!auth.apiKeyScopes || auth.apiKeyScopes.length === 0) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Forbidden: API key has no scopes defined" },
      { status: 403 }
    )
  }

  const requiredScope = isWriteMethod(request.method) ? "write" : "read"

  if (!auth.apiKeyScopes.includes(requiredScope)) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: `Forbidden: API key lacks '${requiredScope}' scope` },
      { status: 403 }
    )
  }

  return null
}

/**
 * Workspace access wrapper - validates user has access to workspace from query param
 *
 * Extracts workspaceId from query parameters and validates user access.
 * Viewers are blocked from state-changing requests (POST/PUT/PATCH/DELETE).
 * If validation passes, handler receives the validated workspaceId.
 *
 * @example
 * export const GET = withWorkspaceAccess(async (request, auth, workspaceId) => {
 *   // User access to workspaceId is guaranteed
 *   const data = await db.getWorkspaceData(workspaceId)
 *   return NextResponse.json({ success: true, data })
 * })
 */
export function withWorkspaceAccess(
  handler: WorkspaceHandler<ApiResponse<unknown>>
): (request: NextRequest, _context?: RouteContext) => Promise<NextResponse<ApiResponse<unknown>>> {
  return async (request: NextRequest, _context?: RouteContext) => {
    try {
      if (!verifyCsrfHeader(request)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Forbidden: Missing CSRF header" },
          { status: 403 }
        )
      }

      const auth = await getAuthContext(request)

      if (!auth) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        )
      }

      const scopeResponse = enforceApiKeyScopes(request, auth)
      if (scopeResponse) return scopeResponse

      // Extract workspaceId from query params
      const { searchParams } = new URL(request.url)
      const workspaceId = searchParams.get("workspaceId")

      if (!workspaceId) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "workspaceId is required" },
          { status: 400 }
        )
      }

      // Validate workspace access
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
      if (!hasAccess) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Forbidden: No access to this workspace" },
          { status: 403 }
        )
      }

      // RBAC: Viewers can only read, not write
      if (isWriteMethod(request.method)) {
        const role = await getUserWorkspaceRole(auth.user.id, workspaceId)
        if (role === "viewer") {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "Forbidden: Viewer role cannot perform write operations" },
            { status: 403 }
          )
        }
      }

      const orgLimitResponse = checkOrgRateLimitOrRespond(auth)
      if (orgLimitResponse) return orgLimitResponse

      const subResponse = checkSubscriptionOrRespond(request, auth)
      if (subResponse) return subResponse

      return await handler(request, auth, workspaceId)
    } catch (error) {
      return handleError(error)
    }
  }
}

/**
 * Workspace access wrapper for routes with workspaceId in URL params
 *
 * Similar to withWorkspaceAccess but extracts workspaceId from route params instead of query.
 *
 * @example
 * // In /app/api/workspaces/[workspaceId]/data/route.ts
 * export const GET = withWorkspaceParam(async (request, auth, workspaceId, context) => {
 *   // workspaceId comes from URL: /api/workspaces/ws_123/data
 *   const data = await db.getWorkspaceData(workspaceId)
 *   return NextResponse.json({ success: true, data })
 * })
 */
export function withWorkspaceParam(
  handler: (
    request: NextRequest,
    auth: AuthContext,
    workspaceId: string,
    context: RouteContext
  ) => Promise<NextResponse<ApiResponse<unknown>>>
): (request: NextRequest, context: RouteContext) => Promise<NextResponse<ApiResponse<unknown>>> {
  return async (request: NextRequest, context: RouteContext) => {
    try {
      if (!verifyCsrfHeader(request)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Forbidden: Missing CSRF header" },
          { status: 403 }
        )
      }

      const auth = await getAuthContext(request)

      if (!auth) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        )
      }

      const scopeResponse = enforceApiKeyScopes(request, auth)
      if (scopeResponse) return scopeResponse

      // Extract workspaceId from route params (async in Next.js 16+)
      const params = await context.params
      const workspaceId = params?.workspaceId || params?.id

      if (!workspaceId) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "workspaceId parameter is missing" },
          { status: 400 }
        )
      }

      // Validate workspace access
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
      if (!hasAccess) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Forbidden: No access to this workspace" },
          { status: 403 }
        )
      }

      // RBAC: Viewers can only read, not write
      if (isWriteMethod(request.method)) {
        const role = await getUserWorkspaceRole(auth.user.id, workspaceId)
        if (role === "viewer") {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "Forbidden: Viewer role cannot perform write operations" },
            { status: 403 }
          )
        }
      }

      const orgLimitResponse = checkOrgRateLimitOrRespond(auth)
      if (orgLimitResponse) return orgLimitResponse

      const subResponse = checkSubscriptionOrRespond(request, auth)
      if (subResponse) return subResponse

      return await handler(request, auth, workspaceId, context)
    } catch (error) {
      return handleError(error)
    }
  }
}

/**
 * Optional auth wrapper - does not require authentication but provides auth context if available
 *
 * Useful for routes that have different behavior for authenticated vs anonymous users.
 *
 * @example
 * export const GET = withOptionalAuth(async (request, auth) => {
 *   if (auth) {
 *     // Authenticated user - return personalized data
 *     return NextResponse.json({ data: "personalized" })
 *   } else {
 *     // Anonymous user - return public data
 *     return NextResponse.json({ data: "public" })
 *   }
 * })
 */
export function withOptionalAuth(
  handler: (request: NextRequest, auth: AuthContext | null, context?: RouteContext) => Promise<NextResponse<ApiResponse<unknown>>>
): (request: NextRequest, context?: RouteContext) => Promise<NextResponse<ApiResponse<unknown>>> {
  return async (request: NextRequest, context?: RouteContext) => {
    try {
      const auth = await getAuthContext(request)
      return await handler(request, auth, context)
    } catch (error) {
      return handleError(error)
    }
  }
}

/**
 * Combine multiple middleware checks
 *
 * @example
 * export const POST = withAuth(
 *   withRoleCheck("admin")(async (request, auth) => {
 *     // Both auth and admin check pass
 *     return NextResponse.json({ success: true })
 *   })
 * )
 */
export function withRoleCheck(requiredRole: "owner" | "admin" | "manager" | "member") {
  return function (handler: AuthenticatedHandler<ApiResponse<unknown>>): AuthenticatedHandler<ApiResponse<unknown>> {
    return async (request: NextRequest, auth: AuthContext) => {
      const roleHierarchy = {
        owner: 4,
        admin: 3,
        manager: 2,
        member: 1,
      }

      const userLevel = roleHierarchy[auth.member.role as keyof typeof roleHierarchy] || 0
      const requiredLevel = roleHierarchy[requiredRole]

      if (userLevel < requiredLevel) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `Forbidden: ${requiredRole} access required` },
          { status: 403 }
        )
      }

      return await handler(request, auth)
    }
  }
}

/**
 * Validate organization membership
 *
 * Ensures the authenticated user is a member of the organization.
 * This is a double-check since getAuthContext already validates this,
 * but can be useful for extra safety on critical routes.
 *
 * @example
 * export const POST = withAuth(
 *   withOrgMembership(async (request, auth) => {
 *     // Guaranteed to be org member
 *     return NextResponse.json({ success: true })
 *   })
 * )
 */
export function withOrgMembership(handler: AuthenticatedHandler<ApiResponse<unknown>>): AuthenticatedHandler<ApiResponse<unknown>> {
  return async (request: NextRequest, auth: AuthContext) => {
    if (!auth.member || auth.member.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden: Not a member of this organization" },
        { status: 403 }
      )
    }

    return await handler(request, auth)
  }
}

/**
 * Verify workspace belongs to the authenticated user's organization
 *
 * CRITICAL SECURITY: This prevents cross-organization data access by ensuring
 * that a workspace ID belongs to the authenticated user's organization before
 * allowing access. Returns 404 (not 403) to avoid information leakage.
 *
 * @param workspaceId - The workspace ID to verify
 * @param organizationId - The authenticated user's organization ID
 * @returns true if workspace belongs to organization, false otherwise
 *
 * @example
 * const workspace = await getWorkspaceById(workspaceId)
 * if (!workspace || !verifyWorkspaceOrgBoundary(workspace, auth.organization.id)) {
 *   return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 })
 * }
 */
export async function verifyWorkspaceOrgBoundary(
  workspaceId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const { getWorkspaceById } = await import("@/lib/db/workspaces")
    const workspace = await getWorkspaceById(workspaceId)
    if (!workspace) {
      return false
    }
    return workspace.organizationId === organizationId
  } catch (error) {
    logError(logger, "Error verifying workspace org boundary", error)
    return false
  }
}
