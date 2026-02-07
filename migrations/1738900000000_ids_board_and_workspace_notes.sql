-- IDS Board and Workspace Notes
-- Adds IDS (Identify, Discuss, Solve) kanban board items and
-- per-workspace shared notes document.

-- ============================================
-- IDS BOARD ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ids_board_items (
  id TEXT PRIMARY KEY,
  workspace_id VARCHAR(255) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  column_name TEXT NOT NULL DEFAULT 'identify'
    CHECK (column_name IN ('identify', 'discuss', 'solve')),
  order_index INTEGER NOT NULL DEFAULT 0,
  item_type TEXT NOT NULL DEFAULT 'custom'
    CHECK (item_type IN ('issue', 'rock', 'custom')),
  linked_id TEXT,
  created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  assigned_to VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ids_board_items_workspace
  ON ids_board_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ids_board_items_workspace_column
  ON ids_board_items(workspace_id, column_name, order_index);

-- ============================================
-- WORKSPACE NOTES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS workspace_notes (
  id TEXT PRIMARY KEY,
  workspace_id VARCHAR(255) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  last_edited_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint on workspace_id (one note per workspace, required for ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_notes_workspace_id
  ON workspace_notes(workspace_id);
