-- ============================================
-- MULTI-TENANCY & PRODUCTIZATION SCHEMA
-- ============================================
-- This migration adds support for:
-- 1. Enhanced organization branding (logo, colors, custom domain)
-- 2. Seat-based subscription management
-- 3. Cross-workspace task assignment tracking
-- 4. Organization-level feature flags

-- ============================================
-- ORGANIZATION BRANDING ENHANCEMENTS
-- ============================================

-- Add branding columns to organizations table
-- Note: These complement the existing JSONB settings.customBranding field
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#dc2626'; -- red-600
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#1f2937'; -- gray-800
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);

-- ============================================
-- ENHANCED SUBSCRIPTION & BILLING
-- ============================================

-- Subscription tiers table - defines available plans
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL, -- In cents
  price_yearly INTEGER NOT NULL, -- In cents (annual price)
  max_seats INTEGER, -- NULL = unlimited
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default subscription tiers
INSERT INTO subscription_tiers (id, name, slug, description, price_monthly, price_yearly, max_seats, features, sort_order)
VALUES
  ('tier_free', 'Free', 'free', 'Perfect for individuals getting started', 0, 0, 5,
   '["Basic task management", "EOD reports", "1 rock per user", "Email support"]', 0),
  ('tier_starter', 'Starter', 'starter', 'For small teams running EOS', 1500, 14400, 15,
   '["Everything in Free", "Unlimited rocks", "Team scorecard", "AI-powered insights", "Asana integration", "Priority support"]', 1),
  ('tier_professional', 'Professional', 'professional', 'For growing organizations', 3500, 33600, 50,
   '["Everything in Starter", "Manager dashboards", "Advanced analytics", "Custom branding", "API access", "Google Calendar sync", "Dedicated success manager"]', 2),
  ('tier_enterprise', 'Enterprise', 'enterprise', 'For large organizations with custom needs', 7500, 72000, NULL,
   '["Everything in Professional", "Unlimited seats", "SSO/SAML", "Custom integrations", "SLA guarantee", "On-premise option", "Custom contract"]', 3)
ON CONFLICT (id) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features;

-- Organization billing/subscription details
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tier_id VARCHAR(255) NOT NULL REFERENCES subscription_tiers(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, trialing, past_due, canceled, paused
  billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  seats_purchased INTEGER DEFAULT 5,
  seats_used INTEGER DEFAULT 1,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Billing history
CREATE TABLE IF NOT EXISTS billing_history (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id VARCHAR(255) REFERENCES organization_subscriptions(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- In cents
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL, -- paid, pending, failed, refunded
  description TEXT,
  invoice_url TEXT,
  stripe_invoice_id VARCHAR(255),
  billing_period_start TIMESTAMP WITH TIME ZONE,
  billing_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_stripe_customer ON organization_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_org ON billing_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_created ON billing_history(created_at DESC);

-- ============================================
-- CROSS-WORKSPACE TASK ASSIGNMENT
-- ============================================

-- Tracks tasks assigned across organizations (for admins managing multiple workspaces)
CREATE TABLE IF NOT EXISTS cross_workspace_tasks (
  id VARCHAR(255) PRIMARY KEY,
  source_organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_task_id VARCHAR(255) REFERENCES assigned_tasks(id) ON DELETE SET NULL,
  target_task_id VARCHAR(255) REFERENCES assigned_tasks(id) ON DELETE SET NULL,
  assigned_by_user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(50) DEFAULT 'normal',
  status VARCHAR(50) DEFAULT 'pending', -- pending, synced, completed, archived
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cross_workspace_source ON cross_workspace_tasks(source_organization_id);
CREATE INDEX IF NOT EXISTS idx_cross_workspace_target ON cross_workspace_tasks(target_organization_id);
CREATE INDEX IF NOT EXISTS idx_cross_workspace_user ON cross_workspace_tasks(assigned_by_user_id);

-- ============================================
-- ORGANIZATION FEATURE FLAGS
-- ============================================

-- Allows per-org feature toggling
CREATE TABLE IF NOT EXISTS organization_features (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_org_features_org ON organization_features(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_features_key ON organization_features(feature_key);

-- ============================================
-- USER ORGANIZATION PREFERENCES
-- ============================================

-- Stores user's preferences across organizations (like last accessed org)
CREATE TABLE IF NOT EXISTS user_organization_preferences (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_organization_id VARCHAR(255) REFERENCES organizations(id) ON DELETE SET NULL,
  default_organization_id VARCHAR(255) REFERENCES organizations(id) ON DELETE SET NULL,
  organization_order JSONB DEFAULT '[]', -- Order of orgs in switcher
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_org_prefs_user ON user_organization_preferences(user_id);

-- ============================================
-- AUDIT LOG FOR COMPLIANCE
-- ============================================

-- Comprehensive audit trail for SaaS compliance
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) REFERENCES organizations(id) ON DELETE SET NULL,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- login, logout, create_task, update_rock, invite_member, etc.
  resource_type VARCHAR(100), -- task, rock, member, organization, etc.
  resource_id VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================
-- WHITE-LABELING SUPPORT
-- ============================================

-- White-label configurations for resellers/partners
CREATE TABLE IF NOT EXISTS white_label_configs (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brand_name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  logo_dark_url TEXT, -- For dark mode
  favicon_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#dc2626',
  secondary_color VARCHAR(7) DEFAULT '#1f2937',
  accent_color VARCHAR(7) DEFAULT '#3b82f6',
  custom_css TEXT,
  custom_domain VARCHAR(255),
  email_from_name VARCHAR(255),
  email_from_address VARCHAR(255),
  support_email VARCHAR(255),
  support_url TEXT,
  terms_url TEXT,
  privacy_url TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_white_label_org ON white_label_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_white_label_domain ON white_label_configs(custom_domain) WHERE custom_domain IS NOT NULL;

-- ============================================
-- HELPFUL VIEWS
-- ============================================

-- View: User's organizations with membership details
CREATE OR REPLACE VIEW user_organizations_view AS
SELECT
  u.id as user_id,
  u.email as user_email,
  u.name as user_name,
  o.id as organization_id,
  o.name as organization_name,
  o.slug as organization_slug,
  o.logo_url as organization_logo,
  o.primary_color,
  om.id as member_id,
  om.role,
  om.status as member_status,
  om.joined_at,
  os.status as subscription_status,
  st.name as subscription_tier,
  os.seats_purchased,
  os.seats_used
FROM users u
JOIN organization_members om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
LEFT JOIN organization_subscriptions os ON o.id = os.organization_id
LEFT JOIN subscription_tiers st ON os.tier_id = st.id
WHERE om.status = 'active' AND om.user_id IS NOT NULL;

-- View: Organization seat usage
CREATE OR REPLACE VIEW organization_seat_usage_view AS
SELECT
  o.id as organization_id,
  o.name as organization_name,
  COALESCE(os.seats_purchased, 5) as seats_purchased,
  COUNT(om.id) FILTER (WHERE om.status = 'active') as seats_used,
  COALESCE(os.seats_purchased, 5) - COUNT(om.id) FILTER (WHERE om.status = 'active') as seats_available,
  st.max_seats as tier_max_seats
FROM organizations o
LEFT JOIN organization_subscriptions os ON o.id = os.organization_id
LEFT JOIN subscription_tiers st ON os.tier_id = st.id
LEFT JOIN organization_members om ON o.id = om.organization_id
GROUP BY o.id, o.name, os.seats_purchased, st.max_seats;
