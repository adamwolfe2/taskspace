-- Client Portal Migration
-- Adds per-client portal support: unique token, enable flag, member filter
-- Also creates eod_comments table for client/team collaboration on EOD reports

ALTER TABLE clients
  ADD COLUMN portal_token         TEXT UNIQUE,
  ADD COLUMN portal_enabled       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN portal_member_filter TEXT[] DEFAULT NULL;

CREATE INDEX idx_clients_portal_token ON clients(portal_token)
  WHERE portal_token IS NOT NULL;

CREATE TABLE eod_comments (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  eod_report_id   TEXT NOT NULL REFERENCES eod_reports(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       TEXT REFERENCES clients(id) ON DELETE SET NULL,
  author_name     TEXT NOT NULL,
  is_client       BOOLEAN NOT NULL DEFAULT true,
  content         TEXT NOT NULL CHECK (char_length(content) <= 2000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_eod_comments_report ON eod_comments(eod_report_id);
