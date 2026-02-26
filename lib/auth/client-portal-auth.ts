/**
 * Client Portal Authentication Helpers
 *
 * Validates portal tokens for public client portal endpoints.
 * Uses timing-safe comparison to prevent token-length side-channel attacks.
 */

import { timingSafeEqual, createHash } from "crypto"
import { db } from "@/lib/db"
import { getWorkspaceById } from "@/lib/db/workspaces"
import { getWorkspaceFeatures } from "@/lib/auth/workspace-features"
import type { Client } from "@/lib/types"

export interface PortalClientInfo {
  client: Client & {
    orgSlug: string
    orgName: string
    orgLogoUrl: string | null
    orgPrimaryColor: string | null
  }
}


/**
 * Validate a client portal token for public API routes.
 * Returns client+org info on success, or null on failure.
 *
 * Checks:
 * 1. Client exists with that token + org slug
 * 2. portal_enabled = true (already enforced in DB query)
 * 3. Timing-safe token comparison
 * 4. Workspace has advanced.clientPortal feature enabled
 */
export async function validatePortalToken(
  slug: string,
  token: string
): Promise<PortalClientInfo | { error: string; status: number }> {
  const client = await db.clients.getByPortalToken(slug, token)

  if (!client) {
    return { error: "This portal link is no longer active.", status: 403 }
  }

  // Double-check with timing-safe comparison to prevent timing attacks
  const hashToken = (t: string) => createHash("sha256").update(t).digest()
  if (
    !client.portalToken ||
    !timingSafeEqual(hashToken(token), hashToken(client.portalToken))
  ) {
    return { error: "This portal link is no longer active.", status: 403 }
  }

  // Check workspace feature flag (advanced.clientPortal must be on)
  const workspace = await getWorkspaceById(client.workspaceId)
  if (!workspace) {
    return { error: "Workspace not found.", status: 404 }
  }

  const features = getWorkspaceFeatures(workspace)
  if (!features.advanced.clientPortal) {
    return { error: "This portal link is no longer active.", status: 403 }
  }

  return { client }
}
