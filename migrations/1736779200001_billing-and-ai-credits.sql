-- Migration: Billing and AI Credits
-- Adds Stripe billing columns and AI usage tracking
-- Date: 2025-01-13

-- ============================================
-- ADD STRIPE COLUMNS TO ORGANIZATIONS
-- ============================================

-- Add Stripe-related columns to organizations if they don't exist
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription ON organizations(stripe_subscription_id);

-- ============================================
-- SUBSCRIPTIONS TABLE (Enhanced)
-- ============================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255),
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  seat_count INTEGER NOT NULL DEFAULT 1,
  ai_credits_used INTEGER NOT NULL DEFAULT 0,
  ai_credits_limit INTEGER NOT NULL DEFAULT 100,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- AI USAGE TRACKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ai_usage (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  credits_used INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_org ON ai_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_org_month ON ai_usage(organization_id, created_at);

-- ============================================
-- AI CREDIT LIMITS BY PLAN
-- ============================================

-- Plan configuration table for dynamic pricing
CREATE TABLE IF NOT EXISTS plan_configs (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  max_seats INTEGER,
  ai_credits_monthly INTEGER NOT NULL DEFAULT 100,
  price_monthly_cents INTEGER NOT NULL DEFAULT 0,
  price_yearly_cents INTEGER NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default plans
INSERT INTO plan_configs (id, name, display_name, max_seats, ai_credits_monthly, price_monthly_cents, price_yearly_cents, features, sort_order)
VALUES
  ('free', 'free', 'Free', 5, 100, 0, 0,
   '["basic_rocks", "basic_tasks", "eod_reports"]'::jsonb, 0),
  ('pro', 'pro', 'Pro', 20, 1000, 1500, 14400,
   '["basic_rocks", "basic_tasks", "eod_reports", "ai_insights", "team_analytics", "asana_integration"]'::jsonb, 1),
  ('team', 'team', 'Team', 100, 5000, 2500, 24000,
   '["basic_rocks", "basic_tasks", "eod_reports", "ai_insights", "team_analytics", "asana_integration", "custom_branding", "api_access", "priority_support"]'::jsonb, 2),
  ('enterprise', 'enterprise', 'Enterprise', NULL, -1, 7500, 72000,
   '["basic_rocks", "basic_tasks", "eod_reports", "ai_insights", "team_analytics", "asana_integration", "custom_branding", "api_access", "priority_support", "sso_saml", "dedicated_support", "sla_guarantee", "unlimited_ai"]'::jsonb, 3)
ON CONFLICT (id) DO UPDATE SET
  max_seats = EXCLUDED.max_seats,
  ai_credits_monthly = EXCLUDED.ai_credits_monthly,
  price_monthly_cents = EXCLUDED.price_monthly_cents,
  price_yearly_cents = EXCLUDED.price_yearly_cents,
  features = EXCLUDED.features,
  updated_at = NOW();

-- ============================================
-- MONTHLY AI USAGE SUMMARY
-- ============================================

-- Materialized view for monthly usage (optional, for fast lookups)
CREATE TABLE IF NOT EXISTS monthly_ai_usage (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  total_credits_used INTEGER NOT NULL DEFAULT 0,
  total_tokens_used INTEGER NOT NULL DEFAULT 0,
  query_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, month_start)
);

CREATE INDEX IF NOT EXISTS idx_monthly_ai_usage_org ON monthly_ai_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_monthly_ai_usage_month ON monthly_ai_usage(month_start);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get current month's AI usage for an organization
CREATE OR REPLACE FUNCTION get_monthly_ai_credits_used(org_id VARCHAR(255))
RETURNS INTEGER AS $$
DECLARE
  credits_used INTEGER;
BEGIN
  SELECT COALESCE(SUM(credits_used), 0) INTO credits_used
  FROM ai_usage
  WHERE organization_id = org_id
    AND created_at >= date_trunc('month', CURRENT_DATE)
    AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
  RETURN credits_used;
END;
$$ LANGUAGE plpgsql;

-- Function to check if organization has AI credits remaining
CREATE OR REPLACE FUNCTION has_ai_credits(org_id VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
  plan_limit INTEGER;
  credits_used INTEGER;
  org_plan VARCHAR(50);
BEGIN
  -- Get organization's plan
  SELECT COALESCE(subscription->>'plan', 'free') INTO org_plan
  FROM organizations WHERE id = org_id;

  -- Get plan's credit limit (-1 = unlimited)
  SELECT ai_credits_monthly INTO plan_limit
  FROM plan_configs WHERE id = org_plan;

  -- Unlimited credits for enterprise
  IF plan_limit = -1 THEN
    RETURN TRUE;
  END IF;

  -- Get current month's usage
  credits_used := get_monthly_ai_credits_used(org_id);

  RETURN credits_used < COALESCE(plan_limit, 100);
END;
$$ LANGUAGE plpgsql;
