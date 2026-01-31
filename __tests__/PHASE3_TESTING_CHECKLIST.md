# Phase 3 Workspace Scoping - End-to-End Testing Checklist

## Overview
This document provides a comprehensive testing checklist for Phase 3 workspace scoping implementation. All productivity features and integrations must properly isolate data by workspace.

## Test Environment Setup

### Prerequisites
1. At least 2 workspaces created (e.g., "Engineering" and "Marketing")
2. At least 2 users:
   - User A: Member of workspace-1 only
   - User B: Member of workspace-2 only
   - Admin: Member of both workspaces (or org admin)
3. Sample data created in each workspace

### Database Verification
Before testing, verify migrations were applied:

```sql
-- Check workspace_id columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('focus_blocks', 'daily_energy', 'user_streaks', 'focus_score_history', 'recurring_task_templates', 'webhook_configs', 'google_calendar_tokens', 'asana_connections')
AND column_name = 'workspace_id';

-- Check asana_connections table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'asana_connections';
```

## 1. Productivity Features Testing

### 1.1 Focus Blocks

#### Test Case 1.1.1: Require workspaceId Parameter
- [ ] **GET** `/api/productivity/focus-blocks` without `workspaceId` → Returns 400 error
- [ ] Error message: "workspaceId is required"

#### Test Case 1.1.2: Workspace Access Validation
- [ ] Login as User A (workspace-1 member)
- [ ] **GET** `/api/productivity/focus-blocks?workspaceId=workspace-2` → Returns 403 error
- [ ] Error message: "You don't have access to this workspace"

#### Test Case 1.1.3: Data Isolation
- [ ] Create focus blocks in workspace-1 and workspace-2 using different users
- [ ] Login as User A
- [ ] **GET** `/api/productivity/focus-blocks?workspaceId=workspace-1` → Returns only workspace-1 data
- [ ] Verify no workspace-2 data is included

#### Test Case 1.1.4: Create Focus Block
- [ ] Login as User A
- [ ] **POST** `/api/productivity/focus-blocks` with:
  ```json
  {
    "workspaceId": "workspace-1",
    "startTime": "2024-01-15T09:00:00Z",
    "endTime": "2024-01-15T11:00:00Z",
    "category": "deep_work",
    "quality": 4
  }
  ```
- [ ] Verify focus block is created with correct `workspaceId`
- [ ] Verify attempting to create in workspace-2 returns 403

#### Test Case 1.1.5: Admin Access
- [ ] Login as Admin
- [ ] **GET** `/api/productivity/focus-blocks?workspaceId=workspace-1` → Success
- [ ] **GET** `/api/productivity/focus-blocks?workspaceId=workspace-2` → Success
- [ ] Admin can access all workspaces without validation

### 1.2 Energy Tracking

#### Test Case 1.2.1: Require workspaceId Parameter
- [ ] **GET** `/api/productivity/energy` without `workspaceId` → Returns 400 error

#### Test Case 1.2.2: Data Isolation
- [ ] Create energy entries in both workspaces
- [ ] **GET** `/api/productivity/energy?workspaceId=workspace-1` → Returns only workspace-1 data
- [ ] **GET** `/api/productivity/energy?workspaceId=workspace-2` → Returns only workspace-2 data

#### Test Case 1.2.3: Create Energy Entry
- [ ] **POST** `/api/productivity/energy` with:
  ```json
  {
    "workspaceId": "workspace-1",
    "energyLevel": 8,
    "date": "2024-01-15"
  }
  ```
- [ ] Verify entry is created with correct `workspaceId`

### 1.3 Streaks

#### Test Case 1.3.1: Workspace-Filtered Calculation
- [ ] Create EOD reports in both workspaces for User A
- [ ] Workspace-1: Reports on Jan 1, 2, 3 (3-day streak)
- [ ] Workspace-2: Reports on Jan 1 only (1-day streak)
- [ ] **GET** `/api/productivity/streak?workspaceId=workspace-1` → Returns 3-day streak
- [ ] **GET** `/api/productivity/streak?workspaceId=workspace-2` → Returns 1-day streak
- [ ] Verify streaks are calculated independently per workspace

