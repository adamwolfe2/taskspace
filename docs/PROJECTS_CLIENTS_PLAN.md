# Projects & Clients Implementation Plan

## Overview

Add two new core features to TaskSpace: **Projects** and **Clients**. These are workspace-scoped entities that integrate with existing tasks, rocks, and tracking systems. Each gets a dedicated sidebar page with kanban boards, list views, filtering, and full CRUD operations. Both are toggleable via the admin feature panel like all other features.

**Key principle:** Projects and Clients are linked entities. A Client can have multiple Projects. Projects can have tasks and rocks linked to them. This creates an attribution chain: Client -> Project -> Tasks/Rocks -> EOD Reports.

---

## Architecture Summary

| Layer | Projects | Clients |
|-------|----------|---------|
| DB Tables | `projects`, `project_members` | `clients` |
| API Routes | `/api/projects` | `/api/clients` |
| API Client | `api.projects.*` | `api.clients.*` |
| Page Component | `components/pages/projects-page.tsx` | `components/pages/clients-page.tsx` |
| PageType | `"projects"` | `"clients"` |
| Feature Key | `"core.projects"` | `"core.clients"` |
| Sidebar Position | After "Tasks", before "My Team" | After "Projects", before "My Team" |

---

## Part 1: Database Schema

### 1.1 Clients Table

```sql
-- Migration: XXXXXXXXXX_clients_and_projects.sql

CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id VARCHAR(255) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(100),
  website VARCHAR(500),
  industry VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'prospect', 'archived')),
  notes TEXT,
  tags JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_clients_org_workspace ON clients(organization_id, workspace_id);
CREATE INDEX idx_clients_status ON clients(organization_id, workspace_id, status);
CREATE INDEX idx_clients_created_at ON clients(organization_id, workspace_id, created_at DESC);
```

### 1.2 Projects Table

```sql
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id VARCHAR(255) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id VARCHAR(255) REFERENCES clients(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('planning', 'active', 'on-hold', 'completed', 'cancelled')),
  priority VARCHAR(50) NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('high', 'medium', 'normal', 'low')),
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  budget_cents INTEGER,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  owner_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  tags JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_projects_org_workspace ON projects(organization_id, workspace_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(organization_id, workspace_id, status);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_created_at ON projects(organization_id, workspace_id, created_at DESC);
```

### 1.3 Project Members Table

```sql
CREATE TABLE IF NOT EXISTS project_members (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'lead', 'member', 'viewer')),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
```

### 1.4 Link Existing Tasks and Rocks to Projects

```sql
-- Add project_id to assigned_tasks
ALTER TABLE assigned_tasks
  ADD COLUMN IF NOT EXISTS project_id VARCHAR(255) REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assigned_tasks_project ON assigned_tasks(project_id);

-- Add project_id to rocks
ALTER TABLE rocks
  ADD COLUMN IF NOT EXISTS project_id VARCHAR(255) REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rocks_project ON rocks(project_id);
```

---

## Part 2: TypeScript Types

### File: `lib/types.ts`

Add these interfaces alongside the existing types:

```typescript
// ============================================
// CLIENTS
// ============================================

export interface Client {
  id: string
  organizationId: string
  workspaceId: string
  name: string
  description?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  website?: string
  industry?: string
  status: "active" | "inactive" | "prospect" | "archived"
  notes?: string
  tags: string[]
  customFields: Record<string, unknown>
  createdBy?: string
  createdAt: string
  updatedAt: string
  // Computed (from JOINs, not stored)
  projectCount?: number
  activeProjectCount?: number
}

// ============================================
// PROJECTS
// ============================================

export interface Project {
  id: string
  organizationId: string
  workspaceId: string
  clientId: string | null
  clientName?: string  // JOIN-populated
  name: string
  description?: string
  status: "planning" | "active" | "on-hold" | "completed" | "cancelled"
  priority: "high" | "medium" | "normal" | "low"
  startDate?: string | null
  dueDate?: string | null
  completedAt?: string | null
  budgetCents?: number | null
  progress: number
  ownerId?: string | null
  ownerName?: string  // JOIN-populated
  tags: string[]
  customFields: Record<string, unknown>
  createdBy?: string
  createdAt: string
  updatedAt: string
  // Computed
  taskCount?: number
  completedTaskCount?: number
  memberCount?: number
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  userName?: string
  userEmail?: string
  role: "owner" | "lead" | "member" | "viewer"
  addedAt: string
}
```

