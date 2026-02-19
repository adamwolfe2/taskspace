-- Migration: Pending Subscriptions
-- Stores Stripe Payment Link checkout sessions that haven't been linked to an org yet.
-- When a user pays via a marketing Payment Link (no organizationId metadata),
-- the webhook stores the session here. After the user signs up / logs in,
-- they can claim the subscription which links it to their org.
-- Date: 2026-02-19

CREATE TABLE IF NOT EXISTS pending_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  customer_email TEXT,
  plan TEXT NOT NULL DEFAULT 'team',
  billing_cycle TEXT DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'pending',      -- pending | claimed | expired
  claimed_by_org_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_pending_subs_session ON pending_subscriptions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_pending_subs_customer ON pending_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_pending_subs_email ON pending_subscriptions(customer_email);
CREATE INDEX IF NOT EXISTS idx_pending_subs_status ON pending_subscriptions(status);

COMMENT ON TABLE pending_subscriptions IS 'Stores Payment Link checkout sessions awaiting org linkage. Expires after 7 days if unclaimed.';
