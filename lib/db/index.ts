import { sql } from "./sql"
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
  TaskTemplate,
  PushSubscription,
  GoogleCalendarToken,
  GoogleCalendarEventMapping,
  FocusBlock,
  DailyEnergy,
  UserStreak,
  FocusBlockCategory,
  EnergyLevel,
  MoodEmoji,
  EnergyFactor,
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
    // Branding fields
    logoUrl: row.logo_url as string | undefined,
    primaryColor: row.primary_color as string | undefined,
    secondaryColor: row.secondary_color as string | undefined,
    customDomain: row.custom_domain as string | undefined,
    faviconUrl: row.favicon_url as string | undefined,
    billingEmail: row.billing_email as string | undefined,
    // Stripe fields
    stripeCustomerId: row.stripe_customer_id as string | undefined,
    stripeSubscriptionId: row.stripe_subscription_id as string | null | undefined,
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
    timezone: row.timezone as string | undefined,
    eodReminderTime: row.eod_reminder_time as string | undefined,
    managerId: (row.manager_id as string) || null,
    jobTitle: row.job_title as string | undefined,
    notificationPreferences: row.notification_preferences as OrganizationMember["notificationPreferences"],
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
    workspaceId: row.workspace_id as string | null | undefined,
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
    workspaceId: row.workspace_id as string | null | undefined,
    userId: row.user_id as string | undefined,
    ownerEmail: row.owner_email as string | undefined,
    title: row.title as string,
    description: row.description as string,
    progress: row.progress as number,
    dueDate: row.due_date as string,
    status: row.status as Rock["status"],
    bucket: row.bucket as string | undefined,
    outcome: row.outcome as string | undefined,
    doneWhen: row.done_when as string[] | undefined,
    milestones: row.milestones as Rock["milestones"] | undefined,
    quarter: row.quarter as string | undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

function parseAssignedTask(row: Record<string, unknown>): AssignedTask {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    workspaceId: row.workspace_id as string | null | undefined,
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
    source: (row.source as "manual" | "asana") || "manual",
    asanaGid: row.asana_gid as string | null | undefined,
    comments: row.comments as AssignedTask["comments"] | undefined,
    recurrence: row.recurrence as AssignedTask["recurrence"] | undefined,
    parentRecurringTaskId: row.parent_recurring_task_id as string | undefined,
  }
}

