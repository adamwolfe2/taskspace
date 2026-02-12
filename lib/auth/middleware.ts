import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { isTokenExpired } from "@/lib/auth/password"
import { logger, logError } from "@/lib/logger"
import { CONFIG } from "@/lib/config"
import type { User, Organization, OrganizationMember } from "@/lib/types"

export interface AuthContext {
  user: User
  organization: Organization
  member: OrganizationMember
  sessionId: string
  isApiKey?: boolean
}

// Authenticate via API key (for MCP server and external integrations)
async function getApiKeyAuthContext(request: NextRequest): Promise<AuthContext | null> {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return null
    }

    const apiKeyValue = authHeader.substring(7) // Remove "Bearer " prefix
    if (!apiKeyValue.startsWith("aims_")) {
      return null // Not an API key
    }

    const apiKey = await db.apiKeys.findByKey(apiKeyValue)
    if (!apiKey) {
      return null
    }

    // Get the organization
    const organization = await db.organizations.findById(apiKey.organizationId)
    if (!organization) {
      return null
    }

    // Get the user who created the API key
    const user = await db.users.findById(apiKey.createdBy)
    if (!user) {
      return null
    }

    // Get the member record
    const member = await db.members.findByOrgAndUser(apiKey.organizationId, user.id)
    if (!member) {
      return null
    }

    // Update last used timestamp
    await db.apiKeys.updateLastUsed(apiKey.id)

    return {
      user,
      organization,
      member,
      sessionId: apiKey.id, // Use API key ID as session ID
      isApiKey: true,
    }
  } catch (error) {
    logError(logger, "API key auth error", error)
    return null
  }
}

// Authenticate via session cookie (for web app)
async function getSessionAuthContext(request: NextRequest): Promise<AuthContext | null> {
  try {
    const sessionToken = request.cookies.get("session_token")?.value

    if (!sessionToken) {
      return null
    }

    const session = await db.sessions.findByToken(sessionToken)
    if (!session || isTokenExpired(session.expiresAt)) {
      return null
    }

    const user = await db.users.findById(session.userId)
    if (!user) {
      return null
    }

    const organization = await db.organizations.findById(session.organizationId)
    if (!organization) {
      return null
    }

    const member = await db.members.findByOrgAndUser(session.organizationId, user.id)
    if (!member) {
      return null
    }

    // Only update lastActiveAt if enough time has elapsed to reduce write load
    const now = Date.now()
    const lastActive = session.lastActiveAt ? new Date(session.lastActiveAt).getTime() : 0
    if (now - lastActive >= CONFIG.session.activityUpdateIntervalMs) {
      await db.sessions.update(session.id, {
        lastActiveAt: new Date().toISOString(),
      })
    }

    return {
      user,
      organization,
      member,
      sessionId: session.id,
    }
  } catch (error) {
    logError(logger, "Session auth error", error)
    return null
  }
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  // First try API key authentication (for MCP and external tools)
  const apiKeyAuth = await getApiKeyAuthContext(request)
  if (apiKeyAuth) {
    return apiKeyAuth
  }

  // Fall back to session cookie authentication
  return getSessionAuthContext(request)
}

/**
 * Lightweight auth context for pre-onboarding users who have a valid session
 * but no organization yet. Used by firecrawl scrape and org creation endpoints.
 */
export interface UserAuthContext {
  user: User
  sessionId: string
}

/**
 * Get user-only auth context from session cookie.
 * Unlike getAuthContext, this does NOT require organization membership.
 * Used during onboarding when user has a session but no org yet.
 */
export async function getUserAuthContext(request: NextRequest): Promise<UserAuthContext | null> {
  try {
    const sessionToken = request.cookies.get("session_token")?.value
    if (!sessionToken) {
      return null
    }

    const session = await db.sessions.findByToken(sessionToken)
    if (!session || isTokenExpired(session.expiresAt)) {
      return null
    }

    const user = await db.users.findById(session.userId)
    if (!user) {
      return null
    }

    // Only update lastActiveAt if enough time has elapsed to reduce write load
    const now = Date.now()
    const lastActive = session.lastActiveAt ? new Date(session.lastActiveAt).getTime() : 0
    if (now - lastActive >= CONFIG.session.activityUpdateIntervalMs) {
      await db.sessions.update(session.id, {
        lastActiveAt: new Date().toISOString(),
      })
    }

    return {
      user,
      sessionId: session.id,
    }
  } catch (error) {
    logError(logger, "User auth error", error)
    return null
  }
}

export function isAdmin(context: AuthContext): boolean {
  return context.member.role === "owner" || context.member.role === "admin"
}

export function isOwner(context: AuthContext): boolean {
  return context.member.role === "owner"
}