### File: `lib/types.ts` — Update PageType

Add `"projects"` and `"clients"` to the `PageType` union:

```typescript
export type PageType =
  | "login" | "register" | "forgot-password" | "reset-password"
  | "setup-organization" | "accept-invitation" | "welcome"
  | "dashboard" | "calendar" | "history" | "rocks" | "tasks"
  | "projects" | "clients"  // <-- NEW
  | "admin" | "admin-team" | "admin-tasks" | "admin-database"
  | "command-center" | "analytics" | "scorecard" | "manager"
  | "settings" | "profile" | "org-chart" | "ids-board"
  | "notes" | "vto" | "people-analyzer"
```

### File: `lib/types.ts` — Update AssignedTask and Rock

Add optional `projectId` and `projectName` fields:

```typescript
// In AssignedTask interface, add:
projectId?: string | null
projectName?: string | null

// In Rock interface, add:
projectId?: string | null
projectName?: string | null
```

---

## Part 3: Feature Toggle Registration

### File: `lib/types/workspace-features.ts`

#### 3.1 Add to `WorkspaceFeatureToggles.core`:

```typescript
core: {
  tasks: boolean
  rocks: boolean
  eodReports: boolean
  scorecard: boolean
  meetings: boolean
  ids: boolean
  orgChart: boolean
  notes: boolean
  vto: boolean
  peopleAnalyzer: boolean
  projects: boolean   // <-- NEW
  clients: boolean    // <-- NEW
}
```

#### 3.2 Add to `DEFAULT_WORKSPACE_FEATURES.core`:

```typescript
projects: true,
clients: true,
```

#### 3.3 Add to `WORKSPACE_FEATURE_METADATA`:

```typescript
"core.projects": {
  name: "Projects",
  description: "Track and manage projects with kanban boards, team members, and task attribution",
  category: "core",
  icon: "FolderKanban",
  dependencies: ["core.tasks"],
  impact: { navigation: true, dashboard: true, api: true },
},
"core.clients": {
  name: "Clients",
  description: "Manage client relationships, link projects to clients, and track client attribution",
  category: "core",
  icon: "Building2",
  dependencies: ["core.projects"],
  impact: { navigation: true, dashboard: true, api: true },
},
```

Note: `clients` depends on `projects` (you need projects to meaningfully use clients). `projects` depends on `tasks` (tasks are linked to projects).

---

## Part 4: Database Layer

### File: `lib/db/index.ts`

Add `parseClient` and `parseProject` functions following existing patterns (snake_case to camelCase). Add CRUD methods to the `db` object:

### 4.1 Parser Functions

