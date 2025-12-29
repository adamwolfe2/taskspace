import { sql } from "@vercel/postgres"
import type {
  User,
  Organization,
  OrganizationMember,
  Session,
  Invitation,
  PasswordResetToken,
  Rock,
  Task,
  AssignedTask,
  EODReport,
  Notification,
  AdminBrainDump,
  EODInsight,
  AIGeneratedTask,
  DailyDigest,
  AIConversation,
  ApiKey,
} from "../types"

// Helper to convert snake_case DB rows to camelCase
function toCamelCase<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const key in row) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    result[camelKey] = row[key]
  }
  return result as T
}

// Helper to parse JSONB fields
function parseUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    name: row.name as string,
    avatar: row.avatar as string | undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
    emailVerified: row.email_verified as boolean,
    lastLoginAt: row.last_login_at ? (row.last_login_at as Date).toISOString() : undefined,
  }
}

function parseOrganization(row: Record<string, unknown>): Organization {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    ownerId: row.owner_id as string,
    settings: row.settings as Organization["settings"],
    subscription: row.subscription as Organization["subscription"],
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

function parseMember(row: Record<string, unknown>): OrganizationMember {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    userId: (row.user_id as string) || null,
    email: row.email as string,
    name: row.name as string,
    role: row.role as OrganizationMember["role"],
    department: row.department as string,
    weeklyMeasurable: row.weekly_measurable as string | undefined,
    joinedAt: (row.joined_at as Date)?.toISOString() || "",
    invitedBy: row.invited_by as string | undefined,
    status: row.status as OrganizationMember["status"],
  }
}

function parseSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    organizationId: row.organization_id as string,
    token: row.token as string,
    expiresAt: (row.expires_at as Date)?.toISOString() || "",
    createdAt: (row.created_at as Date)?.toISOString() || "",
    lastActiveAt: (row.last_active_at as Date)?.toISOString() || "",
    userAgent: row.user_agent as string | undefined,
    ipAddress: row.ip_address as string | undefined,
  }
}

function parseInvitation(row: Record<string, unknown>): Invitation {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    email: row.email as string,
    role: row.role as Invitation["role"],
    department: row.department as string,
    token: row.token as string,
    expiresAt: (row.expires_at as Date)?.toISOString() || "",
    createdAt: (row.created_at as Date)?.toISOString() || "",
    invitedBy: row.invited_by as string,
    status: row.status as Invitation["status"],
  }
}

function parsePasswordResetToken(row: Record<string, unknown>): PasswordResetToken {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    email: row.email as string,
    token: row.token as string,
    expiresAt: (row.expires_at as Date)?.toISOString() || "",
    createdAt: (row.created_at as Date)?.toISOString() || "",
    usedAt: row.used_at ? (row.used_at as Date).toISOString() : undefined,
  }
}

function parseRock(row: Record<string, unknown>): Rock {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: row.description as string,
    progress: row.progress as number,
    dueDate: row.due_date as string,
    status: row.status as Rock["status"],
    bucket: row.bucket as string | undefined,
    outcome: row.outcome as string | undefined,
    doneWhen: row.done_when as string[] | undefined,
    quarter: row.quarter as string | undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

function parseAssignedTask(row: Record<string, unknown>): AssignedTask {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    assigneeId: row.assignee_id as string,
    assigneeName: row.assignee_name as string,
    assignedById: row.assigned_by_id as string | null,
    assignedByName: row.assigned_by_name as string | null,
    type: row.type as AssignedTask["type"],
    rockId: row.rock_id as string | null,
    rockTitle: row.rock_title as string | null,
    priority: row.priority as AssignedTask["priority"],
    dueDate: row.due_date as string,
    status: row.status as AssignedTask["status"],
    completedAt: row.completed_at ? (row.completed_at as Date).toISOString() : null,
    addedToEOD: row.added_to_eod as boolean,
    eodReportId: row.eod_report_id as string | null,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

function parseEODReport(row: Record<string, unknown>): EODReport {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    userId: row.user_id as string,
    date: row.date as string,
    tasks: row.tasks as EODReport["tasks"],
    challenges: row.challenges as string,
    tomorrowPriorities: row.tomorrow_priorities as EODReport["tomorrowPriorities"],
    needsEscalation: row.needs_escalation as boolean,
    escalationNote: row.escalation_note as string | null,
    submittedAt: (row.submitted_at as Date)?.toISOString() || "",
    createdAt: (row.created_at as Date)?.toISOString() || "",
  }
}

function parseApiKey(row: Record<string, unknown>): ApiKey {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    createdBy: row.created_by as string,
    name: row.name as string,
    key: row.key as string,
    scopes: row.scopes as string[],
    createdAt: (row.created_at as Date)?.toISOString() || "",
    lastUsedAt: row.last_used_at ? (row.last_used_at as Date).toISOString() : null,
  }
}