### 1.4 Focus Score

#### Test Case 1.4.1: Workspace-Filtered Score Calculation
- [ ] Create data in both workspaces:
  - EOD reports
  - Completed tasks
  - Completed rocks
- [ ] **GET** `/api/productivity/focus-score?workspaceId=workspace-1` → Returns score based only on workspace-1 data
- [ ] **GET** `/api/productivity/focus-score?workspaceId=workspace-2` → Returns score based only on workspace-2 data
- [ ] Verify scores differ based on workspace-specific data

## 2. Google Calendar Integration

### 2.1 Connection Status

#### Test Case 2.1.1: Require workspaceId Parameter
- [ ] **GET** `/api/google-calendar` without `workspaceId` → Returns 400 error

#### Test Case 2.1.2: Workspace-Specific Connection
- [ ] Login as User A
- [ ] **GET** `/api/google-calendar?workspaceId=workspace-1` → Returns connection status for workspace-1
- [ ] Verify `authUrl` includes state parameter with `workspaceId`
- [ ] Decode state parameter:
  ```javascript
  const state = new URL(authUrl).searchParams.get('state')
  const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
  console.log(decoded.workspaceId) // Should be workspace-1
  ```

### 2.2 OAuth Flow

#### Test Case 2.2.1: Complete OAuth with Workspace Context
- [ ] Initiate OAuth for workspace-1
- [ ] Complete Google Calendar authorization
- [ ] Verify callback saves token with `workspace_id = workspace-1`
- [ ] **GET** `/api/google-calendar?workspaceId=workspace-1` → Shows connected status
- [ ] **GET** `/api/google-calendar?workspaceId=workspace-2` → Shows NOT connected (different workspace)

#### Test Case 2.2.2: Multiple Workspace Connections
- [ ] Connect Google Calendar to workspace-1
- [ ] Connect Google Calendar to workspace-2 (same user, different calendar)
- [ ] Verify both connections exist independently
- [ ] Database check:
  ```sql
  SELECT user_id, workspace_id, calendar_id FROM google_calendar_tokens;
  ```
- [ ] Should show 2 rows for same user, different workspaces

### 2.3 Update and Delete

#### Test Case 2.3.1: Update Workspace Connection
- [ ] **PATCH** `/api/google-calendar` with:
  ```json
  {
    "workspaceId": "workspace-1",
    "calendarId": "primary",
    "syncEnabled": true
  }
  ```
- [ ] Verify only workspace-1 connection is updated
- [ ] Workspace-2 connection remains unchanged

#### Test Case 2.3.2: Delete Workspace Connection
- [ ] **DELETE** `/api/google-calendar?workspaceId=workspace-1`
- [ ] Verify workspace-1 connection is deleted
- [ ] Verify workspace-2 connection still exists

## 3. Asana Integration

### 3.1 Connection Management

#### Test Case 3.1.1: Check Connection Status
- [ ] **GET** `/api/asana/me/connect?workspaceId=workspace-1` → Returns connection status
- [ ] Without workspaceId → Returns 400 error

#### Test Case 3.1.2: Connect to Asana (Workspace-Specific)
- [ ] Get Asana Personal Access Token
- [ ] **POST** `/api/asana/me/connect` with:
  ```json
  {
    "personalAccessToken": "YOUR_PAT",
    "workspaceGid": "ASANA_WORKSPACE_GID",
    "aimsWorkspaceId": "workspace-1"
  }
  ```
- [ ] Verify connection is created in `asana_connections` table
- [ ] Database check:
  ```sql
  SELECT user_id, workspace_id, asana_workspace_gid
  FROM asana_connections
  WHERE workspace_id = 'workspace-1';
  ```

