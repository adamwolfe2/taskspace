-- ============================================
-- Quarterly Reports Migration
-- ============================================
-- Stores generated quarterly performance reports per workspace.
-- Each report aggregates EOD, rocks, and task data for a full quarter.

CREATE TABLE IF NOT EXISTS quarterly_reports (
  id            VARCHAR(255) PRIMARY KEY,
  org_id        VARCHAR(255) NOT NULL,
  workspace_id  VARCHAR(255) NOT NULL,
  quarter       VARCHAR(20)  NOT NULL,  -- e.g. "Q1-2026"
  period_start  DATE         NOT NULL,
  period_end    DATE         NOT NULL,
  title         VARCHAR(500) NOT NULL DEFAULT '',
  status        VARCHAR(20)  NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('generating', 'draft', 'published')),
  public_token  VARCHAR(255) UNIQUE,
  data          JSONB        NOT NULL DEFAULT '{}',
  created_by    VARCHAR(255),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quarterly_reports_workspace
  ON quarterly_reports(workspace_id, org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quarterly_reports_token
  ON quarterly_reports(public_token)
  WHERE public_token IS NOT NULL;