// Database operations using Vercel Postgres
export const db = {
  // Users
  users: {
    async findAll(): Promise<User[]> {
      const { rows } = await sql`SELECT * FROM users`
      return rows.map(parseUser)
    },
    async findById(id: string): Promise<User | null> {
      const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`
      return rows[0] ? parseUser(rows[0]) : null
    },
    async findByEmail(email: string): Promise<User | null> {
      const { rows } = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email})`
      return rows[0] ? parseUser(rows[0]) : null
    },
    async create(user: User): Promise<User> {
      await sql`
        INSERT INTO users (id, email, password_hash, name, avatar, created_at, updated_at, email_verified, last_login_at)
        VALUES (${user.id}, ${user.email}, ${user.passwordHash}, ${user.name}, ${user.avatar || null},
                ${user.createdAt}, ${user.updatedAt}, ${user.emailVerified}, ${user.lastLoginAt || null})
      `
      return user
    },
    async update(id: string, updates: Partial<User>): Promise<User | null> {
      const now = new Date().toISOString()
      const { rows } = await sql`
        UPDATE users SET
          name = COALESCE(${updates.name || null}, name),
          avatar = COALESCE(${updates.avatar || null}, avatar),
          email_verified = COALESCE(${updates.emailVerified ?? null}, email_verified),
          last_login_at = COALESCE(${updates.lastLoginAt || null}, last_login_at),
          updated_at = ${now}
        WHERE id = ${id}
        RETURNING *
      `
      return rows[0] ? parseUser(rows[0]) : null
    },
    async delete(id: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM users WHERE id = ${id}`
      return (rowCount ?? 0) > 0
    },
  },

  // Organizations
  organizations: {
    async findAll(): Promise<Organization[]> {
      const { rows } = await sql`SELECT * FROM organizations`
      return rows.map(parseOrganization)
    },
    async findById(id: string): Promise<Organization | null> {
      const { rows } = await sql`SELECT * FROM organizations WHERE id = ${id}`
      return rows[0] ? parseOrganization(rows[0]) : null
    },
    async findBySlug(slug: string): Promise<Organization | null> {
      const { rows } = await sql`SELECT * FROM organizations WHERE slug = ${slug}`
      return rows[0] ? parseOrganization(rows[0]) : null
    },
    async findByOwnerId(ownerId: string): Promise<Organization[]> {
      const { rows } = await sql`SELECT * FROM organizations WHERE owner_id = ${ownerId}`
      return rows.map(parseOrganization)
    },
    async create(org: Organization): Promise<Organization> {
      await sql`
        INSERT INTO organizations (id, name, slug, owner_id, settings, subscription, created_at, updated_at)
        VALUES (${org.id}, ${org.name}, ${org.slug}, ${org.ownerId},
                ${JSON.stringify(org.settings)}, ${JSON.stringify(org.subscription)},
                ${org.createdAt}, ${org.updatedAt})
      `
      return org
    },
    async update(id: string, updates: Partial<Organization>): Promise<Organization | null> {
      const now = new Date().toISOString()
      const current = await this.findById(id)
      if (!current) return null

      const newSettings = updates.settings ? JSON.stringify({ ...current.settings, ...updates.settings }) : null
      const newSubscription = updates.subscription ? JSON.stringify({ ...current.subscription, ...updates.subscription }) : null

      const { rows } = await sql`
        UPDATE organizations SET
          name = COALESCE(${updates.name || null}, name),
          settings = COALESCE(${newSettings}::jsonb, settings),
          subscription = COALESCE(${newSubscription}::jsonb, subscription),
          updated_at = ${now}
        WHERE id = ${id}
        RETURNING *
      `
      return rows[0] ? parseOrganization(rows[0]) : null
    },
    async delete(id: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM organizations WHERE id = ${id}`
      return (rowCount ?? 0) > 0
    },
  },

  // Organization Members
  members: {
    async findAll(): Promise<OrganizationMember[]> {
      const { rows } = await sql`SELECT * FROM organization_members`
      return rows.map(parseMember)
    },
    async findById(id: string): Promise<OrganizationMember | null> {
      const { rows } = await sql`SELECT * FROM organization_members WHERE id = ${id}`
      return rows[0] ? parseMember(rows[0]) : null
    },
    async findByOrganizationId(orgId: string): Promise<OrganizationMember[]> {
      const { rows } = await sql`SELECT * FROM organization_members WHERE organization_id = ${orgId}`
      return rows.map(parseMember)
    },
    async findByOrgAndId(orgId: string, memberId: string): Promise<OrganizationMember | null> {
      const { rows } = await sql`
        SELECT * FROM organization_members
        WHERE organization_id = ${orgId} AND id = ${memberId}
      `
      return rows[0] ? parseMember(rows[0]) : null
    },
    // Optimized query that gets members with user data in a single JOIN query
    // Uses LEFT JOIN to also include draft/pending members who don't have a user yet
    async findWithUsersByOrganizationId(orgId: string): Promise<Array<{
      id: string
      name: string
      email: string
      role: "owner" | "admin" | "member"
      department: string
      avatar?: string
      joinDate: string
      weeklyMeasurable?: string
      status?: "active" | "invited" | "pending" | "inactive"
    }>> {
      const { rows } = await sql`
        SELECT
          COALESCE(u.id, om.id) as id,
          COALESCE(u.name, om.name) as name,
          COALESCE(u.email, om.email) as email,
          u.avatar,
          om.role,
          om.department,
          om.joined_at,
          om.weekly_measurable,
          om.status
        FROM organization_members om
        LEFT JOIN users u ON u.id = om.user_id
        WHERE om.organization_id = ${orgId}
        ORDER BY om.joined_at ASC
      `
      return rows.map(row => ({
        id: row.id as string,
        name: row.name as string,
        email: row.email as string,
        role: row.role as "owner" | "admin" | "member",
        department: row.department as string,
        avatar: row.avatar as string | undefined,
        joinDate: (row.joined_at as Date)?.toISOString() || "",
        weeklyMeasurable: row.weekly_measurable as string | undefined,
        status: row.status as "active" | "invited" | "pending" | "inactive" | undefined,
      }))
    },
    async findByUserId(userId: string): Promise<OrganizationMember[]> {
      const { rows } = await sql`SELECT * FROM organization_members WHERE user_id = ${userId}`
      return rows.map(parseMember)
    },
    async findByOrgAndUser(orgId: string, userId: string): Promise<OrganizationMember | null> {
      const { rows } = await sql`
        SELECT * FROM organization_members
        WHERE organization_id = ${orgId} AND user_id = ${userId}
      `
      return rows[0] ? parseMember(rows[0]) : null
    },
    async findByOrgAndEmail(orgId: string, email: string): Promise<OrganizationMember | null> {
      const { rows } = await sql`
        SELECT * FROM organization_members
        WHERE organization_id = ${orgId} AND LOWER(email) = LOWER(${email})
      `
      return rows[0] ? parseMember(rows[0]) : null
    },
    async create(member: OrganizationMember): Promise<OrganizationMember> {
      await sql`
        INSERT INTO organization_members (id, organization_id, user_id, email, name, role, department, weekly_measurable, joined_at, invited_by, status)
        VALUES (${member.id}, ${member.organizationId}, ${member.userId}, ${member.email}, ${member.name}, ${member.role},
                ${member.department}, ${member.weeklyMeasurable || null}, ${member.joinedAt},
                ${member.invitedBy || null}, ${member.status})
      `
      return member
    },
    async update(id: string, updates: Partial<OrganizationMember>): Promise<OrganizationMember | null> {
      const { rows } = await sql`
        UPDATE organization_members SET
          user_id = COALESCE(${updates.userId || null}, user_id),
          name = COALESCE(${updates.name || null}, name),
          role = COALESCE(${updates.role || null}, role),
          department = COALESCE(${updates.department || null}, department),
          weekly_measurable = COALESCE(${updates.weeklyMeasurable || null}, weekly_measurable),
          status = COALESCE(${updates.status || null}, status)
        WHERE id = ${id}
        RETURNING *
      `
      return rows[0] ? parseMember(rows[0]) : null
    },
    async delete(id: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM organization_members WHERE id = ${id}`
      return (rowCount ?? 0) > 0
    },
  },

  // Sessions
  sessions: {
    async findByToken(token: string): Promise<Session | null> {
      const { rows } = await sql`SELECT * FROM sessions WHERE token = ${token}`
      return rows[0] ? parseSession(rows[0]) : null
    },
    async findByUserId(userId: string): Promise<Session[]> {
      const { rows } = await sql`SELECT * FROM sessions WHERE user_id = ${userId}`
      return rows.map(parseSession)
    },
    async create(session: Session): Promise<Session> {
      await sql`
        INSERT INTO sessions (id, user_id, organization_id, token, expires_at, created_at, last_active_at, user_agent, ip_address)
        VALUES (${session.id}, ${session.userId}, ${session.organizationId}, ${session.token},
                ${session.expiresAt}, ${session.createdAt}, ${session.lastActiveAt},
                ${session.userAgent || null}, ${session.ipAddress || null})
      `
      return session
    },
    async update(id: string, updates: Partial<Session>): Promise<Session | null> {
      const { rows } = await sql`
        UPDATE sessions SET
          last_active_at = COALESCE(${updates.lastActiveAt || null}, last_active_at)
        WHERE id = ${id}
        RETURNING *
      `
      return rows[0] ? parseSession(rows[0]) : null
    },
    async delete(id: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM sessions WHERE id = ${id}`
      return (rowCount ?? 0) > 0
    },
    async deleteByToken(token: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM sessions WHERE token = ${token}`
      return (rowCount ?? 0) > 0
    },
    async deleteExpired(): Promise<number> {
      const { rowCount } = await sql`DELETE FROM sessions WHERE expires_at < NOW()`
      return rowCount ?? 0
    },
  },

  // Invitations
  invitations: {
    async findByToken(token: string): Promise<Invitation | null> {
      const { rows } = await sql`SELECT * FROM invitations WHERE token = ${token}`
      return rows[0] ? parseInvitation(rows[0]) : null
    },
    async findByOrganizationId(orgId: string): Promise<Invitation[]> {
      const { rows } = await sql`SELECT * FROM invitations WHERE organization_id = ${orgId}`
      return rows.map(parseInvitation)
    },
    async findPendingByEmail(email: string): Promise<Invitation[]> {
      const { rows } = await sql`
        SELECT * FROM invitations
        WHERE LOWER(email) = LOWER(${email}) AND status = 'pending'
      `
      return rows.map(parseInvitation)
    },
    async create(invitation: Invitation): Promise<Invitation> {
      await sql`
        INSERT INTO invitations (id, organization_id, email, role, department, token, expires_at, created_at, invited_by, status)
        VALUES (${invitation.id}, ${invitation.organizationId}, ${invitation.email}, ${invitation.role},
                ${invitation.department}, ${invitation.token}, ${invitation.expiresAt},
                ${invitation.createdAt}, ${invitation.invitedBy}, ${invitation.status})
      `
      return invitation
    },
    async update(id: string, updates: Partial<Invitation>): Promise<Invitation | null> {
      const { rows } = await sql`
        UPDATE invitations SET
          status = COALESCE(${updates.status || null}, status)
        WHERE id = ${id}
        RETURNING *
      `
      return rows[0] ? parseInvitation(rows[0]) : null
    },
    async delete(id: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM invitations WHERE id = ${id}`
      return (rowCount ?? 0) > 0
    },
  },

  // Password Reset Tokens
  passwordResetTokens: {
    async findByToken(token: string): Promise<PasswordResetToken | null> {
      const { rows } = await sql`SELECT * FROM password_reset_tokens WHERE token = ${token}`
      return rows[0] ? parsePasswordResetToken(rows[0]) : null
    },
    async findByEmail(email: string): Promise<PasswordResetToken[]> {
      const { rows } = await sql`
        SELECT * FROM password_reset_tokens
        WHERE LOWER(email) = LOWER(${email}) AND used_at IS NULL
        ORDER BY created_at DESC
      `
      return rows.map(parsePasswordResetToken)
    },
    async create(token: PasswordResetToken): Promise<PasswordResetToken> {
      await sql`
        INSERT INTO password_reset_tokens (id, user_id, email, token, expires_at, created_at)
        VALUES (${token.id}, ${token.userId}, ${token.email}, ${token.token},
                ${token.expiresAt}, ${token.createdAt})
      `
      return token
    },
    async markAsUsed(id: string): Promise<PasswordResetToken | null> {
      const now = new Date().toISOString()
      const { rows } = await sql`
        UPDATE password_reset_tokens SET used_at = ${now}
        WHERE id = ${id}
        RETURNING *
      `
      return rows[0] ? parsePasswordResetToken(rows[0]) : null
    },
    async deleteByEmail(email: string): Promise<number> {
      const { rowCount } = await sql`
        DELETE FROM password_reset_tokens WHERE LOWER(email) = LOWER(${email})
      `
      return rowCount ?? 0
    },
    async deleteExpired(): Promise<number> {
      const { rowCount } = await sql`
        DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL
      `
      return rowCount ?? 0
    },
  },

  // Rocks
  rocks: {
    async findAll(): Promise<Rock[]> {
      const { rows } = await sql`SELECT * FROM rocks`
      return rows.map(parseRock)
    },
    async findById(id: string): Promise<Rock | null> {
      const { rows } = await sql`SELECT * FROM rocks WHERE id = ${id}`
      return rows[0] ? parseRock(rows[0]) : null
    },
    async findByOrganizationId(orgId: string): Promise<Rock[]> {
      const { rows } = await sql`SELECT * FROM rocks WHERE organization_id = ${orgId}`
      return rows.map(parseRock)
    },
    async findByUserId(userId: string, orgId: string): Promise<Rock[]> {
      const { rows } = await sql`
        SELECT * FROM rocks WHERE user_id = ${userId} AND organization_id = ${orgId}
      `
      return rows.map(parseRock)
    },
    async create(rock: Rock): Promise<Rock> {
      await sql`
        INSERT INTO rocks (id, organization_id, user_id, title, description, progress, due_date, status, bucket, outcome, done_when, quarter, created_at, updated_at)
        VALUES (${rock.id}, ${rock.organizationId}, ${rock.userId}, ${rock.title}, ${rock.description},
                ${rock.progress}, ${rock.dueDate}, ${rock.status}, ${rock.bucket || null},
                ${rock.outcome || null}, ${JSON.stringify(rock.doneWhen || [])}, ${rock.quarter || null},
                ${rock.createdAt}, ${rock.updatedAt})
      `
      return rock
    },
    async update(id: string, updates: Partial<Rock>): Promise<Rock | null> {
      const now = new Date().toISOString()
      const { rows } = await sql`
        UPDATE rocks SET
          title = COALESCE(${updates.title || null}, title),
          description = COALESCE(${updates.description || null}, description),
          progress = COALESCE(${updates.progress ?? null}, progress),
          due_date = COALESCE(${updates.dueDate || null}, due_date),
          status = COALESCE(${updates.status || null}, status),
          bucket = COALESCE(${updates.bucket || null}, bucket),
          outcome = COALESCE(${updates.outcome || null}, outcome),
          done_when = COALESCE(${updates.doneWhen ? JSON.stringify(updates.doneWhen) : null}::jsonb, done_when),
          quarter = COALESCE(${updates.quarter || null}, quarter),
          updated_at = ${now}
        WHERE id = ${id}
        RETURNING *
      `
      return rows[0] ? parseRock(rows[0]) : null
    },
    async delete(id: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM rocks WHERE id = ${id}`
      return (rowCount ?? 0) > 0
    },
  },

  // Tasks (simple tasks - keeping for compatibility)
  tasks: {
    async findByOrganizationId(orgId: string): Promise<Task[]> {
      return [] // Not used currently, assigned_tasks is used instead
    },
    async findByUserId(userId: string, orgId: string): Promise<Task[]> {
      return []
    },
    async create(task: Task): Promise<Task> {
      return task
    },
    async update(id: string, updates: Partial<Task>): Promise<Task | null> {
      return null
    },
    async delete(id: string): Promise<boolean> {
      return false
    },
  },

  // Assigned Tasks
  assignedTasks: {
    async findByOrganizationId(orgId: string): Promise<AssignedTask[]> {
      const { rows } = await sql`SELECT * FROM assigned_tasks WHERE organization_id = ${orgId}`
      return rows.map(parseAssignedTask)
    },
    async findByAssigneeId(assigneeId: string, orgId: string): Promise<AssignedTask[]> {
      const { rows } = await sql`
        SELECT * FROM assigned_tasks
        WHERE assignee_id = ${assigneeId} AND organization_id = ${orgId}
      `
      return rows.map(parseAssignedTask)
    },
    async findById(id: string): Promise<AssignedTask | null> {
      const { rows } = await sql`SELECT * FROM assigned_tasks WHERE id = ${id}`
      return rows[0] ? parseAssignedTask(rows[0]) : null
    },
    async create(task: AssignedTask): Promise<AssignedTask> {
      await sql`
        INSERT INTO assigned_tasks (id, organization_id, title, description, assignee_id, assignee_name,
          assigned_by_id, assigned_by_name, type, rock_id, rock_title, priority, due_date, status,
          completed_at, added_to_eod, eod_report_id, created_at, updated_at)
        VALUES (${task.id}, ${task.organizationId}, ${task.title}, ${task.description || null},
                ${task.assigneeId}, ${task.assigneeName}, ${task.assignedById}, ${task.assignedByName},
                ${task.type}, ${task.rockId}, ${task.rockTitle}, ${task.priority}, ${task.dueDate},
                ${task.status}, ${task.completedAt}, ${task.addedToEOD}, ${task.eodReportId},
                ${task.createdAt}, ${task.updatedAt})
      `
      return task
    },
    async update(id: string, updates: Partial<AssignedTask>): Promise<AssignedTask | null> {
      const now = new Date().toISOString()
      const { rows } = await sql`
        UPDATE assigned_tasks SET
          title = COALESCE(${updates.title || null}, title),
          description = COALESCE(${updates.description || null}, description),
          priority = COALESCE(${updates.priority || null}, priority),
          due_date = COALESCE(${updates.dueDate || null}, due_date),
          status = COALESCE(${updates.status || null}, status),
          completed_at = COALESCE(${updates.completedAt || null}, completed_at),
          added_to_eod = COALESCE(${updates.addedToEOD ?? null}, added_to_eod),
          eod_report_id = COALESCE(${updates.eodReportId || null}, eod_report_id),
          updated_at = ${now}
        WHERE id = ${id}
        RETURNING *
      `
      return rows[0] ? parseAssignedTask(rows[0]) : null
    },
    async delete(id: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM assigned_tasks WHERE id = ${id}`
      return (rowCount ?? 0) > 0
    },
  },

  // EOD Reports
  eodReports: {
    async findByOrganizationId(orgId: string): Promise<EODReport[]> {
      const { rows } = await sql`SELECT * FROM eod_reports WHERE organization_id = ${orgId}`
      return rows.map(parseEODReport)
    },
    async findByUserId(userId: string, orgId: string): Promise<EODReport[]> {
      const { rows } = await sql`
        SELECT * FROM eod_reports
        WHERE user_id = ${userId} AND organization_id = ${orgId}
      `
      return rows.map(parseEODReport)
    },
    async findByUserAndDate(userId: string, orgId: string, date: string): Promise<EODReport | null> {
      const { rows } = await sql`
        SELECT * FROM eod_reports
        WHERE user_id = ${userId} AND organization_id = ${orgId} AND date = ${date}
      `
      return rows[0] ? parseEODReport(rows[0]) : null
    },
    async findById(id: string): Promise<EODReport | null> {
      const { rows } = await sql`SELECT * FROM eod_reports WHERE id = ${id}`
      return rows[0] ? parseEODReport(rows[0]) : null
    },
    async create(report: EODReport): Promise<EODReport> {
      await sql`
        INSERT INTO eod_reports (id, organization_id, user_id, date, tasks, challenges,
          tomorrow_priorities, needs_escalation, escalation_note, submitted_at, created_at)
        VALUES (${report.id}, ${report.organizationId}, ${report.userId}, ${report.date},
                ${JSON.stringify(report.tasks)}, ${report.challenges},
                ${JSON.stringify(report.tomorrowPriorities)}, ${report.needsEscalation},
                ${report.escalationNote}, ${report.submittedAt}, ${report.createdAt})
      `
      return report
    },
    async update(id: string, updates: Partial<EODReport>): Promise<EODReport | null> {
      const { rows } = await sql`
        UPDATE eod_reports SET
          tasks = COALESCE(${updates.tasks ? JSON.stringify(updates.tasks) : null}::jsonb, tasks),
          challenges = COALESCE(${updates.challenges || null}, challenges),
          tomorrow_priorities = COALESCE(${updates.tomorrowPriorities ? JSON.stringify(updates.tomorrowPriorities) : null}::jsonb, tomorrow_priorities),
          needs_escalation = COALESCE(${updates.needsEscalation ?? null}, needs_escalation),
          escalation_note = COALESCE(${updates.escalationNote || null}, escalation_note),
          submitted_at = COALESCE(${updates.submittedAt || null}, submitted_at)
        WHERE id = ${id}
        RETURNING *
      `
      return rows[0] ? parseEODReport(rows[0]) : null
    },
    async delete(id: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM eod_reports WHERE id = ${id}`
      return (rowCount ?? 0) > 0
    },
  },

  // Notifications
  notifications: {
    async findByUserId(userId: string, orgId: string, limit: number = 50): Promise<Notification[]> {
      const { rows } = await sql`
        SELECT * FROM notifications
        WHERE user_id = ${userId} AND organization_id = ${orgId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
      return rows.map(row => ({
        id: row.id as string,
        organizationId: row.organization_id as string,
        userId: row.user_id as string,
        type: row.type as Notification["type"],
        title: row.title as string,
        message: row.message as string || "",
        read: row.read as boolean,
        createdAt: (row.created_at as Date)?.toISOString() || "",
        actionUrl: row.action_url as string | undefined,
        metadata: row.metadata as Record<string, unknown> | undefined,
      }))
    },
    async findUnreadByUserId(userId: string, orgId: string): Promise<Notification[]> {
      const { rows } = await sql`
        SELECT * FROM notifications
        WHERE user_id = ${userId} AND organization_id = ${orgId} AND read = FALSE
        ORDER BY created_at DESC
      `
      return rows.map(row => ({
        id: row.id as string,
        organizationId: row.organization_id as string,
        userId: row.user_id as string,
        type: row.type as Notification["type"],
        title: row.title as string,
        message: row.message as string || "",
        read: row.read as boolean,
        createdAt: (row.created_at as Date)?.toISOString() || "",
        actionUrl: row.action_url as string | undefined,
        metadata: row.metadata as Record<string, unknown> | undefined,
      }))
    },
    async getUnreadCount(userId: string, orgId: string): Promise<number> {
      const { rows } = await sql`
        SELECT COUNT(*) as count FROM notifications
        WHERE user_id = ${userId} AND organization_id = ${orgId} AND read = FALSE
      `
      return parseInt(rows[0]?.count || "0", 10)
    },
    async create(notification: Notification): Promise<Notification> {
      await sql`
        INSERT INTO notifications (id, organization_id, user_id, type, title, message, read, action_url, metadata, created_at)
        VALUES (
          ${notification.id},
          ${notification.organizationId},
          ${notification.userId},
          ${notification.type},
          ${notification.title},
          ${notification.message},
          ${notification.read},
          ${notification.actionUrl || null},
          ${JSON.stringify(notification.metadata || {})},
          ${notification.createdAt}
        )
      `
      return notification
    },
    async markAsRead(id: string): Promise<Notification | null> {
      const { rows } = await sql`
        UPDATE notifications SET read = TRUE WHERE id = ${id}
        RETURNING *
      `
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        organizationId: row.organization_id as string,
        userId: row.user_id as string,
        type: row.type as Notification["type"],
        title: row.title as string,
        message: row.message as string || "",
        read: row.read as boolean,
        createdAt: (row.created_at as Date)?.toISOString() || "",
        actionUrl: row.action_url as string | undefined,
        metadata: row.metadata as Record<string, unknown> | undefined,
      }
    },
    async markAllAsRead(userId: string, orgId: string): Promise<number> {
      const { rowCount } = await sql`
        UPDATE notifications SET read = TRUE
        WHERE user_id = ${userId} AND organization_id = ${orgId} AND read = FALSE
      `
      return rowCount ?? 0
    },
    async delete(id: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM notifications WHERE id = ${id}`
      return (rowCount ?? 0) > 0
    },
    async deleteOld(days: number = 30): Promise<number> {
      const { rowCount } = await sql`
        DELETE FROM notifications
        WHERE created_at < NOW() - INTERVAL '${days} days' AND read = TRUE
      `
      return rowCount ?? 0
    },
  },

  // ============================================
  // AI COMMAND CENTER DATABASE OPERATIONS
  // ============================================

  // Brain Dumps
  brainDumps: {
    async findByOrganizationId(orgId: string): Promise<AdminBrainDump[]> {
      const { rows } = await sql`
        SELECT * FROM admin_brain_dumps
        WHERE organization_id = ${orgId}
        ORDER BY created_at DESC
      `
      return rows.map(row => ({
        id: row.id as string,
        organizationId: row.organization_id as string,
        adminId: row.admin_id as string,
        content: row.content as string,
        processedAt: row.processed_at ? (row.processed_at as Date).toISOString() : undefined,
        tasksGenerated: row.tasks_generated as number,
        status: row.status as AdminBrainDump["status"],
        createdAt: (row.created_at as Date)?.toISOString() || "",
      }))
    },
    async findById(id: string): Promise<AdminBrainDump | null> {
      const { rows } = await sql`SELECT * FROM admin_brain_dumps WHERE id = ${id}`
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        organizationId: row.organization_id as string,
        adminId: row.admin_id as string,
        content: row.content as string,
        processedAt: row.processed_at ? (row.processed_at as Date).toISOString() : undefined,
        tasksGenerated: row.tasks_generated as number,
        status: row.status as AdminBrainDump["status"],
        createdAt: (row.created_at as Date)?.toISOString() || "",
      }
    },
    async create(brainDump: AdminBrainDump): Promise<AdminBrainDump> {
      await sql`
        INSERT INTO admin_brain_dumps (id, organization_id, admin_id, content, status, created_at)
        VALUES (${brainDump.id}, ${brainDump.organizationId}, ${brainDump.adminId},
                ${brainDump.content}, ${brainDump.status}, ${brainDump.createdAt})
      `
      return brainDump
    },
    async update(id: string, updates: Partial<AdminBrainDump>): Promise<AdminBrainDump | null> {
      const { rows } = await sql`
        UPDATE admin_brain_dumps SET
          processed_at = COALESCE(${updates.processedAt || null}, processed_at),
          tasks_generated = COALESCE(${updates.tasksGenerated ?? null}, tasks_generated),
          status = COALESCE(${updates.status || null}, status)
        WHERE id = ${id}
        RETURNING *
      `
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        organizationId: row.organization_id as string,
        adminId: row.admin_id as string,
        content: row.content as string,
        processedAt: row.processed_at ? (row.processed_at as Date).toISOString() : undefined,
        tasksGenerated: row.tasks_generated as number,
        status: row.status as AdminBrainDump["status"],
        createdAt: (row.created_at as Date)?.toISOString() || "",
      }
    },
  },

  // EOD Insights
  eodInsights: {
    async findByOrganizationId(orgId: string): Promise<EODInsight[]> {
      const { rows } = await sql`
        SELECT * FROM eod_insights
        WHERE organization_id = ${orgId}
        ORDER BY processed_at DESC
      `
      return rows.map(row => ({
        id: row.id as string,
        organizationId: row.organization_id as string,
        eodReportId: row.eod_report_id as string,
        completedItems: row.completed_items as EODInsight["completedItems"],
        blockers: row.blockers as EODInsight["blockers"],
        sentiment: row.sentiment as EODInsight["sentiment"],
        sentimentScore: row.sentiment_score as number,
        categories: row.categories as string[],
        highlights: row.highlights as string[],
        aiSummary: row.ai_summary as string,
        followUpQuestions: row.follow_up_questions as string[],
        processedAt: (row.processed_at as Date)?.toISOString() || "",
      }))
    },
    async findByEODReportId(eodReportId: string): Promise<EODInsight | null> {
      const { rows } = await sql`
        SELECT * FROM eod_insights WHERE eod_report_id = ${eodReportId}
      `
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        organizationId: row.organization_id as string,
        eodReportId: row.eod_report_id as string,
        completedItems: row.completed_items as EODInsight["completedItems"],
        blockers: row.blockers as EODInsight["blockers"],
        sentiment: row.sentiment as EODInsight["sentiment"],
        sentimentScore: row.sentiment_score as number,
        categories: row.categories as string[],
        highlights: row.highlights as string[],
        aiSummary: row.ai_summary as string,
        followUpQuestions: row.follow_up_questions as string[],
        processedAt: (row.processed_at as Date)?.toISOString() || "",
      }
    },
    async create(insight: EODInsight): Promise<EODInsight> {
      await sql`
        INSERT INTO eod_insights (id, organization_id, eod_report_id, completed_items, blockers,
          sentiment, sentiment_score, categories, highlights, ai_summary, follow_up_questions, processed_at)
        VALUES (${insight.id}, ${insight.organizationId}, ${insight.eodReportId},
                ${JSON.stringify(insight.completedItems)}, ${JSON.stringify(insight.blockers)},
                ${insight.sentiment}, ${insight.sentimentScore}, ${JSON.stringify(insight.categories)},
                ${JSON.stringify(insight.highlights)}, ${insight.aiSummary},
                ${JSON.stringify(insight.followUpQuestions)}, ${insight.processedAt})
      `
      return insight
    },
    async findRecentByOrganization(orgId: string, days: number = 7): Promise<EODInsight[]> {
      const { rows } = await sql`
        SELECT * FROM eod_insights
        WHERE organization_id = ${orgId}
          AND processed_at >= NOW() - INTERVAL '1 day' * ${days}
        ORDER BY processed_at DESC
      `
      return rows.map(row => ({
        id: row.id as string,
        organizationId: row.organization_id as string,
        eodReportId: row.eod_report_id as string,
        completedItems: row.completed_items as EODInsight["completedItems"],
        blockers: row.blockers as EODInsight["blockers"],
        sentiment: row.sentiment as EODInsight["sentiment"],
        sentimentScore: row.sentiment_score as number,
        categories: row.categories as string[],
        highlights: row.highlights as string[],
        aiSummary: row.ai_summary as string,
        followUpQuestions: row.follow_up_questions as string[],
        processedAt: (row.processed_at as Date)?.toISOString() || "",
      }))
    },
  },

  // AI Generated Tasks
  aiGeneratedTasks: {
    async findByOrganizationId(orgId: string): Promise<AIGeneratedTask[]> {
      const { rows } = await sql`
        SELECT * FROM ai_generated_tasks
        WHERE organization_id = ${orgId}
        ORDER BY created_at DESC
      `
      return rows.map(row => ({
        id: row.id as string,
        organizationId: row.organization_id as string,
        brainDumpId: row.brain_dump_id as string | undefined,
        assigneeId: row.assignee_id as string,
        assigneeName: row.assignee_name as string | undefined,
        title: row.title as string,
        description: row.description as string | undefined,
        priority: row.priority as AIGeneratedTask["priority"],
        dueDate: row.due_date as string | undefined,
        context: row.context as string,
        status: row.status as AIGeneratedTask["status"],
        approvedBy: row.approved_by as string | undefined,
        approvedAt: row.approved_at ? (row.approved_at as Date).toISOString() : undefined,
        convertedTaskId: row.converted_task_id as string | undefined,
        pushedToSlack: row.pushed_to_slack as boolean,
        pushedAt: row.pushed_at ? (row.pushed_at as Date).toISOString() : undefined,
        createdAt: (row.created_at as Date)?.toISOString() || "",
      }))
    },
    async findPending(orgId: string): Promise<AIGeneratedTask[]> {
      const { rows } = await sql`
        SELECT * FROM ai_generated_tasks
        WHERE organization_id = ${orgId} AND status = 'pending_approval'
        ORDER BY created_at DESC
      `
      return rows.map(row => ({
        id: row.id as string,
        organizationId: row.organization_id as string,
        brainDumpId: row.brain_dump_id as string | undefined,
        assigneeId: row.assignee_id as string,
        assigneeName: row.assignee_name as string | undefined,
        title: row.title as string,
        description: row.description as string | undefined,
        priority: row.priority as AIGeneratedTask["priority"],
        dueDate: row.due_date as string | undefined,
        context: row.context as string,
        status: row.status as AIGeneratedTask["status"],
        approvedBy: row.approved_by as string | undefined,
        approvedAt: row.approved_at ? (row.approved_at as Date).toISOString() : undefined,
        convertedTaskId: row.converted_task_id as string | undefined,
        pushedToSlack: row.pushed_to_slack as boolean,
        pushedAt: row.pushed_at ? (row.pushed_at as Date).toISOString() : undefined,
        createdAt: (row.created_at as Date)?.toISOString() || "",
      }))
    },
    async create(task: AIGeneratedTask): Promise<AIGeneratedTask> {
      await sql`
        INSERT INTO ai_generated_tasks (id, organization_id, brain_dump_id, assignee_id, assignee_name,
          title, description, priority, due_date, context, status, pushed_to_slack, created_at)
        VALUES (${task.id}, ${task.organizationId}, ${task.brainDumpId || null}, ${task.assigneeId},
                ${task.assigneeName || null}, ${task.title}, ${task.description || null},
                ${task.priority}, ${task.dueDate || null}, ${task.context}, ${task.status},
                ${task.pushedToSlack}, ${task.createdAt})
      `
      return task
    },
    async update(id: string, updates: Partial<AIGeneratedTask>): Promise<AIGeneratedTask | null> {
      const { rows } = await sql`
        UPDATE ai_generated_tasks SET
          status = COALESCE(${updates.status || null}, status),
          approved_by = COALESCE(${updates.approvedBy || null}, approved_by),
          approved_at = COALESCE(${updates.approvedAt || null}, approved_at),
          converted_task_id = COALESCE(${updates.convertedTaskId || null}, converted_task_id),
          pushed_to_slack = COALESCE(${updates.pushedToSlack ?? null}, pushed_to_slack),
          pushed_at = COALESCE(${updates.pushedAt || null}, pushed_at)
        WHERE id = ${id}
        RETURNING *
      `
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        organizationId: row.organization_id as string,
        brainDumpId: row.brain_dump_id as string | undefined,
        assigneeId: row.assignee_id as string,
        assigneeName: row.assignee_name as string | undefined,
        title: row.title as string,
        description: row.description as string | undefined,
        priority: row.priority as AIGeneratedTask["priority"],
        dueDate: row.due_date as string | undefined,
        context: row.context as string,
        status: row.status as AIGeneratedTask["status"],
        approvedBy: row.approved_by as string | undefined,
        approvedAt: row.approved_at ? (row.approved_at as Date).toISOString() : undefined,
        convertedTaskId: row.converted_task_id as string | undefined,
        pushedToSlack: row.pushed_to_slack as boolean,
        pushedAt: row.pushed_at ? (row.pushed_at as Date).toISOString() : undefined,
        createdAt: (row.created_at as Date)?.toISOString() || "",
      }
    },
    async delete(id: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM ai_generated_tasks WHERE id = ${id}`
      return (rowCount ?? 0) > 0
    },
  },

  // Daily Digests
  dailyDigests: {
    async findByOrganizationId(orgId: string, limit: number = 7): Promise<DailyDigest[]> {
      const { rows } = await sql`
        SELECT * FROM daily_digests
        WHERE organization_id = ${orgId}
        ORDER BY digest_date DESC
        LIMIT ${limit}
      `
      return rows.map(row => ({
        id: row.id as string,
        organizationId: row.organization_id as string,
        digestDate: row.digest_date as string,
        summary: row.summary as string,
        wins: row.wins as DailyDigest["wins"],
        blockers: row.blockers as DailyDigest["blockers"],
        concerns: row.concerns as DailyDigest["concerns"],
        followUps: row.follow_ups as DailyDigest["followUps"],
        challengeQuestions: row.challenge_questions as string[],
        teamSentiment: row.team_sentiment as DailyDigest["teamSentiment"],
        reportsAnalyzed: row.reports_analyzed as number,
        generatedAt: (row.generated_at as Date)?.toISOString() || "",
      }))
    },
    async findByDate(orgId: string, date: string): Promise<DailyDigest | null> {
      const { rows } = await sql`
        SELECT * FROM daily_digests
        WHERE organization_id = ${orgId} AND digest_date = ${date}
      `
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        organizationId: row.organization_id as string,
        digestDate: row.digest_date as string,
        summary: row.summary as string,
        wins: row.wins as DailyDigest["wins"],
        blockers: row.blockers as DailyDigest["blockers"],
        concerns: row.concerns as DailyDigest["concerns"],
        followUps: row.follow_ups as DailyDigest["followUps"],
        challengeQuestions: row.challenge_questions as string[],
        teamSentiment: row.team_sentiment as DailyDigest["teamSentiment"],
        reportsAnalyzed: row.reports_analyzed as number,
        generatedAt: (row.generated_at as Date)?.toISOString() || "",
      }
    },
    async create(digest: DailyDigest): Promise<DailyDigest> {
      await sql`
        INSERT INTO daily_digests (id, organization_id, digest_date, summary, wins, blockers,
          concerns, follow_ups, challenge_questions, team_sentiment, reports_analyzed, generated_at)
        VALUES (${digest.id}, ${digest.organizationId}, ${digest.digestDate}, ${digest.summary},
                ${JSON.stringify(digest.wins)}, ${JSON.stringify(digest.blockers)},
                ${JSON.stringify(digest.concerns)}, ${JSON.stringify(digest.followUps)},
                ${JSON.stringify(digest.challengeQuestions)}, ${digest.teamSentiment},
                ${digest.reportsAnalyzed}, ${digest.generatedAt})
      `
      return digest
    },
    async getLatest(orgId: string): Promise<DailyDigest | null> {
      const { rows } = await sql`
        SELECT * FROM daily_digests
        WHERE organization_id = ${orgId}
        ORDER BY digest_date DESC
        LIMIT 1
      `
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        organizationId: row.organization_id as string,
        digestDate: row.digest_date as string,
        summary: row.summary as string,
        wins: row.wins as DailyDigest["wins"],
        blockers: row.blockers as DailyDigest["blockers"],
        concerns: row.concerns as DailyDigest["concerns"],
        followUps: row.follow_ups as DailyDigest["followUps"],
        challengeQuestions: row.challenge_questions as string[],
        teamSentiment: row.team_sentiment as DailyDigest["teamSentiment"],
        reportsAnalyzed: row.reports_analyzed as number,
        generatedAt: (row.generated_at as Date)?.toISOString() || "",
      }
    },
  },

  // AI Conversations
  aiConversations: {
    async findByUserId(userId: string, orgId: string, limit: number = 50): Promise<AIConversation[]> {
      const { rows } = await sql`
        SELECT * FROM ai_conversations
        WHERE user_id = ${userId} AND organization_id = ${orgId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
      return rows.map(row => ({
        id: row.id as string,
        organizationId: row.organization_id as string,
        userId: row.user_id as string,
        query: row.query as string,
        response: row.response as string | undefined,
        contextUsed: row.context_used as Record<string, unknown> | undefined,
        createdAt: (row.created_at as Date)?.toISOString() || "",
      }))
    },
    async create(conversation: AIConversation): Promise<AIConversation> {
      await sql`
        INSERT INTO ai_conversations (id, organization_id, user_id, query, response, context_used, created_at)
        VALUES (${conversation.id}, ${conversation.organizationId}, ${conversation.userId},
                ${conversation.query}, ${conversation.response || null},
                ${conversation.contextUsed ? JSON.stringify(conversation.contextUsed) : null},
                ${conversation.createdAt})
      `
      return conversation
    },
    async update(id: string, updates: Partial<AIConversation>): Promise<AIConversation | null> {
      const { rows } = await sql`
        UPDATE ai_conversations SET
          response = COALESCE(${updates.response || null}, response),
          context_used = COALESCE(${updates.contextUsed ? JSON.stringify(updates.contextUsed) : null}::jsonb, context_used)
        WHERE id = ${id}
        RETURNING *
      `
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        organizationId: row.organization_id as string,
        userId: row.user_id as string,
        query: row.query as string,
        response: row.response as string | undefined,
        contextUsed: row.context_used as Record<string, unknown> | undefined,
        createdAt: (row.created_at as Date)?.toISOString() || "",
      }
    },
  },

  // API Keys for external integrations (MCP, Claude Desktop, etc.)
  apiKeys: {
    async findByOrganizationId(orgId: string): Promise<ApiKey[]> {
      const { rows } = await sql`
        SELECT * FROM api_keys
        WHERE organization_id = ${orgId}
        ORDER BY created_at DESC
      `
      return rows.map(parseApiKey)
    },
    async findById(id: string): Promise<ApiKey | null> {
      const { rows } = await sql`SELECT * FROM api_keys WHERE id = ${id}`
      return rows[0] ? parseApiKey(rows[0]) : null
    },
    async findByKey(key: string): Promise<ApiKey | null> {
      const { rows } = await sql`SELECT * FROM api_keys WHERE key = ${key}`
      return rows[0] ? parseApiKey(rows[0]) : null
    },
    async create(apiKey: ApiKey): Promise<ApiKey> {
      await sql`
        INSERT INTO api_keys (id, organization_id, created_by, name, key, scopes, created_at, last_used_at)
        VALUES (${apiKey.id}, ${apiKey.organizationId}, ${apiKey.createdBy}, ${apiKey.name},
                ${apiKey.key}, ${JSON.stringify(apiKey.scopes)}, ${apiKey.createdAt}, ${apiKey.lastUsedAt})
      `
      return apiKey
    },
    async updateLastUsed(id: string): Promise<ApiKey | null> {
      const now = new Date().toISOString()
      const { rows } = await sql`
        UPDATE api_keys SET last_used_at = ${now}
        WHERE id = ${id}
        RETURNING *
      `
      return rows[0] ? parseApiKey(rows[0]) : null
    },
    async delete(id: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM api_keys WHERE id = ${id}`
      return (rowCount ?? 0) > 0
    },
  },
}

export default db
