# AIMS EOD Tracker - Productization Audit & Multi-Tenancy Implementation

**Date:** January 2026
**Status:** Implementation Complete
**Version:** 2.0.0

---

## Executive Summary

This document outlines the comprehensive audit and architectural changes made to transform AIMS EOD Tracker from a single-organization application into a productized, multi-tenant SaaS platform. The changes enable:

1. **Multi-workspace support** - Users can belong to and switch between multiple organizations
2. **Seat-based billing** - Subscription tiers with configurable seat limits
3. **White-labeling** - Organization-level branding and customization
4. **Cross-workspace task assignment** - Assign tasks across organizations you manage
5. **Comprehensive audit logging** - Track all actions for compliance

---

## Architecture Changes

### 1. Database Schema Updates

#### New Tables Added

| Table | Purpose |
|-------|---------|
| `subscription_tiers` | Defines pricing plans (Free, Starter, Professional, Enterprise) |
| `organization_subscriptions` | Per-org subscription status, seats, billing cycle |
| `cross_workspace_tasks` | Track tasks assigned across organizations |
| `user_organization_preferences` | User's last/default org, switcher order |
| `white_label_configs` | Per-org branding, custom domain, support URLs |
| `billing_history` | Payment history and invoices |
| `organization_features` | Feature flags per organization |

#### Organization Table Enhancements

```sql
-- New columns added to organizations table
logo_url TEXT                       -- Organization logo
primary_color VARCHAR(7)            -- Brand primary color
secondary_color VARCHAR(7)          -- Brand secondary color
custom_domain VARCHAR(255)          -- Custom domain for white-labeling
favicon_url TEXT                    -- Custom favicon
billing_email VARCHAR(255)          -- Billing contact email
```

#### Audit Logs Enhancement

```sql
-- Enhanced audit_logs for compliance
old_values JSONB                    -- Previous state before change
new_values JSONB                    -- New state after change
```

### 2. Subscription Tiers

| Tier | Price (Monthly) | Price (Yearly) | Max Seats | Key Features |
|------|-----------------|----------------|-----------|--------------|
| Free | $0 | $0 | 5 | Basic tasks, EOD reports, 1 rock/user |
| Starter | $15 | $144 | 15 | Unlimited rocks, scorecard, AI insights, Asana |
| Professional | $35 | $336 | 50 | Manager dashboards, analytics, custom branding, API |
| Enterprise | $75 | $720 | Unlimited | SSO/SAML, custom integrations, SLA, on-premise |

### 3. API Endpoints

#### User Organizations API

```
GET  /api/user/organizations        - List all organizations user belongs to
POST /api/user/organizations        - Create a new organization
POST /api/user/switch-organization  - Switch active organization
```

#### Cross-Workspace Tasks API

```
GET  /api/cross-workspace/tasks     - List cross-workspace tasks
POST /api/cross-workspace/tasks     - Create cross-workspace task
```

### 4. UI Components

#### Organization Switcher (`components/shared/organization-switcher.tsx`)

- Dropdown in header showing current organization with logo
- List of all organizations user belongs to
- Visual indicators for role (Owner, Admin, Member)
- Quick organization switching with session update
- "Create new workspace" option

---

## Implementation Details

### Multi-Organization Session Handling

The session model has been updated to support users belonging to multiple organizations:

```typescript
// Session contains organization context
interface Session {
  userId: string
  organizationId: string  // Current active organization
  token: string
  expiresAt: string
}

// When switching organizations:
// 1. Verify user is member of target org
// 2. Create new session for target org
// 3. Update user preferences with last org
// 4. Set new session cookie
```

### Cross-Workspace Task Assignment

For users managing multiple organizations (like franchise owners or consultants):

```typescript
interface CrossWorkspaceTask {
  sourceOrganizationId: string    // Where task originated
  targetOrganizationId: string    // Where task is assigned
  assignedByUserId: string        // User creating the task
  title: string
  description?: string
  priority: "high" | "medium" | "normal"
  status: "pending" | "synced" | "completed" | "archived"
}
```

### Seat-Based Billing

```typescript
interface OrganizationSubscription {
  tierId: string              // Reference to subscription_tiers
  status: "active" | "trialing" | "past_due" | "canceled" | "paused"
  billingCycle: "monthly" | "yearly"
  seatsPurchased: number      // How many seats paid for
  seatsUsed: number           // Active members count
  stripeCustomerId?: string   // For payment processing
  stripeSubscriptionId?: string
}
```

