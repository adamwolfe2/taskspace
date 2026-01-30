# Product Relaunch Plan - Multi-Tenant SaaS Platform
## From AIMS-Specific Tool → Generic Team Productivity Platform

**Date**: January 30, 2026
**Goal**: Transform platform into a white-label SaaS product that any organization can use
**Timeline**: 2-3 weeks to MVP relaunch

---

## Executive Summary

This platform is **85% complete** with:
- ✅ Robust multi-tenant architecture (organization + workspace levels)
- ✅ 50+ database tables with complete EOS methodology
- ✅ 111+ API endpoints with security/auth
- ✅ Professional marketing pages with pricing
- ✅ Workspace switcher UI (functional)
- ✅ Branding system (logo, colors) in settings
- ✅ MCP server for Claude integration
- ✅ Integrations: Asana, Slack, Google Calendar

**What's Needed**: De-brand from AIMS, complete workspace functionality, apply dynamic theming, clean up settings UI.

---

## Phase 1: Critical Path (Week 1) - LAUNCH BLOCKERS

### 1. De-brand Platform from AIMS ⚡ HIGH PRIORITY
**Goal**: Make platform generic for any organization

**Changes Required**:

#### A. Database/Environment
- [ ] Update default organization name creation logic
- [ ] Remove hardcoded "AIMS" from seed data
- [ ] Update example environment variables

#### B. UI/Frontend
- [ ] Replace "AIMS" in page titles with org name variable
- [ ] Update app name in navigation/header (use org logo + name)
- [ ] Update sidebar branding to use org logo
- [ ] Update email templates to use `{{orgName}}` variable
- [ ] Update meta tags/SEO to be generic
- [ ] Update favicon to be org-specific (use uploaded favicon or default)

#### C. Marketing Pages (Already Generic!)
- [ ] Verify `/app/(marketing)/page.tsx` is brand-neutral ✅ (looks good!)
- [ ] Verify `/app/(marketing)/pricing/page.tsx` is generic ✅ (already is!)
- [ ] Update any "AIMS" references in feature pages
- [ ] Update screenshots/demos to show generic branding

#### D. MCP Server
- [ ] Rename `aims-mcp-server` to generic name (e.g., `teamalign-mcp-server`)
- [ ] Update MCP description to be product-agnostic
- [ ] Update API key prefix from `aims_` to generic (or keep as is)

#### E. Documentation
- [ ] Update README.md to be product-neutral
- [ ] Remove AIMS-specific deployment instructions
- [ ] Update onboarding docs

**Files to Update**:
```
app/layout.tsx (meta tags)
app/(app)/layout.tsx (sidebar logo)
components/sidebar/* (branding)
lib/email/templates/* (email templates)
app/(marketing)/* (verify generic)
mcp-server/package.json
mcp-server/README.md
README.md
```

**Estimated Time**: 4-6 hours

---

### 2. Complete Workspace Functionality ⚡ HIGH PRIORITY
**Goal**: Ensure workspace creation and switching works flawlessly

**Current Status**: UI exists (screenshot shows "Switch workspace" + "Create new workspace"), but needs testing/completion.

#### A. Verify Workspace Creation
- [ ] Test "Create new workspace" modal functionality
- [ ] Ensure workspace name, type (team/department/project) can be set
- [ ] Auto-assign creator as workspace admin
- [ ] Create default workspace on org signup

#### B. Workspace Switcher
- [ ] Verify dropdown shows all user's workspaces
- [ ] Persist selected workspace in session
- [ ] Update context throughout app when switching
- [ ] Add workspace name to page breadcrumbs

