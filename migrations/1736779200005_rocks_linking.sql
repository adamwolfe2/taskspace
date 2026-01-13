-- SESSION 7: Rocks ↔ Tasks Linking System
-- Adds confidence tracking, check-ins, and auto-progress calculation

-- ============================================
-- ENHANCE ROCKS TABLE
-- ============================================

-- Add confidence tracking columns
ALTER TABLE rocks
  ADD COLUMN IF NOT EXISTS confidence VARCHAR(20) DEFAULT 'on_track'
    CHECK (confidence IN ('on_track', 'at_risk', 'off_track'));

ALTER TABLE rocks
  ADD COLUMN IF NOT EXISTS confidence_notes TEXT;

ALTER TABLE rocks
  ADD COLUMN IF NOT EXISTS confidence_updated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE rocks
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Add progress_percentage if it doesn't exist (using progress)
-- The existing 'progress' column (INTEGER) will be used for percentage

-- ============================================
-- ROCK CHECK-INS TABLE
-- ============================================
-- Weekly updates history for L10 meeting reviews

CREATE TABLE IF NOT EXISTS rock_checkins (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  rock_id VARCHAR(255) NOT NULL REFERENCES rocks(id) ON DELETE CASCADE,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  confidence VARCHAR(20) NOT NULL DEFAULT 'on_track'
    CHECK (confidence IN ('on_track', 'at_risk', 'off_track')),
  notes TEXT,
  progress_at_checkin INTEGER DEFAULT 0,
  week_start DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One check-in per rock per week
  UNIQUE(rock_id, week_start)
);

-- Indexes for rock_checkins
CREATE INDEX IF NOT EXISTS idx_rock_checkins_rock
  ON rock_checkins(rock_id);

CREATE INDEX IF NOT EXISTS idx_rock_checkins_week
  ON rock_checkins(week_start DESC);

CREATE INDEX IF NOT EXISTS idx_rock_checkins_rock_week
  ON rock_checkins(rock_id, week_start DESC);

-- ============================================
-- ADD INDEX FOR TASKS LINKED TO ROCKS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tasks_rock_id
  ON assigned_tasks(rock_id)
  WHERE rock_id IS NOT NULL;

-- ============================================
-- PROGRESS CALCULATION FUNCTION
-- ============================================

-- Calculate rock progress based on linked task completion
CREATE OR REPLACE FUNCTION calculate_rock_progress(p_rock_id VARCHAR)
RETURNS INTEGER AS $$
DECLARE
  v_total_tasks INTEGER;
  v_completed_tasks INTEGER;
  v_progress INTEGER;
BEGIN
  -- Count total and completed tasks linked to this rock
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total_tasks, v_completed_tasks
  FROM assigned_tasks
  WHERE rock_id = p_rock_id;

  -- If no tasks, return current progress or 0
  IF v_total_tasks = 0 THEN
    RETURN COALESCE((SELECT progress FROM rocks WHERE id = p_rock_id), 0);
  END IF;

  -- Calculate percentage
  v_progress := ROUND((v_completed_tasks::NUMERIC / v_total_tasks::NUMERIC) * 100);

  RETURN v_progress;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- AUTO-UPDATE PROGRESS TRIGGER
-- ============================================

-- Function to update rock progress when tasks change
CREATE OR REPLACE FUNCTION update_rock_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_rock_id VARCHAR(255);
  v_new_progress INTEGER;
BEGIN
  -- Determine which rock_id to update
  IF TG_OP = 'DELETE' THEN
    v_rock_id := OLD.rock_id;
  ELSE
    v_rock_id := COALESCE(NEW.rock_id, OLD.rock_id);
  END IF;

  -- Skip if no rock linked
  IF v_rock_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Calculate new progress
  v_new_progress := calculate_rock_progress(v_rock_id);

  -- Update the rock's progress
  UPDATE rocks
  SET
    progress = v_new_progress,
    updated_at = NOW(),
    -- Auto-complete rock if progress hits 100
    completed_at = CASE
      WHEN v_new_progress >= 100 AND completed_at IS NULL THEN NOW()
      WHEN v_new_progress < 100 THEN NULL
      ELSE completed_at
    END,
    -- Auto-update status if not manually set
    status = CASE
      WHEN v_new_progress >= 100 THEN 'completed'
      ELSE status
    END
  WHERE id = v_rock_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on assigned_tasks
DROP TRIGGER IF EXISTS trigger_update_rock_progress ON assigned_tasks;
CREATE TRIGGER trigger_update_rock_progress
  AFTER INSERT OR UPDATE OF status, rock_id OR DELETE
  ON assigned_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_rock_progress();

-- ============================================
-- ROCK SUMMARY FUNCTION
-- ============================================