---

## Migration Guide

### Running the Migration

1. Set the `MIGRATION_KEY` environment variable (recommended for production)
2. Call the migration endpoint:

```bash
curl -X GET "https://your-domain.com/api/db/migrate" \
  -H "x-migration-key: YOUR_MIGRATION_KEY"
```

### Database Changes Applied

The migration is idempotent and can be run multiple times safely. It:

1. Adds new columns to existing tables using `IF NOT EXISTS`
2. Creates new tables using `IF NOT EXISTS`
3. Inserts default subscription tiers using `ON CONFLICT DO UPDATE`
4. Creates indexes using `IF NOT EXISTS`

---

## Feature Flags

Organizations can have features enabled/disabled via the `organization_features` table:

| Feature Key | Description |
|-------------|-------------|
| `ai_insights` | AI-powered EOD analysis |
| `cross_workspace` | Cross-workspace task assignment |
| `custom_branding` | Logo, colors, custom domain |
| `api_access` | REST API and MCP access |
| `sso` | Single sign-on support |
| `advanced_analytics` | Extended analytics dashboard |

---

## Security Considerations

### Multi-Tenant Data Isolation

- All queries include `organization_id` filter
- Users can only access organizations they're members of
- Cross-workspace operations verify membership in both orgs
- API keys are scoped to specific organizations

### Audit Logging

All significant actions are logged:

- `login` / `logout` - Authentication events
- `organization_created` / `organization_switched` - Org management
- `member_invited` / `member_removed` - Team changes
- `task_created` / `task_completed` - Task management
- `cross_workspace_task_created` - Cross-org actions
- `settings_updated` - Configuration changes

### Rate Limiting

- Login attempts: 5 per 15 minutes
- Registration: 3 per 15 minutes
- API calls: Per-organization limits based on tier

---

## Future Roadmap

### Phase 2 - Billing Integration

- [ ] Stripe integration for payment processing
- [ ] Automated seat enforcement
- [ ] Usage-based billing options
- [ ] Invoice generation

### Phase 3 - Advanced Features

- [ ] SSO/SAML authentication
- [ ] Custom domain SSL provisioning
- [ ] Team templates (copy org structure)
- [ ] API rate limiting per tier

### Phase 4 - Enterprise Features

- [ ] On-premise deployment option
- [ ] Data residency controls
- [ ] Advanced compliance (SOC2, GDPR)
- [ ] Custom SLA agreements

---

## Files Modified/Created

### New Files

| File | Purpose |
|------|---------|
| `lib/db/schema-multi-tenancy.sql` | Multi-tenancy schema definitions |
| `app/api/user/organizations/route.ts` | User organizations API |
| `app/api/user/switch-organization/route.ts` | Organization switching API |
| `app/api/cross-workspace/tasks/route.ts` | Cross-workspace tasks API |
| `components/shared/organization-switcher.tsx` | UI component for org switching |
| `docs/PRODUCTIZATION-AUDIT.md` | This documentation |

### Modified Files

| File | Changes |
|------|---------|
| `lib/types.ts` | Added 15+ new types for multi-tenancy |
| `lib/db/index.ts` | Added 7 new database operation modules |
| `app/api/db/migrate/route.ts` | Added multi-tenancy table migrations |
| `components/layout/header.tsx` | Integrated organization switcher |

---

## Testing Checklist

### Organization Switching

- [ ] User can view list of their organizations
- [ ] Clicking an org switches context correctly
- [ ] Session cookie is updated after switch
- [ ] All data refreshes to show new org's data
- [ ] User preferences remember last organization

### New Organization Creation

- [ ] Can create new organization from dropdown
- [ ] Slug is auto-generated from name
- [ ] Creator becomes owner of new org
- [ ] Default subscription (Free tier) is created
- [ ] User can immediately switch to new org

### Cross-Workspace Tasks

- [ ] Can create task in another organization
- [ ] Task appears in target organization
- [ ] Status syncs between source and target
- [ ] Only users with access to both orgs can create

### Subscription Management

- [ ] Tiers display correctly with features
- [ ] Seat limits are enforced
- [ ] Upgrades increase available seats
- [ ] Billing history is recorded

---

## Contact & Support

For questions about this implementation:

- GitHub Issues: https://github.com/adamwolfe2/aimseod/issues
- Documentation: /docs folder in repository