```typescript
function parseClient(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    description: (row.description as string) || undefined,
    contactName: (row.contact_name as string) || undefined,
    contactEmail: (row.contact_email as string) || undefined,
    contactPhone: (row.contact_phone as string) || undefined,
    website: (row.website as string) || undefined,
    industry: (row.industry as string) || undefined,
    status: row.status as Client["status"],
    notes: (row.notes as string) || undefined,
    tags: (row.tags as string[]) || [],
    customFields: (row.custom_fields as Record<string, unknown>) || {},
    createdBy: (row.created_by as string) || undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    projectCount: row.project_count !== undefined ? Number(row.project_count) : undefined,
    activeProjectCount: row.active_project_count !== undefined ? Number(row.active_project_count) : undefined,
  }
}

function parseProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    workspaceId: row.workspace_id as string,
    clientId: (row.client_id as string) || null,
    clientName: (row.client_name as string) || undefined,
    name: row.name as string,
    description: (row.description as string) || undefined,
    status: row.status as Project["status"],
    priority: row.priority as Project["priority"],
    startDate: row.start_date ? String(row.start_date) : null,
    dueDate: row.due_date ? String(row.due_date) : null,
    completedAt: row.completed_at instanceof Date ? row.completed_at.toISOString() : (row.completed_at as string) || null,
    budgetCents: row.budget_cents !== null ? Number(row.budget_cents) : null,
    progress: Number(row.progress || 0),
    ownerId: (row.owner_id as string) || null,
    ownerName: (row.owner_name as string) || undefined,
    tags: (row.tags as string[]) || [],
    customFields: (row.custom_fields as Record<string, unknown>) || {},
    createdBy: (row.created_by as string) || undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    taskCount: row.task_count !== undefined ? Number(row.task_count) : undefined,
    completedTaskCount: row.completed_task_count !== undefined ? Number(row.completed_task_count) : undefined,
    memberCount: row.member_count !== undefined ? Number(row.member_count) : undefined,
  }
}
```

### 4.2 DB Methods

```typescript
// db.clients
clients: {
  async findByWorkspace(orgId: string, workspaceId: string, status?: string): Promise<Client[]>,
  async findById(orgId: string, id: string): Promise<Client | null>,
  async create(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client>,
  async update(orgId: string, id: string, updates: Partial<Client>): Promise<Client>,
  async delete(orgId: string, id: string): Promise<void>,
  async findPaginated(orgId: string, workspaceId: string, pagination: PaginationParams, filters?: { status?: string }): Promise<{ clients: Client[]; totalCount: number }>,
}

// db.projects
projects: {
  async findByWorkspace(orgId: string, workspaceId: string, filters?: { status?: string; clientId?: string; ownerId?: string }): Promise<Project[]>,
  async findById(orgId: string, id: string): Promise<Project | null>,
  async create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'clientName' | 'ownerName' | 'taskCount' | 'completedTaskCount' | 'memberCount'>): Promise<Project>,
  async update(orgId: string, id: string, updates: Partial<Project>): Promise<Project>,
  async delete(orgId: string, id: string): Promise<void>,
  async findPaginated(orgId: string, workspaceId: string, pagination: PaginationParams, filters?: { status?: string; clientId?: string; ownerId?: string }): Promise<{ projects: Project[]; totalCount: number }>,
  // Members
  async getMembers(projectId: string): Promise<ProjectMember[]>,
  async addMember(projectId: string, userId: string, role: ProjectMember['role']): Promise<ProjectMember>,
  async updateMemberRole(projectId: string, userId: string, role: ProjectMember['role']): Promise<ProjectMember>,
  async removeMember(projectId: string, userId: string): Promise<void>,
}
```

### 4.3 Query Patterns

**Clients list query** should LEFT JOIN projects to compute `projectCount` and `activeProjectCount`:
```sql
SELECT c.*,
  COUNT(p.id) as project_count,
  COUNT(p.id) FILTER (WHERE p.status = 'active') as active_project_count
FROM clients c
LEFT JOIN projects p ON p.client_id = c.id
WHERE c.organization_id = $1 AND c.workspace_id = $2
GROUP BY c.id
ORDER BY c.created_at DESC
```

**Projects list query** should LEFT JOIN for client name, owner name, and task counts:
```sql
SELECT p.*,
  cl.name as client_name,
  u.name as owner_name,
  COUNT(at.id) as task_count,
  COUNT(at.id) FILTER (WHERE at.status = 'completed') as completed_task_count,
  (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
FROM projects p
LEFT JOIN clients cl ON cl.id = p.client_id
LEFT JOIN users u ON u.id = p.owner_id
LEFT JOIN assigned_tasks at ON at.project_id = p.id
WHERE p.organization_id = $1 AND p.workspace_id = $2
GROUP BY p.id, cl.name, u.name
ORDER BY p.created_at DESC
```