-- Get rocks with stats for a workspace
CREATE OR REPLACE FUNCTION get_rock_summary(
  p_workspace_id VARCHAR,
  p_status VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  id VARCHAR(255),
  title VARCHAR(500),
  description TEXT,
  user_id VARCHAR(255),
  user_name VARCHAR(255),
  progress INTEGER,
  due_date DATE,
  status VARCHAR(50),
  confidence VARCHAR(20),
  confidence_notes TEXT,
  quarter VARCHAR(50),
  task_count BIGINT,
  completed_task_count BIGINT,
  days_remaining INTEGER,
  is_overdue BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.title,
    r.description,
    r.user_id,
    u.name as user_name,
    r.progress,
    r.due_date,
    r.status,
    COALESCE(r.confidence, 'on_track')::VARCHAR(20) as confidence,
    r.confidence_notes,
    r.quarter,
    COUNT(t.id) as task_count,
    COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_task_count,
    CASE
      WHEN r.due_date IS NOT NULL THEN (r.due_date - CURRENT_DATE)::INTEGER
      ELSE NULL
    END as days_remaining,
    CASE
      WHEN r.due_date IS NOT NULL AND r.due_date < CURRENT_DATE AND r.status != 'completed' THEN TRUE
      ELSE FALSE
    END as is_overdue,
    r.created_at
  FROM rocks r
  LEFT JOIN users u ON u.id = r.user_id
  LEFT JOIN assigned_tasks t ON t.rock_id = r.id
  WHERE r.workspace_id = p_workspace_id
    AND (p_status IS NULL OR r.status = p_status)
  GROUP BY r.id, r.title, r.description, r.user_id, u.name, r.progress,
           r.due_date, r.status, r.confidence, r.confidence_notes, r.quarter, r.created_at
  ORDER BY
    CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END,
    r.due_date ASC NULLS LAST,
    r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROCKS AT RISK FUNCTION
-- ============================================

-- Get rocks that are at risk or off track
CREATE OR REPLACE FUNCTION get_rocks_at_risk(p_workspace_id VARCHAR)
RETURNS TABLE (
  id VARCHAR(255),
  title VARCHAR(500),
  user_id VARCHAR(255),
  user_name VARCHAR(255),
  progress INTEGER,
  due_date DATE,
  confidence VARCHAR(20),
  confidence_notes TEXT,
  days_remaining INTEGER,
  risk_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.title,
    r.user_id,
    u.name as user_name,
    r.progress,
    r.due_date,
    COALESCE(r.confidence, 'on_track')::VARCHAR(20) as confidence,
    r.confidence_notes,
    CASE
      WHEN r.due_date IS NOT NULL THEN (r.due_date - CURRENT_DATE)::INTEGER
      ELSE NULL
    END as days_remaining,
    CASE
      -- Manual at_risk or off_track
      WHEN r.confidence IN ('at_risk', 'off_track') THEN 'Manual confidence update: ' || r.confidence
      -- Overdue
      WHEN r.due_date < CURRENT_DATE AND r.status != 'completed' THEN 'Overdue'
      -- Low progress with little time left
      WHEN r.due_date IS NOT NULL AND r.progress < 50 AND (r.due_date - CURRENT_DATE) < 14 THEN 'Low progress with less than 2 weeks remaining'
      WHEN r.due_date IS NOT NULL AND r.progress < 30 AND (r.due_date - CURRENT_DATE) < 30 THEN 'Very low progress with less than 30 days remaining'
      ELSE 'Unknown risk'
    END as risk_reason
  FROM rocks r
  LEFT JOIN users u ON u.id = r.user_id
  WHERE r.workspace_id = p_workspace_id
    AND r.status != 'completed'
    AND (
      -- Manually set as at risk or off track
      r.confidence IN ('at_risk', 'off_track')
      -- Overdue
      OR (r.due_date < CURRENT_DATE)
      -- Low progress with little time
      OR (r.due_date IS NOT NULL AND r.progress < 50 AND (r.due_date - CURRENT_DATE) < 14)
      OR (r.due_date IS NOT NULL AND r.progress < 30 AND (r.due_date - CURRENT_DATE) < 30)
    )
  ORDER BY
    CASE r.confidence
      WHEN 'off_track' THEN 0
      WHEN 'at_risk' THEN 1
      ELSE 2
    END,
    r.due_date ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- AUTO-CONFIDENCE UPDATE FUNCTION
-- ============================================

-- Function to auto-update confidence based on progress and due date
CREATE OR REPLACE FUNCTION auto_update_rock_confidence()
RETURNS TRIGGER AS $$
DECLARE
  v_days_remaining INTEGER;
BEGIN
  -- Skip if confidence was recently manually updated (within 24 hours)
  IF NEW.confidence_updated_at IS NOT NULL
     AND NEW.confidence_updated_at > NOW() - INTERVAL '24 hours'
     AND OLD.confidence_updated_at = NEW.confidence_updated_at THEN
    RETURN NEW;
  END IF;

  -- Calculate days remaining
  IF NEW.due_date IS NOT NULL THEN
    v_days_remaining := NEW.due_date - CURRENT_DATE;
  ELSE
    v_days_remaining := NULL;
  END IF;

  -- Auto-set confidence based on rules (only if not manually set recently)
  IF v_days_remaining IS NOT NULL THEN
    IF NEW.progress < 30 AND v_days_remaining < 30 THEN
      NEW.confidence := 'off_track';
    ELSIF NEW.progress < 50 AND v_days_remaining < 14 THEN
      NEW.confidence := 'at_risk';
    ELSIF NEW.progress >= 100 THEN
      NEW.confidence := 'on_track';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-confidence
DROP TRIGGER IF EXISTS trigger_auto_confidence ON rocks;
CREATE TRIGGER trigger_auto_confidence
  BEFORE UPDATE OF progress ON rocks
  FOR EACH ROW
  WHEN (OLD.progress IS DISTINCT FROM NEW.progress)
  EXECUTE FUNCTION auto_update_rock_confidence();

-- ============================================
-- RECALCULATE ALL ROCK PROGRESS
-- ============================================

-- One-time function to recalculate all existing rocks
CREATE OR REPLACE FUNCTION recalculate_all_rock_progress()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM rocks WHERE status != 'completed'
  LOOP
    UPDATE rocks
    SET progress = calculate_rock_progress(r.id)
    WHERE id = r.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the recalculation (can be commented out if not needed)
-- SELECT recalculate_all_rock_progress();
