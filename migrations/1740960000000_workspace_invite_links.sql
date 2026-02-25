-- Workspace invite links: permanent, reusable, regeneratable, one per workspace
CREATE TABLE workspace_invite_links (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,
  created_by      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce one active link per workspace
CREATE UNIQUE INDEX idx_workspace_invite_links_workspace ON workspace_invite_links(workspace_id);

-- Fast token lookups
CREATE INDEX idx_workspace_invite_links_token ON workspace_invite_links(token);