#### Test Case 3.1.3: UPSERT Behavior
- [ ] Connect to Asana for workspace-1 with PAT1
- [ ] Connect again for workspace-1 with PAT2 (different token)
- [ ] Verify connection is UPDATED (not duplicated)
- [ ] Database check should show only 1 row for (user_id, workspace_id)

#### Test Case 3.1.4: Multiple Workspace Connections
- [ ] Connect User A to Asana for workspace-1
- [ ] Connect User A to Asana for workspace-2 (can be same or different Asana workspace)
- [ ] Verify both connections exist independently
- [ ] Database check:
  ```sql
  SELECT user_id, workspace_id, asana_workspace_gid
  FROM asana_connections
  WHERE user_id = 'user-a-id';
  ```
- [ ] Should show 2 rows

#### Test Case 3.1.5: Delete Connection
- [ ] **DELETE** `/api/asana/me/connect?workspaceId=workspace-1`
- [ ] Verify only workspace-1 connection is deleted
- [ ] Workspace-2 connection remains intact

### 3.2 Data Isolation

#### Test Case 3.2.1: Connection Visibility
- [ ] User A connects to Asana for workspace-1
- [ ] User B attempts to view User A's connection for workspace-1 → Should fail (403)
- [ ] User A checks workspace-2 (where not connected) → Shows not connected

## 4. Slack Integration

### 4.1 Workspace-Specific Webhooks

#### Test Case 4.1.1: Workspace Settings
- [ ] Configure workspace-1 with Slack webhook URL: `https://hooks.slack.com/services/T1/B1/X1`
- [ ] Configure workspace-2 with Slack webhook URL: `https://hooks.slack.com/services/T2/B2/X2`
- [ ] Verify settings are stored per workspace

#### Test Case 4.1.2: Send Notification
- [ ] **POST** `/api/ai/slack` with:
  ```json
  {
    "type": "custom",
    "data": { "text": "Test from workspace-1" },
    "workspaceId": "workspace-1"
  }
  ```
- [ ] Verify message is sent to workspace-1's Slack channel
- [ ] Verify workspace-2's Slack does NOT receive the message

#### Test Case 4.1.3: Fallback to Org-Level Webhook
- [ ] Remove workspace-2's Slack webhook
- [ ] Set org-level Slack webhook
- [ ] Send notification to workspace-2
- [ ] Verify it uses org-level webhook as fallback

## 5. Task Templates

### 5.1 Dual-Scope Model

#### Test Case 5.1.1: Create Org-Wide Template
- [ ] **POST** `/api/task-templates` with:
  ```json
  {
    "name": "Daily Standup",
    "title": "Daily Standup Meeting",
    "description": "Org-wide template",
    "isShared": true
  }
  ```
- [ ] Verify `workspaceId` is NULL in database

#### Test Case 5.1.2: Create Workspace-Specific Template
- [ ] **POST** `/api/task-templates` with:
  ```json
  {
    "name": "Engineering Review",
    "title": "Code Review Task",
    "description": "Engineering-specific template",
    "workspaceId": "workspace-1"
  }
  ```
- [ ] Verify `workspaceId = workspace-1` in database

#### Test Case 5.1.3: Visibility Rules
- [ ] **GET** `/api/task-templates` (no workspaceId) → Returns ALL templates (org-wide + all workspaces)
- [ ] **GET** `/api/task-templates?workspaceId=workspace-1` → Returns:
  - Org-wide templates (workspaceId = NULL)
  - Workspace-1 templates (workspaceId = workspace-1)
  - Excludes workspace-2 templates
- [ ] **GET** `/api/task-templates?workspaceId=workspace-2` → Returns:
  - Org-wide templates
  - Workspace-2 templates
  - Excludes workspace-1 templates

#### Test Case 5.1.4: Delete Template with Workspace Validation
- [ ] Create workspace-specific template in workspace-1
- [ ] User A (workspace-1 member) attempts to delete → Success
- [ ] User B (workspace-2 member) attempts to delete same template → 403 error

