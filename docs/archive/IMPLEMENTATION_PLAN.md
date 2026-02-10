# Implementation Plan: Feature Bundle

## Overview
This plan covers 8 features organized into 3 phases. All low-effort features (except dark mode), plus Google Calendar sync and Kanban board.

---

## Phase 1: Quick Wins (Low Effort)

### 1.1 EOD Submission Streak Tracker
**Effort: 2-3 hours**

**What it does:** Shows consecutive days the user has submitted EOD reports, gamifying accountability.

**Files to modify:**
- `lib/types.ts` - Already has `streakDays` in `DashboardStats` interface
- `app/api/stats/route.ts` - Calculate streak from eod_reports table
- `components/dashboard/stats-cards.tsx` - Display streak with fire emoji/badge

**Implementation:**
1. Add streak calculation query in stats API:
   ```sql
   SELECT date FROM eod_reports
   WHERE user_id = $1 AND organization_id = $2
   ORDER BY date DESC
   ```
2. Iterate backwards counting consecutive days (skip weekends optionally)
3. Display in stats card with 🔥 icon and milestone badges (7-day, 30-day, etc.)

---

### 1.2 Quick Task Capture in Command Palette
**Effort: 2-3 hours**

**What it does:** Adds "Add Task" action to Cmd+K palette for rapid task creation.

**Files to modify:**
- `components/shared/command-palette.tsx` - Add quick task command
- Create `components/shared/quick-task-dialog.tsx` - Minimal task input modal

**Implementation:**
1. Add new command in Actions group:
   ```tsx
   {
     id: "quick-task",
     name: "Quick Add Task",
     description: "Rapidly create a new task",
     icon: <Plus className="mr-2 h-4 w-4" />,
     action: () => setShowQuickTask(true),
     keywords: ["new", "create", "add", "todo"],
     group: "Actions",
   }
   ```
2. Create minimal dialog with just title + optional due date
3. Submit creates personal task via API
4. Add keyboard shortcut hint in UI

---

### 1.3 Task Templates
**Effort: 3-4 hours**

**What it does:** Save common tasks as reusable templates for quick assignment.

