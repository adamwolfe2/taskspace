import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { isTokenExpired } from "@/lib/auth/password"
import type { User, Organization, OrganizationMember } from "@/lib/types"

export interface AuthContext {
  user: User
  organization: Organization
  member: OrganizationMember
  sessionId: string
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
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

    // Update session last active
    await db.sessions.update(session.id, {
      lastActiveAt: new Date().toISOString(),
    })

    return {
      user,
      organization,
      member,
      sessionId: session.id,
    }
  } catch (error) {
    console.error("Auth context error:", error)
    return null
  }
}

export function isAdmin(context: AuthContext): boolean {
  return context.member.role === "owner" || context.member.role === "admin"
}

export function isOwner(context: AuthContext): boolean {
  return context.member.role === "owner"
}