## 6. Webhooks

### 6.1 Dual-Scope Model

#### Test Case 6.1.1: Create Org-Wide Webhook
- [ ] **POST** `/api/webhooks` with:
  ```json
  {
    "name": "Org Events",
    "url": "https://example.com/org-webhook",
    "events": ["task.created", "task.completed"],
    "enabled": true
  }
  ```
- [ ] Verify `workspace_id` is NULL in database
- [ ] Verify `scope` is "organization" in response

#### Test Case 6.1.2: Create Workspace-Specific Webhook
- [ ] **POST** `/api/webhooks` with:
  ```json
  {
    "name": "Engineering Events",
    "url": "https://example.com/eng-webhook",
    "events": ["task.created"],
    "workspaceId": "workspace-1",
    "enabled": true
  }
  ```
- [ ] Verify `workspace_id = workspace-1` in database
- [ ] Verify `scope` is "workspace" in response

#### Test Case 6.1.3: Visibility Rules
- [ ] **GET** `/api/webhooks` (no workspaceId) → Returns ALL webhooks
- [ ] **GET** `/api/webhooks?workspaceId=workspace-1` → Returns:
  - Org-wide webhooks (workspace_id = NULL)
  - Workspace-1 webhooks (workspace_id = workspace-1)
  - Excludes workspace-2 webhooks
- [ ] Database query verification:
  ```sql
  SELECT id, name, workspace_id FROM webhook_configs
  WHERE organization_id = 'org-1'
  AND (workspace_id IS NULL OR workspace_id = 'workspace-1');
  ```

#### Test Case 6.1.4: Secret Masking
- [ ] **GET** `/api/webhooks` → Verify all secrets are masked (show as "whsec_12345***")
- [ ] Full secret should never be returned in GET requests

#### Test Case 6.1.5: Update Webhook
- [ ] **PATCH** `/api/webhooks?id=webhook-1` for workspace-specific webhook
- [ ] User without workspace access attempts update → 403 error
- [ ] User with workspace access → Success

#### Test Case 6.1.6: Delete Webhook
- [ ] **DELETE** `/api/webhooks?id=webhook-1` for workspace-specific webhook
- [ ] Validate workspace access is checked
- [ ] Verify associated deliveries are also deleted

#### Test Case 6.1.7: Webhook Limit
- [ ] Create 10 webhooks for organization
- [ ] Attempt to create 11th webhook → Returns 400 error
- [ ] Error message: "Maximum webhook limit (10) reached"

## 7. Cross-Workspace Data Leakage Tests

### 7.1 Critical Security Tests

#### Test Case 7.1.1: Focus Block Leakage
- [ ] User A creates focus blocks in workspace-1
- [ ] User B (workspace-2 only) attempts to access:
  - `/api/productivity/focus-blocks?workspaceId=workspace-1` → 403 error
- [ ] User A should NEVER see workspace-2 data when querying workspace-1

#### Test Case 7.1.2: Integration Connection Leakage
- [ ] User A connects Google Calendar to workspace-1
- [ ] User B checks connection status for workspace-1 → Should NOT see User A's connection
- [ ] Each user's connections are isolated by (user_id, workspace_id)

#### Test Case 7.1.3: Asana Token Leakage
- [ ] User A connects Asana to workspace-1 with PAT
- [ ] Database query should show:
  ```sql
  SELECT personal_access_token FROM asana_connections
  WHERE user_id = 'user-a-id' AND workspace_id = 'workspace-1';
  ```
- [ ] User B should NEVER be able to retrieve User A's PAT
- [ ] Verify API endpoint enforces user_id matching

#### Test Case 7.1.4: Template Cross-Workspace Access
- [ ] User A creates workspace-specific template in workspace-1
- [ ] User B (workspace-2 member) queries workspace-2
- [ ] Verify User B does NOT see workspace-1 specific templates
- [ ] Org-wide templates should be visible to both