### 4.4 ID Generation Pattern

Follow existing pattern:
```typescript
const clientId = "cli_" + generateId()
const projectId = "prj_" + generateId()
const projectMemberId = "pm_" + generateId()
```

---

## Part 5: API Routes

### 5.1 Clients API: `app/api/clients/route.ts`

| Method | Description | Auth | Feature Gate |
|--------|-------------|------|-------------|
| GET | List clients for workspace | Required | `core.clients` |
| POST | Create client | Admin/Owner | `core.clients` |
| PATCH | Update client | Admin/Owner | `core.clients` |
| DELETE | Delete client (cascade to project links) | Admin/Owner | `core.clients` |

**GET query params:** `workspaceId` (required), `status` (optional filter), `cursor`/`limit` (optional pagination)

**POST body:**
```typescript
{
  name: string           // required
  workspaceId: string    // required
  description?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  website?: string
  industry?: string
  status?: Client["status"]  // default "active"
  notes?: string
  tags?: string[]
}
```

**PATCH body:** `{ id: string, ...updates }` — same fields as POST, all optional

**DELETE query:** `?id=xxx`

### 5.2 Projects API: `app/api/projects/route.ts`

| Method | Description | Auth | Feature Gate |
|--------|-------------|------|-------------|
| GET | List projects for workspace | Required | `core.projects` |
| POST | Create project | Required | `core.projects` |
| PATCH | Update project | Admin/Owner/Lead | `core.projects` |
| DELETE | Delete project | Admin/Owner | `core.projects` |

**GET query params:** `workspaceId` (required), `status`, `clientId`, `ownerId` (optional filters), `cursor`/`limit` (optional pagination)

**POST body:**
```typescript
{
  name: string           // required
  workspaceId: string    // required
  clientId?: string
  description?: string
  status?: Project["status"]  // default "active"
  priority?: Project["priority"]  // default "normal"
  startDate?: string
  dueDate?: string
  ownerId?: string
  tags?: string[]
}
```

### 5.3 Project Members API: `app/api/projects/members/route.ts`

| Method | Description |
|--------|-------------|
| GET | List project members (`?projectId=xxx`) |
| POST | Add member (`{ projectId, userId, role }`) |
| PATCH | Update role (`{ projectId, userId, role }`) |
| DELETE | Remove member (`?projectId=xxx&userId=xxx`) |

### 5.4 Validation Schemas

Add to `lib/validation/schemas.ts`:

```typescript
export const createClientSchema = z.object({
  name: z.string().min(1, "Client name is required").max(255),
  workspaceId: z.string().min(1),
  description: z.string().max(2000).optional(),
  contactName: z.string().max(255).optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactPhone: z.string().max(100).optional(),
  website: z.string().url("Invalid URL").max(500).optional().or(z.literal("")),
  industry: z.string().max(255).optional(),
  status: z.enum(["active", "inactive", "prospect", "archived"]).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export const updateClientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  contactName: z.string().max(255).optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal("")),
  contactPhone: z.string().max(100).optional().nullable(),
  website: z.string().url().max(500).optional().nullable().or(z.literal("")),
  industry: z.string().max(255).optional().nullable(),
  status: z.enum(["active", "inactive", "prospect", "archived"]).optional(),
  notes: z.string().max(5000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255),
  workspaceId: z.string().min(1),
  clientId: z.string().optional().nullable(),
  description: z.string().max(5000).optional(),
  status: z.enum(["planning", "active", "on-hold", "completed", "cancelled"]).optional(),
  priority: z.enum(["high", "medium", "normal", "low"]).optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export const updateProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  clientId: z.string().optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["planning", "active", "on-hold", "completed", "cancelled"]).optional(),
  priority: z.enum(["high", "medium", "normal", "low"]).optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  progress: z.number().min(0).max(100).optional(),
  budgetCents: z.number().int().min(0).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export const projectMemberSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(["owner", "lead", "member", "viewer"]).optional(),
})
```

---

## Part 6: API Client

