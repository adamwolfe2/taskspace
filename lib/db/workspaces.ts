/**
 * Workspace Database Operations
 *
 * Provides CRUD operations for workspaces and workspace members.
 * Part of SESSION 5: Multi-Workspace Architecture
 */

import { sql } from "./sql"

// ============================================
// TYPES
// ============================================

export interface Workspace {
  id: string
  organizationId: string
  name: string
  slug: string
  type: "leadership" | "department" | "team" | "project"
  description?: string
  settings: Record<string, unknown>
  isDefault: boolean
  createdBy?: string
  // Workspace-level branding
  logoUrl?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  accentColor?: string | null
  faviconUrl?: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  role: "owner" | "admin" | "member" | "viewer"
  joinedAt: string
}

export interface WorkspaceWithMemberInfo extends Workspace {
  memberRole: WorkspaceMember["role"]
  memberCount: number
}

// ============================================
// PARSERS
// ============================================

function parseWorkspace(row: Record<string, unknown>): Workspace {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    name: row.name as string,
    slug: row.slug as string,
    type: (row.type as Workspace["type"]) || "team",
    description: row.description as string | undefined,
    settings: (row.settings as Record<string, unknown>) || {},
    isDefault: row.is_default as boolean,
    createdBy: row.created_by as string | undefined,
    // Workspace-level branding
    logoUrl: row.logo_url as string | null | undefined,
    primaryColor: row.primary_color as string | null | undefined,
    secondaryColor: row.secondary_color as string | null | undefined,
    accentColor: row.accent_color as string | null | undefined,
    faviconUrl: row.favicon_url as string | null | undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

function parseWorkspaceWithMemberInfo(row: Record<string, unknown>): WorkspaceWithMemberInfo {
  return {
    ...parseWorkspace(row),
    memberRole: (row.member_role as WorkspaceMember["role"]) || "member",
    memberCount: parseInt(row.member_count as string, 10) || 0,
  }
}

function parseWorkspaceMember(row: Record<string, unknown>): WorkspaceMember {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    userId: row.user_id as string,
    role: (row.role as WorkspaceMember["role"]) || "member",
    joinedAt: (row.joined_at as Date)?.toISOString() || "",
  }
}

// ============================================
// WORKSPACE OPERATIONS
// ============================================

/**
 * Get all workspaces for an organization
 */
export async function getWorkspacesByOrg(orgId: string): Promise<Workspace[]> {
  const { rows } = await sql`
    SELECT * FROM workspaces
    WHERE organization_id = ${orgId}
    ORDER BY is_default DESC, name ASC
  `
  return rows.map(parseWorkspace)
}

/**
 * Get all workspaces a user has access to within a specific organization.
 * Always pass organizationId to enforce org-level data isolation.
 */
export async function getUserWorkspaces(userId: string, organizationId?: string): Promise<WorkspaceWithMemberInfo[]> {
  if (organizationId) {
    const { rows } = await sql`
      SELECT
        w.id,
        w.organization_id,
        w.name,
        w.slug,
        w.type,
        w.description,
        w.settings,
        w.is_default,
        w.created_by,
        w.logo_url,
        w.primary_color,
        w.secondary_color,
        w.accent_color,
        w.favicon_url,
        wm.role as member_role,
        (SELECT COUNT(*) FROM workspace_members wm2 WHERE wm2.workspace_id = w.id) as member_count,
        w.created_at,
        w.updated_at
      FROM workspaces w
      JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE wm.user_id = ${userId} AND w.organization_id = ${organizationId}
      ORDER BY w.is_default DESC, w.name ASC
    `
    return rows.map(parseWorkspaceWithMemberInfo)
  }
  // Fallback for backward compat — should not be used in production paths
  const { rows } = await sql`
    SELECT
      w.id,
      w.organization_id,
      w.name,
      w.slug,
      w.type,
      w.description,
      w.settings,
      w.is_default,
      w.created_by,
      w.logo_url,
      w.primary_color,
      w.secondary_color,
      w.accent_color,
      w.favicon_url,
      wm.role as member_role,
      (SELECT COUNT(*) FROM workspace_members wm2 WHERE wm2.workspace_id = w.id) as member_count,
      w.created_at,
      w.updated_at
    FROM workspaces w
    JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = ${userId}
    ORDER BY w.is_default DESC, w.name ASC
  `
  return rows.map(parseWorkspaceWithMemberInfo)
}

/**
 * Get workspace by ID
 */