**Database changes:**
```sql
CREATE TABLE IF NOT EXISTS task_templates (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by VARCHAR(255) NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(50) DEFAULT 'normal',
  default_rock_id VARCHAR(255),
  recurrence JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Files to create/modify:**
- `lib/db/schema.sql` - Add task_templates table
- `lib/types.ts` - Add `TaskTemplate` interface
- `app/api/task-templates/route.ts` - CRUD API
- `components/tasks/template-picker.tsx` - Template selection UI
- `components/tasks/add-task-modal.tsx` - Add "Save as Template" option

**Implementation:**
1. Add migration for task_templates table
2. Create API routes for CRUD operations
3. In AddTaskModal, add "Save as Template" checkbox when creating
4. Add template picker dropdown that pre-fills form fields
5. Templates scoped to organization (shared) or user (personal)

---

### 1.4 Notification Preferences Granularity
**Effort: 3-4 hours**

**What it does:** Let users control which events trigger which notification channels.

**Database changes:**
- Add `notification_preferences` JSONB column to `organization_members` table

**Schema:**
```typescript
interface NotificationPreferences {
  task_assigned: { email: boolean; inApp: boolean; slack: boolean }
  eod_reminder: { email: boolean; inApp: boolean; slack: boolean }
  escalation: { email: boolean; inApp: boolean; slack: boolean }
  rock_updated: { email: boolean; inApp: boolean; slack: boolean }
  digest: { email: boolean; slack: boolean }
}
```

**Files to modify:**
- `lib/db/schema.sql` - Add column to organization_members
- `lib/types.ts` - Add NotificationPreferences interface
- `components/pages/settings-page.tsx` - Add preferences UI section
- `app/api/members/[id]/route.ts` - Save preferences
- `lib/notifications.ts` - Check preferences before sending

**Implementation:**
1. Add migration for new column with sensible defaults
2. Create UI with toggle grid (event type × channel)
3. Modify notification dispatch to check user preferences
4. Add "Quick mute all" option for vacation mode

---

### 1.5 Browser Push Notifications
**Effort: 4-5 hours**

**What it does:** Real browser notifications for urgent events.

**Files to create:**
- `public/sw.js` - Service worker for push notifications
- `lib/push-notifications.ts` - Subscription management
- `app/api/push/subscribe/route.ts` - Store subscription
- `app/api/push/send/route.ts` - Send push notification

**Database changes:**
```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);
```

**Implementation:**
1. Generate VAPID keys for push authentication
2. Create service worker with push event handler
3. Add "Enable Push Notifications" button in settings
4. Request notification permission and store subscription
5. Modify notification dispatch to also send push for urgent items
6. Add to notification preferences (enable/disable per event type)

---

### 1.6 Mobile Navigation Improvements
**Effort: 3-4 hours**

**What it does:** Better mobile experience with bottom nav and collapsible sidebar.

**Files to modify:**
- `components/layout/sidebar-nav.tsx` - Make collapsible
- `components/layout/main-layout.tsx` - Add mobile bottom nav
- Create `components/layout/mobile-nav.tsx` - Bottom navigation bar
- Various modals - Improve touch targets

**Implementation:**
1. Create bottom navigation bar for mobile (< 768px):
   - 5 icons: Dashboard, Tasks, Calendar, History, More (opens sheet)
   - Fixed to bottom, visible on all pages
2. Hide sidebar on mobile, show via hamburger menu
3. Add swipe gestures to close modals/sheets
4. Increase touch targets to 44px minimum
5. Improve modal positioning on mobile (full-width, slide from bottom)

---

## Phase 2: Medium Effort Features

### 2.1 Google Calendar Sync
**Effort: 1-2 days**

**What it does:** Two-way sync between task due dates and Google Calendar events.

**OAuth Setup Required:**
- Google Cloud Console project with Calendar API enabled
- OAuth 2.0 credentials (web application type)
- Redirect URI: `{APP_URL}/api/google/oauth/callback`

**Environment variables:**
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

**Database changes:**
```sql
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  calendar_id VARCHAR(255) DEFAULT 'primary',
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS google_calendar_events (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id VARCHAR(255) REFERENCES assigned_tasks(id) ON DELETE CASCADE,
  rock_id VARCHAR(255) REFERENCES rocks(id) ON DELETE CASCADE,
  google_event_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(google_event_id)
);
```

**Files to create:**
- `lib/integrations/google-calendar.ts` - Google Calendar API wrapper
- `app/api/google/oauth/connect/route.ts` - Initiate OAuth flow
- `app/api/google/oauth/callback/route.ts` - Handle OAuth callback
- `app/api/google/calendar/sync/route.ts` - Sync endpoint
- `components/settings/google-calendar-settings.tsx` - Connection UI

**Implementation Steps:**
1. **OAuth Flow:**
   - User clicks "Connect Google Calendar" in settings
   - Redirect to Google OAuth with calendar.events scope
   - On callback, store tokens in database
   - Refresh token automatically when expired

2. **AIMS → Google (Push):**
   - When task created with due date, create Google Calendar event
   - When task updated, update event
   - When task completed, optionally delete or mark event
   - Store mapping in google_calendar_events table

3. **Google → AIMS (Optional Pull):**
   - Webhook or periodic sync to detect external changes
   - Update task due dates if calendar event moved

4. **Settings UI:**
   - Connect/disconnect button
   - Choose which calendar to sync to
   - Toggle sync for tasks, rocks, or both
   - Manual "Sync Now" button

---

### 2.2 Kanban Board View
**Effort: 1-2 days**

**What it does:** Drag-and-drop task board organized by status columns.

**No database changes required** - Uses existing `status` field on assigned_tasks.

**Files to create:**
- `components/tasks/kanban-board.tsx` - Main board component
- `components/tasks/kanban-column.tsx` - Individual column
- `components/tasks/kanban-card.tsx` - Draggable task card

**Files to modify:**
- `components/pages/tasks-page.tsx` - Add view toggle (list/kanban)
- `lib/types.ts` - No changes needed (status already exists)

**Dependencies to add:**
```json
{
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.2"
}
```

**Implementation Steps:**

1. **Install dnd-kit:**
   ```bash
   npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
   ```

2. **Create KanbanBoard component:**
   ```tsx
   // 3 columns: pending, in-progress, completed
   // Each column is a droppable zone
   // Cards are draggable items
   ```

3. **Column Structure:**
   - **To Do** (pending) - Tasks not yet started
   - **In Progress** (in-progress) - Tasks being worked on
   - **Done** (completed) - Completed tasks

4. **Drag Behavior:**
   - Drag within column reorders (optional - may not persist order)
   - Drag between columns updates task status
   - Call `updateTask` API on drop
   - Optimistic UI update, revert on error

5. **Card Design:**
   - Compact version of TaskCard
   - Show: title, priority indicator, due date, rock badge
   - Click opens full task detail/edit

6. **View Toggle:**
   - Add toggle button in TasksPage header
   - Persist preference in localStorage
   - Default to list view on mobile (better UX)

7. **Filtering:**
   - Apply same search/priority filters to kanban view
   - Filter reduces visible cards in all columns

---

## Phase 3: Integration (Connect Everything)

### 3.1 Wire Up Notification System
- All new notification types respect user preferences
- Push notifications integrated with existing dispatch
- Templates can trigger notifications on creation

### 3.2 Cross-Feature Integration
- Quick task capture can use templates
- Kanban board respects view preferences stored in settings
- Google Calendar syncs tasks created via any method (modal, quick add, templates)

---

## Database Migration Plan

All migrations should be in a single file for simplicity:

```sql
-- migrations/004_feature_bundle.sql