## 8. Admin Bypass Testing

### 8.1 Admin Access

#### Test Case 8.1.1: Admin Can Access All Workspaces
- [ ] Login as org admin
- [ ] **GET** `/api/productivity/focus-blocks?workspaceId=workspace-1` → Success (no access check)
- [ ] **GET** `/api/productivity/focus-blocks?workspaceId=workspace-2` → Success (no access check)
- [ ] Verify `userHasWorkspaceAccess` is NOT called for admins

#### Test Case 8.1.2: Admin Can Manage All Resources
- [ ] Admin can update/delete workspace-specific templates in any workspace
- [ ] Admin can update/delete workspace-specific webhooks in any workspace
- [ ] Admin bypasses workspace access validation

## 9. Database Integrity

### 9.1 Foreign Key Constraints

#### Test Case 9.1.1: Cascade Deletes
- [ ] Delete a workspace
- [ ] Verify all associated records are deleted:
  ```sql
  SELECT COUNT(*) FROM focus_blocks WHERE workspace_id = 'deleted-workspace-id';
  SELECT COUNT(*) FROM asana_connections WHERE workspace_id = 'deleted-workspace-id';
  SELECT COUNT(*) FROM google_calendar_tokens WHERE workspace_id = 'deleted-workspace-id';
  ```
- [ ] All counts should be 0

#### Test Case 9.1.2: Unique Constraints
- [ ] Attempt to create duplicate Google Calendar connection for (user_id, organization_id, workspace_id) → Should UPSERT (update existing)
- [ ] Attempt to create duplicate Asana connection for (user_id, workspace_id) → Should UPSERT
- [ ] No duplicate rows should exist

### 9.2 Index Performance

#### Test Case 9.2.1: Verify Indexes Exist
```sql
-- Check all workspace-related indexes
SELECT tablename, indexname FROM pg_indexes
WHERE indexname LIKE '%workspace%';
```
- [ ] Indexes should exist on all workspace_id columns
- [ ] Composite indexes should exist for (user_id, workspace_id, ...) patterns

## 10. UI/Frontend Testing

### 10.1 Workspace Switcher

#### Test Case 10.1.1: Data Refresh on Workspace Switch
- [ ] View focus blocks in workspace-1
- [ ] Switch to workspace-2 using workspace switcher
- [ ] Verify all data refreshes to show workspace-2 data
- [ ] Network tab should show new requests with `workspaceId=workspace-2` parameter

#### Test Case 10.1.2: Integration Connections Per Workspace
- [ ] Navigate to integrations page
- [ ] Switch between workspaces
- [ ] Verify connection status updates per workspace (Google Calendar, Asana)
- [ ] Connect to integration in workspace-1
- [ ] Switch to workspace-2 → Should show NOT connected

### 10.2 Template and Webhook UI

#### Test Case 10.2.1: Template Visibility
- [ ] View task templates page
- [ ] Verify org-wide templates show "Organization" scope badge
- [ ] Verify workspace-specific templates show workspace name badge
- [ ] Switch workspaces → Templates list updates correctly

#### Test Case 10.2.2: Webhook Management
- [ ] View webhooks page
- [ ] Create org-wide webhook → Shows "Organization" scope
- [ ] Create workspace-specific webhook → Shows workspace name scope
- [ ] Switch workspaces → Webhook list filters correctly (org-wide + current workspace)

## Test Results

### Summary
- [ ] Total test cases: _____
- [ ] Passed: _____
- [ ] Failed: _____
- [ ] Blocked: _____

### Issues Found
| Test Case | Issue Description | Severity | Status |
|-----------|------------------|----------|--------|
|           |                  |          |        |

### Sign-off
- [ ] All critical security tests passed (no data leakage)
- [ ] All workspace isolation tests passed
- [ ] All integration tests passed
- [ ] Database integrity verified
- [ ] UI correctly reflects workspace scoping

**Tested by:** _____________
**Date:** _____________
**Environment:** _____________