export async function getWorkspaceById(id: string): Promise<Workspace | null> {
  const { rows } = await sql`
    SELECT * FROM workspaces
    WHERE id = ${id}
  `
  if (rows.length === 0) return null
  return parseWorkspace(rows[0])
}

/**
 * Get workspace by slug within an organization
 */
export async function getWorkspaceBySlug(orgId: string, slug: string): Promise<Workspace | null> {
  const { rows } = await sql`
    SELECT * FROM workspaces
    WHERE organization_id = ${orgId} AND slug = ${slug}
  `
  if (rows.length === 0) return null
  return parseWorkspace(rows[0])
}

/**
 * Get default workspace for an organization
 */
export async function getDefaultWorkspace(orgId: string): Promise<Workspace | null> {
  const { rows } = await sql`
    SELECT * FROM workspaces
    WHERE organization_id = ${orgId} AND is_default = TRUE
    LIMIT 1
  `
  if (rows.length === 0) return null
  return parseWorkspace(rows[0])
}

/**
 * Create workspace params
 */
export interface CreateWorkspaceParams {
  organizationId: string
  name: string
  slug: string
  type?: Workspace["type"]
  description?: string
  settings?: Record<string, unknown>
  isDefault?: boolean
  createdBy?: string
  logoUrl?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  accentColor?: string | null
  faviconUrl?: string | null
}

/**
 * Create a new workspace
 */
export async function createWorkspace(params: CreateWorkspaceParams): Promise<Workspace> {
  const {
    organizationId,
    name,
    slug,
    type = "team",
    description = null,
    settings = {},
    isDefault = false,
    createdBy = null,
    logoUrl = null,
    primaryColor = null,
    secondaryColor = null,
    accentColor = null,
    faviconUrl = null,
  } = params

  const { rows } = await sql`
    INSERT INTO workspaces (
      organization_id, name, slug, type, description, settings, is_default, created_by,
      logo_url, primary_color, secondary_color, accent_color, favicon_url
    )
    VALUES (
      ${organizationId}, ${name}, ${slug}, ${type}, ${description},
      ${JSON.stringify(settings)}::jsonb, ${isDefault}, ${createdBy},
      ${logoUrl}, ${primaryColor}, ${secondaryColor}, ${accentColor}, ${faviconUrl}
    )
    RETURNING *
  `
  return parseWorkspace(rows[0])
}

/**
 * Update workspace params
 */
export interface UpdateWorkspaceParams {
  name?: string
  slug?: string
  type?: Workspace["type"]
  description?: string
  settings?: Record<string, unknown>
  isDefault?: boolean
  // Branding fields
  logoUrl?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  accentColor?: string | null
  faviconUrl?: string | null
}

/**
 * Update a workspace
 */
