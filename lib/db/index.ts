import { promises as fs } from "fs"
import path from "path"
import type {
  User,
  Organization,
  OrganizationMember,
  Session,
  Invitation,
  Rock,
  Task,
  AssignedTask,
  EODReport,
  Notification,
} from "../types"

// Database file path - in production, use a real database
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data")

interface Database {
  users: User[]
  organizations: Organization[]
  members: OrganizationMember[]
  sessions: Session[]
  invitations: Invitation[]
  rocks: Rock[]
  tasks: Task[]
  assignedTasks: AssignedTask[]
  eodReports: EODReport[]
  notifications: Notification[]
}

const defaultDb: Database = {
  users: [],
  organizations: [],
  members: [],
  sessions: [],
  invitations: [],
  rocks: [],
  tasks: [],
  assignedTasks: [],
  eodReports: [],
  notifications: [],
}

async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

async function getDbPath(): Promise<string> {
  await ensureDataDir()
  return path.join(DATA_DIR, "database.json")
}

async function readDb(): Promise<Database> {
  try {
    const dbPath = await getDbPath()
    const data = await fs.readFile(dbPath, "utf-8")
    return { ...defaultDb, ...JSON.parse(data) }
  } catch {
    return { ...defaultDb }
  }
}

async function writeDb(db: Database): Promise<void> {
  const dbPath = await getDbPath()
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2), "utf-8")
}