function parseEODReport(row: Record<string, unknown>): EODReport {
  // PostgreSQL DATE type returns a JavaScript Date object
  // We need to format it as YYYY-MM-DD string using UTC methods to avoid timezone shifting
  const dateValue = row.date
  let dateString: string
  if (dateValue instanceof Date) {
    // Use UTC methods to avoid server timezone affecting date parsing
    // DATE type is timezone-agnostic, so UTC interpretation is correct
    dateString = `${dateValue.getUTCFullYear()}-${String(dateValue.getUTCMonth() + 1).padStart(2, '0')}-${String(dateValue.getUTCDate()).padStart(2, '0')}`
  } else if (typeof dateValue === 'string') {
    // Already a string, extract just the date part if it has time component
    dateString = dateValue.split('T')[0]
  } else {
    dateString = String(dateValue)
  }

  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    workspaceId: row.workspace_id as string | null | undefined,
    userId: row.user_id as string,
    date: dateString,
    tasks: row.tasks as EODReport["tasks"],
    challenges: row.challenges as string,
    tomorrowPriorities: row.tomorrow_priorities as EODReport["tomorrowPriorities"],
    needsEscalation: row.needs_escalation as boolean,
    escalationNote: row.escalation_note as string | null,
    metricValueToday: row.metric_value_today as number | null,
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
      const { rows } = await sql`SELECT * FROM organizations ORDER BY created_at DESC LIMIT 1000`
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
    async findByIds(ids: string[]): Promise<Organization[]> {
      if (ids.length === 0) return []
      // Use PostgreSQL array literal format for ANY clause
      const idArray = `{${ids.join(',')}}`
      const { rows } = await sql`
        SELECT * FROM organizations
        WHERE id = ANY(${idArray}::text[])
      `
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
          logo_url = COALESCE(${updates.logoUrl ?? null}, logo_url),
          primary_color = COALESCE(${updates.primaryColor ?? null}, primary_color),
          secondary_color = COALESCE(${updates.secondaryColor ?? null}, secondary_color),
          custom_domain = COALESCE(${updates.customDomain ?? null}, custom_domain),
          favicon_url = COALESCE(${updates.faviconUrl ?? null}, favicon_url),
          billing_email = COALESCE(${updates.billingEmail ?? null}, billing_email),
          stripe_customer_id = COALESCE(${updates.stripeCustomerId ?? null}, stripe_customer_id),
          stripe_subscription_id = ${updates.stripeSubscriptionId !== undefined ? updates.stripeSubscriptionId : null},
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
    async findByStripeCustomerId(customerId: string): Promise<Organization | null> {
      const { rows } = await sql`
        SELECT * FROM organizations
        WHERE stripe_customer_id = ${customerId}
      `
      return rows[0] ? parseOrganization(rows[0]) : null
    },
  },

  // Billing History
  billingHistory: {
    async create(entry: {
      organizationId: string
      subscriptionId: string
      amount: number
      currency: string
      status: string
      invoiceUrl?: string
      stripeInvoiceId: string
      billingPeriodStart?: string | null
      billingPeriodEnd?: string | null
    }): Promise<void> {
      const id = crypto.randomUUID()
      await sql`
        INSERT INTO billing_history (
          id, organization_id, subscription_id, amount, currency, status,
          invoice_url, stripe_invoice_id, billing_period_start, billing_period_end, created_at
        ) VALUES (
          ${id}, ${entry.organizationId}, ${entry.subscriptionId}, ${entry.amount},
          ${entry.currency}, ${entry.status}, ${entry.invoiceUrl || null},
          ${entry.stripeInvoiceId}, ${entry.billingPeriodStart || null},
          ${entry.billingPeriodEnd || null}, ${new Date().toISOString()}
        )
      `
    },
    async findByOrganizationId(orgId: string, limit: number = 20): Promise<Array<{
      id: string
      amount: number
      currency: string
      status: string
      invoiceUrl?: string
      billingPeriodStart?: string
      billingPeriodEnd?: string
      createdAt: string
    }>> {
      const { rows } = await sql`
        SELECT * FROM billing_history
        WHERE organization_id = ${orgId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
      return rows.map(row => ({
        id: row.id as string,
        amount: row.amount as number,
        currency: row.currency as string,
        status: row.status as string,
        invoiceUrl: row.invoice_url as string | undefined,
        billingPeriodStart: row.billing_period_start as string | undefined,
        billingPeriodEnd: row.billing_period_end as string | undefined,
        createdAt: (row.created_at as Date).toISOString(),
      }))
    },
  },

  // Organization Members
  members: {
    async findAll(): Promise<OrganizationMember[]> {
      const { rows } = await sql`SELECT * FROM organization_members ORDER BY created_at DESC LIMIT 5000`
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
    // IMPORTANT: id is always organization_members.id (for foreign key references like team_member_metrics)
    // userId is the users.id (if they have registered)
    async findWithUsersByOrganizationId(orgId: string): Promise<Array<{
      id: string // This is organization_members.id - use for metrics, manager assignments, etc.
      userId?: string // This is users.id - use for rocks, tasks, EOD reports
      name: string
      email: string
      role: "owner" | "admin" | "member"
      department: string
      avatar?: string
      joinDate: string
      weeklyMeasurable?: string
      status?: "active" | "invited" | "pending" | "inactive"
      timezone?: string
      eodReminderTime?: string
      managerId?: string | null
      jobTitle?: string
    }>> {
      const { rows } = await sql`
        SELECT
          om.id as id,
          om.user_id as user_id,
          COALESCE(u.name, om.name) as name,
          COALESCE(u.email, om.email) as email,
          u.avatar,
          om.role,
          om.department,
          om.joined_at,
          om.weekly_measurable,
          om.status,
          om.timezone,
          om.eod_reminder_time,
          om.manager_id,
          om.job_title
        FROM organization_members om
        LEFT JOIN users u ON u.id = om.user_id
        WHERE om.organization_id = ${orgId}
        ORDER BY om.joined_at ASC
      `
      return rows.map(row => ({
        id: row.id as string,
        userId: row.user_id as string | undefined,
        name: row.name as string,
        email: row.email as string,
        role: row.role as "owner" | "admin" | "member",
        department: row.department as string,
        avatar: row.avatar as string | undefined,
        joinDate: (row.joined_at as Date)?.toISOString() || "",
        weeklyMeasurable: row.weekly_measurable as string | undefined,
        status: row.status as "active" | "invited" | "pending" | "inactive" | undefined,
        timezone: row.timezone as string | undefined,
        eodReminderTime: row.eod_reminder_time as string | undefined,
        managerId: (row.manager_id as string) || null,
        jobTitle: row.job_title as string | undefined,
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
          status = COALESCE(${updates.status || null}, status),
          timezone = COALESCE(${updates.timezone || null}, timezone),
          eod_reminder_time = COALESCE(${updates.eodReminderTime || null}, eod_reminder_time),
          manager_id = COALESCE(${updates.managerId || null}, manager_id),
          job_title = COALESCE(${updates.jobTitle || null}, job_title),
          notification_preferences = COALESCE(${updates.notificationPreferences ? JSON.stringify(updates.notificationPreferences) : null}::jsonb, notification_preferences)
        WHERE id = ${id}
        RETURNING *
      `
      return rows[0] ? parseMember(rows[0]) : null
    },
    // Find all direct reports for a manager
    async findDirectReports(orgId: string, managerId: string): Promise<Array<{
      id: string
      userId: string | null
      name: string
      email: string
      role: "owner" | "admin" | "member"
      department: string
      avatar?: string
      joinDate: string
      weeklyMeasurable?: string
      status?: "active" | "invited" | "pending" | "inactive"
      timezone?: string
      eodReminderTime?: string
      jobTitle?: string
    }>> {
      const { rows } = await sql`
        SELECT
          COALESCE(u.id, om.id) as id,
          om.user_id,
          COALESCE(u.name, om.name) as name,
          COALESCE(u.email, om.email) as email,
          u.avatar,
          om.role,
          om.department,
          om.joined_at,
          om.weekly_measurable,
          om.status,
          om.timezone,
          om.eod_reminder_time,
          om.job_title
        FROM organization_members om
        LEFT JOIN users u ON u.id = om.user_id
        WHERE om.organization_id = ${orgId}
          AND om.manager_id = ${managerId}
          AND om.status = 'active'
        ORDER BY om.name ASC
      `
      return rows.map(row => ({
        id: row.id as string,
        userId: (row.user_id as string) || null,
        name: row.name as string,
        email: row.email as string,
        role: row.role as "owner" | "admin" | "member",
        department: row.department as string,
        avatar: row.avatar as string | undefined,
        joinDate: (row.joined_at as Date)?.toISOString() || "",
        weeklyMeasurable: row.weekly_measurable as string | undefined,
        status: row.status as "active" | "invited" | "pending" | "inactive" | undefined,
        timezone: row.timezone as string | undefined,
        eodReminderTime: row.eod_reminder_time as string | undefined,
        jobTitle: row.job_title as string | undefined,
      }))
    },
    // Get count of direct reports for a manager
    async getDirectReportsCount(orgId: string, managerId: string): Promise<number> {
      const { rows } = await sql`
        SELECT COUNT(*) as count
        FROM organization_members
        WHERE organization_id = ${orgId}
          AND manager_id = ${managerId}
          AND status = 'active'
      `
      return parseInt(rows[0]?.count || "0", 10)
    },
    // Update manager for a member (allows setting to null)
    async updateManager(id: string, managerId: string | null): Promise<OrganizationMember | null> {
      const { rows } = await sql`
        UPDATE organization_members SET
          manager_id = ${managerId}
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
    async updateOrganization(token: string, organizationId: string): Promise<boolean> {
      const { rowCount } = await sql`
        UPDATE sessions SET organization_id = ${organizationId}
        WHERE token = ${token}
      `
      return (rowCount ?? 0) > 0
    },
  },

  // Invitations
  invitations: {
    async findByToken(token: string): Promise<Invitation | null> {
      const { rows } = await sql`SELECT * FROM invitations WHERE token = ${token}`
      return rows[0] ? parseInvitation(rows[0]) : null
    },
    async findByOrganizationId(orgId: string): Promise<Invitation[]> {
      const { rows } = await sql`SELECT * FROM invitations WHERE organization_id = ${orgId} ORDER BY created_at DESC LIMIT 1000`
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
        INSERT INTO invitations (id, organization_id, email, role, department, token, expires_at, created_at, invited_by, status, workspace_id)
        VALUES (${invitation.id}, ${invitation.organizationId}, ${invitation.email}, ${invitation.role},
                ${invitation.department}, ${invitation.token}, ${invitation.expiresAt},
                ${invitation.createdAt}, ${invitation.invitedBy}, ${invitation.status}, ${invitation.workspaceId || null})
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
      // OPTIMIZED: Added LIMIT to prevent unbounded queries
      const { rows } = await sql`SELECT * FROM rocks ORDER BY created_at DESC LIMIT 1000`
      return rows.map(parseRock)
    },
    async findById(id: string): Promise<Rock | null> {
      const { rows } = await sql`SELECT * FROM rocks WHERE id = ${id} LIMIT 1`
      return rows[0] ? parseRock(rows[0]) : null
    },
    async findByOrganizationId(orgId: string, workspaceId?: string): Promise<Rock[]> {
      // OPTIMIZED: Added LIMIT to prevent unbounded queries
      // Added optional workspace filter to move filtering to SQL layer
      if (workspaceId) {
        const { rows } = await sql`
          SELECT * FROM rocks
          WHERE organization_id = ${orgId} AND workspace_id = ${workspaceId}
          ORDER BY created_at DESC LIMIT 500
        `
        return rows.map(parseRock)
      }
      const { rows } = await sql`SELECT * FROM rocks WHERE organization_id = ${orgId} ORDER BY created_at DESC LIMIT 500`
      return rows.map(parseRock)
    },
    async findByUserId(userId: string, orgId: string): Promise<Rock[]> {
      const { rows } = await sql`
        SELECT * FROM rocks WHERE user_id = ${userId} AND organization_id = ${orgId} ORDER BY created_at DESC LIMIT 100
      `
      return rows.map(parseRock)
    },
    async create(rock: Rock): Promise<Rock> {
      await sql`
        INSERT INTO rocks (id, organization_id, user_id, owner_email, title, description, progress, due_date, status, bucket, outcome, done_when, quarter, created_at, updated_at)
        VALUES (${rock.id}, ${rock.organizationId}, ${rock.userId || null}, ${rock.ownerEmail || null}, ${rock.title}, ${rock.description},
                ${rock.progress}, ${rock.dueDate}, ${rock.status}, ${rock.bucket || null},
                ${rock.outcome || null}, ${JSON.stringify(rock.doneWhen || [])},
                ${rock.quarter || null}, ${rock.createdAt}, ${rock.updatedAt})
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
    // Optimized: fetch rocks for multiple users at once (reduces data transfer)
    async findByUserIds(userIds: string[], orgId: string): Promise<Rock[]> {
      if (userIds.length === 0) return []
      // Use PostgreSQL array literal format for ANY clause
      const userIdArray = `{${userIds.join(',')}}`
      const { rows } = await sql`
        SELECT * FROM rocks
        WHERE organization_id = ${orgId} AND user_id = ANY(${userIdArray}::text[])
      `
      return rows.map(parseRock)
    },
  },

  // Rock Milestones
  rockMilestones: {
    async findByRockId(rockId: string): Promise<Array<{
      id: string
      rockId: string
      text: string
      completed: boolean
      completedAt: string | null
      position: number
      createdAt: string
      updatedAt: string
    }>> {
      const { rows } = await sql`
        SELECT * FROM rock_milestones
        WHERE rock_id = ${rockId}
        ORDER BY position ASC
      `
      return rows.map(row => ({
        id: row.id as string,
        rockId: row.rock_id as string,
        text: row.text as string,
        completed: row.completed as boolean,
        completedAt: row.completed_at ? (row.completed_at as Date).toISOString() : null,
        position: row.position as number,
        createdAt: (row.created_at as Date)?.toISOString() || "",
        updatedAt: (row.updated_at as Date)?.toISOString() || "",
      }))
    },
    async create(milestone: {
      id?: string
      rockId: string
      text: string
      completed?: boolean
      position?: number
    }): Promise<{ id: string; rockId: string; text: string; completed: boolean; position: number }> {
      const id = milestone.id || `milestone-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      const { rows } = await sql`
        INSERT INTO rock_milestones (id, rock_id, text, completed, position, created_at, updated_at)
        VALUES (
          ${id},
          ${milestone.rockId},
          ${milestone.text},
          ${milestone.completed || false},
          ${milestone.position || 0},
          NOW(),
          NOW()
        )
        RETURNING *
      `
      const row = rows[0]
      return {
        id: row.id as string,
        rockId: row.rock_id as string,
        text: row.text as string,
        completed: row.completed as boolean,
        position: row.position as number,
      }
    },
    async createMany(rockId: string, milestones: string[]): Promise<void> {
      // Insert all milestones for a rock
      for (let i = 0; i < milestones.length; i++) {
        const text = milestones[i]
        if (text && text.trim()) {
          await sql`
            INSERT INTO rock_milestones (rock_id, text, completed, position, created_at, updated_at)
            VALUES (${rockId}, ${text.trim()}, false, ${i}, NOW(), NOW())
          `
        }
      }
    },
    async update(id: string, updates: { text?: string; completed?: boolean; position?: number }): Promise<boolean> {
      const completedAt = updates.completed ? "NOW()" : null
      const { rowCount } = await sql`
        UPDATE rock_milestones SET
          text = COALESCE(${updates.text || null}, text),
          completed = COALESCE(${updates.completed ?? null}, completed),
          completed_at = ${updates.completed ? new Date().toISOString() : null},
          position = COALESCE(${updates.position ?? null}, position),
          updated_at = NOW()
        WHERE id = ${id}
      `
      return (rowCount ?? 0) > 0
    },
    async delete(id: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM rock_milestones WHERE id = ${id}`
      return (rowCount ?? 0) > 0
    },
    async deleteByRockId(rockId: string): Promise<number> {
      const { rowCount } = await sql`DELETE FROM rock_milestones WHERE rock_id = ${rockId}`
      return rowCount ?? 0
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
    async findByOrganizationId(orgId: string, workspaceId?: string): Promise<AssignedTask[]> {
      // OPTIMIZED: Added LIMIT and ORDER BY to prevent unbounded queries
      // Added optional workspace filter to move filtering to SQL layer
      if (workspaceId) {
        const { rows } = await sql`
          SELECT * FROM assigned_tasks
          WHERE organization_id = ${orgId} AND workspace_id = ${workspaceId}
          ORDER BY created_at DESC LIMIT 1000
        `
        return rows.map(parseAssignedTask)
      }
      const { rows } = await sql`SELECT * FROM assigned_tasks WHERE organization_id = ${orgId} ORDER BY created_at DESC LIMIT 1000`
      return rows.map(parseAssignedTask)
    },
    async findByAssigneeId(assigneeId: string, orgId: string): Promise<AssignedTask[]> {
      // OPTIMIZED: Added LIMIT to prevent unbounded queries
      const { rows } = await sql`
        SELECT * FROM assigned_tasks
        WHERE assignee_id = ${assigneeId} AND organization_id = ${orgId}
        ORDER BY created_at DESC LIMIT 200
      `
      return rows.map(parseAssignedTask)
    },
    async findById(id: string): Promise<AssignedTask | null> {
      const { rows } = await sql`SELECT * FROM assigned_tasks WHERE id = ${id} LIMIT 1`
      return rows[0] ? parseAssignedTask(rows[0]) : null
    },
    async findByAsanaGid(asanaGid: string, orgId: string): Promise<AssignedTask | null> {
      const { rows } = await sql`
        SELECT * FROM assigned_tasks
        WHERE asana_gid = ${asanaGid} AND organization_id = ${orgId}
      `
      return rows[0] ? parseAssignedTask(rows[0]) : null
    },
    async findByIds(ids: string[]): Promise<AssignedTask[]> {
      if (ids.length === 0) return []
      // Use PostgreSQL array literal format for ANY clause
      const idArray = `{${ids.join(',')}}`
      const { rows } = await sql`
        SELECT * FROM assigned_tasks
        WHERE id = ANY(${idArray}::text[])
      `
      return rows.map(parseAssignedTask)
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
          comments = COALESCE(${updates.comments ? JSON.stringify(updates.comments) : null}::jsonb, comments),
          recurrence = COALESCE(${updates.recurrence ? JSON.stringify(updates.recurrence) : null}::jsonb, recurrence),
          updated_at = ${now}
        WHERE id = ${id}
        RETURNING *
      `
      return rows[0] ? parseAssignedTask(rows[0]) : null
    },
    async batchUpdate(updates: Array<{ id: string; updates: Partial<AssignedTask> }>): Promise<void> {
      if (updates.length === 0) return
      const now = new Date().toISOString()

      // Execute all updates in parallel
      await Promise.all(
        updates.map(({ id, updates: taskUpdates }) =>
          sql`
            UPDATE assigned_tasks SET
              title = COALESCE(${taskUpdates.title || null}, title),
              description = COALESCE(${taskUpdates.description || null}, description),
              priority = COALESCE(${taskUpdates.priority || null}, priority),
              due_date = COALESCE(${taskUpdates.dueDate || null}, due_date),
              status = COALESCE(${taskUpdates.status || null}, status),
              completed_at = COALESCE(${taskUpdates.completedAt || null}, completed_at),
              added_to_eod = COALESCE(${taskUpdates.addedToEOD ?? null}, added_to_eod),
              eod_report_id = COALESCE(${taskUpdates.eodReportId || null}, eod_report_id),
              comments = COALESCE(${taskUpdates.comments ? JSON.stringify(taskUpdates.comments) : null}::jsonb, comments),
              recurrence = COALESCE(${taskUpdates.recurrence ? JSON.stringify(taskUpdates.recurrence) : null}::jsonb, recurrence),
              updated_at = ${now}
            WHERE id = ${id}
          `
        )
      )
    },
    async delete(id: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM assigned_tasks WHERE id = ${id}`
      return (rowCount ?? 0) > 0
    },
    // Optimized: fetch tasks for multiple users at once (reduces data transfer)
    async findByUserIds(userIds: string[], orgId: string): Promise<AssignedTask[]> {
      if (userIds.length === 0) return []
      // Use PostgreSQL array literal format for ANY clause
      const userIdArray = `{${userIds.join(',')}}`
      const { rows } = await sql`
        SELECT * FROM assigned_tasks
        WHERE organization_id = ${orgId} AND assignee_id = ANY(${userIdArray}::text[])
      `
      return rows.map(parseAssignedTask)
    },
  },

  // EOD Reports
  eodReports: {
    async findByOrganizationId(orgId: string, workspaceId?: string): Promise<EODReport[]> {
      // OPTIMIZED: Added LIMIT and ORDER BY - fetches last 90 days max
      // Added optional workspace filter to move filtering to SQL layer
      if (workspaceId) {
        const { rows } = await sql`
          SELECT * FROM eod_reports
          WHERE organization_id = ${orgId} AND workspace_id = ${workspaceId}
          ORDER BY date DESC
          LIMIT 500
        `
        return rows.map(parseEODReport)
      }
      const { rows } = await sql`
        SELECT * FROM eod_reports
        WHERE organization_id = ${orgId}
        ORDER BY date DESC
        LIMIT 500
      `
      return rows.map(parseEODReport)
    },
    async findByUserId(userId: string, orgId: string): Promise<EODReport[]> {
      // OPTIMIZED: Added LIMIT - fetches last 90 days max per user
      const { rows } = await sql`
        SELECT * FROM eod_reports
        WHERE user_id = ${userId} AND organization_id = ${orgId}
        ORDER BY date DESC
        LIMIT 90
      `
      return rows.map(parseEODReport)
    },
    async findByUserAndDate(userId: string, orgId: string, date: string): Promise<EODReport | null> {
      // Returns the most recent report for backward compatibility
      const { rows } = await sql`
        SELECT * FROM eod_reports
        WHERE user_id = ${userId} AND organization_id = ${orgId} AND date = ${date}
        ORDER BY submitted_at DESC
        LIMIT 1
      `
      return rows[0] ? parseEODReport(rows[0]) : null
    },
    async findAllByUserAndDate(userId: string, orgId: string, date: string): Promise<EODReport[]> {
      // Returns all reports for a user on a specific date (supports multiple reports per day)
      const { rows } = await sql`
        SELECT * FROM eod_reports
        WHERE user_id = ${userId} AND organization_id = ${orgId} AND date = ${date}
        ORDER BY submitted_at DESC
      `
      return rows.map(parseEODReport)
    },
    async findById(id: string): Promise<EODReport | null> {
      const { rows } = await sql`SELECT * FROM eod_reports WHERE id = ${id} LIMIT 1`
      return rows[0] ? parseEODReport(rows[0]) : null
    },
    async create(report: EODReport): Promise<EODReport> {
      try {
        // Try with metric_value_today column (requires migration)
        await sql`
          INSERT INTO eod_reports (id, organization_id, user_id, date, tasks, challenges,
            tomorrow_priorities, needs_escalation, escalation_note, metric_value_today, submitted_at, created_at)
          VALUES (${report.id}, ${report.organizationId}, ${report.userId}, ${report.date},
                  ${JSON.stringify(report.tasks)}, ${report.challenges},
                  ${JSON.stringify(report.tomorrowPriorities)}, ${report.needsEscalation},
                  ${report.escalationNote}, ${report.metricValueToday}, ${report.submittedAt}, ${report.createdAt})
        `
      } catch (err: any) {
        // Fallback if metric_value_today column doesn't exist (migration not run)
        if (err.message?.includes('metric_value_today') || err.message?.includes('column')) {
          await sql`
            INSERT INTO eod_reports (id, organization_id, user_id, date, tasks, challenges,
              tomorrow_priorities, needs_escalation, escalation_note, submitted_at, created_at)
            VALUES (${report.id}, ${report.organizationId}, ${report.userId}, ${report.date},
                    ${JSON.stringify(report.tasks)}, ${report.challenges},
                    ${JSON.stringify(report.tomorrowPriorities)}, ${report.needsEscalation},
                    ${report.escalationNote}, ${report.submittedAt}, ${report.createdAt})
          `
        } else {
          throw err
        }
      }
      return report
    },
    async update(id: string, updates: Partial<EODReport>): Promise<EODReport | null> {
      try {
        // Try with metric_value_today and date columns (supports date changes)
        const { rows } = await sql`
          UPDATE eod_reports SET
            tasks = COALESCE(${updates.tasks ? JSON.stringify(updates.tasks) : null}::jsonb, tasks),
            challenges = COALESCE(${updates.challenges || null}, challenges),
            tomorrow_priorities = COALESCE(${updates.tomorrowPriorities ? JSON.stringify(updates.tomorrowPriorities) : null}::jsonb, tomorrow_priorities),
            needs_escalation = COALESCE(${updates.needsEscalation ?? null}, needs_escalation),
            escalation_note = COALESCE(${updates.escalationNote || null}, escalation_note),
            metric_value_today = COALESCE(${updates.metricValueToday ?? null}, metric_value_today),
            date = COALESCE(${updates.date || null}, date),
            submitted_at = COALESCE(${updates.submittedAt || null}, submitted_at)
          WHERE id = ${id}
          RETURNING *
        `
        return rows[0] ? parseEODReport(rows[0]) : null
      } catch (err: any) {
        // Fallback if metric_value_today column doesn't exist
        if (err.message?.includes('metric_value_today') || err.message?.includes('column')) {
          const { rows } = await sql`
            UPDATE eod_reports SET
              tasks = COALESCE(${updates.tasks ? JSON.stringify(updates.tasks) : null}::jsonb, tasks),
              challenges = COALESCE(${updates.challenges || null}, challenges),
              tomorrow_priorities = COALESCE(${updates.tomorrowPriorities ? JSON.stringify(updates.tomorrowPriorities) : null}::jsonb, tomorrow_priorities),
              needs_escalation = COALESCE(${updates.needsEscalation ?? null}, needs_escalation),
              escalation_note = COALESCE(${updates.escalationNote || null}, escalation_note),
              date = COALESCE(${updates.date || null}, date),
              submitted_at = COALESCE(${updates.submittedAt || null}, submitted_at)
            WHERE id = ${id}
            RETURNING *
          `
          return rows[0] ? parseEODReport(rows[0]) : null
        }
        throw err
      }
    },
    async delete(id: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM eod_reports WHERE id = ${id}`
      return (rowCount ?? 0) > 0
    },
    // Optimized: fetch EOD reports for multiple users with date range (reduces data transfer)
    async findByUserIdsWithDateRange(
      userIds: string[],
      orgId: string,
      startDate: string,
      endDate: string
    ): Promise<EODReport[]> {
      if (userIds.length === 0) return []
      // Use PostgreSQL array literal format for ANY clause
      const userIdArray = `{${userIds.join(',')}}`
      const { rows } = await sql`
        SELECT * FROM eod_reports
        WHERE organization_id = ${orgId}
          AND user_id = ANY(${userIdArray}::text[])
          AND date >= ${startDate}
          AND date <= ${endDate}
        ORDER BY date DESC
      `
      return rows.map(parseEODReport)
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
        LIMIT 100
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
        LIMIT 100
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
    // OPTIMIZED: Batch fetch insights for multiple reports (fixes N+1 query problem)
    async findByReportIds(reportIds: string[]): Promise<EODInsight[]> {
      if (reportIds.length === 0) return []
      // Use PostgreSQL array literal format for ANY clause
      const reportIdArray = `{${reportIds.join(',')}}`
      const { rows } = await sql`
        SELECT * FROM eod_insights
        WHERE eod_report_id = ANY(${reportIdArray}::text[])
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

  // Task Templates
  taskTemplates: {
    async findByOrganizationId(orgId: string, userId?: string): Promise<TaskTemplate[]> {
      const { rows } = await sql`
        SELECT * FROM task_templates
        WHERE organization_id = ${orgId}
        AND (is_shared = TRUE OR created_by = ${userId || ''})
        ORDER BY created_at DESC
      `
      return rows.map(row => ({
        id: row.id as string,
        organizationId: row.organization_id as string,
        createdBy: row.created_by as string,
        name: row.name as string,
        title: row.title as string,
        description: row.description as string | undefined,
        priority: (row.priority as TaskTemplate["priority"]) || "normal",
        defaultRockId: row.default_rock_id as string | undefined,
        recurrence: row.recurrence as TaskTemplate["recurrence"],
        isShared: row.is_shared as boolean,
        createdAt: (row.created_at as Date)?.toISOString() || "",
      }))
    },
    async findById(id: string): Promise<TaskTemplate | null> {
      const { rows } = await sql`SELECT * FROM task_templates WHERE id = ${id}`
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        organizationId: row.organization_id as string,
        createdBy: row.created_by as string,
        name: row.name as string,
        title: row.title as string,
        description: row.description as string | undefined,
        priority: (row.priority as TaskTemplate["priority"]) || "normal",
        defaultRockId: row.default_rock_id as string | undefined,
        recurrence: row.recurrence as TaskTemplate["recurrence"],
        isShared: row.is_shared as boolean,
        createdAt: (row.created_at as Date)?.toISOString() || "",
      }
    },
    async create(template: TaskTemplate): Promise<TaskTemplate> {
      await sql`
        INSERT INTO task_templates (id, organization_id, created_by, name, title, description, priority, default_rock_id, recurrence, is_shared, created_at)
        VALUES (${template.id}, ${template.organizationId}, ${template.createdBy}, ${template.name},
                ${template.title}, ${template.description || null}, ${template.priority},
                ${template.defaultRockId || null},
                ${template.recurrence ? JSON.stringify(template.recurrence) : null},
                ${template.isShared}, ${template.createdAt})
      `
      return template
    },
    async delete(id: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM task_templates WHERE id = ${id}`
      return (rowCount ?? 0) > 0
    },
  },

  // Push Subscriptions for browser notifications
  pushSubscriptions: {
    async findByUserId(userId: string): Promise<PushSubscription[]> {
      const { rows } = await sql`
        SELECT * FROM push_subscriptions
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `
      return rows.map(row => ({
        id: row.id as string,
        userId: row.user_id as string,
        organizationId: row.organization_id as string,
        endpoint: row.endpoint as string,
        p256dh: row.p256dh as string,
        auth: row.auth as string,
        userAgent: row.user_agent as string | undefined,
        createdAt: (row.created_at as Date)?.toISOString() || "",
        lastUsedAt: row.last_used_at ? (row.last_used_at as Date).toISOString() : undefined,
      }))
    },
    async findByOrganizationId(orgId: string): Promise<PushSubscription[]> {
      const { rows } = await sql`
        SELECT * FROM push_subscriptions
        WHERE organization_id = ${orgId}
        ORDER BY created_at DESC
      `
      return rows.map(row => ({
        id: row.id as string,
        userId: row.user_id as string,
        organizationId: row.organization_id as string,
        endpoint: row.endpoint as string,
        p256dh: row.p256dh as string,
        auth: row.auth as string,
        userAgent: row.user_agent as string | undefined,
        createdAt: (row.created_at as Date)?.toISOString() || "",
        lastUsedAt: row.last_used_at ? (row.last_used_at as Date).toISOString() : undefined,
      }))
    },
    async findByEndpoint(endpoint: string): Promise<PushSubscription | null> {
      const { rows } = await sql`SELECT * FROM push_subscriptions WHERE endpoint = ${endpoint}`
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        userId: row.user_id as string,
        organizationId: row.organization_id as string,
        endpoint: row.endpoint as string,
        p256dh: row.p256dh as string,
        auth: row.auth as string,
        userAgent: row.user_agent as string | undefined,
        createdAt: (row.created_at as Date)?.toISOString() || "",
        lastUsedAt: row.last_used_at ? (row.last_used_at as Date).toISOString() : undefined,
      }
    },
    async create(subscription: PushSubscription): Promise<PushSubscription> {
      await sql`
        INSERT INTO push_subscriptions (id, user_id, organization_id, endpoint, p256dh, auth, user_agent, created_at)
        VALUES (${subscription.id}, ${subscription.userId}, ${subscription.organizationId},
                ${subscription.endpoint}, ${subscription.p256dh}, ${subscription.auth},
                ${subscription.userAgent || null}, ${subscription.createdAt})
        ON CONFLICT (endpoint) DO UPDATE SET
          user_id = ${subscription.userId},
          organization_id = ${subscription.organizationId},
          p256dh = ${subscription.p256dh},
          auth = ${subscription.auth},
          user_agent = ${subscription.userAgent || null}
      `
      return subscription
    },
    async updateLastUsed(id: string): Promise<void> {
      const now = new Date().toISOString()
      await sql`UPDATE push_subscriptions SET last_used_at = ${now} WHERE id = ${id}`
    },
    async delete(endpoint: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`
      return (rowCount ?? 0) > 0
    },
    async deleteByUserId(userId: string): Promise<number> {
      const { rowCount } = await sql`DELETE FROM push_subscriptions WHERE user_id = ${userId}`
      return rowCount ?? 0
    },
  },

  // Google Calendar tokens
  googleCalendarTokens: {
    // Legacy method - for backward compatibility (org-scoped)
    async findByUserId(userId: string, orgId: string): Promise<GoogleCalendarToken | null> {
      const { rows } = await sql`
        SELECT * FROM google_calendar_tokens
        WHERE user_id = ${userId} AND organization_id = ${orgId}
        LIMIT 1
      `
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        userId: row.user_id as string,
        organizationId: row.organization_id as string,
        workspaceId: row.workspace_id as string | undefined,
        accessToken: row.access_token as string,
        refreshToken: row.refresh_token as string,
        tokenType: row.token_type as string,
        expiryDate: Number(row.expiry_date),
        scope: row.scope as string | undefined,
        calendarId: row.calendar_id as string,
        syncEnabled: row.sync_enabled as boolean,
        lastSyncAt: row.last_sync_at ? (row.last_sync_at as Date).toISOString() : undefined,
        createdAt: (row.created_at as Date)?.toISOString() || "",
        updatedAt: (row.updated_at as Date)?.toISOString() || "",
      }
    },
    // New workspace-scoped method
    async findByUserIdAndWorkspace(userId: string, orgId: string, workspaceId: string): Promise<GoogleCalendarToken | null> {
      const { rows } = await sql`
        SELECT * FROM google_calendar_tokens
        WHERE user_id = ${userId} AND organization_id = ${orgId} AND workspace_id = ${workspaceId}
      `
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        userId: row.user_id as string,
        organizationId: row.organization_id as string,
        workspaceId: row.workspace_id as string,
        accessToken: row.access_token as string,
        refreshToken: row.refresh_token as string,
        tokenType: row.token_type as string,
        expiryDate: Number(row.expiry_date),
        scope: row.scope as string | undefined,
        calendarId: row.calendar_id as string,
        syncEnabled: row.sync_enabled as boolean,
        lastSyncAt: row.last_sync_at ? (row.last_sync_at as Date).toISOString() : undefined,
        createdAt: (row.created_at as Date)?.toISOString() || "",
        updatedAt: (row.updated_at as Date)?.toISOString() || "",
      }
    },
    async create(token: GoogleCalendarToken): Promise<GoogleCalendarToken> {
      await sql`
        INSERT INTO google_calendar_tokens (id, user_id, organization_id, workspace_id, access_token, refresh_token,
          token_type, expiry_date, scope, calendar_id, sync_enabled, created_at, updated_at)
        VALUES (${token.id}, ${token.userId}, ${token.organizationId}, ${token.workspaceId || null}, ${token.accessToken},
          ${token.refreshToken}, ${token.tokenType}, ${token.expiryDate}, ${token.scope || null},
          ${token.calendarId}, ${token.syncEnabled}, ${token.createdAt}, ${token.updatedAt})
        ON CONFLICT (user_id, organization_id, workspace_id) DO UPDATE SET
          access_token = ${token.accessToken},
          refresh_token = ${token.refreshToken},
          expiry_date = ${token.expiryDate},
          scope = ${token.scope || null},
          updated_at = ${token.updatedAt}
      `
      return token
    },
    // Legacy update method - for backward compatibility
    async update(userId: string, orgId: string, updates: Partial<GoogleCalendarToken>): Promise<GoogleCalendarToken | null> {
      const now = new Date().toISOString()
      const { rows } = await sql`
        UPDATE google_calendar_tokens SET
          access_token = COALESCE(${updates.accessToken || null}, access_token),
          refresh_token = COALESCE(${updates.refreshToken || null}, refresh_token),
          expiry_date = COALESCE(${updates.expiryDate ?? null}, expiry_date),
          calendar_id = COALESCE(${updates.calendarId || null}, calendar_id),
          sync_enabled = COALESCE(${updates.syncEnabled ?? null}, sync_enabled),
          last_sync_at = COALESCE(${updates.lastSyncAt || null}, last_sync_at),
          updated_at = ${now}
        WHERE user_id = ${userId} AND organization_id = ${orgId}
        RETURNING *
      `
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        userId: row.user_id as string,
        organizationId: row.organization_id as string,
        accessToken: row.access_token as string,
        refreshToken: row.refresh_token as string,
        tokenType: row.token_type as string,
        expiryDate: Number(row.expiry_date),
        scope: row.scope as string | undefined,
        calendarId: row.calendar_id as string,
        syncEnabled: row.sync_enabled as boolean,
        lastSyncAt: row.last_sync_at ? (row.last_sync_at as Date).toISOString() : undefined,
        createdAt: (row.created_at as Date)?.toISOString() || "",
        updatedAt: (row.updated_at as Date)?.toISOString() || "",
      }
    },
    async delete(userId: string, orgId: string): Promise<boolean> {
      const { rowCount } = await sql`
        DELETE FROM google_calendar_tokens
        WHERE user_id = ${userId} AND organization_id = ${orgId}
      `
      return (rowCount ?? 0) > 0
    },
    // New workspace-scoped update method
    async updateByWorkspace(userId: string, orgId: string, workspaceId: string, updates: Partial<GoogleCalendarToken>): Promise<GoogleCalendarToken | null> {
      const now = new Date().toISOString()
      const { rows } = await sql`
        UPDATE google_calendar_tokens SET
          access_token = COALESCE(${updates.accessToken || null}, access_token),
          refresh_token = COALESCE(${updates.refreshToken || null}, refresh_token),
          expiry_date = COALESCE(${updates.expiryDate ?? null}, expiry_date),
          calendar_id = COALESCE(${updates.calendarId || null}, calendar_id),
          sync_enabled = COALESCE(${updates.syncEnabled ?? null}, sync_enabled),
          last_sync_at = COALESCE(${updates.lastSyncAt || null}, last_sync_at),
          updated_at = ${now}
        WHERE user_id = ${userId} AND organization_id = ${orgId} AND workspace_id = ${workspaceId}
        RETURNING *
      `
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        userId: row.user_id as string,
        organizationId: row.organization_id as string,
        workspaceId: row.workspace_id as string,
        accessToken: row.access_token as string,
        refreshToken: row.refresh_token as string,
        tokenType: row.token_type as string,
        expiryDate: Number(row.expiry_date),
        scope: row.scope as string | undefined,
        calendarId: row.calendar_id as string,
        syncEnabled: row.sync_enabled as boolean,
        lastSyncAt: row.last_sync_at ? (row.last_sync_at as Date).toISOString() : undefined,
        createdAt: (row.created_at as Date)?.toISOString() || "",
        updatedAt: (row.updated_at as Date)?.toISOString() || "",
      }
    },
    // New workspace-scoped delete method
    async deleteByWorkspace(userId: string, orgId: string, workspaceId: string): Promise<boolean> {
      const { rowCount } = await sql`
        DELETE FROM google_calendar_tokens
        WHERE user_id = ${userId} AND organization_id = ${orgId} AND workspace_id = ${workspaceId}
      `
      return (rowCount ?? 0) > 0
    },
  },

  // Google Calendar event mappings
  googleCalendarEvents: {
    async findByItem(userId: string, itemType: string, itemId: string): Promise<GoogleCalendarEventMapping | null> {
      const { rows } = await sql`
        SELECT * FROM google_calendar_events
        WHERE user_id = ${userId} AND item_type = ${itemType} AND item_id = ${itemId}
      `
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        userId: row.user_id as string,
        googleEventId: row.google_event_id as string,
        itemType: row.item_type as "task" | "rock",
        itemId: row.item_id as string,
        calendarId: row.calendar_id as string,
        createdAt: (row.created_at as Date)?.toISOString() || "",
        updatedAt: (row.updated_at as Date)?.toISOString() || "",
      }
    },
    async findByGoogleEventId(userId: string, googleEventId: string): Promise<GoogleCalendarEventMapping | null> {
      const { rows } = await sql`
        SELECT * FROM google_calendar_events
        WHERE user_id = ${userId} AND google_event_id = ${googleEventId}
      `
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        userId: row.user_id as string,
        googleEventId: row.google_event_id as string,
        itemType: row.item_type as "task" | "rock",
        itemId: row.item_id as string,
        calendarId: row.calendar_id as string,
        createdAt: (row.created_at as Date)?.toISOString() || "",
        updatedAt: (row.updated_at as Date)?.toISOString() || "",
      }
    },
    async create(mapping: GoogleCalendarEventMapping): Promise<GoogleCalendarEventMapping> {
      await sql`
        INSERT INTO google_calendar_events (id, user_id, google_event_id, item_type, item_id, calendar_id, created_at, updated_at)
        VALUES (${mapping.id}, ${mapping.userId}, ${mapping.googleEventId}, ${mapping.itemType},
          ${mapping.itemId}, ${mapping.calendarId}, ${mapping.createdAt}, ${mapping.updatedAt})
        ON CONFLICT (user_id, google_event_id) DO UPDATE SET
          item_type = ${mapping.itemType},
          item_id = ${mapping.itemId},
          updated_at = ${mapping.updatedAt}
      `
      return mapping
    },
    async delete(userId: string, googleEventId: string): Promise<boolean> {
      const { rowCount } = await sql`
        DELETE FROM google_calendar_events
        WHERE user_id = ${userId} AND google_event_id = ${googleEventId}
      `
      return (rowCount ?? 0) > 0
    },
    async deleteByItem(userId: string, itemType: string, itemId: string): Promise<boolean> {
      const { rowCount } = await sql`
        DELETE FROM google_calendar_events
        WHERE user_id = ${userId} AND item_type = ${itemType} AND item_id = ${itemId}
      `
      return (rowCount ?? 0) > 0
    },
  },

  // Org Chart Rock Progress - tracks completion of individual rock bullets
  orgChartRockProgress: {
    async findByEmployee(employeeName: string): Promise<{ employeeName: string; rockIndex: number; bulletIndex: number; completed: boolean; updatedAt: string; updatedBy?: string }[]> {
      const { rows } = await sql`
        SELECT * FROM org_chart_rock_progress
        WHERE employee_name = ${employeeName}
      `
      return rows.map(row => ({
        employeeName: row.employee_name as string,
        rockIndex: row.rock_index as number,
        bulletIndex: row.bullet_index as number,
        completed: row.completed as boolean,
        updatedAt: (row.updated_at as Date)?.toISOString() || "",
        updatedBy: row.updated_by as string | undefined,
      }))
    },
    async findAll(): Promise<{ employeeName: string; rockIndex: number; bulletIndex: number; completed: boolean; updatedAt: string; updatedBy?: string }[]> {
      const { rows } = await sql`SELECT * FROM org_chart_rock_progress`
      return rows.map(row => ({
        employeeName: row.employee_name as string,
        rockIndex: row.rock_index as number,
        bulletIndex: row.bullet_index as number,
        completed: row.completed as boolean,
        updatedAt: (row.updated_at as Date)?.toISOString() || "",
        updatedBy: row.updated_by as string | undefined,
      }))
    },
    async upsert(employeeName: string, rockIndex: number, bulletIndex: number, completed: boolean, updatedBy?: string): Promise<void> {
      const now = new Date().toISOString()
      await sql`
        INSERT INTO org_chart_rock_progress (id, employee_name, rock_index, bullet_index, completed, updated_at, updated_by)
        VALUES (gen_random_uuid(), ${employeeName}, ${rockIndex}, ${bulletIndex}, ${completed}, ${now}, ${updatedBy || null})
        ON CONFLICT (employee_name, rock_index, bullet_index)
        DO UPDATE SET completed = ${completed}, updated_at = ${now}, updated_by = ${updatedBy || null}
      `
    },
    async delete(employeeName: string, rockIndex: number, bulletIndex: number): Promise<boolean> {
      const { rowCount } = await sql`
        DELETE FROM org_chart_rock_progress
        WHERE employee_name = ${employeeName} AND rock_index = ${rockIndex} AND bullet_index = ${bulletIndex}
      `
      return (rowCount ?? 0) > 0
    },
    async deleteByEmployee(employeeName: string): Promise<boolean> {
      const { rowCount } = await sql`
        DELETE FROM org_chart_rock_progress
        WHERE employee_name = ${employeeName}
      `
      return (rowCount ?? 0) > 0
    },
  },

  // MA Employees - org chart data source
  maEmployees: {
    async findAll(): Promise<{
      id: string
      firstName: string
      lastName: string
      fullName: string
      supervisor: string | null
      department: string | null
      jobTitle: string | null
      responsibilities: string | null
      notes: string | null
      email: string | null
      rocks: string | null
      isActive: boolean
      createdAt: string
      updatedAt: string
    }[]> {
      const { rows } = await sql`
        SELECT *, TRIM(first_name || ' ' || COALESCE(last_name, '')) as full_name
        FROM ma_employees
        WHERE is_active = TRUE
        ORDER BY first_name ASC, last_name ASC
      `
      return rows.map(row => ({
        id: row.id as string,
        firstName: row.first_name as string,
        lastName: row.last_name as string,
        fullName: row.full_name as string,
        supervisor: row.supervisor as string | null,
        department: row.department as string | null,
        jobTitle: row.job_title as string | null,
        responsibilities: row.responsibilities as string | null,
        notes: row.notes as string | null,
        email: row.email as string | null,
        rocks: row.rocks as string | null,
        isActive: row.is_active as boolean,
        createdAt: (row.created_at as Date)?.toISOString() || "",
        updatedAt: (row.updated_at as Date)?.toISOString() || "",
      }))
    },
    async findByWorkspace(workspaceId: string): Promise<{
      id: string
      firstName: string
      lastName: string
      fullName: string
      supervisor: string | null
      department: string | null
      jobTitle: string | null
      responsibilities: string | null
      notes: string | null
      email: string | null
      rocks: string | null
      isActive: boolean
      createdAt: string
      updatedAt: string
    }[]> {
      const { rows } = await sql`
        SELECT *, TRIM(first_name || ' ' || COALESCE(last_name, '')) as full_name
        FROM ma_employees
        WHERE workspace_id = ${workspaceId}
          AND is_active = TRUE
        ORDER BY first_name ASC, last_name ASC
      `
      return rows.map(row => ({
        id: row.id as string,
        firstName: row.first_name as string,
        lastName: row.last_name as string,
        fullName: row.full_name as string,
        supervisor: row.supervisor as string | null,
        department: row.department as string | null,
        jobTitle: row.job_title as string | null,
        responsibilities: row.responsibilities as string | null,
        notes: row.notes as string | null,
        email: row.email as string | null,
        rocks: row.rocks as string | null,
        isActive: row.is_active as boolean,
        createdAt: (row.created_at as Date)?.toISOString() || "",
        updatedAt: (row.updated_at as Date)?.toISOString() || "",
      }))
    },
    async findById(id: string): Promise<{
      id: string
      firstName: string
      lastName: string
      fullName: string
      supervisor: string | null
      department: string | null
      jobTitle: string | null
      responsibilities: string | null
      notes: string | null
      email: string | null
      rocks: string | null
      isActive: boolean
      createdAt: string
      updatedAt: string
    } | null> {
      const { rows } = await sql`
        SELECT *, TRIM(first_name || ' ' || COALESCE(last_name, '')) as full_name
        FROM ma_employees WHERE id = ${id}
      `
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        firstName: row.first_name as string,
        lastName: row.last_name as string,
        fullName: row.full_name as string,
        supervisor: row.supervisor as string | null,
        department: row.department as string | null,
        jobTitle: row.job_title as string | null,
        responsibilities: row.responsibilities as string | null,
        notes: row.notes as string | null,
        email: row.email as string | null,
        rocks: row.rocks as string | null,
        isActive: row.is_active as boolean,
        createdAt: (row.created_at as Date)?.toISOString() || "",
        updatedAt: (row.updated_at as Date)?.toISOString() || "",
      }
    },
    async findByEmail(email: string): Promise<{
      id: string
      firstName: string
      lastName: string
      fullName: string
      supervisor: string | null
      department: string | null
      jobTitle: string | null
      responsibilities: string | null
      notes: string | null
      email: string | null
      rocks: string | null
      isActive: boolean
    } | null> {
      const { rows } = await sql`
        SELECT *, TRIM(first_name || ' ' || COALESCE(last_name, '')) as full_name
        FROM ma_employees
        WHERE LOWER(email) = LOWER(${email}) AND is_active = TRUE
      `
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        firstName: row.first_name as string,
        lastName: row.last_name as string,
        fullName: row.full_name as string,
        supervisor: row.supervisor as string | null,
        department: row.department as string | null,
        jobTitle: row.job_title as string | null,
        responsibilities: row.responsibilities as string | null,
        notes: row.notes as string | null,
        email: row.email as string | null,
        rocks: row.rocks as string | null,
        isActive: row.is_active as boolean,
      }
    },
    async findByDepartment(department: string): Promise<{
      id: string
      firstName: string
      lastName: string
      fullName: string
      supervisor: string | null
      department: string | null
      jobTitle: string | null
      responsibilities: string | null
      notes: string | null
      email: string | null
      isActive: boolean
    }[]> {
      const { rows } = await sql`
        SELECT *, TRIM(first_name || ' ' || COALESCE(last_name, '')) as full_name
        FROM ma_employees
        WHERE department = ${department} AND is_active = TRUE
        ORDER BY first_name ASC, last_name ASC
      `
      return rows.map(row => ({
        id: row.id as string,
        firstName: row.first_name as string,
        lastName: row.last_name as string,
        fullName: row.full_name as string,
        supervisor: row.supervisor as string | null,
        department: row.department as string | null,
        jobTitle: row.job_title as string | null,
        responsibilities: row.responsibilities as string | null,
        notes: row.notes as string | null,
        email: row.email as string | null,
        isActive: row.is_active as boolean,
      }))
    },
    async create(employee: {
      firstName: string
      lastName: string
      supervisor?: string | null
      department?: string | null
      jobTitle?: string | null
      responsibilities?: string | null
      notes?: string | null
      email?: string | null
      workspaceId?: string | null
    }): Promise<{ id: string; fullName: string }> {
      const { rows } = await sql`
        INSERT INTO ma_employees (first_name, last_name, supervisor, department, job_title, responsibilities, notes, email, workspace_id)
        VALUES (${employee.firstName}, ${employee.lastName}, ${employee.supervisor || null},
                ${employee.department || null}, ${employee.jobTitle || null},
                ${employee.responsibilities || null}, ${employee.notes || null}, ${employee.email || null},
                ${employee.workspaceId || null})
        RETURNING id, first_name, last_name
      `
      const fullName = `${rows[0].first_name} ${rows[0].last_name || ''}`.trim()
      return {
        id: rows[0].id as string,
        fullName,
      }
    },
    async createMany(employees: {
      firstName: string
      lastName: string
      supervisor?: string | null
      department?: string | null
      jobTitle?: string | null
      responsibilities?: string | null
      notes?: string | null
      email?: string | null
      workspaceId?: string | null
    }[]): Promise<number> {
      let count = 0
      for (const emp of employees) {
        await sql`
          INSERT INTO ma_employees (first_name, last_name, supervisor, department, job_title, responsibilities, notes, email, workspace_id)
          VALUES (${emp.firstName}, ${emp.lastName}, ${emp.supervisor || null},
                  ${emp.department || null}, ${emp.jobTitle || null},
                  ${emp.responsibilities || null}, ${emp.notes || null}, ${emp.email || null},
                  ${emp.workspaceId || null})
        `
        count++
      }
      return count
    },
    async update(id: string, updates: {
      firstName?: string
      lastName?: string
      supervisor?: string | null
      department?: string | null
      jobTitle?: string | null
      responsibilities?: string | null
      notes?: string | null
      email?: string | null
      rocks?: string | null
      isActive?: boolean
    }): Promise<boolean> {
      const now = new Date().toISOString()
      const { rowCount } = await sql`
        UPDATE ma_employees SET
          first_name = COALESCE(${updates.firstName || null}, first_name),
          last_name = COALESCE(${updates.lastName || null}, last_name),
          supervisor = COALESCE(${updates.supervisor}, supervisor),
          department = COALESCE(${updates.department}, department),
          job_title = COALESCE(${updates.jobTitle}, job_title),
          responsibilities = COALESCE(${updates.responsibilities}, responsibilities),
          notes = COALESCE(${updates.notes}, notes),
          email = COALESCE(${updates.email}, email),
          rocks = COALESCE(${updates.rocks}, rocks),
          is_active = COALESCE(${updates.isActive ?? null}, is_active),
          updated_at = ${now}
        WHERE id = ${id}
      `
      return (rowCount ?? 0) > 0
    },
    async updateRocks(id: string, rocks: string | null): Promise<boolean> {
      const now = new Date().toISOString()
      const { rowCount } = await sql`
        UPDATE ma_employees SET rocks = ${rocks}, updated_at = ${now}
        WHERE id = ${id}
      `
      return (rowCount ?? 0) > 0
    },
    async updateRocksByEmail(email: string, rocks: string | null): Promise<boolean> {
      const now = new Date().toISOString()
      const { rowCount } = await sql`
        UPDATE ma_employees SET rocks = ${rocks}, updated_at = ${now}
        WHERE LOWER(email) = LOWER(${email}) AND is_active = TRUE
      `
      return (rowCount ?? 0) > 0
    },
    async delete(id: string): Promise<boolean> {
      // Soft delete by setting is_active = false
      const now = new Date().toISOString()
      const { rowCount } = await sql`
        UPDATE ma_employees SET is_active = FALSE, updated_at = ${now}
        WHERE id = ${id}
      `
      return (rowCount ?? 0) > 0
    },
    async hardDelete(id: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM ma_employees WHERE id = ${id}`
      return (rowCount ?? 0) > 0
    },
    async deleteAll(): Promise<number> {
      const { rowCount } = await sql`DELETE FROM ma_employees`
      return rowCount ?? 0
    },
    async count(): Promise<number> {
      const { rows } = await sql`SELECT COUNT(*) as count FROM ma_employees WHERE is_active = TRUE`
      return parseInt(rows[0]?.count || "0", 10)
    },
    async countByWorkspace(workspaceId: string): Promise<number> {
      const { rows } = await sql`
        SELECT COUNT(*) as count FROM ma_employees
        WHERE workspace_id = ${workspaceId} AND is_active = TRUE
      `
      return parseInt(rows[0]?.count || "0", 10)
    },
  },

  // ============================================
  // PRODUCTIVITY TRACKING
  // ============================================

  focusBlocks: {
    async findByUserId(userId: string, organizationId: string, startDate?: string, endDate?: string): Promise<FocusBlock[]> {
      let query
      if (startDate && endDate) {
        query = await sql`
          SELECT * FROM focus_blocks
          WHERE user_id = ${userId} AND organization_id = ${organizationId}
          AND start_time >= ${startDate}::timestamp AND start_time <= ${endDate}::timestamp
          ORDER BY start_time DESC
        `
      } else {
        query = await sql`
          SELECT * FROM focus_blocks
          WHERE user_id = ${userId} AND organization_id = ${organizationId}
          ORDER BY start_time DESC
          LIMIT 50
        `
      }
      return query.rows.map(row => ({
        id: row.id as string,
        organizationId: row.organization_id as string,
        userId: row.user_id as string,
        startTime: (row.start_time as Date)?.toISOString() || "",
        endTime: (row.end_time as Date)?.toISOString() || "",
        category: row.category as FocusBlockCategory,
        quality: row.quality as 1 | 2 | 3 | 4 | 5 | null,
        interruptions: (row.interruptions as number) || 0,
        notes: row.notes as string | null,
        taskId: row.task_id as string | null,
        rockId: row.rock_id as string | null,
        createdAt: (row.created_at as Date)?.toISOString() || "",
      }))
    },
    async findById(id: string): Promise<FocusBlock | null> {
      const { rows } = await sql`SELECT * FROM focus_blocks WHERE id = ${id}`
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        organizationId: row.organization_id as string,
        userId: row.user_id as string,
        startTime: (row.start_time as Date)?.toISOString() || "",
        endTime: (row.end_time as Date)?.toISOString() || "",
        category: row.category as FocusBlockCategory,
        quality: row.quality as 1 | 2 | 3 | 4 | 5 | null,
        interruptions: (row.interruptions as number) || 0,
        notes: row.notes as string | null,
        taskId: row.task_id as string | null,
        rockId: row.rock_id as string | null,
        createdAt: (row.created_at as Date)?.toISOString() || "",
      }
    },
    async create(block: {
      organizationId: string
      userId: string
      startTime: string
      endTime: string
      category: string
      quality?: number | null
      interruptions?: number
      notes?: string | null
      taskId?: string | null
      rockId?: string | null
    }): Promise<{ id: string }> {
      const { rows } = await sql`
        INSERT INTO focus_blocks (organization_id, user_id, start_time, end_time, category, quality, interruptions, notes, task_id, rock_id)
        VALUES (${block.organizationId}, ${block.userId}, ${block.startTime}::timestamp, ${block.endTime}::timestamp,
                ${block.category}, ${block.quality || null}, ${block.interruptions || 0},
                ${block.notes || null}, ${block.taskId || null}, ${block.rockId || null})
        RETURNING id
      `
      return { id: rows[0].id as string }
    },
    async update(id: string, updates: {
      startTime?: string
      endTime?: string
      category?: string
      quality?: number | null
      interruptions?: number
      notes?: string | null
      taskId?: string | null
      rockId?: string | null
    }): Promise<boolean> {
      const { rowCount } = await sql`
        UPDATE focus_blocks SET
          start_time = COALESCE(${updates.startTime || null}::timestamp, start_time),
          end_time = COALESCE(${updates.endTime || null}::timestamp, end_time),
          category = COALESCE(${updates.category || null}, category),
          quality = COALESCE(${updates.quality ?? null}, quality),
          interruptions = COALESCE(${updates.interruptions ?? null}, interruptions),
          notes = COALESCE(${updates.notes}, notes),
          task_id = COALESCE(${updates.taskId}, task_id),
          rock_id = COALESCE(${updates.rockId}, rock_id),
          updated_at = NOW()
        WHERE id = ${id}
      `
      return (rowCount ?? 0) > 0
    },
    async delete(id: string): Promise<boolean> {
      const { rowCount } = await sql`DELETE FROM focus_blocks WHERE id = ${id}`
      return (rowCount ?? 0) > 0
    },
    async getTodayTotalMinutes(userId: string, organizationId: string): Promise<number> {
      const today = new Date().toISOString().split("T")[0]
      const { rows } = await sql`
        SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 60), 0) as total_minutes
        FROM focus_blocks
        WHERE user_id = ${userId} AND organization_id = ${organizationId}
        AND DATE(start_time) = ${today}::date
      `
      return Math.round(parseFloat(rows[0]?.total_minutes || "0"))
    },
  },

  dailyEnergy: {
    async findByUserAndDate(userId: string, organizationId: string, date: string): Promise<DailyEnergy | null> {
      const { rows } = await sql`
        SELECT * FROM daily_energy
        WHERE user_id = ${userId} AND organization_id = ${organizationId} AND date = ${date}::date
      `
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        organizationId: row.organization_id as string,
        userId: row.user_id as string,
        date: row.date as string,
        energyLevel: row.energy_level as EnergyLevel,
        mood: row.mood as MoodEmoji,
        factors: (row.factors as EnergyFactor[]) || [],
        notes: row.notes as string | null,
        createdAt: (row.created_at as Date)?.toISOString() || "",
      }
    },
    async findByUserDateRange(userId: string, organizationId: string, startDate: string, endDate: string): Promise<DailyEnergy[]> {
      const { rows } = await sql`
        SELECT * FROM daily_energy
        WHERE user_id = ${userId} AND organization_id = ${organizationId}
        AND date >= ${startDate}::date AND date <= ${endDate}::date
        ORDER BY date DESC
      `
      return rows.map(row => ({
        id: row.id as string,
        organizationId: row.organization_id as string,
        userId: row.user_id as string,
        date: row.date as string,
        energyLevel: row.energy_level as EnergyLevel,
        mood: row.mood as MoodEmoji,
        factors: (row.factors as EnergyFactor[]) || [],
        notes: row.notes as string | null,
        createdAt: (row.created_at as Date)?.toISOString() || "",
      }))
    },
    async upsert(energy: {
      organizationId: string
      userId: string
      date: string
      energyLevel: string
      mood: string
      factors?: string[]
      notes?: string | null
    }): Promise<{ id: string }> {
      const factorsJson = JSON.stringify(energy.factors || [])
      const { rows } = await sql`
        INSERT INTO daily_energy (organization_id, user_id, date, energy_level, mood, factors, notes)
        VALUES (${energy.organizationId}, ${energy.userId}, ${energy.date}::date,
                ${energy.energyLevel}, ${energy.mood}, ${factorsJson}::jsonb, ${energy.notes || null})
        ON CONFLICT (organization_id, user_id, date)
        DO UPDATE SET
          energy_level = EXCLUDED.energy_level,
          mood = EXCLUDED.mood,
          factors = EXCLUDED.factors,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING id
      `
      return { id: rows[0].id as string }
    },
  },

  userStreaks: {
    async findByUser(userId: string, organizationId: string): Promise<{
      id: string
      organizationId: string
      userId: string
      currentStreak: number
      longestStreak: number
      lastSubmissionDate: string | null
      milestoneDates: Record<string, string>
      updatedAt: string
    } | null> {
      const { rows } = await sql`
        SELECT * FROM user_streaks
        WHERE user_id = ${userId} AND organization_id = ${organizationId}
      `
      if (!rows[0]) return null
      const row = rows[0]
      return {
        id: row.id as string,
        organizationId: row.organization_id as string,
        userId: row.user_id as string,
        currentStreak: (row.current_streak as number) || 0,
        longestStreak: (row.longest_streak as number) || 0,
        lastSubmissionDate: row.last_submission_date as string | null,
        milestoneDates: (row.milestone_dates as Record<string, string>) || {},
        updatedAt: (row.updated_at as Date)?.toISOString() || "",
      }
    },
    async upsert(streak: {
      organizationId: string
      userId: string
      currentStreak: number
      longestStreak: number
      lastSubmissionDate: string
      milestoneDates?: Record<string, string>
    }): Promise<{ id: string }> {
      const milestonesJson = JSON.stringify(streak.milestoneDates || {})
      const { rows } = await sql`
        INSERT INTO user_streaks (organization_id, user_id, current_streak, longest_streak, last_submission_date, milestone_dates)
        VALUES (${streak.organizationId}, ${streak.userId}, ${streak.currentStreak},
                ${streak.longestStreak}, ${streak.lastSubmissionDate}::date, ${milestonesJson}::jsonb)
        ON CONFLICT (organization_id, user_id)
        DO UPDATE SET
          current_streak = EXCLUDED.current_streak,
          longest_streak = EXCLUDED.longest_streak,
          last_submission_date = EXCLUDED.last_submission_date,
          milestone_dates = EXCLUDED.milestone_dates,
          updated_at = NOW()
        RETURNING id
      `
      return { id: rows[0].id as string }
    },
    async updateStreak(userId: string, organizationId: string, today: string): Promise<{
      currentStreak: number
      longestStreak: number
      isNewRecord: boolean
    }> {
      // Get existing streak
      const existing = await this.findByUser(userId, organizationId)

      if (!existing) {
        // First submission ever
        await this.upsert({
          organizationId,
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastSubmissionDate: today,
          milestoneDates: {},
        })
        return { currentStreak: 1, longestStreak: 1, isNewRecord: true }
      }

      const lastDate = existing.lastSubmissionDate ? new Date(existing.lastSubmissionDate) : null
      const todayDate = new Date(today)

      // If already submitted today, no change
      if (lastDate && lastDate.toISOString().split("T")[0] === today) {
        return {
          currentStreak: existing.currentStreak,
          longestStreak: existing.longestStreak,
          isNewRecord: false,
        }
      }

      let newCurrentStreak = existing.currentStreak
      let isNewRecord = false

      if (lastDate) {
        // Calculate working days difference
        const diffTime = todayDate.getTime() - lastDate.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

        // Check if it's a consecutive working day (accounting for weekends)
        let workingDaysDiff = 0
        const checkDate = new Date(lastDate)
        checkDate.setDate(checkDate.getDate() + 1)
        while (checkDate <= todayDate) {
          const day = checkDate.getDay()
          if (day !== 0 && day !== 6) {
            workingDaysDiff++
          }
          checkDate.setDate(checkDate.getDate() + 1)
        }

        if (workingDaysDiff === 1) {
          // Consecutive working day
          newCurrentStreak += 1
        } else if (workingDaysDiff === 0) {
          // Same day or weekend skip
          newCurrentStreak += 0
        } else {
          // Streak broken
          newCurrentStreak = 1
        }
      } else {
        newCurrentStreak = 1
      }

      const newLongestStreak = Math.max(newCurrentStreak, existing.longestStreak)
      isNewRecord = newCurrentStreak > existing.longestStreak

      // Check for new milestones
      const milestoneDates = { ...existing.milestoneDates }
      const milestones = [7, 14, 30, 60, 90, 100]
      for (const milestone of milestones) {
        if (newCurrentStreak >= milestone && !milestoneDates[milestone.toString()]) {
          milestoneDates[milestone.toString()] = today
        }
      }

      await this.upsert({
        organizationId,
        userId,
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastSubmissionDate: today,
        milestoneDates,
      })

      return { currentStreak: newCurrentStreak, longestStreak: newLongestStreak, isNewRecord }
    },
  },

  focusScoreHistory: {
    async findByUserDateRange(userId: string, organizationId: string, startDate: string, endDate: string): Promise<{
      id: string
      date: string
      score: number
      breakdown: Record<string, number>
    }[]> {
      const { rows } = await sql`
        SELECT * FROM focus_score_history
        WHERE user_id = ${userId} AND organization_id = ${organizationId}
        AND date >= ${startDate}::date AND date <= ${endDate}::date
        ORDER BY date DESC
      `
      return rows.map(row => ({
        id: row.id as string,
        date: row.date as string,
        score: row.score as number,
        breakdown: (row.breakdown as Record<string, number>) || {},
      }))
    },
    async upsert(score: {
      organizationId: string
      userId: string
      date: string
      score: number
      breakdown: Record<string, number>
    }): Promise<{ id: string }> {
      const breakdownJson = JSON.stringify(score.breakdown)
      const { rows } = await sql`
        INSERT INTO focus_score_history (organization_id, user_id, date, score, breakdown)
        VALUES (${score.organizationId}, ${score.userId}, ${score.date}::date, ${score.score}, ${breakdownJson}::jsonb)
        ON CONFLICT (organization_id, user_id, date)
        DO UPDATE SET
          score = EXCLUDED.score,
          breakdown = EXCLUDED.breakdown
        RETURNING id
      `
      return { id: rows[0].id as string }
    },
  },

  // ============================================
  // MULTI-TENANCY & PRODUCTIZATION
  // ============================================

  // Get all organizations a user is a member of (for org switcher)
  userOrganizations: {
    async findByUserId(userId: string): Promise<Array<{
      id: string
      name: string
      slug: string
      logoUrl?: string
      primaryColor?: string
      role: "owner" | "admin" | "member"
      memberStatus: "active" | "invited" | "pending" | "inactive"
      subscriptionTier?: string
      subscriptionStatus?: string
      seatsUsed?: number
      seatsPurchased?: number
      joinedAt: string
    }>> {
      const { rows } = await sql`
        SELECT
          o.id,
          o.name,
          o.slug,
          o.logo_url,
          o.primary_color,
          om.role,
          om.status as member_status,
          om.joined_at,
          os.status as subscription_status,
          st.name as subscription_tier,
          os.seats_purchased,
          os.seats_used
        FROM organization_members om
        JOIN organizations o ON om.organization_id = o.id
        LEFT JOIN organization_subscriptions os ON o.id = os.organization_id
        LEFT JOIN subscription_tiers st ON os.tier_id = st.id
        WHERE om.user_id = ${userId} AND om.status = 'active'
        ORDER BY om.joined_at ASC
      `
      return rows.map(row => ({
        id: row.id as string,
        name: row.name as string,
        slug: row.slug as string,
        logoUrl: row.logo_url as string | undefined,
        primaryColor: row.primary_color as string | undefined,
        role: row.role as "owner" | "admin" | "member",
        memberStatus: row.member_status as "active" | "invited" | "pending" | "inactive",
        subscriptionTier: row.subscription_tier as string | undefined,
        subscriptionStatus: row.subscription_status as string | undefined,
        seatsUsed: row.seats_used as number | undefined,
        seatsPurchased: row.seats_purchased as number | undefined,
        joinedAt: (row.joined_at as Date)?.toISOString() || "",
      }))
    },
  },

  // User organization preferences (for remembering last org, default org, etc.)
  userOrgPreferences: {
    async findByUserId(userId: string): Promise<{
      id: string
      userId: string
      lastOrganizationId?: string
      defaultOrganizationId?: string
      organizationOrder: string[]
      preferences?: Record<string, unknown>
    } | null> {
      const { rows } = await sql`
        SELECT * FROM user_organization_preferences WHERE user_id = ${userId}
      `
      if (!rows[0]) return null
      return {
        id: rows[0].id as string,
        userId: rows[0].user_id as string,
        lastOrganizationId: rows[0].last_organization_id as string | undefined,
        defaultOrganizationId: rows[0].default_organization_id as string | undefined,
        organizationOrder: (rows[0].organization_order as string[]) || [],
        preferences: rows[0].preferences as Record<string, unknown> | undefined,
      }
    },
    async upsert(prefs: {
      userId: string
      lastOrganizationId?: string
      defaultOrganizationId?: string
      organizationOrder?: string[]
      preferences?: Record<string, unknown>
    }): Promise<{ id: string }> {
      const id = `uop_${crypto.randomUUID()}`
      const orderJson = JSON.stringify(prefs.organizationOrder || [])
      const prefsJson = JSON.stringify(prefs.preferences || {})
      const { rows } = await sql`
        INSERT INTO user_organization_preferences (id, user_id, last_organization_id, default_organization_id, organization_order, preferences)
        VALUES (${id}, ${prefs.userId}, ${prefs.lastOrganizationId || null}, ${prefs.defaultOrganizationId || null}, ${orderJson}::jsonb, ${prefsJson}::jsonb)
        ON CONFLICT (user_id)
        DO UPDATE SET
          last_organization_id = COALESCE(EXCLUDED.last_organization_id, user_organization_preferences.last_organization_id),
          default_organization_id = COALESCE(EXCLUDED.default_organization_id, user_organization_preferences.default_organization_id),
          organization_order = CASE WHEN EXCLUDED.organization_order != '[]'::jsonb THEN EXCLUDED.organization_order ELSE user_organization_preferences.organization_order END,
          preferences = CASE WHEN EXCLUDED.preferences != '{}'::jsonb THEN EXCLUDED.preferences ELSE user_organization_preferences.preferences END,
          updated_at = NOW()
        RETURNING id
      `
      return { id: rows[0].id as string }
    },
  },

  // Audit logs for compliance tracking
  auditLogs: {
    async create(log: {
      organizationId?: string
      userId?: string
      action: string
      resourceType?: string
      resourceId?: string
      oldValues?: Record<string, unknown>
      newValues?: Record<string, unknown>
      ipAddress?: string
      userAgent?: string
      metadata?: Record<string, unknown>
    }): Promise<{ id: string }> {
      const id = `audit_${crypto.randomUUID()}`
      const oldValuesJson = log.oldValues ? JSON.stringify(log.oldValues) : null
      const newValuesJson = log.newValues ? JSON.stringify(log.newValues) : null
      const metadataJson = log.metadata ? JSON.stringify(log.metadata) : '{}'

      await sql`
        INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent, metadata)
        VALUES (${id}, ${log.organizationId || null}, ${log.userId || null}, ${log.action}, ${log.resourceType || null}, ${log.resourceId || null}, ${oldValuesJson}::jsonb, ${newValuesJson}::jsonb, ${log.ipAddress || null}, ${log.userAgent || null}, ${metadataJson}::jsonb)
      `
      return { id }
    },
    async findByOrganization(orgId: string, limit = 100, offset = 0): Promise<Array<{
      id: string
      userId?: string
      action: string
      resourceType?: string
      resourceId?: string
      metadata?: Record<string, unknown>
      createdAt: string
    }>> {
      const { rows } = await sql`
        SELECT id, user_id, action, resource_type, resource_id, metadata, created_at
        FROM audit_logs
        WHERE organization_id = ${orgId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return rows.map(row => ({
        id: row.id as string,
        userId: row.user_id as string | undefined,
        action: row.action as string,
        resourceType: row.resource_type as string | undefined,
        resourceId: row.resource_id as string | undefined,
        metadata: row.metadata as Record<string, unknown> | undefined,
        createdAt: (row.created_at as Date)?.toISOString() || "",
      }))
    },
  },

  // Cross-workspace task management (for multi-org admins)
  crossWorkspaceTasks: {
    async create(task: {
      sourceOrganizationId: string
      targetOrganizationId: string
      assignedByUserId: string
      title: string
      description?: string
      priority?: "high" | "medium" | "normal"
      sourceTaskId?: string
    }): Promise<{ id: string }> {
      const id = `cwt_${crypto.randomUUID()}`
      const { rows } = await sql`
        INSERT INTO cross_workspace_tasks (id, source_organization_id, target_organization_id, assigned_by_user_id, title, description, priority, source_task_id)
        VALUES (${id}, ${task.sourceOrganizationId}, ${task.targetOrganizationId}, ${task.assignedByUserId}, ${task.title}, ${task.description || null}, ${task.priority || 'normal'}, ${task.sourceTaskId || null})
        RETURNING id
      `
      return { id: rows[0].id as string }
    },
    async findByUser(userId: string): Promise<Array<{
      id: string
      sourceOrganizationId: string
      sourceOrganizationName: string
      targetOrganizationId: string
      targetOrganizationName: string
      title: string
      description?: string
      priority: "high" | "medium" | "normal"
      status: string
      createdAt: string
    }>> {
      const { rows } = await sql`
        SELECT
          cwt.*,
          so.name as source_org_name,
          to_org.name as target_org_name
        FROM cross_workspace_tasks cwt
        JOIN organizations so ON cwt.source_organization_id = so.id
        JOIN organizations to_org ON cwt.target_organization_id = to_org.id
        WHERE cwt.assigned_by_user_id = ${userId}
        ORDER BY cwt.created_at DESC
      `
      return rows.map(row => ({
        id: row.id as string,
        sourceOrganizationId: row.source_organization_id as string,
        sourceOrganizationName: row.source_org_name as string,
        targetOrganizationId: row.target_organization_id as string,
        targetOrganizationName: row.target_org_name as string,
        title: row.title as string,
        description: row.description as string | undefined,
        priority: row.priority as "high" | "medium" | "normal",
        status: row.status as string,
        createdAt: (row.created_at as Date)?.toISOString() || "",
      }))
    },
    async updateStatus(id: string, status: string, targetTaskId?: string): Promise<boolean> {
      const { rowCount } = await sql`
        UPDATE cross_workspace_tasks
        SET status = ${status}, target_task_id = COALESCE(${targetTaskId || null}, target_task_id), updated_at = NOW()
        WHERE id = ${id}
      `
      return (rowCount ?? 0) > 0
    },
  },

  // Subscription tiers
  subscriptionTiers: {
    async findAll(): Promise<Array<{
      id: string
      name: string
      slug: string
      description?: string
      priceMonthly: number
      priceYearly: number
      maxSeats: number | null
      features: string[]
      isActive: boolean
      sortOrder: number
    }>> {
      const { rows } = await sql`
        SELECT * FROM subscription_tiers WHERE is_active = true ORDER BY sort_order ASC
      `
      return rows.map(row => ({
        id: row.id as string,
        name: row.name as string,
        slug: row.slug as string,
        description: row.description as string | undefined,
        priceMonthly: row.price_monthly as number,
        priceYearly: row.price_yearly as number,
        maxSeats: row.max_seats as number | null,
        features: (row.features as string[]) || [],
        isActive: row.is_active as boolean,
        sortOrder: row.sort_order as number,
      }))
    },
    async findBySlug(slug: string): Promise<{
      id: string
      name: string
      slug: string
      description?: string
      priceMonthly: number
      priceYearly: number
      maxSeats: number | null
      features: string[]
    } | null> {
      const { rows } = await sql`
        SELECT * FROM subscription_tiers WHERE slug = ${slug} AND is_active = true
      `
      if (!rows[0]) return null
      return {
        id: rows[0].id as string,
        name: rows[0].name as string,
        slug: rows[0].slug as string,
        description: rows[0].description as string | undefined,
        priceMonthly: rows[0].price_monthly as number,
        priceYearly: rows[0].price_yearly as number,
        maxSeats: rows[0].max_seats as number | null,
        features: (rows[0].features as string[]) || [],
      }
    },
  },

  // Organization subscriptions
  orgSubscriptions: {
    async findByOrganizationId(orgId: string): Promise<{
      id: string
      organizationId: string
      tierId: string
      tierName?: string
      status: string
      billingCycle: string
      currentPeriodStart?: string
      currentPeriodEnd?: string
      trialEndsAt?: string
      seatsPurchased: number
      seatsUsed: number
    } | null> {
      const { rows } = await sql`
        SELECT os.*, st.name as tier_name
        FROM organization_subscriptions os
        LEFT JOIN subscription_tiers st ON os.tier_id = st.id
        WHERE os.organization_id = ${orgId}
      `
      if (!rows[0]) return null
      return {
        id: rows[0].id as string,
        organizationId: rows[0].organization_id as string,
        tierId: rows[0].tier_id as string,
        tierName: rows[0].tier_name as string | undefined,
        status: rows[0].status as string,
        billingCycle: rows[0].billing_cycle as string,
        currentPeriodStart: rows[0].current_period_start ? (rows[0].current_period_start as Date).toISOString() : undefined,
        currentPeriodEnd: rows[0].current_period_end ? (rows[0].current_period_end as Date).toISOString() : undefined,
        trialEndsAt: rows[0].trial_ends_at ? (rows[0].trial_ends_at as Date).toISOString() : undefined,
        seatsPurchased: rows[0].seats_purchased as number,
        seatsUsed: rows[0].seats_used as number,
      }
    },
    async create(sub: {
      organizationId: string
      tierId: string
      billingCycle?: "monthly" | "yearly"
      seatsPurchased?: number
    }): Promise<{ id: string }> {
      const id = `sub_${crypto.randomUUID()}`
      const { rows } = await sql`
        INSERT INTO organization_subscriptions (id, organization_id, tier_id, billing_cycle, seats_purchased, current_period_start, current_period_end)
        VALUES (${id}, ${sub.organizationId}, ${sub.tierId}, ${sub.billingCycle || 'monthly'}, ${sub.seatsPurchased || 5}, NOW(), NOW() + INTERVAL '30 days')
        RETURNING id
      `
      return { id: rows[0].id as string }
    },
    async updateSeatsUsed(orgId: string): Promise<void> {
      await sql`
        UPDATE organization_subscriptions
        SET seats_used = (
          SELECT COUNT(*) FROM organization_members
          WHERE organization_id = ${orgId} AND status = 'active'
        ),
        updated_at = NOW()
        WHERE organization_id = ${orgId}
      `
    },
  },

  // Workspaces
  workspaces: {
    async create(workspace: {
      id: string
      organizationId: string
      name: string
      slug: string
      type: string
      description?: string
      isDefault?: boolean
      createdBy?: string
      createdAt: string
      updatedAt: string
      settings?: any
    }): Promise<void> {
      await sql`
        INSERT INTO workspaces (id, organization_id, name, slug, type, description, is_default, created_by, created_at, updated_at, settings)
        VALUES (${workspace.id}, ${workspace.organizationId}, ${workspace.name}, ${workspace.slug}, ${workspace.type},
                ${workspace.description || null}, ${workspace.isDefault ?? false}, ${workspace.createdBy || null},
                ${workspace.createdAt}, ${workspace.updatedAt}, ${JSON.stringify(workspace.settings || {})})
      `
    },
    async findByOrganizationId(orgId: string): Promise<any[]> {
      const { rows } = await sql`
        SELECT * FROM workspaces WHERE organization_id = ${orgId} ORDER BY is_default DESC, name ASC
      `
      return rows
    },
    async findById(id: string): Promise<any | null> {
      const { rows } = await sql`SELECT * FROM workspaces WHERE id = ${id}`
      return rows[0] || null
    },
  },

  // Workspace Members
  workspaceMembers: {
    async create(member: {
      id: string
      workspaceId: string
      userId: string
      role: string
      joinedAt: string
    }): Promise<void> {
      await sql`
        INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
        VALUES (${member.id}, ${member.workspaceId}, ${member.userId}, ${member.role}, ${member.joinedAt})
      `
    },
    async findByWorkspaceId(workspaceId: string): Promise<any[]> {
      const { rows } = await sql`
        SELECT * FROM workspace_members WHERE workspace_id = ${workspaceId}
      `
      return rows
    },
    async findByUserId(userId: string): Promise<any[]> {
      const { rows } = await sql`
        SELECT * FROM workspace_members WHERE user_id = ${userId}
      `
      return rows
    },
  },

  // Transfer pending rocks/tasks from email to userId when user accepts invitation
  async transferPendingItems(email: string, userId: string): Promise<void> {
    await sql`SELECT transfer_pending_items_to_user(${email}, ${userId})`
  },

  // AI Usage Tracking
  aiUsage: {
    async track(params: {
      organizationId: string
      userId: string
      action: string
      model: string
      inputTokens: number
      outputTokens: number
      creditsUsed: number
      metadata?: Record<string, unknown>
    }): Promise<void> {
      const { organizationId, userId, action, model, inputTokens, outputTokens, creditsUsed, metadata } = params

      await sql`
        INSERT INTO ai_usage (id, organization_id, user_id, action, model, input_tokens, output_tokens, credits_used, metadata, created_at)
        VALUES (
          gen_random_uuid()::text,
          ${organizationId},
          ${userId},
          ${action},
          ${model},
          ${inputTokens},
          ${outputTokens},
          ${creditsUsed},
          ${JSON.stringify(metadata || {})}::jsonb,
          NOW()
        )
      `

      // Update subscription credits used
      await sql`
        UPDATE subscriptions
        SET ai_credits_used = ai_credits_used + ${creditsUsed},
            updated_at = NOW()
        WHERE organization_id = ${organizationId}
      `
    },

    async getMonthlyUsage(organizationId: string): Promise<number> {
      const { rows } = await sql`
        SELECT COALESCE(SUM(credits_used), 0)::int as total_credits
        FROM ai_usage
        WHERE organization_id = ${organizationId}
          AND created_at >= date_trunc('month', CURRENT_DATE)
          AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
      `
      return rows[0]?.total_credits || 0
    },

    async getUsageByAction(organizationId: string, startDate: string, endDate: string): Promise<Array<{
      action: string
      count: number
      totalCredits: number
    }>> {
      const { rows } = await sql`
        SELECT
          action,
          COUNT(*)::int as count,
          SUM(credits_used)::int as total_credits
        FROM ai_usage
        WHERE organization_id = ${organizationId}
          AND created_at >= ${startDate}::timestamptz
          AND created_at < ${endDate}::timestamptz
        GROUP BY action
        ORDER BY total_credits DESC
      `
      return rows.map(row => ({
        action: row.action,
        count: row.count,
        totalCredits: row.total_credits,
      }))
    },
  },

  // Subscriptions
  subscriptions: {
    async findByOrganizationId(organizationId: string): Promise<{
      id: string
      organizationId: string
      plan: string
      aiCreditsUsed: number
      aiCreditsLimit: number
      status: string
    } | null> {
      const { rows } = await sql`
        SELECT * FROM subscriptions WHERE organization_id = ${organizationId}
      `
      if (!rows[0]) return null
      return {
        id: rows[0].id,
        organizationId: rows[0].organization_id,
        plan: rows[0].plan,
        aiCreditsUsed: rows[0].ai_credits_used || 0,
        aiCreditsLimit: rows[0].ai_credits_limit || 0,
        status: rows[0].status,
      }
    },

    async updateCredits(organizationId: string, creditsUsed: number): Promise<void> {
      await sql`
        UPDATE subscriptions
        SET ai_credits_used = ${creditsUsed},
            updated_at = NOW()
        WHERE organization_id = ${organizationId}
      `
    },
  },
}

export default db