export async function updateWorkspace(
  id: string,
  updates: UpdateWorkspaceParams
): Promise<Workspace | null> {
  const workspace = await getWorkspaceById(id)
  if (!workspace) return null

  const { rows } = await sql`
    UPDATE workspaces
    SET
      name = ${updates.name ?? workspace.name},
      slug = ${updates.slug ?? workspace.slug},
      type = ${updates.type ?? workspace.type},
      description = ${updates.description ?? workspace.description ?? null},
      settings = ${JSON.stringify(updates.settings ?? workspace.settings)}::jsonb,
      is_default = ${updates.isDefault ?? workspace.isDefault},
      logo_url = ${updates.logoUrl !== undefined ? updates.logoUrl : workspace.logoUrl ?? null},
      primary_color = ${updates.primaryColor !== undefined ? updates.primaryColor : workspace.primaryColor ?? null},
      secondary_color = ${updates.secondaryColor !== undefined ? updates.secondaryColor : workspace.secondaryColor ?? null},
      accent_color = ${updates.accentColor !== undefined ? updates.accentColor : workspace.accentColor ?? null},
      favicon_url = ${updates.faviconUrl !== undefined ? updates.faviconUrl : workspace.faviconUrl ?? null},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  if (rows.length === 0) return null
  return parseWorkspace(rows[0])
}

/**
 * Delete a workspace (prevents deleting default)
 */
export async function deleteWorkspace(id: string): Promise<boolean> {
  const workspace = await getWorkspaceById(id)
  if (!workspace) return false

  if (workspace.isDefault) {
    throw new Error("Cannot delete the default workspace")
  }

  const { rowCount } = await sql`
    DELETE FROM workspaces WHERE id = ${id}
  `
  return (rowCount ?? 0) > 0
}

// ============================================
// WORKSPACE MEMBER OPERATIONS
// ============================================

/**
 * Get all members of a workspace
 */
export async function getWorkspaceMembers(workspaceId: string): Promise<Array<WorkspaceMember & { userName?: string; userEmail?: string }>> {
  const { rows } = await sql`
    SELECT
      wm.*,
      u.name as user_name,
      u.email as user_email
    FROM workspace_members wm
    LEFT JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ${workspaceId}
    ORDER BY wm.joined_at ASC
  `
  return rows.map((row) => ({
    ...parseWorkspaceMember(row),
    userName: row.user_name as string | undefined,
    userEmail: row.user_email as string | undefined,
  }))
}

/**
 * Get a user's membership in a workspace
 */
export async function getWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMember | null> {
  const { rows } = await sql`
    SELECT * FROM workspace_members
    WHERE workspace_id = ${workspaceId} AND user_id = ${userId}
  `
  if (rows.length === 0) return null
  return parseWorkspaceMember(rows[0])
}

/**
 * Add a member to a workspace
 */
export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: WorkspaceMember["role"] = "member"
): Promise<WorkspaceMember> {
  const { rows } = await sql`
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (${workspaceId}, ${userId}, ${role})
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = ${role}
    RETURNING *
  `
  return parseWorkspaceMember(rows[0])
}

/**
 * Update a member's role in a workspace
 */
export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceMember["role"]
): Promise<WorkspaceMember | null> {
  const { rows } = await sql`
    UPDATE workspace_members
    SET role = ${role}
    WHERE workspace_id = ${workspaceId} AND user_id = ${userId}
    RETURNING *
  `
  if (rows.length === 0) return null
  return parseWorkspaceMember(rows[0])
}

/**
 * Remove a member from a workspace
 */
export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const { rowCount } = await sql`
    DELETE FROM workspace_members
    WHERE workspace_id = ${workspaceId} AND user_id = ${userId}
  `
  return (rowCount ?? 0) > 0
}

// ============================================
// ACCESS CONTROL
// ============================================

/**
 * Check if a user has access to a workspace (uses SQL function)
 */
export async function userHasWorkspaceAccess(
  userId: string,
  workspaceId: string,
  requiredRole?: WorkspaceMember["role"]
): Promise<boolean> {
  const { rows } = await sql`
    SELECT user_has_workspace_access(${userId}, ${workspaceId}, ${requiredRole ?? null}) as has_access
  `
  return rows[0]?.has_access === true
}

/**
 * Get user's role in a workspace
 */
export async function getUserWorkspaceRole(
  userId: string,
  workspaceId: string
): Promise<WorkspaceMember["role"] | null> {
  const { rows } = await sql`
    SELECT role FROM workspace_members
    WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
  `
  if (rows.length === 0) return null
  return rows[0].role as WorkspaceMember["role"]
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate a slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50)
}

/**
 * Ensure unique slug within organization
 */
export async function ensureUniqueSlug(orgId: string, baseSlug: string): Promise<string> {
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await getWorkspaceBySlug(orgId, slug)
    if (!existing) return slug
    slug = `${baseSlug}-${counter}`
    counter++
    if (counter > 100) throw new Error("Could not generate unique slug")
  }
}

/**
 * Add a user to the default workspace of their organization
 */
export async function addUserToDefaultWorkspace(
  orgId: string,
  userId: string,
  role: WorkspaceMember["role"] = "member"
): Promise<WorkspaceMember | null> {
  const defaultWorkspace = await getDefaultWorkspace(orgId)
  if (!defaultWorkspace) return null
  return addWorkspaceMember(defaultWorkspace.id, userId, role)
}

// ============================================
// WORKSPACE DB OBJECT (for compatibility with db pattern)
// ============================================

export const workspaces = {
  findByOrg: getWorkspacesByOrg,
  findByUser: getUserWorkspaces,
  findById: getWorkspaceById,
  findBySlug: getWorkspaceBySlug,
  findDefault: getDefaultWorkspace,
  create: createWorkspace,
  update: updateWorkspace,
  delete: deleteWorkspace,
  getMembers: getWorkspaceMembers,
  getMember: getWorkspaceMember,
  addMember: addWorkspaceMember,
  updateMemberRole: updateWorkspaceMemberRole,
  removeMember: removeWorkspaceMember,
  hasAccess: userHasWorkspaceAccess,
  getUserRole: getUserWorkspaceRole,
  generateSlug,
  ensureUniqueSlug,
  addUserToDefault: addUserToDefaultWorkspace,
}

export default workspaces