#### C. Workspace-Scoped Data
- [ ] Ensure tasks filter by current workspace
- [ ] Ensure rocks filter by current workspace
- [ ] Ensure EOD reports filter by current workspace
- [ ] Ensure AI suggestions respect workspace scope
- [ ] Test data isolation (create 2 workspaces, ensure data doesn't cross)

#### D. Workspace Settings
- [ ] Add workspace settings page (name, logo, members)
- [ ] Allow workspace admins to invite members
- [ ] Allow workspace admins to set workspace-specific branding

**API Routes to Verify**:
```
GET  /api/workspaces - List user workspaces
POST /api/workspaces - Create workspace
GET  /api/workspaces/[id] - Get workspace
PATCH /api/workspaces/[id] - Update workspace
POST /api/workspaces/[id]/members - Add member
```

**Database Functions to Test**:
```sql
get_user_workspaces(user_id, org_id)
user_has_workspace_access(user_id, workspace_id)
```

**Estimated Time**: 6-8 hours

---

### 3. Implement Dynamic Theming System ⚡ HIGH PRIORITY
**Goal**: Apply org branding (colors, logo) throughout the app

**Current Status**: Settings page has color pickers and theme preview, but colors may not be applied throughout app.

#### A. CSS Variable Injection
- [ ] Create middleware to inject CSS variables from org settings
- [ ] Apply `--primary-color`, `--secondary-color`, `--accent-color` from DB
- [ ] Override Tailwind colors with org colors
- [ ] Ensure changes apply immediately after saving settings

#### B. Component Updates
- [ ] Update buttons to use `bg-primary` instead of hardcoded `bg-red-500`
- [ ] Update cards to use primary color for borders/accents
- [ ] Update gradients to use org colors
- [ ] Update sidebar active states to use primary color
- [ ] Update stat cards to use org colors

#### C. Logo Application
- [ ] Use org logo in header (fallback to generic icon)
- [ ] Use org logo in sidebar
- [ ] Use org logo in emails
- [ ] Use org logo in marketing pages for logged-in users

#### D. Dark Mode Support
- [ ] Ensure org colors work in dark mode
- [ ] Test contrast ratios for accessibility
- [ ] Provide lighter/darker variants of org colors

**Files to Update**:
```
app/globals.css (CSS variables)
middleware.ts (inject theme from DB)
components/ui/* (use CSS variables)
components/sidebar/* (use org logo)
app/(app)/layout.tsx (apply theme)
```

**Implementation Approach**:
```tsx
// In layout.tsx or middleware
const orgSettings = await getOrgSettings(orgId)
const themeStyles = `
  :root {
    --primary: ${orgSettings.primaryColor || '220 38 38'};
    --secondary: ${orgSettings.secondaryColor || '218 165 32'};
    --accent: ${orgSettings.accentColor || '220 38 38'};
  }
`
```

**Estimated Time**: 6-8 hours

---

### 4. Super Admin Multi-Org Access ⚡ MEDIUM PRIORITY
**Goal**: Allow you (platform owner) to switch between all organizations you're part of

**Current Status**: User switcher may exist, needs verification.

#### A. Organization Switcher
- [ ] Add org switcher dropdown in user menu (header right)
- [ ] Show all orgs where user is owner/admin/member
- [ ] Display org logo + name in dropdown
- [ ] Highlight current org
- [ ] Allow switching with single click

#### B. Context Persistence
- [ ] Store selected org in session
- [ ] Update all API calls to use current org
- [ ] Add breadcrumb showing current org + workspace
- [ ] Test switching between orgs (ensure data isolation)

#### C. Access Control
- [ ] Verify user can only access orgs they're a member of
- [ ] Show role badge in org list (Owner/Admin/Member)
- [ ] Test that switching orgs updates permissions properly

**UI Location**: User dropdown menu (top-right of header)

**Estimated Time**: 4 hours

---

## Phase 2: Polish & UX (Week 2) - IMPORTANT

### 5. Settings Page Cleanup 🎨 HIGH PRIORITY
**Goal**: Make all settings tabs cohesive and visually consistent

**Current Issues** (from screenshots):
- Inconsistent spacing between sections
- Some tabs feel cramped, others have too much whitespace
- Button positioning varies (some "Save" buttons top, some bottom)
- Color preview section looks good, but needs better spacing
- Icons are inconsistent (some tabs have icons, some don't)

#### A. Visual Consistency
- [ ] Standardize section spacing (use `space-y-8` between major sections)
- [ ] Standardize card padding (`p-6` for all setting cards)
- [ ] Ensure all section headers have same font size (`text-xl font-semibold`)
- [ ] Add section descriptions under headers (`text-sm text-slate-600`)
- [ ] Add dividers between major sections

#### B. Form Layout
- [ ] All input labels should be `text-sm font-medium text-slate-700`
- [ ] All help text should be `text-xs text-slate-500`
- [ ] All "Save" buttons should be bottom-right or bottom-left (consistent)
- [ ] Add success toast after saving ("Settings updated successfully")
- [ ] Add error states with clear messages

#### C. Tab Organization
- [ ] **Organization Tab**: Logo, Name, Timezone, EOD Time, Workspace Branding
- [ ] **Notifications Tab**: Email, In-App, Slack, Push preferences
- [ ] **Team Tab**: Invite members, Team limits, Member list
- [ ] **Billing Tab**: Current plan, Usage meters, Upgrade options (no payment for now)
- [ ] **AI Inbox Tab**: Credit usage, Budget controls, Suggestions
- [ ] **Integrations Tab**: Email, API Keys, MCP, Asana, Google Calendar, Slack
- [ ] **Data Export Tab**: Export Rocks, Tasks, EOD Reports, Calendar

#### D. Specific Improvements

**Organization Tab**:
- [ ] Move "Workspace Branding" to its own section with clear heading
- [ ] Add preview of how colors look on actual components (mini button, mini card)
- [ ] Show uploaded logo preview thumbnail
- [ ] Add "Remove Logo" button

**Notifications Tab**:
- [ ] Group by category (Personal Settings, Notification Preferences, Integrations)
- [ ] Add "Mute All" and "Enable All" quick actions
- [ ] Show last sync time for Asana
- [ ] Add "Test Notification" button for each channel

**Integrations Tab**:
- [ ] Show connected status with green checkmark
- [ ] Add "Last synced" timestamp
- [ ] Group by integration type (Communication, Productivity, Developer)
- [ ] Make MCP setup instructions collapsible

**AI Inbox Tab**:
- [ ] Show AI credit usage as progress bar (0/100 credits)
- [ ] Add "Resets on [date]" text under credits
- [ ] Make budget controls clearer (what does 80% warning mean?)
- [ ] Show AI suggestions in a better empty state (mailbox icon)

**Billing Tab** (for future):
- [ ] Show plan comparison in modal (not inline)
- [ ] Add "Contact Sales" for Enterprise
- [ ] Show next billing date
- [ ] Add usage graphs (seats, AI credits over time)

**Estimated Time**: 8-10 hours

---

### 6. Signup Flow Update 🎨 MEDIUM PRIORITY
**Goal**: Ensure new signups create a fresh organization

#### A. Registration Form
- [ ] Add "Organization Name" field to signup
- [ ] Auto-generate org slug from name
- [ ] Create default workspace named "General" or user's choice
- [ ] Set user as org owner

#### B. Onboarding Wizard (Optional but Recommended)
- [ ] Step 1: Account creation (name, email, password)
- [ ] Step 2: Organization setup (org name, logo, colors) - optional, can skip
- [ ] Step 3: Invite team (can skip)
- [ ] Step 4: Tour of dashboard

#### C. Welcome Email
- [ ] Send welcome email with org details
- [ ] Include quick start guide
- [ ] Link to help docs

**Estimated Time**: 4-6 hours

---

## Phase 3: Testing & Launch Prep (Week 3) - VALIDATION

### 7. Comprehensive Testing 🧪 HIGH PRIORITY

#### A. Data Isolation Testing
- [ ] Create 3 test organizations
- [ ] Create 2 workspaces per org
- [ ] Create tasks, rocks, EOD reports in each
- [ ] Switch between orgs and verify data doesn't leak
- [ ] Switch between workspaces and verify filtering works
- [ ] Test with multiple browser sessions (different users)

#### B. Branding Testing
- [ ] Upload logo for test org, verify it appears everywhere
- [ ] Change colors, verify they apply to all components
- [ ] Test in light and dark mode
- [ ] Test with extreme colors (very light, very dark)
- [ ] Test without logo (ensure graceful fallback)

#### C. Workspace Testing
- [ ] Create workspace, add members
- [ ] Remove member from workspace
- [ ] Delete workspace (ensure data cleanup)
- [ ] Switch workspace while viewing task list
- [ ] Create task in workspace A, switch to B, verify it's not visible

#### D. Performance Testing
- [ ] Load dashboard with 100 tasks
- [ ] Load org with 50 team members
- [ ] Ensure queries are fast (<200ms)
- [ ] Check for N+1 queries in logs

#### E. Mobile/Responsive Testing
- [ ] Test on mobile Safari
- [ ] Test on mobile Chrome
- [ ] Ensure workspace switcher works on mobile
- [ ] Test settings tabs on mobile

**Estimated Time**: 8-10 hours

---

### 8. Documentation & Marketing 📚 MEDIUM PRIORITY

#### A. Product Documentation
- [ ] Write "Getting Started" guide
- [ ] Write "How to Invite Team Members" guide
- [ ] Write "How to Customize Branding" guide
- [ ] Write "How to Connect Integrations" guide
- [ ] Write "How to Export Data" guide

#### B. Marketing Copy
- [ ] Finalize product name (currently generic, needs brand)
- [ ] Update meta descriptions
- [ ] Create demo video (optional)
- [ ] Create screenshots for marketing site

#### C. Legal Pages
- [ ] Privacy Policy
- [ ] Terms of Service
- [ ] Data Processing Agreement (for Enterprise)

**Estimated Time**: 6-8 hours

---

### 9. Billing Preparation (Future) 💳 LOW PRIORITY
**Goal**: Set up structure for Stripe, but don't enforce yet

#### A. Stripe Setup (Do Later)
- [ ] Create Stripe account
- [ ] Add Stripe keys to .env
- [ ] Test checkout flow
- [ ] Test webhooks (subscription created, payment failed, etc.)

#### B. Plan Limits (Logic Exists, Don't Enforce Yet)
- [ ] Add seat counting logic (already exists in settings)
- [ ] Add AI credit tracking (already exists)
- [ ] Add feature gating checks (but set all to unlimited for now)
- [ ] Document where to enable enforcement later

#### C. Billing UI (Already Built!)
- [ ] Verify billing page shows plan tiers ✅ (screenshot looks good)
- [ ] Update "Get Started" buttons to point to signup (not Stripe)
- [ ] Show plan limits on dashboard (seats, credits) ✅ (already shown)

**Estimated Time**: 2-3 hours setup, but delay Stripe integration

---

## Phase 4: Future Enhancements (Post-Launch)

### 10. Additional Features (Nice to Have)

#### A. L10 Meeting UI (Schema Exists, No UI)
- [ ] Build meeting conductor interface
- [ ] Section timer
- [ ] IDS prioritization
- [ ] Meeting history

#### B. Productivity Tracking
- [ ] Focus block logging UI
- [ ] Energy/mood selector in EOD form
- [ ] Focus score dashboard
- [ ] Streak milestones

#### C. Advanced Analytics
- [ ] Exportable custom reports
- [ ] Workspace-level analytics
- [ ] Team comparison charts
- [ ] Forecasting/trends

#### D. White-Label Enhancements
- [ ] Custom domain support (CNAME)
- [ ] Custom email domain for notifications
- [ ] Remove "Powered by" footer (for Enterprise)
- [ ] Custom CSS injection

---

## Implementation Priority Matrix

| Task | Priority | Effort | Impact | Week |
|------|----------|--------|--------|------|
| De-brand from AIMS | 🔴 Critical | 4-6h | High | 1 |
| Complete workspace functionality | 🔴 Critical | 6-8h | High | 1 |
| Dynamic theming system | 🔴 Critical | 6-8h | High | 1 |
| Super admin multi-org access | 🟡 High | 4h | Medium | 1 |
| Settings page cleanup | 🟡 High | 8-10h | Medium | 2 |
| Signup flow update | 🟡 High | 4-6h | Medium | 2 |
| Data isolation testing | 🟡 High | 8-10h | High | 3 |
| Branding testing | 🟡 High | 4h | Medium | 3 |
| Documentation | 🟢 Medium | 6-8h | Medium | 3 |
| Billing prep | 🔵 Low | 2-3h | Low | Future |

---

## Success Metrics

### Launch Readiness Checklist
- [ ] Can create new organization with custom name
- [ ] Can upload logo and colors, see them applied everywhere
- [ ] Can create multiple workspaces
- [ ] Can switch between workspaces, data filters properly
- [ ] Can invite team members to org
- [ ] Can assign tasks, create rocks, submit EOD reports
- [ ] No "AIMS" branding visible (unless org chooses it)
- [ ] All settings tabs are clean and cohesive
- [ ] Marketing pages are live and generic
- [ ] MCP server works with multiple orgs

### Technical Validation
- [ ] No console errors on any page
- [ ] All API routes return proper status codes
- [ ] Database queries are optimized (<200ms)
- [ ] Mobile responsive works
- [ ] Dark mode works
- [ ] Email notifications send correctly
- [ ] Asana sync works
- [ ] Data exports work

### User Experience
- [ ] First-time user can sign up and create org in <3 min
- [ ] User can customize branding in <5 min
- [ ] User can invite team and see them online in <2 min
- [ ] User can create workspace and assign task in <2 min
- [ ] Settings are intuitive (no confusion on what to click)

---

## Rollout Strategy

### Week 1: Build
- Day 1-2: De-brand platform, test workspace switcher
- Day 3-4: Implement dynamic theming
- Day 5: Super admin access, code review

### Week 2: Polish
- Day 1-3: Settings page cleanup
- Day 4: Signup flow updates
- Day 5: Internal testing

### Week 3: Launch
- Day 1-2: Comprehensive testing (create multiple test orgs)
- Day 3: Fix any critical bugs
- Day 4: Write documentation
- Day 5: Soft launch (invite beta users)

### Week 4+: Iterate
- Monitor usage, fix bugs
- Collect feedback
- Prioritize Phase 4 features based on demand

---

## Notes

### Current Architecture Strengths
✅ Multi-tenant at org level (complete)
✅ Workspace schema (ready, UI needs completion)
✅ Branding system (exists in settings)
✅ Marketing pages (professional, ready)
✅ API security (auth, rate limiting, audit logs)
✅ Integrations (Asana, Slack, MCP, Google Calendar)

### Why This Will Work
1. **85% done** - Most infrastructure is ready
2. **Marketing pages exist** - No need to build landing page from scratch
3. **Branding system exists** - Just needs to be applied
4. **Workspace UI exists** - Just needs testing/polish
5. **No payment needed yet** - Can launch without Stripe integration
6. **You control all orgs** - No need for billing enforcement initially

### Recommended Product Name
Since you're moving away from "AIMS", consider:
- **TeamAlign** - Aligns with EOS/rocks methodology
- **VectorHQ** - Direction + goals
- **PilotOS** - Operating system for teams
- **RallyPoint** - Team coordination
- **Sync** - Simple, clean, describes the product

Or keep a generic name in code and let each org brand it themselves!

---

## Next Steps

1. **Approve this plan** - Let me know if you want to adjust priorities
2. **Choose product name** (optional) - Or keep it generic
3. **Start with Task #1** - De-brand from AIMS
4. **Daily progress checks** - I'll update you as tasks complete
5. **Test as we go** - Create test orgs to verify each change

**Estimated Total Time to Relaunch**: 40-50 hours (2-3 weeks working part-time)

---

Let me know when you're ready to start! I recommend we begin with Task #1 (De-branding) since it's the foundation for everything else.
