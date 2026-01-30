-- Migration: Workspace-Level Branding
-- Moves branding from organization-level to workspace-level
-- Each workspace can have its own logo, colors, and visual identity

-- ============================================
-- ADD BRANDING COLUMNS TO WORKSPACES
-- ============================================

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7),  -- Hex color like #FF0000
  ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS favicon_url TEXT;

-- ============================================
-- DATA MIGRATION: COPY ORG BRANDING TO DEFAULT WORKSPACES
-- ============================================
-- For existing organizations with branding, copy it to their default workspace

UPDATE workspaces w
SET
  logo_url = o.logo_url,
  primary_color = o.primary_color,
  secondary_color = o.secondary_color,
  accent_color = o.accent_color,
  favicon_url = o.favicon_url
FROM organizations o
WHERE w.organization_id = o.id
  AND w.is_default = TRUE
  AND o.logo_url IS NOT NULL;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_workspaces_branding
  ON workspaces(organization_id)
  WHERE logo_url IS NOT NULL OR primary_color IS NOT NULL;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN workspaces.logo_url IS 'Workspace logo URL (uploaded to storage)';
COMMENT ON COLUMN workspaces.primary_color IS 'Primary brand color in hex format (#RRGGBB)';
COMMENT ON COLUMN workspaces.secondary_color IS 'Secondary brand color in hex format';
COMMENT ON COLUMN workspaces.accent_color IS 'Accent brand color in hex format';
COMMENT ON COLUMN workspaces.favicon_url IS 'Workspace favicon URL';