### File: `lib/api/client.ts`

Add these methods to the `api` object:

```typescript
// Clients
clients: {
  async list(workspaceId: string, status?: string) { /* GET /api/clients?workspaceId=...&status=... */ },
  async create(client: ClientCreateInput) { /* POST /api/clients */ },
  async update(id: string, updates: Partial<Client>) { /* PATCH /api/clients */ },
  async delete(id: string) { /* DELETE /api/clients?id=... */ },
},

// Projects
projects: {
  async list(workspaceId: string, filters?: { status?: string; clientId?: string; ownerId?: string }) { /* GET /api/projects?workspaceId=...&... */ },
  async create(project: ProjectCreateInput) { /* POST /api/projects */ },
  async update(id: string, updates: Partial<Project>) { /* PATCH /api/projects */ },
  async delete(id: string) { /* DELETE /api/projects?id=... */ },
  // Members
  async getMembers(projectId: string) { /* GET /api/projects/members?projectId=... */ },
  async addMember(projectId: string, userId: string, role?: string) { /* POST /api/projects/members */ },
  async updateMemberRole(projectId: string, userId: string, role: string) { /* PATCH /api/projects/members */ },
  async removeMember(projectId: string, userId: string) { /* DELETE /api/projects/members?projectId=...&userId=... */ },
},
```

Input types:

```typescript
interface ClientCreateInput {
  name: string
  workspaceId: string
  description?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  website?: string
  industry?: string
  status?: Client["status"]
  notes?: string
  tags?: string[]
}

interface ProjectCreateInput {
  name: string
  workspaceId: string
  clientId?: string | null
  description?: string
  status?: Project["status"]
  priority?: Project["priority"]
  startDate?: string | null
  dueDate?: string | null
  ownerId?: string | null
  tags?: string[]
}
```

---

## Part 7: Data Hook — `use-team-data.ts` Integration

### 7.1 Add to SWR Fetcher

Add `projects` and `clients` to the `TeamData` interface and `teamDataFetcher`:

```typescript
interface TeamData {
  members: TeamMember[]
  rocks: Rock[]
  tasks: AssignedTask[]
  eodReports: EODReport[]
  projects: Project[]   // <-- NEW
  clients: Client[]     // <-- NEW
}

async function teamDataFetcher([, workspaceId]: [string, string]): Promise<TeamData> {
  const [membersData, rocksData, tasksData, reportsData, projectsData, clientsData] = await Promise.all([
    api.members.list(),
    api.rocks.list(undefined, workspaceId),
    api.tasks.list(undefined, undefined, workspaceId),
    api.eodReports.list({ workspaceId }),
    api.projects.list(workspaceId),
    api.clients.list(workspaceId),
  ])
  // ... return all 6 data types
}
```

### 7.2 Add to Return API

Add the following to the hook's return object:
- `projects`, `clients` — derived data arrays
- `setProjects`, `setClients` — setter wrappers (same pattern as `setRocks`)
- `createProject`, `updateProject`, `deleteProject` — CRUD with optimistic updates
- `createClient`, `updateClient`, `deleteClient` — CRUD with optimistic updates

### 7.3 Demo Mode

Add demo projects and clients for the demo mode:

