-- Migration: Add Row-Level Security (RLS) Policies to IDS Workflow Tables
-- Date: 2025-02-05
-- Description: Implements database-level security for IDS feature tables to complement
--              application-level authorization checks.

-- ============================================
-- HELPER FUNCTION: GET CURRENT USER ID
-- ============================================
-- This function retrieves the user_id from PostgreSQL session variables.
-- The application layer must set this using: SET LOCAL app.current_user_id = '<user_id>'
-- before making queries. This is typically done in the database connection layer.

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS VARCHAR AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- HELPER FUNCTION: USER WORKSPACE MEMBERSHIP CHECK
-- ============================================
-- Checks if the current user is a member of a given workspace.
-- Used by RLS policies to enforce workspace isolation.

CREATE OR REPLACE FUNCTION user_is_workspace_member(p_workspace_id VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = get_current_user_id()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- HELPER FUNCTION: USER WORKSPACE ROLE CHECK
-- ============================================
-- Checks if the current user has a specific role (or higher) in a workspace.
-- Role hierarchy: owner > admin > member > viewer

CREATE OR REPLACE FUNCTION user_has_workspace_role(
  p_workspace_id VARCHAR,
  p_required_role VARCHAR DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role VARCHAR(50);
  v_role_priority INTEGER;
  v_required_priority INTEGER;
BEGIN
  -- Get user's role in the workspace
  SELECT wm.role INTO v_user_role
  FROM workspace_members wm
  WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = get_current_user_id();

  -- No membership found
  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Calculate role priorities
  v_role_priority := CASE v_user_role
    WHEN 'owner' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'member' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;

  v_required_priority := CASE p_required_role
    WHEN 'owner' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'member' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;

  RETURN v_role_priority >= v_required_priority;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_sections ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ISSUES TABLE POLICIES
-- ============================================

-- SELECT: Users can view issues in workspaces they're members of
CREATE POLICY issues_select ON issues
  FOR SELECT
  USING (user_is_workspace_member(workspace_id));

-- INSERT: Users can create issues in workspaces they're members of
CREATE POLICY issues_insert ON issues
  FOR INSERT
  WITH CHECK (user_is_workspace_member(workspace_id));

-- UPDATE: Users can update issues in workspaces they're members of
CREATE POLICY issues_update ON issues
  FOR UPDATE
  USING (user_is_workspace_member(workspace_id))
  WITH CHECK (user_is_workspace_member(workspace_id));

-- DELETE: Only workspace admins and owners can delete issues
CREATE POLICY issues_delete ON issues
  FOR DELETE
  USING (user_has_workspace_role(workspace_id, 'admin'));

-- ============================================
-- MEETINGS TABLE POLICIES
-- ============================================

-- SELECT: Users can view meetings in workspaces they're members of
CREATE POLICY meetings_select ON meetings
  FOR SELECT
  USING (user_is_workspace_member(workspace_id));

-- INSERT: Users can create meetings in workspaces they're members of
CREATE POLICY meetings_insert ON meetings
  FOR INSERT
  WITH CHECK (user_is_workspace_member(workspace_id));

-- UPDATE: Users can update meetings in workspaces they're members of
CREATE POLICY meetings_update ON meetings
  FOR UPDATE
  USING (user_is_workspace_member(workspace_id))
  WITH CHECK (user_is_workspace_member(workspace_id));

-- DELETE: Only workspace admins and owners can delete meetings
CREATE POLICY meetings_delete ON meetings
  FOR DELETE
  USING (user_has_workspace_role(workspace_id, 'admin'));

-- ============================================
-- MEETING_SECTIONS TABLE POLICIES
-- ============================================

-- SELECT: Users can view meeting sections if they can view the meeting
CREATE POLICY meeting_sections_select ON meeting_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_sections.meeting_id
        AND user_is_workspace_member(m.workspace_id)
    )
  );

-- INSERT: Users can create meeting sections if they can access the meeting
CREATE POLICY meeting_sections_insert ON meeting_sections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_sections.meeting_id
        AND user_is_workspace_member(m.workspace_id)
    )
  );

