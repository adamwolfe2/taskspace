-- ============================================
-- Workspace Feature Toggles Migration
-- ============================================
--
-- This migration is OPTIONAL but recommended for performance.
-- It adds:
-- 1. JSONB index on workspaces.settings->'features' for faster queries
-- 2. Helper SQL functions for feature checking
--
-- Note: The feature toggle system works WITHOUT this migration
-- since it uses the existing workspaces.settings JSONB column.
--

-- ============================================
-- PERFORMANCE: Add JSONB Index
-- ============================================

-- Index for fast feature lookup
CREATE INDEX IF NOT EXISTS idx_workspaces_settings_features
  ON workspaces USING GIN ((settings->'features'));

-- Comment on the index
COMMENT ON INDEX idx_workspaces_settings_features IS
  'Index for workspace feature toggles stored in settings.features JSONB field';

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if a specific feature is enabled
CREATE OR REPLACE FUNCTION is_workspace_feature_enabled(
  p_workspace_id VARCHAR,
  p_feature_key TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_settings JSONB;
  v_features JSONB;
  v_category TEXT;
  v_feature TEXT;
  v_enabled BOOLEAN;
BEGIN
  -- Parse feature key (e.g., 'core.tasks' -> category='core', feature='tasks')
  v_category := split_part(p_feature_key, '.', 1);
  v_feature := split_part(p_feature_key, '.', 2);

  -- Get workspace settings
  SELECT settings INTO v_settings
  FROM workspaces
  WHERE id = p_workspace_id;

  -- If no settings, return TRUE (default: all enabled)
  IF v_settings IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Get features object
  v_features := v_settings->'features';

  -- If no features object, return TRUE (default: all enabled)
  IF v_features IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Get feature value
  v_enabled := (v_features->v_category->>v_feature)::BOOLEAN;

  -- If feature not set, return TRUE (default: enabled)
  IF v_enabled IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN v_enabled;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_workspace_feature_enabled IS
  'Check if a workspace feature is enabled. Returns TRUE if feature not explicitly disabled.';

-- Function to get all enabled features for a workspace
CREATE OR REPLACE FUNCTION get_enabled_workspace_features(
  p_workspace_id VARCHAR
) RETURNS TEXT[] AS $$
DECLARE
  v_settings JSONB;
  v_features JSONB;
  v_enabled_features TEXT[] := ARRAY[]::TEXT[];
  v_category TEXT;
  v_feature TEXT;
BEGIN
  -- Get workspace settings
  SELECT settings INTO v_settings
  FROM workspaces
  WHERE id = p_workspace_id;

  -- If no settings, return empty array (will default to all enabled in app)
  IF v_settings IS NULL OR v_settings->'features' IS NULL THEN
    RETURN v_enabled_features;
  END IF;

  v_features := v_settings->'features';

  -- Check each feature category
  FOR v_category IN SELECT jsonb_object_keys(v_features) LOOP
    FOR v_feature IN SELECT jsonb_object_keys(v_features->v_category) LOOP
      IF (v_features->v_category->>v_feature)::BOOLEAN = TRUE THEN
        v_enabled_features := array_append(v_enabled_features, v_category || '.' || v_feature);
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_enabled_features;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_enabled_workspace_features IS
  'Get array of all enabled features for a workspace in "category.feature" format';

-- ============================================
-- OPTIONAL: Initialize features for existing workspaces
-- ============================================

-- This section is commented out by default.
-- Uncomment if you want to explicitly set features to all-enabled for existing workspaces.
-- This is NOT required - NULL features default to all enabled in the application code.

/*
UPDATE workspaces
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{features}',
  '{
    "core": {
      "tasks": true,
      "rocks": true,
      "eodReports": true,
      "scorecard": true,
      "meetings": true,
      "ids": true,
      "orgChart": true
    },
    "productivity": {
      "focusBlocks": true,
      "dailyEnergy": true,
      "streakTracking": true,
      "weeklyReviews": true,
      "achievements": true
    },
    "integrations": {
      "asana": true,
      "googleCalendar": true,
      "slack": true,
      "webhooks": true
    },
    "advanced": {
      "aiCommandCenter": true,
      "analytics": true,
      "managerDashboard": true,
      "apiAccess": true
    },
    "admin": {
      "teamManagement": true,
      "databaseManagement": true,
      "branding": true
    }
  }'::jsonb
)
WHERE settings->'features' IS NULL;
*/

-- ============================================
-- ROLLBACK SCRIPT (for reference)
-- ============================================

-- To rollback this migration:
-- DROP INDEX IF EXISTS idx_workspaces_settings_features;
-- DROP FUNCTION IF EXISTS is_workspace_feature_enabled(VARCHAR, TEXT);
-- DROP FUNCTION IF EXISTS get_enabled_workspace_features(VARCHAR);
