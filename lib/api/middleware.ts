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
import { getAuthContext, isAdmin, isOwner, type AuthContext } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import type { ApiResponse } from "@/lib/types"

/**
 * Type for authenticated API route handler
 */
export type AuthenticatedHandler<T = any> = (
  request: NextRequest,
  auth: AuthContext
) => Promise<NextResponse<T>>

/**
 * Type for workspace-scoped API route handler
 */
export type WorkspaceHandler<T = any> = (
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
  handler: AuthenticatedHandler<any>
): (request: NextRequest, context?: RouteContext) => Promise<NextResponse<any>> {
  return async (request: NextRequest, context?: RouteContext) => {
    try {
      const auth = await getAuthContext(request)

      if (!auth) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        )
      }

      return await handler(request, auth)
    } catch (error) {
      console.error("Auth middleware error:", error)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Internal server error" },
        { status: 500 }
      )
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
  handler: AuthenticatedHandler<any>
): (request: NextRequest, context?: RouteContext) => Promise<NextResponse<any>> {
  return async (request: NextRequest, context?: RouteContext) => {
    try {
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

      return await handler(request, auth)
    } catch (error) {
      console.error("Admin middleware error:", error)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Internal server error" },
        { status: 500 }
      )
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
  handler: AuthenticatedHandler<any>
): (request: NextRequest, context?: RouteContext) => Promise<NextResponse<any>> {
  return async (request: NextRequest, context?: RouteContext) => {
    try {
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

      return await handler(request, auth)
    } catch (error) {
      console.error("Owner middleware error:", error)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Internal server error" },
        { status: 500 }
      )
    }
  }
}

/**
 * Workspace access wrapper - validates user has access to workspace from query param
 *
 * Extracts workspaceId from query parameters and validates user access.
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
  handler: WorkspaceHandler<any>
): (request: NextRequest, context?: RouteContext) => Promise<NextResponse<any>> {
  return async (request: NextRequest, context?: RouteContext) => {
    try {
      const auth = await getAuthContext(request)

      if (!auth) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        )
      }

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

      return await handler(request, auth, workspaceId)
    } catch (error) {
      console.error("Workspace access middleware error:", error)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Internal server error" },
        { status: 500 }
      )
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
  ) => Promise<NextResponse<any>>
): (request: NextRequest, context: RouteContext) => Promise<NextResponse<any>> {
  return async (request: NextRequest, context: RouteContext) => {
    try {
      const auth = await getAuthContext(request)

      if (!auth) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        )
      }

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

      return await handler(request, auth, workspaceId, context)
    } catch (error) {
      console.error("Workspace param middleware error:", error)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Internal server error" },
        { status: 500 }
      )
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
  handler: (request: NextRequest, auth: AuthContext | null) => Promise<NextResponse<any>>
): (request: NextRequest, context?: RouteContext) => Promise<NextResponse<any>> {
  return async (request: NextRequest, context?: RouteContext) => {
    try {
      const auth = await getAuthContext(request)
      return await handler(request, auth)
    } catch (error) {
      console.error("Optional auth middleware error:", error)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Internal server error" },
        { status: 500 }
      )
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
  return function (handler: AuthenticatedHandler<any>): AuthenticatedHandler<any> {
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
export function withOrgMembership(handler: AuthenticatedHandler<any>): AuthenticatedHandler<any> {
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