-- UPDATE: Users can update meeting sections if they can access the meeting
CREATE POLICY meeting_sections_update ON meeting_sections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_sections.meeting_id
        AND user_is_workspace_member(m.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_sections.meeting_id
        AND user_is_workspace_member(m.workspace_id)
    )
  );

-- DELETE: Only admins can delete meeting sections
CREATE POLICY meeting_sections_delete ON meeting_sections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_sections.meeting_id
        AND user_has_workspace_role(m.workspace_id, 'admin')
    )
  );

-- ============================================
-- MEETING_ISSUES TABLE POLICIES
-- ============================================

-- SELECT: Users can view meeting-issue links if they can view the meeting
CREATE POLICY meeting_issues_select ON meeting_issues
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_issues.meeting_id
        AND user_is_workspace_member(m.workspace_id)
    )
  );

-- INSERT: Users can link issues to meetings if they can access the meeting
CREATE POLICY meeting_issues_insert ON meeting_issues
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_issues.meeting_id
        AND user_is_workspace_member(m.workspace_id)
    )
  );

-- UPDATE: Users can update meeting-issue links if they can access the meeting
CREATE POLICY meeting_issues_update ON meeting_issues
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_issues.meeting_id
        AND user_is_workspace_member(m.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_issues.meeting_id
        AND user_is_workspace_member(m.workspace_id)
    )
  );

-- DELETE: Users can unlink issues from meetings if they can access the meeting
CREATE POLICY meeting_issues_delete ON meeting_issues
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_issues.meeting_id
        AND user_is_workspace_member(m.workspace_id)
    )
  );

-- ============================================
-- MEETING_TODOS TABLE POLICIES
-- ============================================

-- SELECT: Users can view meeting todos if they can view the meeting
CREATE POLICY meeting_todos_select ON meeting_todos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_todos.meeting_id
        AND user_is_workspace_member(m.workspace_id)
    )
  );

-- INSERT: Users can create meeting todos if they can access the meeting
CREATE POLICY meeting_todos_insert ON meeting_todos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_todos.meeting_id
        AND user_is_workspace_member(m.workspace_id)
    )
  );

-- UPDATE: Users can update meeting todos if they can access the meeting
CREATE POLICY meeting_todos_update ON meeting_todos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_todos.meeting_id
        AND user_is_workspace_member(m.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_todos.meeting_id
        AND user_is_workspace_member(m.workspace_id)
    )
  );

-- DELETE: Users can delete meeting todos if they can access the meeting
CREATE POLICY meeting_todos_delete ON meeting_todos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_todos.meeting_id
        AND user_is_workspace_member(m.workspace_id)
    )
  );

-- ============================================
-- IMPORTANT: APPLICATION LAYER INTEGRATION
-- ============================================
--
-- For these RLS policies to work, the application layer MUST set the current
-- user ID at the start of each database transaction/query:
--
--   SET LOCAL app.current_user_id = '<user_id>';
--
-- This should be added to the database connection/query layer (lib/db/sql.ts)
-- to ensure it's set for all queries. Example integration:
--
--   export async function withUserContext<T>(
--     userId: string,
--     callback: () => Promise<T>
--   ): Promise<T> {
--     const client = await pool.connect();
--     try {
--       await client.query('BEGIN');
--       await client.query(`SET LOCAL app.current_user_id = '${userId}'`);
--       const result = await callback();
--       await client.query('COMMIT');
--       return result;
--     } catch (error) {
--       await client.query('ROLLBACK');
--       throw error;
--     } finally {
--       client.release();
--     }
--   }
--
-- ============================================
-- TESTING NOTES
-- ============================================
--
-- To test these policies:
--
-- 1. Set a test user context:
--    SET LOCAL app.current_user_id = 'test-user-id';
--
-- 2. Try querying across workspaces - should only return data for
--    workspaces the user is a member of
--
-- 3. Try updating/deleting records in workspaces the user isn't
--    a member of - should fail
--
-- 4. Test with different user roles (owner, admin, member, viewer)
--    to verify role-based policies work correctly
--
-- ============================================
