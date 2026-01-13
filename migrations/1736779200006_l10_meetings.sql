-- SESSION 8: L10 Meeting Module (THE FLAGSHIP FEATURE)
-- Weekly EOS Level 10 Meetings with 6-section agenda

-- ============================================
-- MEETINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS meetings (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id VARCHAR(255) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'L10 Meeting',
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  attendees JSONB DEFAULT '[]',
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for meetings
CREATE INDEX IF NOT EXISTS idx_meetings_workspace ON meetings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON meetings(scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_workspace_scheduled ON meetings(workspace_id, scheduled_at DESC);

-- ============================================
-- MEETING SECTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS meeting_sections (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  meeting_id VARCHAR(255) NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  section_type VARCHAR(50) NOT NULL CHECK (section_type IN ('segue', 'scorecard', 'rocks', 'headlines', 'ids', 'conclude')),
  order_index INTEGER NOT NULL,
  duration_target INTEGER DEFAULT 5, -- target minutes for section
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  data JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(meeting_id, section_type)
);

-- Indexes for meeting sections
CREATE INDEX IF NOT EXISTS idx_meeting_sections_meeting ON meeting_sections(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_sections_order ON meeting_sections(meeting_id, order_index);

-- ============================================
-- ISSUES TABLE (IDS - Identify, Discuss, Solve)
-- ============================================

CREATE TABLE IF NOT EXISTS issues (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id VARCHAR(255) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 0, -- 0 = no priority, higher = more important
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'discussing', 'resolved', 'dropped')),
  source_type VARCHAR(50), -- 'scorecard', 'rock', 'task', 'headline', 'manual'
  source_id VARCHAR(255),
  owner_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for issues
CREATE INDEX IF NOT EXISTS idx_issues_workspace ON issues(workspace_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_workspace_status ON issues(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_issues_owner ON issues(owner_id);

-- ============================================
-- MEETING ISSUES (Many-to-Many)
-- ============================================

CREATE TABLE IF NOT EXISTS meeting_issues (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  meeting_id VARCHAR(255) NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  issue_id VARCHAR(255) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  discussed BOOLEAN DEFAULT FALSE,
  resolved_in_meeting BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(meeting_id, issue_id)
);

-- Indexes for meeting_issues
CREATE INDEX IF NOT EXISTS idx_meeting_issues_meeting ON meeting_issues(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_issues_issue ON meeting_issues(issue_id);

-- ============================================
-- MEETING TODOS (Action Items)
-- ============================================

CREATE TABLE IF NOT EXISTS meeting_todos (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  meeting_id VARCHAR(255) NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  issue_id VARCHAR(255) REFERENCES issues(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  assignee_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  task_id VARCHAR(255) REFERENCES assigned_tasks(id) ON DELETE SET NULL, -- converted to real task
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for meeting_todos
CREATE INDEX IF NOT EXISTS idx_meeting_todos_meeting ON meeting_todos(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_todos_assignee ON meeting_todos(assignee_id);

-- ============================================
-- MEETING PREP FUNCTION
-- ============================================

-- Get all prep data for starting an L10 meeting
CREATE OR REPLACE FUNCTION get_meeting_prep(p_workspace_id VARCHAR)
RETURNS JSON AS $$
DECLARE
  v_scorecard_alerts JSON;
  v_rocks_at_risk JSON;
  v_overdue_tasks JSON;
  v_open_issues JSON;
BEGIN
  -- Get scorecard alerts (red/yellow metrics)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_scorecard_alerts
  FROM (
    SELECT
      sm.id as metric_id,
      sm.name as metric_name,
      sm.target_value,
      sm.unit,
      se.value as current_value,
      COALESCE(se.status, 'gray') as status,
      u.name as owner_name
    FROM scorecard_metrics sm
    LEFT JOIN users u ON u.id = sm.owner_id
    LEFT JOIN scorecard_entries se ON se.metric_id = sm.id
      AND se.week_start = (
        SELECT MAX(week_start) FROM scorecard_entries WHERE metric_id = sm.id
      )
    WHERE sm.workspace_id = p_workspace_id
      AND sm.deleted_at IS NULL
      AND sm.is_active = TRUE
      AND (se.status = 'red' OR se.status = 'yellow')
    ORDER BY
      CASE se.status WHEN 'red' THEN 0 WHEN 'yellow' THEN 1 ELSE 2 END,
      sm.name
  ) t;

  -- Get rocks at risk
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_rocks_at_risk
  FROM (
    SELECT
      r.id,
      r.title,
      r.progress,
      r.due_date,
      COALESCE(r.confidence, 'on_track') as confidence,
      r.confidence_notes,
      u.name as owner_name,
      CASE
        WHEN r.due_date IS NOT NULL THEN (r.due_date - CURRENT_DATE)::INTEGER
        ELSE NULL
      END as days_remaining,
      CASE
        WHEN r.confidence IN ('at_risk', 'off_track') THEN 'Manual: ' || r.confidence
        WHEN r.due_date < CURRENT_DATE THEN 'Overdue'
        WHEN r.progress < 50 AND (r.due_date - CURRENT_DATE) < 14 THEN 'Low progress, <2 weeks'
        WHEN r.progress < 30 AND (r.due_date - CURRENT_DATE) < 30 THEN 'Very low progress, <30 days'
        ELSE 'At risk'
      END as risk_reason
    FROM rocks r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.workspace_id = p_workspace_id
      AND r.status != 'completed'
      AND (
        r.confidence IN ('at_risk', 'off_track')
        OR r.due_date < CURRENT_DATE
        OR (r.due_date IS NOT NULL AND r.progress < 50 AND (r.due_date - CURRENT_DATE) < 14)
        OR (r.due_date IS NOT NULL AND r.progress < 30 AND (r.due_date - CURRENT_DATE) < 30)
      )
    ORDER BY
      CASE r.confidence WHEN 'off_track' THEN 0 WHEN 'at_risk' THEN 1 ELSE 2 END,
      r.due_date NULLS LAST
  ) t;

  -- Get overdue tasks
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_overdue_tasks
  FROM (
    SELECT
      at.id,
      at.title,
      at.due_date,
      at.priority,
      at.assignee_id,
      u.name as assignee_name,
      (CURRENT_DATE - at.due_date)::INTEGER as days_overdue
    FROM assigned_tasks at
    LEFT JOIN users u ON u.id = at.assignee_id
    WHERE at.workspace_id = p_workspace_id
      AND at.due_date < CURRENT_DATE
      AND at.status NOT IN ('completed', 'done')
    ORDER BY at.due_date ASC
    LIMIT 20
  ) t;

  -- Get open issues
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_open_issues
  FROM (
    SELECT
      i.id,
      i.title,
      i.description,
      i.priority,
      i.source_type,
      i.owner_id,
      u.name as owner_name,
      i.created_at
    FROM issues i
    LEFT JOIN users u ON u.id = i.owner_id
    WHERE i.workspace_id = p_workspace_id
      AND i.status = 'open'
    ORDER BY i.priority DESC, i.created_at ASC
  ) t;

  RETURN json_build_object(
    'scorecardAlerts', v_scorecard_alerts,
    'rocksAtRisk', v_rocks_at_risk,
    'overdueTasks', v_overdue_tasks,
    'openIssues', v_open_issues
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MEETING STATS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_meeting_stats(
  p_workspace_id VARCHAR,
  p_weeks INTEGER DEFAULT 13
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'totalMeetings', COUNT(*)::INTEGER,
    'completedMeetings', COUNT(*) FILTER (WHERE status = 'completed')::INTEGER,
    'averageRating', ROUND(AVG(rating)::NUMERIC, 1),
    'averageDuration', ROUND(AVG(duration_minutes)::NUMERIC, 0)::INTEGER,
    'totalIssuesResolved', (
      SELECT COUNT(*)
      FROM meeting_issues mi
      JOIN meetings m ON m.id = mi.meeting_id
      WHERE m.workspace_id = p_workspace_id
        AND mi.resolved_in_meeting = TRUE
        AND m.scheduled_at >= NOW() - (p_weeks || ' weeks')::INTERVAL
    )::INTEGER,
    'totalTodosCreated', (
      SELECT COUNT(*)
      FROM meeting_todos mt
      JOIN meetings m ON m.id = mt.meeting_id
      WHERE m.workspace_id = p_workspace_id
        AND m.scheduled_at >= NOW() - (p_weeks || ' weeks')::INTERVAL
    )::INTEGER
  )
  INTO v_result
  FROM meetings
  WHERE workspace_id = p_workspace_id
    AND scheduled_at >= NOW() - (p_weeks || ' weeks')::INTERVAL;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE DEFAULT SECTIONS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION create_meeting_sections(p_meeting_id VARCHAR)
RETURNS void AS $$
BEGIN
  INSERT INTO meeting_sections (meeting_id, section_type, order_index, duration_target)
  VALUES
    (p_meeting_id, 'segue', 1, 5),
    (p_meeting_id, 'scorecard', 2, 5),
    (p_meeting_id, 'rocks', 3, 5),
    (p_meeting_id, 'headlines', 4, 5),
    (p_meeting_id, 'ids', 5, 60),
    (p_meeting_id, 'conclude', 6, 10)
  ON CONFLICT (meeting_id, section_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: AUTO-CREATE SECTIONS ON MEETING INSERT
-- ============================================

CREATE OR REPLACE FUNCTION auto_create_meeting_sections()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_meeting_sections(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_meeting_sections ON meetings;
CREATE TRIGGER trigger_create_meeting_sections
  AFTER INSERT ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_meeting_sections();

-- ============================================
-- UPDATE TIMESTAMPS TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_meeting_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_meeting_updated ON meetings;
CREATE TRIGGER trigger_meeting_updated
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_timestamp();

DROP TRIGGER IF EXISTS trigger_meeting_section_updated ON meeting_sections;
CREATE TRIGGER trigger_meeting_section_updated
  BEFORE UPDATE ON meeting_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_timestamp();

DROP TRIGGER IF EXISTS trigger_issue_updated ON issues;
CREATE TRIGGER trigger_issue_updated
  BEFORE UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_timestamp();

DROP TRIGGER IF EXISTS trigger_meeting_todo_updated ON meeting_todos;
CREATE TRIGGER trigger_meeting_todo_updated
  BEFORE UPDATE ON meeting_todos
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_timestamp();
