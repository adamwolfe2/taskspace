-- SESSION 6: Scorecard Module
-- Weekly KPI Tracking (EOS-style scorecard)

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get the Monday of the week for a given date
CREATE OR REPLACE FUNCTION get_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
  -- Return the Monday of the week containing input_date
  RETURN input_date - EXTRACT(ISODOW FROM input_date)::integer + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate metric status based on actual vs target and direction
CREATE OR REPLACE FUNCTION calculate_metric_status(
  actual NUMERIC,
  target NUMERIC,
  direction TEXT
)
RETURNS TEXT AS $$
DECLARE
  variance NUMERIC;
  percent_diff NUMERIC;
BEGIN
  -- Handle null cases
  IF actual IS NULL OR target IS NULL THEN
    RETURN 'gray';
  END IF;

  -- Calculate percent difference
  IF target = 0 THEN
    IF actual = 0 THEN
      RETURN 'green';
    ELSE
      RETURN 'red';
    END IF;
  END IF;

  percent_diff := ABS((actual - target) / target) * 100;

  CASE direction
    WHEN 'above' THEN
      -- Higher is better
      IF actual >= target THEN
        RETURN 'green';
      ELSIF actual >= target * 0.9 THEN
        RETURN 'yellow';
      ELSE
        RETURN 'red';
      END IF;
    WHEN 'below' THEN
      -- Lower is better
      IF actual <= target THEN
        RETURN 'green';
      ELSIF actual <= target * 1.1 THEN
        RETURN 'yellow';
      ELSE
        RETURN 'red';
      END IF;
    WHEN 'exact' THEN
      -- Exact match preferred
      IF percent_diff <= 5 THEN
        RETURN 'green';
      ELSIF percent_diff <= 10 THEN
        RETURN 'yellow';
      ELSE
        RETURN 'red';
      END IF;
    ELSE
      -- Default: treat as 'above'
      IF actual >= target THEN
        RETURN 'green';
      ELSIF actual >= target * 0.9 THEN
        RETURN 'yellow';
      ELSE
        RETURN 'red';
      END IF;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- SCORECARD METRICS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS scorecard_metrics (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  target_value NUMERIC,
  target_direction TEXT DEFAULT 'above' CHECK (target_direction IN ('above', 'below', 'exact')),
  unit TEXT DEFAULT '',
  frequency TEXT DEFAULT 'weekly' CHECK (frequency IN ('weekly', 'monthly')),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Index for workspace lookup
CREATE INDEX IF NOT EXISTS idx_scorecard_metrics_workspace
  ON scorecard_metrics(workspace_id)
  WHERE deleted_at IS NULL;

-- Index for owner lookup
CREATE INDEX IF NOT EXISTS idx_scorecard_metrics_owner
  ON scorecard_metrics(owner_id)
  WHERE deleted_at IS NULL;

-- ============================================
-- SCORECARD ENTRIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS scorecard_entries (
  id TEXT PRIMARY KEY,
  metric_id TEXT NOT NULL REFERENCES scorecard_metrics(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  week_start DATE NOT NULL,
  notes TEXT,
  status TEXT GENERATED ALWAYS AS (
    calculate_metric_status(
      value,
      (SELECT target_value FROM scorecard_metrics WHERE id = metric_id),
      (SELECT target_direction FROM scorecard_metrics WHERE id = metric_id)
    )
  ) STORED,
  entered_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Only one entry per metric per week
  CONSTRAINT unique_metric_week UNIQUE (metric_id, week_start)
);

-- Index for metric lookup
CREATE INDEX IF NOT EXISTS idx_scorecard_entries_metric
  ON scorecard_entries(metric_id);

-- Index for week lookup
CREATE INDEX IF NOT EXISTS idx_scorecard_entries_week
  ON scorecard_entries(week_start DESC);

-- ============================================
-- SCORECARD SUMMARY FUNCTION
-- ============================================

-- Get full scorecard summary for a workspace
CREATE OR REPLACE FUNCTION get_scorecard_summary(
  p_workspace_id TEXT,
  p_week_start DATE DEFAULT NULL
)
RETURNS TABLE (
  metric_id TEXT,
  metric_name TEXT,
  metric_description TEXT,
  owner_id TEXT,
  owner_name TEXT,
  target_value NUMERIC,
  target_direction TEXT,
  unit TEXT,
  display_order INTEGER,
  current_value NUMERIC,
  current_status TEXT,
  current_notes TEXT,
  week_start DATE
) AS $$
DECLARE
  v_week_start DATE;
BEGIN
  -- Default to current week if not specified
  v_week_start := COALESCE(p_week_start, get_week_start(CURRENT_DATE));

  RETURN QUERY
  SELECT
    sm.id AS metric_id,
    sm.name AS metric_name,
    sm.description AS metric_description,
    sm.owner_id,
    u.name AS owner_name,
    sm.target_value,
    sm.target_direction,
    sm.unit,
    sm.display_order,
    se.value AS current_value,
    COALESCE(se.status, 'gray') AS current_status,
    se.notes AS current_notes,
    v_week_start AS week_start
  FROM scorecard_metrics sm
  LEFT JOIN users u ON u.id = sm.owner_id
  LEFT JOIN scorecard_entries se ON se.metric_id = sm.id AND se.week_start = v_week_start
  WHERE sm.workspace_id = p_workspace_id
    AND sm.deleted_at IS NULL
    AND sm.is_active = TRUE
  ORDER BY sm.display_order ASC, sm.name ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RED METRICS FUNCTION (for alerts)
-- ============================================

CREATE OR REPLACE FUNCTION get_red_metrics(
  p_workspace_id TEXT,
  p_week_start DATE DEFAULT NULL
)
RETURNS TABLE (
  metric_id TEXT,
  metric_name TEXT,
  owner_id TEXT,
  owner_name TEXT,
  target_value NUMERIC,
  actual_value NUMERIC,
  status TEXT,
  week_start DATE
) AS $$
DECLARE
  v_week_start DATE;
BEGIN
  v_week_start := COALESCE(p_week_start, get_week_start(CURRENT_DATE));

  RETURN QUERY
  SELECT
    sm.id AS metric_id,
    sm.name AS metric_name,
    sm.owner_id,
    u.name AS owner_name,
    sm.target_value,
    se.value AS actual_value,
    se.status,
    v_week_start AS week_start
  FROM scorecard_metrics sm
  LEFT JOIN users u ON u.id = sm.owner_id
  LEFT JOIN scorecard_entries se ON se.metric_id = sm.id AND se.week_start = v_week_start
  WHERE sm.workspace_id = p_workspace_id
    AND sm.deleted_at IS NULL
    AND sm.is_active = TRUE
    AND se.status = 'red'
  ORDER BY sm.display_order ASC, sm.name ASC;
END;
$$ LANGUAGE plpgsql;