// Generic CRUD operations
export const db = {
  // Users
  users: {
    async findAll(): Promise<User[]> {
      const db = await readDb()
      return db.users
    },
    async findById(id: string): Promise<User | null> {
      const db = await readDb()
      return db.users.find((u) => u.id === id) || null
    },
    async findByEmail(email: string): Promise<User | null> {
      const db = await readDb()
      return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null
    },
    async create(user: User): Promise<User> {
      const db = await readDb()
      db.users.push(user)
      await writeDb(db)
      return user
    },
    async update(id: string, updates: Partial<User>): Promise<User | null> {
      const db = await readDb()
      const index = db.users.findIndex((u) => u.id === id)
      if (index === -1) return null
      db.users[index] = { ...db.users[index], ...updates, updatedAt: new Date().toISOString() }
      await writeDb(db)
      return db.users[index]
    },
    async delete(id: string): Promise<boolean> {
      const db = await readDb()
      const index = db.users.findIndex((u) => u.id === id)
      if (index === -1) return false
      db.users.splice(index, 1)
      await writeDb(db)
      return true
    },
  },

  // Organizations
  organizations: {
    async findAll(): Promise<Organization[]> {
      const db = await readDb()
      return db.organizations
    },
    async findById(id: string): Promise<Organization | null> {
      const db = await readDb()
      return db.organizations.find((o) => o.id === id) || null
    },
    async findBySlug(slug: string): Promise<Organization | null> {
      const db = await readDb()
      return db.organizations.find((o) => o.slug === slug) || null
    },
    async findByOwnerId(ownerId: string): Promise<Organization[]> {
      const db = await readDb()
      return db.organizations.filter((o) => o.ownerId === ownerId)
    },
    async create(org: Organization): Promise<Organization> {
      const db = await readDb()
      db.organizations.push(org)
      await writeDb(db)
      return org
    },
    async update(id: string, updates: Partial<Organization>): Promise<Organization | null> {
      const db = await readDb()
      const index = db.organizations.findIndex((o) => o.id === id)
      if (index === -1) return null
      db.organizations[index] = { ...db.organizations[index], ...updates, updatedAt: new Date().toISOString() }
      await writeDb(db)
      return db.organizations[index]
    },
    async delete(id: string): Promise<boolean> {
      const db = await readDb()
      const index = db.organizations.findIndex((o) => o.id === id)
      if (index === -1) return false
      db.organizations.splice(index, 1)
      await writeDb(db)
      return true
    },
  },

  // Organization Members
  members: {
    async findAll(): Promise<OrganizationMember[]> {
      const db = await readDb()
      return db.members
    },
    async findById(id: string): Promise<OrganizationMember | null> {
      const db = await readDb()
      return db.members.find((m) => m.id === id) || null
    },
    async findByOrganizationId(orgId: string): Promise<OrganizationMember[]> {
      const db = await readDb()
      return db.members.filter((m) => m.organizationId === orgId)
    },
    async findByUserId(userId: string): Promise<OrganizationMember[]> {
      const db = await readDb()
      return db.members.filter((m) => m.userId === userId)
    },
    async findByOrgAndUser(orgId: string, userId: string): Promise<OrganizationMember | null> {
      const db = await readDb()
      return db.members.find((m) => m.organizationId === orgId && m.userId === userId) || null
    },
    async create(member: OrganizationMember): Promise<OrganizationMember> {
      const db = await readDb()
      db.members.push(member)
      await writeDb(db)
      return member
    },
    async update(id: string, updates: Partial<OrganizationMember>): Promise<OrganizationMember | null> {
      const db = await readDb()
      const index = db.members.findIndex((m) => m.id === id)
      if (index === -1) return null
      db.members[index] = { ...db.members[index], ...updates }
      await writeDb(db)
      return db.members[index]
    },
    async delete(id: string): Promise<boolean> {
      const db = await readDb()
      const index = db.members.findIndex((m) => m.id === id)
      if (index === -1) return false
      db.members.splice(index, 1)
      await writeDb(db)
      return true
    },
  },

  // Sessions
  sessions: {
    async findByToken(token: string): Promise<Session | null> {
      const db = await readDb()
      return db.sessions.find((s) => s.token === token) || null
    },
    async findByUserId(userId: string): Promise<Session[]> {
      const db = await readDb()
      return db.sessions.filter((s) => s.userId === userId)
    },
    async create(session: Session): Promise<Session> {
      const db = await readDb()
      db.sessions.push(session)
      await writeDb(db)
      return session
    },
    async update(id: string, updates: Partial<Session>): Promise<Session | null> {
      const db = await readDb()
      const index = db.sessions.findIndex((s) => s.id === id)
      if (index === -1) return null
      db.sessions[index] = { ...db.sessions[index], ...updates }
      await writeDb(db)
      return db.sessions[index]
    },
    async delete(id: string): Promise<boolean> {
      const db = await readDb()
      const index = db.sessions.findIndex((s) => s.id === id)
      if (index === -1) return false
      db.sessions.splice(index, 1)
      await writeDb(db)
      return true
    },
    async deleteByToken(token: string): Promise<boolean> {
      const db = await readDb()
      const index = db.sessions.findIndex((s) => s.token === token)
      if (index === -1) return false
      db.sessions.splice(index, 1)
      await writeDb(db)
      return true
    },
    async deleteExpired(): Promise<number> {
      const db = await readDb()
      const now = new Date()
      const originalLength = db.sessions.length
      db.sessions = db.sessions.filter((s) => new Date(s.expiresAt) > now)
      await writeDb(db)
      return originalLength - db.sessions.length
    },
  },

  // Invitations
  invitations: {
    async findByToken(token: string): Promise<Invitation | null> {
      const db = await readDb()
      return db.invitations.find((i) => i.token === token) || null
    },
    async findByOrganizationId(orgId: string): Promise<Invitation[]> {
      const db = await readDb()
      return db.invitations.filter((i) => i.organizationId === orgId)
    },
    async findPendingByEmail(email: string): Promise<Invitation[]> {
      const db = await readDb()
      return db.invitations.filter(
        (i) => i.email.toLowerCase() === email.toLowerCase() && i.status === "pending"
      )
    },
    async create(invitation: Invitation): Promise<Invitation> {
      const db = await readDb()
      db.invitations.push(invitation)
      await writeDb(db)
      return invitation
    },
    async update(id: string, updates: Partial<Invitation>): Promise<Invitation | null> {
      const db = await readDb()
      const index = db.invitations.findIndex((i) => i.id === id)
      if (index === -1) return null
      db.invitations[index] = { ...db.invitations[index], ...updates }
      await writeDb(db)
      return db.invitations[index]
    },
    async delete(id: string): Promise<boolean> {
      const db = await readDb()
      const index = db.invitations.findIndex((i) => i.id === id)
      if (index === -1) return false
      db.invitations.splice(index, 1)
      await writeDb(db)
      return true
    },
  },

  // Rocks
  rocks: {
    async findAll(): Promise<Rock[]> {
      const db = await readDb()
      return db.rocks
    },
    async findById(id: string): Promise<Rock | null> {
      const db = await readDb()
      return db.rocks.find((r) => r.id === id) || null
    },
    async findByOrganizationId(orgId: string): Promise<Rock[]> {
      const db = await readDb()
      return db.rocks.filter((r) => r.organizationId === orgId)
    },
    async findByUserId(userId: string, orgId: string): Promise<Rock[]> {
      const db = await readDb()
      return db.rocks.filter((r) => r.userId === userId && r.organizationId === orgId)
    },
    async create(rock: Rock): Promise<Rock> {
      const db = await readDb()
      db.rocks.push(rock)
      await writeDb(db)
      return rock
    },
    async update(id: string, updates: Partial<Rock>): Promise<Rock | null> {
      const db = await readDb()
      const index = db.rocks.findIndex((r) => r.id === id)
      if (index === -1) return null
      db.rocks[index] = { ...db.rocks[index], ...updates, updatedAt: new Date().toISOString() }
      await writeDb(db)
      return db.rocks[index]
    },
    async delete(id: string): Promise<boolean> {
      const db = await readDb()
      const index = db.rocks.findIndex((r) => r.id === id)
      if (index === -1) return false
      db.rocks.splice(index, 1)
      await writeDb(db)
      return true
    },
  },

  // Tasks
  tasks: {
    async findByOrganizationId(orgId: string): Promise<Task[]> {
      const db = await readDb()
      return db.tasks.filter((t) => t.organizationId === orgId)
    },
    async findByUserId(userId: string, orgId: string): Promise<Task[]> {
      const db = await readDb()
      return db.tasks.filter((t) => t.userId === userId && t.organizationId === orgId)
    },
    async create(task: Task): Promise<Task> {
      const db = await readDb()
      db.tasks.push(task)
      await writeDb(db)
      return task
    },
    async update(id: string, updates: Partial<Task>): Promise<Task | null> {
      const db = await readDb()
      const index = db.tasks.findIndex((t) => t.id === id)
      if (index === -1) return null
      db.tasks[index] = { ...db.tasks[index], ...updates, updatedAt: new Date().toISOString() }
      await writeDb(db)
      return db.tasks[index]
    },
    async delete(id: string): Promise<boolean> {
      const db = await readDb()
      const index = db.tasks.findIndex((t) => t.id === id)
      if (index === -1) return false
      db.tasks.splice(index, 1)
      await writeDb(db)
      return true
    },
  },

  // Assigned Tasks
  assignedTasks: {
    async findByOrganizationId(orgId: string): Promise<AssignedTask[]> {
      const db = await readDb()
      return db.assignedTasks.filter((t) => t.organizationId === orgId)
    },
    async findByAssigneeId(assigneeId: string, orgId: string): Promise<AssignedTask[]> {
      const db = await readDb()
      return db.assignedTasks.filter((t) => t.assigneeId === assigneeId && t.organizationId === orgId)
    },
    async findById(id: string): Promise<AssignedTask | null> {
      const db = await readDb()
      return db.assignedTasks.find((t) => t.id === id) || null
    },
    async create(task: AssignedTask): Promise<AssignedTask> {
      const db = await readDb()
      db.assignedTasks.push(task)
      await writeDb(db)
      return task
    },
    async update(id: string, updates: Partial<AssignedTask>): Promise<AssignedTask | null> {
      const db = await readDb()
      const index = db.assignedTasks.findIndex((t) => t.id === id)
      if (index === -1) return null
      db.assignedTasks[index] = { ...db.assignedTasks[index], ...updates, updatedAt: new Date().toISOString() }
      await writeDb(db)
      return db.assignedTasks[index]
    },
    async delete(id: string): Promise<boolean> {
      const db = await readDb()
      const index = db.assignedTasks.findIndex((t) => t.id === id)
      if (index === -1) return false
      db.assignedTasks.splice(index, 1)
      await writeDb(db)
      return true
    },
  },

  // EOD Reports
  eodReports: {
    async findByOrganizationId(orgId: string): Promise<EODReport[]> {
      const db = await readDb()
      return db.eodReports.filter((r) => r.organizationId === orgId)
    },
    async findByUserId(userId: string, orgId: string): Promise<EODReport[]> {
      const db = await readDb()
      return db.eodReports.filter((r) => r.userId === userId && r.organizationId === orgId)
    },
    async findByUserAndDate(userId: string, orgId: string, date: string): Promise<EODReport | null> {
      const db = await readDb()
      return db.eodReports.find(
        (r) => r.userId === userId && r.organizationId === orgId && r.date === date
      ) || null
    },
    async findById(id: string): Promise<EODReport | null> {
      const db = await readDb()
      return db.eodReports.find((r) => r.id === id) || null
    },
    async create(report: EODReport): Promise<EODReport> {
      const db = await readDb()
      db.eodReports.push(report)
      await writeDb(db)
      return report
    },
    async update(id: string, updates: Partial<EODReport>): Promise<EODReport | null> {
      const db = await readDb()
      const index = db.eodReports.findIndex((r) => r.id === id)
      if (index === -1) return null
      db.eodReports[index] = { ...db.eodReports[index], ...updates }
      await writeDb(db)
      return db.eodReports[index]
    },
    async delete(id: string): Promise<boolean> {
      const db = await readDb()
      const index = db.eodReports.findIndex((r) => r.id === id)
      if (index === -1) return false
      db.eodReports.splice(index, 1)
      await writeDb(db)
      return true
    },
  },

  // Notifications
  notifications: {
    async findByUserId(userId: string, orgId: string): Promise<Notification[]> {
      const db = await readDb()
      return db.notifications.filter((n) => n.userId === userId && n.organizationId === orgId)
    },
    async findUnreadByUserId(userId: string, orgId: string): Promise<Notification[]> {
      const db = await readDb()
      return db.notifications.filter(
        (n) => n.userId === userId && n.organizationId === orgId && !n.read
      )
    },
    async create(notification: Notification): Promise<Notification> {
      const db = await readDb()
      db.notifications.push(notification)
      await writeDb(db)
      return notification
    },
    async markAsRead(id: string): Promise<Notification | null> {
      const db = await readDb()
      const index = db.notifications.findIndex((n) => n.id === id)
      if (index === -1) return null
      db.notifications[index].read = true
      await writeDb(db)
      return db.notifications[index]
    },
    async markAllAsRead(userId: string, orgId: string): Promise<number> {
      const db = await readDb()
      let count = 0
      db.notifications.forEach((n) => {
        if (n.userId === userId && n.organizationId === orgId && !n.read) {
          n.read = true
          count++
        }
      })
      await writeDb(db)
      return count
    },
    async delete(id: string): Promise<boolean> {
      const db = await readDb()
      const index = db.notifications.findIndex((n) => n.id === id)
      if (index === -1) return false
      db.notifications.splice(index, 1)
      await writeDb(db)
      return true
    },
  },
}

export default db