```typescript
function getDemoClients(): Client[] {
  return [
    { id: "client-1", organizationId: "demo-org-1", workspaceId: "demo-ws-1", name: "Acme Properties", status: "active", contactName: "John Doe", contactEmail: "john@acme.com", industry: "Real Estate", tags: [], customFields: {}, createdAt: "2024-01-15", updatedAt: "2024-01-15" },
    { id: "client-2", organizationId: "demo-org-1", workspaceId: "demo-ws-1", name: "Sunrise Development", status: "active", contactName: "Jane Smith", contactEmail: "jane@sunrise.com", industry: "Construction", tags: [], customFields: {}, createdAt: "2024-02-01", updatedAt: "2024-02-01" },
  ]
}

function getDemoProjects(): Project[] {
  return [
    { id: "proj-1", organizationId: "demo-org-1", workspaceId: "demo-ws-1", clientId: "client-1", name: "Q1 Renovations", status: "active", priority: "high", progress: 45, tags: [], customFields: {}, createdAt: "2024-01-20", updatedAt: "2024-01-20" },
    { id: "proj-2", organizationId: "demo-org-1", workspaceId: "demo-ws-1", clientId: "client-2", name: "New Construction - Lot 14", status: "planning", priority: "medium", progress: 10, tags: [], customFields: {}, createdAt: "2024-02-10", updatedAt: "2024-02-10" },
    { id: "proj-3", organizationId: "demo-org-1", workspaceId: "demo-ws-1", clientId: null, name: "Internal Process Improvement", status: "active", priority: "normal", progress: 70, tags: [], customFields: {}, createdAt: "2024-01-05", updatedAt: "2024-01-05" },
  ]
}
```

---

## Part 8: Page Components

### 8.1 Projects Page — `components/pages/projects-page.tsx`