-- Task Templates
CREATE TABLE IF NOT EXISTS task_templates (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by VARCHAR(255) NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(50) DEFAULT 'normal',
  default_rock_id VARCHAR(255),
  recurrence JSONB,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Push Subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Google Calendar Integration
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  calendar_id VARCHAR(255) DEFAULT 'primary',
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS google_calendar_events (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id VARCHAR(255) REFERENCES assigned_tasks(id) ON DELETE CASCADE,
  rock_id VARCHAR(255) REFERENCES rocks(id) ON DELETE CASCADE,
  google_event_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(google_event_id)
);

-- Notification Preferences (add column)
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "task_assigned": {"email": true, "inApp": true, "slack": true},
  "eod_reminder": {"email": true, "inApp": true, "slack": false},
  "escalation": {"email": true, "inApp": true, "slack": true},
  "rock_updated": {"email": false, "inApp": true, "slack": false},
  "digest": {"email": true, "slack": true}
}';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_templates_org ON task_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_user ON google_calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_google_events_task ON google_calendar_events(task_id);
CREATE INDEX IF NOT EXISTS idx_google_events_event ON google_calendar_events(google_event_id);
```

---

## Implementation Order (Recommended)

1. **Day 1 Morning:** EOD Streak Tracker (quick win, visible impact)
2. **Day 1 Afternoon:** Quick Task Capture + Mobile Nav Improvements
3. **Day 2 Morning:** Task Templates (foundation for reuse)
4. **Day 2 Afternoon:** Notification Preferences
5. **Day 3:** Browser Push Notifications
6. **Day 4-5:** Kanban Board View
7. **Day 6-7:** Google Calendar Sync

---

## Testing Checklist

### EOD Streak
- [ ] Streak calculates correctly with consecutive days
- [ ] Streak resets after gap
- [ ] Weekend handling (optional skip or include)
- [ ] Display updates after EOD submission

### Quick Task
- [ ] Cmd+K opens palette
- [ ] "Add Task" appears in results
- [ ] Dialog opens and accepts input
- [ ] Task creates successfully
- [ ] Keyboard-only flow works

### Task Templates
- [ ] Create template from task modal
- [ ] Templates appear in picker
- [ ] Selecting template fills form
- [ ] Shared templates visible to org
- [ ] Delete template works

### Notification Preferences
- [ ] Toggles save correctly
- [ ] Preferences respected on send
- [ ] Email respects settings
- [ ] In-app respects settings
- [ ] Slack respects settings

### Push Notifications
- [ ] Permission prompt works
- [ ] Subscription stored
- [ ] Push received on mobile/desktop
- [ ] Click opens correct page
- [ ] Unsubscribe works

### Mobile Navigation
- [ ] Bottom nav visible on mobile
- [ ] Correct page opens on tap
- [ ] Sidebar hidden by default
- [ ] Hamburger opens sidebar sheet
- [ ] Modals slide from bottom

### Kanban Board
- [ ] Three columns render
- [ ] Tasks in correct columns
- [ ] Drag between columns works
- [ ] Status updates on drop
- [ ] Filters apply correctly
- [ ] View toggle persists

### Google Calendar
- [ ] OAuth flow completes
- [ ] Token refresh works
- [ ] Event created on task create
- [ ] Event updated on task update
- [ ] Disconnect removes events
- [ ] Error handling graceful

---

## Rollback Plan

Each feature is independent. If issues arise:
1. Revert specific feature commits
2. Run down migration if needed
3. Feature flags can disable without revert (future enhancement)

---

## Success Metrics

- **Streak Tracker:** % of users with 5+ day streaks
- **Quick Task:** Tasks created via Cmd+K vs modal
- **Templates:** # of templates created and used
- **Notifications:** Engagement rate with notifications
- **Push:** Opt-in rate and click-through rate
- **Mobile:** Mobile session duration increase
- **Kanban:** % of users using kanban vs list
- **Calendar:** Google Calendar connection rate
