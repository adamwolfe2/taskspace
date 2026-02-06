# Row-Level Security (RLS) Integration Guide

## Overview

Row-Level Security (RLS) policies have been successfully applied to all IDS workflow tables:
- `issues`
- `meetings`
- `meeting_sections`
- `meeting_issues`
- `meeting_todos`

These policies provide **database-level security** that complements the existing application-level authorization checks.

## Current Status

### ✅ Completed
- RLS enabled on all 5 IDS tables
- 20 policies created (4 per table: SELECT, INSERT, UPDATE, DELETE)
- 3 helper functions created for workspace membership checks
- Migration file created and applied: `1770336411000_add_ids_rls_policies.sql`

### ⚠️ Pending
- Application layer integration to set user context
- Testing of RLS policies with different user roles
- Performance monitoring after RLS activation

## How RLS Policies Work

### Policy Structure

Each table has 4 policies:

1. **SELECT**: Users can view records in workspaces they're members of
2. **INSERT**: Users can create records in workspaces they're members of
3. **UPDATE**: Users can update records in workspaces they're members of
4. **DELETE**: Only workspace admins/owners can delete records

### Helper Functions

Three PostgreSQL functions support the RLS policies:

1. **`get_current_user_id()`**: Retrieves the user ID from session variables
2. **`user_is_workspace_member(workspace_id)`**: Checks if user is a workspace member
3. **`user_has_workspace_role(workspace_id, role)`**: Checks if user has a specific role

## Application Integration Required

### Critical: Setting User Context

For RLS policies to work, the application **MUST** set the current user ID at the start of each database transaction:

```sql
SET LOCAL app.current_user_id = '<user_id>';
```

### Integration Points

#### Option 1: Modify `lib/db/sql.ts` (Recommended)

Add a wrapper function that sets the user context for all queries:

```typescript
// lib/db/sql.ts

export async function withUserContext<T>(
  userId: string,
  callback: () => Promise<T>
): Promise<T> {
  const client = await getLocalPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_user_id = $1`, [userId]);
    const result = await callback();
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

Usage in API routes:
```typescript
export const GET = withAuth(async (request, auth) => {
  const data = await withUserContext(auth.user.id, async () => {
    return await db.issues.list(workspaceId);
  });
  return NextResponse.json({ data });
});
```

#### Option 2: Modify the SQL Template Function

Extend the SQL query function to automatically set user context when available:

```typescript
// In lib/db/sql.ts
export function createSqlWithUser(userId: string) {
  return async function sql<T>(strings: TemplateStringsArray, ...values: unknown[]) {
    const client = await getLocalPool().connect();
    try {
      await client.query(`SET LOCAL app.current_user_id = $1`, [userId]);
      // ... rest of query execution
    } finally {
      client.release();
    }
  };
}
```

#### Option 3: Middleware at Connection Level

Add connection-level middleware that sets user context for all queries:

```typescript
// lib/db/connection.ts
export function setUserContext(client: PoolClient, userId: string) {
  return client.query(`SET LOCAL app.current_user_id = $1`, [userId]);
}
```

## Testing the RLS Policies

### Manual Testing with psql

```sql
-- Set user context
SET LOCAL app.current_user_id = 'test-user-id';

-- Try to query issues (should only return issues from user's workspaces)
SELECT * FROM issues;

-- Try to insert an issue in a workspace the user doesn't belong to (should fail)
INSERT INTO issues (workspace_id, title)
VALUES ('unauthorized-workspace', 'Test Issue');

-- Try to delete an issue as a non-admin (should fail)
DELETE FROM issues WHERE id = 'some-issue-id';
```

### Integration Testing

Create tests in `__tests__/integration/rls-policies.test.ts`:

```typescript
describe('RLS Policies', () => {
  it('should only return issues from user workspaces', async () => {
    // Create user and workspace
    const user = await createTestUser();
    const workspace = await createTestWorkspace();
    await addUserToWorkspace(user.id, workspace.id);

    // Set user context
    await withUserContext(user.id, async () => {
      const issues = await db.issues.list(workspace.id);
      expect(issues).toBeDefined();
    });
  });

  it('should prevent cross-workspace data access', async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const workspace1 = await createTestWorkspace();
    const workspace2 = await createTestWorkspace();

    await addUserToWorkspace(user1.id, workspace1.id);
    await addUserToWorkspace(user2.id, workspace2.id);

    // User1 should not see workspace2 issues
    await withUserContext(user1.id, async () => {
      const issues = await db.issues.list(workspace2.id);
      expect(issues.length).toBe(0);
    });
  });
});
```

## Security Benefits

### Defense in Depth
- **Application Layer**: Authorization checks via `getAuthContext()` and `userHasWorkspaceAccess()`
- **Database Layer**: RLS policies enforce workspace isolation at the database level

### Protection Against
- SQL injection bypassing application logic
- Compromised API keys accessing unauthorized data
- Direct database access attempts
- Misconfigured application-level checks

## Performance Considerations

### Potential Impact
- RLS policies add a small overhead to each query (typically <5ms)
- Helper functions are marked as `STABLE` for query optimization
- Workspace membership checks are indexed on `workspace_members(workspace_id, user_id)`

### Monitoring
Monitor query performance after deployment:
```sql
-- Check slow queries with RLS
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%issues%' OR query LIKE '%meetings%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Rollback Plan

If RLS causes issues, you can temporarily disable it:

```sql
-- Disable RLS (emergency only)
ALTER TABLE issues DISABLE ROW LEVEL SECURITY;
ALTER TABLE meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_issues DISABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_todos DISABLE ROW LEVEL SECURITY;
```

To fully remove RLS:
```sql
-- Drop all policies
DROP POLICY issues_select ON issues;
DROP POLICY issues_insert ON issues;
DROP POLICY issues_update ON issues;
DROP POLICY issues_delete ON issues;
-- ... repeat for other tables

-- Drop helper functions
DROP FUNCTION user_has_workspace_role;
DROP FUNCTION user_is_workspace_member;
DROP FUNCTION get_current_user_id;
```

## Next Steps

1. **Integrate with Application Layer**
   - Choose integration approach (Option 1, 2, or 3 above)
   - Update `lib/db/sql.ts` to set user context
   - Test with existing API routes

2. **Verify Functionality**
   - Run existing test suite to ensure nothing breaks
   - Add RLS-specific integration tests
   - Test with multiple user roles (owner, admin, member)

3. **Monitor Performance**
   - Check query execution times before/after RLS
   - Monitor for any slow queries
   - Adjust indexes if needed

4. **Documentation**
   - Update API documentation to mention RLS protection
   - Add security section to developer docs
   - Document the user context requirement

## References

- Migration file: `/migrations/1770336411000_add_ids_rls_policies.sql`
- PostgreSQL RLS docs: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Existing workspace functions: `user_has_workspace_access()` in `1736779200003_multi_workspace.sql`
