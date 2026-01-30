# Workspace Filtering Implementation

**Date**: January 30, 2026
**Status**: ✅ BACKEND COMPLETE - Frontend integration needed

---

## 🎯 What Was Implemented

### Backend API Routes Updated (3 files)

#### 1. **Tasks API** (`app/api/tasks/route.ts`)

**GET `/api/tasks`** - Added workspace filtering:
```typescript
// Now accepts workspaceId query parameter
const workspaceId = searchParams.get("workspaceId")

// Filters results by workspace
if (workspaceId) {
  tasks = tasks.filter(t => t.workspaceId === workspaceId)
}
```

**POST `/api/tasks`** - Added workspace assignment:
```typescript
// Accepts workspaceId in request body
const { workspaceId, title, description, ... } = body

// Stores workspace with task
const task: AssignedTask = {
  id: taskId,
  organizationId: auth.organization.id,
  workspaceId: workspaceId || null,  // ← NEW
  // ... rest of fields
}
```

---

#### 2. **Rocks API** (`app/api/rocks/route.ts`)

**GET `/api/rocks`** - Added workspace filtering:
```typescript
// Now accepts workspaceId query parameter
const workspaceId = searchParams.get("workspaceId")

// Filters results by workspace
if (workspaceId) {
  rocks = rocks.filter((rock) => rock.workspaceId === workspaceId)
}
```

**POST `/api/rocks`** - Added workspace assignment:
```typescript
// Accepts workspaceId in request body
const { workspaceId, title, description, ... } = body

// Stores workspace with rock
const rock: Rock = {
  id: generateId(),
  organizationId: auth.organization.id,
  workspaceId: workspaceId || null,  // ← NEW
  // ... rest of fields
}
```

---

#### 3. **EOD Reports API** (`app/api/eod-reports/route.ts`)

**GET `/api/eod-reports`** - Added workspace filtering:
```typescript
// Now accepts workspaceId query parameter
const workspaceId = searchParams.get("workspaceId")

// Filters results by workspace
if (workspaceId) {
  reports = reports.filter((report) => report.workspaceId === workspaceId)
}
```

**POST `/api/eod-reports`** - Added workspace assignment:
```typescript
// Accepts workspaceId in request body
const { workspaceId, tasks, challenges, ... } = body

// Stores workspace with report
const report: EODReport = {
  id: generateId(),
  organizationId: auth.organization.id,
  workspaceId: workspaceId || null,  // ← NEW
  // ... rest of fields
}
```

---

## ✅ What Works Now

### Backwards Compatibility
- ✅ **All existing data still accessible** - No workspace filter = shows all org data
- ✅ **No breaking changes** - Old API calls without workspaceId still work
- ✅ **Gradual migration** - Can add workspaceId progressively

### New Workspace Filtering
- ✅ **GET requests** - Can filter by workspace using `?workspaceId={id}` query param
- ✅ **POST requests** - Can assign new items to specific workspace
- ✅ **Data isolation ready** - Once frontend passes workspaceId, data will be isolated

---

## ⚠️ What Still Needs Work

### Frontend Integration Required

The frontend needs to be updated to:

#### 1. **Pass workspaceId in API Calls**

**For GET requests** (fetching data):
```typescript
// Current (shows all org data):
const response = await fetch('/api/tasks')

// Updated (shows workspace data):
const { currentWorkspaceId } = useWorkspaceStore()
const response = await fetch(`/api/tasks?workspaceId=${currentWorkspaceId}`)
```

**For POST requests** (creating data):
```typescript
// Current (no workspace assignment):
await fetch('/api/tasks', {
  method: 'POST',
  body: JSON.stringify({ title, description, ... })
})

// Updated (assigns to current workspace):
const { currentWorkspaceId } = useWorkspaceStore()
await fetch('/api/tasks', {
  method: 'POST',
  body: JSON.stringify({
    title,
    description,
    workspaceId: currentWorkspaceId,  // ← ADD THIS
    ...
  })
})
```

---

#### 2. **Files That Need Updates**

**Data Fetching Hooks** (add workspaceId to API calls):
- `lib/hooks/use-team-data.ts` - Fetches tasks, rocks, EOD reports
- Any components directly calling `/api/tasks`, `/api/rocks`, `/api/eod-reports`

**Data Creation Forms** (include workspaceId in POST bodies):
- Task creation forms
- Rock creation forms
- EOD report submission forms

---

## 🧪 Testing Plan

### Phase 1: Verify Backend Works

```bash
# Test GET with workspace filter
curl "http://localhost:3000/api/tasks?workspaceId=workspace-123" \
  -H "Cookie: session=..."

# Test POST with workspace assignment
curl -X POST "http://localhost:3000/api/tasks" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "title": "Test Task",
    "workspaceId": "workspace-123"
  }'

# Test backwards compatibility (no workspaceId)
curl "http://localhost:3000/api/tasks" \
  -H "Cookie: session=..."
```

### Phase 2: Frontend Integration Testing

1. **Create 2 test workspaces**
   - Use `/api/workspaces` to create "Workspace A" and "Workspace B"

2. **Test data isolation**
   - Switch to Workspace A
   - Create task "Task A"
   - Switch to Workspace B
   - Verify "Task A" is NOT visible
   - Create task "Task B"
   - Switch back to Workspace A
   - Verify "Task B" is NOT visible

3. **Test backwards compatibility**
   - Log out and log back in (clears workspace selection)
   - Verify all tasks/rocks/reports still visible (org-level view)

---

## 📋 Implementation Checklist