**Features:**
- **List view** (default) — table with columns: Name, Client, Status, Priority, Progress, Owner, Due Date, Tasks
- **Kanban view** — columns for each status: Planning, Active, On Hold, Completed, Cancelled
- **Search** — filter by project name
- **Filters** — status, client, owner (admins see all, members see own or projects they're members of)
- **Create project modal** — name, client (dropdown), description, priority, start/due dates, owner (admin: any member, member: self)
- **Project detail panel** (slide-out sheet) — full details, linked tasks list, team members, progress bar
- **Drag-and-drop** between kanban columns (updates project status)
- **Bulk actions** — archive, change status

**Props pattern** (matches tasks-page.tsx exactly):
```typescript
interface ProjectsPageProps {
  currentUser: TeamMember
  teamMembers: TeamMember[]
  projects: Project[]
  clients: Client[]
  rocks: Rock[]
  assignedTasks: AssignedTask[]
  createProject: (project: Partial<Project>) => Promise<Project>
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
}
```

Wrap entire page in `<FeatureGate feature="core.projects">`.

### 8.2 Clients Page — `components/pages/clients-page.tsx`

**Features:**
- **List view** — cards/table with: Name, Contact, Industry, Status, # Projects, # Active Projects
- **Search** — filter by client name, contact name, email
- **Filters** — status (active/inactive/prospect/archived), industry
- **Create client modal** — name, description, contact info, industry, status
- **Client detail panel** (slide-out sheet) — full details, linked projects list, notes
- **Quick actions** — edit, archive, delete (with confirmation for clients with active projects)

**Props pattern:**
```typescript
interface ClientsPageProps {
  currentUser: TeamMember
  clients: Client[]
  projects: Project[]
  createClient: (client: Partial<Client>) => Promise<Client>
  updateClient: (id: string, updates: Partial<Client>) => Promise<Client>
  deleteClient: (id: string) => Promise<void>
}
```

Wrap entire page in `<FeatureGate feature="core.clients">`.

### 8.3 Project Kanban Board — `components/projects/project-kanban-board.tsx`

Follow the exact pattern from `components/tasks/kanban-board.tsx`:
- Use `@dnd-kit/core` and `@dnd-kit/sortable`
- 5 columns matching project statuses
- Drag between columns updates status
- Each card shows: name, client tag, priority badge, progress bar, owner avatar, task count

### 8.4 Dynamic Imports in `app/app/page.tsx`

Add dynamic imports (code-split) for both pages:

```typescript
const ProjectsPage = dynamic(
  () => import("@/components/pages/projects-page").then(mod => ({ default: mod.ProjectsPage })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)

const ClientsPage = dynamic(
  () => import("@/components/pages/clients-page").then(mod => ({ default: mod.ClientsPage })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)
```

Add cases to `renderPage()`:

```typescript
case "projects":
  return <ProjectsPage currentUser={currentUser} teamMembers={...} projects={...} clients={...} ... />
case "clients":
  return <ClientsPage currentUser={currentUser} clients={...} projects={...} ... />
```

---

## Part 9: Sidebar Navigation

### File: `components/layout/sidebar-nav.tsx`

Add to `navItems` array (after "tasks", before "manager"):

```typescript
{ id: "projects", label: "Projects", icon: FolderKanban, requiredFeature: "core.projects" },
{ id: "clients", label: "Clients", icon: Building2, requiredFeature: "core.clients" },
```

Import the icons: `import { FolderKanban, Building2 } from "lucide-react"`

---

## Part 10: Integration Points

### 10.1 Task Creation — Project Selector

When creating a task (in the task creation modal), add an optional "Project" dropdown that shows active projects in the workspace. When a project is selected, `projectId` is passed to the task create API.

Files to modify:
- `components/tasks/add-task-modal.tsx` — add project dropdown
- Task create API — already accepts any field, just needs to pass `projectId` through

### 10.2 Rock Creation — Project Selector

Same pattern: add optional "Project" dropdown when creating rocks.

### 10.3 Dashboard — Project Summary Widget

Optionally show a "Projects" card on the dashboard showing:
- Active projects count
- Projects at risk (overdue or low progress)
- Recently updated projects

This should be behind the `core.projects` feature flag.

### 10.4 Task/Rock Attribution

When viewing a task or rock that has a `projectId`, show the project name as a clickable badge that navigates to the projects page.

---

## Part 11: Tests

### 11.1 Unit Tests — `__tests__/unit/validation/project-client-schemas.test.ts`

~20 tests:
- `createClientSchema` — valid input, missing name, invalid email, invalid URL, too-long fields
- `updateClientSchema` — valid update, empty update, nullable fields
- `createProjectSchema` — valid input, missing name, invalid status, invalid priority
- `updateProjectSchema` — valid update, progress bounds (0-100), budget non-negative
- `projectMemberSchema` — valid, missing projectId, invalid role

### 11.2 API Route Tests — `__tests__/api/clients.test.ts`

~15 tests:
- List clients — returns workspace-scoped results
- Create client — valid, missing name, duplicate handling
- Update client — valid, not found, wrong org
- Delete client — valid, cascades project links to NULL
- Feature gate — returns 403 when `core.clients` is disabled

### 11.3 API Route Tests — `__tests__/api/projects.test.ts`

~20 tests:
- List projects — returns workspace-scoped results, filter by status/client/owner
- Create project — valid, with client, without client, missing name
- Update project — valid, update status to completed sets completedAt
- Delete project — valid, nullifies task/rock projectId references
- Project members — add, update role, remove, duplicate prevention
- Feature gate — returns 403 when `core.projects` is disabled

### 11.4 Integration Tests — `__tests__/integration/workspace-scoping/projects-clients.test.ts`

~10 tests:
- Projects are scoped to workspace (can't see projects from another workspace)
- Clients are scoped to workspace
- Deleting a client sets `client_id = NULL` on linked projects (not cascade delete)
- Deleting a project sets `project_id = NULL` on linked tasks/rocks (not cascade delete)
- Changing workspace re-fetches projects and clients

---

## Part 12: Edge Cases & Error Handling

### 12.1 Deletion Safety
- **Delete client with active projects**: Show confirmation dialog listing affected projects. Set `client_id = NULL` on projects (don't cascade-delete projects).
- **Delete project with linked tasks**: Show confirmation dialog listing affected task count. Set `project_id = NULL` on tasks/rocks (don't cascade-delete tasks).
- **Archive vs delete**: Prefer archiving (status change) over hard delete. Only allow hard delete for items with no linked data.

### 12.2 Permission Checks
- **Members** can view all projects/clients in their workspace but can only create/edit projects they own or are members of
- **Admins** can CRUD all projects/clients
- **Project leads** can manage their project's members and settings
- **Viewers** have read-only access to project details

### 12.3 Data Integrity
- **Client email validation**: Zod schema validates format, but allow empty string (optional field)
- **Project progress**: Auto-calculate from linked task completion percentage if no manual override
- **Status transitions**: When all tasks in a project complete, suggest (don't auto-set) marking project as completed
- **Workspace boundary**: All queries MUST filter by `organization_id AND workspace_id`. No cross-workspace data leakage.
- **Client-Project relationship**: A project's `client_id` must reference a client in the same workspace. Validate on create/update.

### 12.4 Performance
- **Pagination**: Both clients and projects API support cursor-based pagination (same pattern as rocks)
- **Aggregation queries**: Use LEFT JOINs with COUNT aggregations for list views (project count per client, task count per project) — avoid N+1
- **SWR caching**: Projects and clients are part of the team data SWR cache, benefiting from 60s polling and deduplication

### 12.5 Demo Mode
- Demo data includes 2 sample clients and 3 sample projects
- CRUD operations work in demo mode via localStorage persistence (same pattern as existing demo data)
- Demo projects link to existing demo tasks via `projectId`

---

## Execution Order

| # | Task | Files Created/Modified | Depends On |
|---|------|----------------------|------------|
| 1 | Create database migration | `migrations/XXXXXXXXXX_clients_and_projects.sql` | — |
| 2 | Apply migration to Supabase | — | 1 |
| 3 | Add TypeScript types | `lib/types.ts` | — |
| 4 | Register feature toggles | `lib/types/workspace-features.ts` | — |
| 5 | Add DB parser + CRUD methods | `lib/db/index.ts` | 1, 3 |
| 6 | Add validation schemas | `lib/validation/schemas.ts` | 3 |
| 7 | Create clients API route | `app/api/clients/route.ts` | 5, 6 |
| 8 | Create projects API route | `app/api/projects/route.ts` | 5, 6 |
| 9 | Create project members API | `app/api/projects/members/route.ts` | 5, 6 |
| 10 | Add API client methods | `lib/api/client.ts` | 3 |
| 11 | Update `use-team-data.ts` | `lib/hooks/use-team-data.ts` | 10 |
| 12 | Create projects page component | `components/pages/projects-page.tsx` | 3 |
| 13 | Create project kanban board | `components/projects/project-kanban-board.tsx` | 12 |
| 14 | Create clients page component | `components/pages/clients-page.tsx` | 3 |
| 15 | Add pages to `app/app/page.tsx` | `app/app/page.tsx` | 11, 12, 14 |
| 16 | Add sidebar nav items | `components/layout/sidebar-nav.tsx` | 4 |
| 17 | Add task/rock project selector | `components/tasks/add-task-modal.tsx`, task creation flows | 10 |
| 18 | Create validation tests | `__tests__/unit/validation/project-client-schemas.test.ts` | 6 |
| 19 | Create API tests | `__tests__/api/clients.test.ts`, `__tests__/api/projects.test.ts` | 7, 8 |
| 20 | Create integration tests | `__tests__/integration/workspace-scoping/projects-clients.test.ts` | 7, 8 |
| 21 | TypeScript check (`tsc --noEmit`) | — | All |
| 22 | Run all tests (`npm test`) | — | 18, 19, 20 |
| 23 | Update roadmap | `docs/REFACTOR_ROADMAP.md` | All |

---

## Verification Checklist

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm test` — all tests pass
- [ ] Feature toggle: projects/clients can be disabled in Settings > Features
- [ ] Sidebar: projects/clients nav items hidden when feature disabled
- [ ] Page: `<FeatureGate>` shows disabled message when feature off
- [ ] API: returns 403 when feature disabled (via `withWorkspaceFeature` middleware)
- [ ] Workspace scoping: data isolated per workspace
- [ ] Demo mode: sample data renders, CRUD works with localStorage
- [ ] Kanban: drag-and-drop status changes work
- [ ] Client-project link: creating project with client shows client name
- [ ] Task-project link: creating task with project shows project badge
- [ ] Deletion safety: confirmation dialogs for cascading operations
- [ ] Pagination: cursor-based pagination works on both endpoints
