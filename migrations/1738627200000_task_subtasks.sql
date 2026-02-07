-- Task Subtasks Migration
--
-- Creates a dedicated table for task subtasks instead of using JSONB.
-- This provides better scalability, indexing, and query performance.
--
-- Features:
-- - Separate row per subtask for efficient queries
-- - Automatic cleanup on task deletion (CASCADE)
-- - Efficient ordering with order_index
-- - Tracks completion timestamps

CREATE TABLE IF NOT EXISTS task_subtasks (
  id VARCHAR(255) PRIMARY KEY,
  task_id VARCHAR(255) NOT NULL REFERENCES assigned_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by task
CREATE INDEX IF NOT EXISTS idx_task_subtasks_task_id ON task_subtasks(task_id);

-- Index for ordering subtasks
CREATE INDEX IF NOT EXISTS idx_task_subtasks_order ON task_subtasks(task_id, order_index);

-- Composite index for filtering completed/pending subtasks
CREATE INDEX IF NOT EXISTS idx_task_subtasks_completed ON task_subtasks(task_id, completed);

-- @down (rollback - DO NOT RUN IN PRODUCTION)
-- DROP INDEX IF EXISTS idx_task_subtasks_completed;
-- DROP INDEX IF EXISTS idx_task_subtasks_order;
-- DROP INDEX IF EXISTS idx_task_subtasks_task_id;
-- DROP TABLE IF EXISTS task_subtasks;