### ✅ Backend (Complete)
- [x] Update tasks GET endpoint to accept workspaceId query param
- [x] Update tasks POST endpoint to accept and store workspaceId
- [x] Update rocks GET endpoint to accept workspaceId query param
- [x] Update rocks POST endpoint to accept and store workspaceId
- [x] Update EOD reports GET endpoint to accept workspaceId query param
- [x] Update EOD reports POST endpoint to accept and store workspaceId
- [x] Maintain backwards compatibility (no workspace = show all org data)

### ❌ Frontend (Pending)
- [ ] Update use-team-data hook to pass workspaceId in fetch calls
- [ ] Update task creation to include currentWorkspaceId
- [ ] Update rock creation to include currentWorkspaceId
- [ ] Update EOD submission to include currentWorkspaceId
- [ ] Test workspace switching updates data display
- [ ] Test creating data in different workspaces
- [ ] Verify data isolation between workspaces

---

## 🔧 Example Frontend Implementation

### Option A: Update Individual Fetch Calls

```typescript
// lib/hooks/use-team-data.ts
import { useWorkspaceStore } from "./use-workspace"

export function useTeamData() {
  const { currentWorkspaceId } = useWorkspaceStore()

  // Fetch tasks with workspace filter
  const fetchTasks = async () => {
    const url = currentWorkspaceId
      ? `/api/tasks?workspaceId=${currentWorkspaceId}`
      : `/api/tasks`
    const response = await fetch(url)
    // ... rest of logic
  }

  // Include workspaceId when creating tasks
  const createTask = async (taskData) => {
    await fetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        ...taskData,
        workspaceId: currentWorkspaceId,
      })
    })
  }
}
```

### Option B: Create Workspace-Aware Fetch Wrapper

```typescript
// lib/api/workspace-fetch.ts
import { useWorkspaceStore } from "@/lib/hooks/use-workspace"

export function useWorkspaceApi() {
  const { currentWorkspaceId } = useWorkspaceStore()

  const workspaceFetch = async (url: string, options?: RequestInit) => {
    // Add workspaceId to GET requests
    if (!options?.method || options.method === 'GET') {
      const separator = url.includes('?') ? '&' : '?'
      url = currentWorkspaceId
        ? `${url}${separator}workspaceId=${currentWorkspaceId}`
        : url
    }

    // Add workspaceId to POST/PATCH request bodies
    if (options?.method === 'POST' || options?.method === 'PATCH') {
      if (options.body && currentWorkspaceId) {
        const body = JSON.parse(options.body as string)
        body.workspaceId = currentWorkspaceId
        options.body = JSON.stringify(body)
      }
    }

    return fetch(url, options)
  }

  return { workspaceFetch }
}

// Usage:
const { workspaceFetch } = useWorkspaceApi()
const response = await workspaceFetch('/api/tasks')  // Automatically adds workspaceId
```

---

## 🚀 Deployment Strategy

### Step 1: Deploy Backend Changes (Safe)
1. Deploy updated API routes
2. Existing frontend continues working (no workspace filter = org-level data)
3. No user impact

### Step 2: Test Backend in Production
1. Use curl or Postman to test workspace filtering
2. Verify backwards compatibility
3. Confirm no regressions

### Step 3: Deploy Frontend Changes
1. Update frontend to pass workspaceId
2. Test workspace switching
3. Verify data isolation

### Step 4: Migration (Optional)
1. If needed, run script to assign existing data to default workspace
2. But this is already done in migration `1736779200003_multi_workspace.sql`

---

## 📊 Benefits of This Implementation

### ✅ Clean Separation
- Backend handles filtering logic
- Frontend just passes workspaceId
- Simple, maintainable

### ✅ Backwards Compatible
- No breaking changes
- Existing code works without modifications
- Gradual migration possible

### ✅ Performance Friendly
- Filtering done in-memory (fast)
- Can later optimize with database-level filtering if needed
- No additional database queries required

### ✅ Flexible
- Can switch between workspace-filtered and org-level views
- Admin tools can still see all org data (omit workspaceId)
- Future: Can add more advanced filtering (multiple workspaces, etc.)

---

## 🔄 Rollback Plan

If issues occur:

```bash
# Restore previous API route files
git checkout HEAD~1 -- app/api/tasks/route.ts
git checkout HEAD~1 -- app/api/rocks/route.ts
git checkout HEAD~1 -- app/api/eod-reports/route.ts

# Redeploy
vercel --prod
```

Data is safe - no database changes were made, only API route logic.

---

## 📝 Commit Message

```bash
git add app/api/tasks/route.ts app/api/rocks/route.ts app/api/eod-reports/route.ts
git commit -m "Add workspace filtering to tasks, rocks, and EOD reports API routes

- Add workspaceId query parameter support to GET endpoints
- Add workspaceId field to POST endpoint request bodies
- Filter results by workspace when workspaceId is provided
- Maintain backwards compatibility (no workspaceId = org-level data)

Backend implementation complete. Frontend integration pending.

Files modified:
- app/api/tasks/route.ts (GET, POST)
- app/api/rocks/route.ts (GET, POST)
- app/api/eod-reports/route.ts (GET, POST)

Related: WORKSPACE_STATUS.md Task #5"
```

---

## ✅ Success Criteria

This implementation is complete when:
- ✅ Backend accepts workspaceId in API calls
- ✅ Backend filters data by workspace when provided
- ✅ Backwards compatibility maintained (works without workspaceId)
- ❌ Frontend passes currentWorkspaceId in API calls (next step)
- ❌ Workspace switching filters displayed data (next step)
- ❌ Creating items assigns them to current workspace (next step)
- ❌ Data isolation verified between workspaces (next step)

**Current Status**: Backend ready ✅ | Frontend integration needed ⏳

---

**Next Steps**: Update frontend hooks and components to pass `currentWorkspaceId` in all API calls.
