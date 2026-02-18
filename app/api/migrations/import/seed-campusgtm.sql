-- ============================================
-- CampusGTM Workspace Seed Script
-- Organization: d7132bd08ff71e079ff53f93 (CampusGTM)
-- Workspace: 02f5adb1cc09a4119d15eb6d (Default)
-- Owner: adamwolfe102@gmail.com (user: 8c9960a03dda2a6c9aa3932f)
-- ============================================

-- Constants
-- org_id: d7132bd08ff71e079ff53f93
-- workspace_id: 02f5adb1cc09a4119d15eb6d
-- adam_user_id: 8c9960a03dda2a6c9aa3932f

BEGIN;

-- ============================================
-- 1. CREATE TEAM MEMBER USERS
-- ============================================

INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
VALUES
  ('usr_campus_will',   'Will',   'will@campusgtm.dev',   '$2b$10$placeholder.hash.nologin.campus.will000000000000000000', NOW(), NOW()),
  ('usr_campus_anusha', 'Anusha', 'anusha@campusgtm.dev', '$2b$10$placeholder.hash.nologin.campus.anusha0000000000000000', NOW(), NOW()),
  ('usr_campus_arshia', 'Arshia', 'arshia@campusgtm.dev', '$2b$10$placeholder.hash.nologin.campus.arshia0000000000000000', NOW(), NOW()),
  ('usr_campus_logan',  'Logan',  'logan@campusgtm.dev',  '$2b$10$placeholder.hash.nologin.campus.logan00000000000000000', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. ADD USERS TO ORGANIZATION
-- ============================================

INSERT INTO organization_members (id, organization_id, user_id, role, name, email, status, joined_at)
VALUES
  ('om_campus_will',   'd7132bd08ff71e079ff53f93', 'usr_campus_will',   'member', 'Will',   'will@campusgtm.dev',   'active', NOW()),
  ('om_campus_anusha', 'd7132bd08ff71e079ff53f93', 'usr_campus_anusha', 'member', 'Anusha', 'anusha@campusgtm.dev', 'active', NOW()),
  ('om_campus_arshia', 'd7132bd08ff71e079ff53f93', 'usr_campus_arshia', 'member', 'Arshia', 'arshia@campusgtm.dev', 'active', NOW()),
  ('om_campus_logan',  'd7132bd08ff71e079ff53f93', 'usr_campus_logan',  'member', 'Logan',  'logan@campusgtm.dev',  'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. ADD USERS TO WORKSPACE
-- ============================================

INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
VALUES
  ('wm_campus_will',   '02f5adb1cc09a4119d15eb6d', 'usr_campus_will',   'member', NOW()),
  ('wm_campus_anusha', '02f5adb1cc09a4119d15eb6d', 'usr_campus_anusha', 'member', NOW()),
  ('wm_campus_arshia', '02f5adb1cc09a4119d15eb6d', 'usr_campus_arshia', 'member', NOW()),
  ('wm_campus_logan',  '02f5adb1cc09a4119d15eb6d', 'usr_campus_logan',  'member', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. CREATE PROJECTS (EPICS)
-- Sprint dates based on ~Feb 17 start:
--   Sprint 1: Week 2 (Feb 24) + Week 3 (Mar 3)
--   Sprint 2: Week 4 (Mar 10)
--   Sprint 3: Week 5 (Mar 17) + Week 6 (Mar 24)
--   Sprint 4: Week 7 (Mar 31)
--   Post: Week 8 (Apr 7), Week 9 (Apr 14), Week 10 (Apr 21)
-- ============================================

INSERT INTO projects (id, organization_id, workspace_id, name, description, status, priority, start_date, due_date, progress, owner_id, tags, created_by, created_at, updated_at)
VALUES
  ('prj_epic_01', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d',
   'Application Pipeline -- Table View',
   'Build the core applications list page with table view, filters, search, and status management. Sprint 1 / Week 2. 7 tickets, 14 story points.',
   'active', 'high', '2026-02-24', '2026-03-01', 0, 'usr_campus_will',
   '["sprint-1","week-2","14pts"]'::jsonb, '8c9960a03dda2a6c9aa3932f', NOW(), NOW()),

  ('prj_epic_02', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d',
   'Email Infrastructure',
   'Setup Resend API, email service abstraction, and React Email templates for application confirmation, acceptance, and tracking. Sprint 1 / Week 2. 3 tickets, 6 story points.',
   'active', 'high', '2026-02-24', '2026-03-01', 0, 'usr_campus_logan',
   '["sprint-1","week-2","6pts"]'::jsonb, '8c9960a03dda2a6c9aa3932f', NOW(), NOW()),

  ('prj_epic_03', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d',
   'Application Pipeline -- Kanban',
   'Add drag-and-drop Kanban board view for applications with columns for each status. Sprint 1 / Week 3. 5 tickets, 13 story points.',
   'planning', 'high', '2026-03-03', '2026-03-08', 0, 'usr_campus_will',
   '["sprint-1","week-3","13pts"]'::jsonb, '8c9960a03dda2a6c9aa3932f', NOW(), NOW()),

  ('prj_epic_04', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d',
   'Email Triggers',
   'Wire up automatic email sends on application submission and status changes. Sprint 1 / Week 3. 4 tickets, 7 story points.',
   'planning', 'high', '2026-03-03', '2026-03-08', 0, 'usr_campus_arshia',
   '["sprint-1","week-3","7pts"]'::jsonb, '8c9960a03dda2a6c9aa3932f', NOW(), NOW()),

  ('prj_epic_05', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d',
   'Application Pipeline -- Details & Actions',
   'Build application detail modal, review notes, quick actions, and bulk operations. Sprint 2 / Week 4. 4 tickets, 10 story points.',
   'planning', 'high', '2026-03-10', '2026-03-15', 0, 'usr_campus_will',
   '["sprint-2","week-4","10pts"]'::jsonb, '8c9960a03dda2a6c9aa3932f', NOW(), NOW()),

  ('prj_epic_06', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d',
   'Email Bison Dashboard',
   'Manual entry form and dashboard widget for Email Bison campaign metrics (emails sent, opens, replies, clicks, bounces). Sprint 2 / Week 4. 3 tickets, 7 story points.',
   'planning', 'medium', '2026-03-10', '2026-03-15', 0, 'usr_campus_arshia',
   '["sprint-2","week-4","7pts"]'::jsonb, '8c9960a03dda2a6c9aa3932f', NOW(), NOW()),

  ('prj_epic_07', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d',
   'Conversion Webhook System',
   'Design and build the webhook API for companies to report conversions, including API key management and logging. Sprint 3 / Week 5. 6 tickets, 15 story points.',
   'planning', 'high', '2026-03-17', '2026-03-22', 0, 'usr_campus_will',
   '["sprint-3","week-5","15pts"]'::jsonb, '8c9960a03dda2a6c9aa3932f', NOW(), NOW()),

  ('prj_epic_08', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d',
   'Conversion Dashboard & Visualization',
   'Display conversion data on link dashboard with timeline charts, top performers widget, and CSV upload fallback. Sprint 3 / Week 6. 5 tickets, 13 story points.',
   'planning', 'medium', '2026-03-24', '2026-03-29', 0, 'usr_campus_arshia',
   '["sprint-3","week-6","13pts"]'::jsonb, '8c9960a03dda2a6c9aa3932f', NOW(), NOW()),

  ('prj_epic_09', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d',
   'Funnel Analytics Dashboard',
   'Full recruitment funnel visualization showing Emails Sent -> Replies -> Applications -> Accepted -> Conversions with filtering and program comparison. Sprint 4 / Week 7. 5 tickets, 15 story points.',
   'planning', 'medium', '2026-03-31', '2026-04-05', 0, 'usr_campus_arshia',
   '["sprint-4","week-7","15pts"]'::jsonb, '8c9960a03dda2a6c9aa3932f', NOW(), NOW()),

  ('prj_epic_10', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d',
   'Week 8 Polish & Quick Wins',
   'Bug fixes, UX improvements, and nice-to-haves. P0: critical bugs, loading states, error handling, mobile. P1: empty states, tooltips, animations. P2: QR codes, CSV export, dark mode. 20-25 story points.',
   'planning', 'medium', '2026-04-07', '2026-04-12', 0, NULL,
   '["post-sprint","week-8","polish"]'::jsonb, '8c9960a03dda2a6c9aa3932f', NOW(), NOW()),

  ('prj_epic_11', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d',
   'Week 9 End-to-End Testing',
   'Test complete pilot workflow, cross-browser/platform testing, security audit, and performance testing. Full E2E: application -> acceptance -> activation flow.',
   'planning', 'medium', '2026-04-14', '2026-04-19', 0, NULL,
   '["post-sprint","week-9","testing"]'::jsonb, '8c9960a03dda2a6c9aa3932f', NOW(), NOW()),

  ('prj_epic_12', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d',
   'Week 10 Deployment & Launch',
   'Deploy to Vercel production, setup production DB, configure monitoring (Sentry), user guide, video walkthrough, demo to stakeholders, onboard first pilot client.',
   'planning', 'high', '2026-04-21', '2026-04-30', 0, NULL,
   '["post-sprint","week-10","launch"]'::jsonb, '8c9960a03dda2a6c9aa3932f', NOW(), NOW());

-- ============================================
-- 5. CREATE TASKS (42 TICKETS)
-- ============================================

-- Sprint 1 / Week 2 — Application Pipeline Table View (Tickets 1-7)

INSERT INTO assigned_tasks (id, organization_id, workspace_id, project_id, title, description, assignee_id, assignee_name, priority, due_date, status, created_at, updated_at, source)
VALUES
  ('task_gtm_01', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_01',
   '#1 Create /applications page route',
   'Story Points: 2 | Epic: Application Pipeline -- Table View | Sprint 1, Week 2

Scope:
- New route under (dashboard)/applications
- Basic page layout with header
- Fetch applications from API

Acceptance Criteria:
- Page renders, shows loading state',
   'usr_campus_will', 'Will', 'medium', '2026-03-01', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_02', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_01',
   '#2 Build application list API',
   'Story Points: 3 | Epic: Application Pipeline -- Table View | Sprint 1, Week 2

Scope:
- GET /api/applications (list w/ pagination)
- PATCH /api/applications/[id] (update status)
- Filter by program, status, date

Acceptance Criteria:
- API returns applications, supports filters',
   'usr_campus_will', 'Will', 'high', '2026-03-01', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_03', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_01',
   '#3 Build applications table component',
   'Story Points: 3 | Epic: Application Pipeline -- Table View | Sprint 1, Week 2

Scope:
- Columns: Name, University, Date, Status
- Use existing UI table component
- Loading/empty states

Acceptance Criteria:
- Table displays data correctly',
   'usr_campus_anusha', 'Anusha', 'high', '2026-03-01', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_04', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_01',
   '#4 Add status change dropdown',
   'Story Points: 2 | Epic: Application Pipeline -- Table View | Sprint 1, Week 2

Scope:
- Dropdown: Pending -> Reviewing -> Accepted -> Rejected
- Optimistic UI update
- Error handling

Acceptance Criteria:
- Status changes save correctly',
   'usr_campus_anusha', 'Anusha', 'medium', '2026-03-01', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_05', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_01',
   '#5 Add program filter dropdown',
   'Story Points: 1 | Epic: Application Pipeline -- Table View | Sprint 1, Week 2

Scope:
- Filter by program
- Updates URL params

Acceptance Criteria:
- Filter works, URL updates',
   'usr_campus_arshia', 'Arshia', 'normal', '2026-03-01', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_06', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_01',
   '#6 Add date range filter',
   'Story Points: 2 | Epic: Application Pipeline -- Table View | Sprint 1, Week 2

Scope:
- Date picker component
- Filter by submission date

Acceptance Criteria:
- Can filter by date range',
   'usr_campus_arshia', 'Arshia', 'medium', '2026-03-01', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_07', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_01',
   '#7 Add search by name/email',
   'Story Points: 1 | Epic: Application Pipeline -- Table View | Sprint 1, Week 2

Scope:
- Search input with debounce
- Client-side filtering

Acceptance Criteria:
- Search works smoothly',
   'usr_campus_arshia', 'Arshia', 'normal', '2026-03-01', 'pending', NOW(), NOW(), 'manual'),

-- Sprint 1 / Week 2 — Email Infrastructure (Tickets 8-10)

  ('task_gtm_08', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_02',
   '#8 Setup Resend API',
   'Story Points: 1 | Epic: Email Infrastructure | Sprint 1, Week 2

Scope:
- Add RESEND_API_KEY to .env
- Create /lib/email/client.ts wrapper
- Test send with basic email

Acceptance Criteria:
- Can send test email successfully',
   'usr_campus_logan', 'Logan', 'high', '2026-03-01', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_09', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_02',
   '#9 Create email service abstraction',
   'Story Points: 2 | Epic: Email Infrastructure | Sprint 1, Week 2

Scope:
- /lib/email/service.ts
- sendEmail(to, subject, template) helper
- Error handling + logging

Acceptance Criteria:
- Service works, handles errors gracefully',
   'usr_campus_logan', 'Logan', 'high', '2026-03-01', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_10', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_02',
   '#10 Build React Email templates',
   'Story Points: 3 | Epic: Email Infrastructure | Sprint 1, Week 2

Scope:
- Template 1: Application confirmation
- Template 2: Application accepted
- Template 3: Tracking link ready

Acceptance Criteria:
- Templates render correctly, look professional',
   'usr_campus_arshia', 'Arshia', 'high', '2026-03-01', 'pending', NOW(), NOW(), 'manual'),

-- Sprint 1 / Week 3 — Application Pipeline Kanban (Tickets 11-15)

  ('task_gtm_11', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_03',
   '#11 Research & setup drag-and-drop library',
   'Story Points: 2 | Epic: Application Pipeline -- Kanban | Sprint 1, Week 3

Scope:
- Evaluate react-beautiful-dnd vs @dnd-kit
- Install chosen library
- Create basic drag example

Acceptance Criteria:
- Library chosen and working',
   'usr_campus_logan', 'Logan', 'medium', '2026-03-08', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_12', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_03',
   '#12 Create Kanban board layout',
   'Story Points: 3 | Epic: Application Pipeline -- Kanban | Sprint 1, Week 3

Scope:
- 4 columns: New, Reviewing, Accepted, Rejected
- Basic card component
- Group applications by status

Acceptance Criteria:
- Board renders with applications',
   'usr_campus_will', 'Will', 'high', '2026-03-08', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_13', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_03',
   '#13 Implement drag-and-drop logic',
   'Story Points: 5 | Epic: Application Pipeline -- Kanban | Sprint 1, Week 3

Scope:
- Handle onDragEnd
- Update status in DB
- Optimistic UI w/ rollback

Acceptance Criteria:
- Drag between columns saves correctly',
   'usr_campus_will', 'Will', 'high', '2026-03-08', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_14', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_03',
   '#14 Add count badges to columns',
   'Story Points: 1 | Epic: Application Pipeline -- Kanban | Sprint 1, Week 3

Scope:
- Show application count in column headers
- Update dynamically on drag

Acceptance Criteria:
- Counts accurate',
   'usr_campus_anusha', 'Anusha', 'normal', '2026-03-08', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_15', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_03',
   '#15 Add view toggle (table/Kanban)',
   'Story Points: 2 | Epic: Application Pipeline -- Kanban | Sprint 1, Week 3

Scope:
- Button to switch views
- Save preference in URL param

Acceptance Criteria:
- Switch views smoothly',
   'usr_campus_anusha', 'Anusha', 'medium', '2026-03-08', 'pending', NOW(), NOW(), 'manual'),

-- Sprint 1 / Week 3 — Email Triggers (Tickets 16-19)

  ('task_gtm_16', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_04',
   '#16 Add confirmation email trigger',
   'Story Points: 2 | Epic: Email Triggers | Sprint 1, Week 3

Scope:
- On POST /api/applications
- Send confirmation immediately
- Log sends to DB

Acceptance Criteria:
- Applicants receive confirmation email',
   'usr_campus_arshia', 'Arshia', 'high', '2026-03-08', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_17', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_04',
   '#17 Add acceptance email trigger',
   'Story Points: 2 | Epic: Email Triggers | Sprint 1, Week 3

Scope:
- When status changes to "Accepted"
- Send welcome email w/ next steps
- Include Slack invite link (manual for now)

Acceptance Criteria:
- Accepted ambassadors receive email',
   'usr_campus_arshia', 'Arshia', 'high', '2026-03-08', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_18', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_04',
   '#18 Test email deliverability',
   'Story Points: 1 | Epic: Email Triggers | Sprint 1, Week 3

Scope:
- Test: Gmail, Outlook, ProtonMail
- Check spam rates
- Verify templates display correctly

Acceptance Criteria:
- <10% emails go to spam',
   'usr_campus_logan', 'Logan', 'medium', '2026-03-08', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_19', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_04',
   '#19 Add email notification preferences',
   'Story Points: 2 | Epic: Email Triggers | Sprint 1, Week 3 (stretch goal)

Scope:
- User opt in/out of emails
- Check preference before sending
- Default opt-in

Acceptance Criteria:
- Preference saves + respected',
   'usr_campus_anusha', 'Anusha', 'normal', '2026-03-08', 'pending', NOW(), NOW(), 'manual'),

-- Sprint 2 / Week 4 — Application Pipeline Details & Actions (Tickets 20-23)

  ('task_gtm_20', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_05',
   '#20 Build application detail modal',
   'Story Points: 3 | Epic: Application Pipeline -- Details & Actions | Sprint 2, Week 4

Scope:
- Click application -> modal/drawer
- Show full application data (whyJoin, experience, etc.)
- Display social links if provided

Acceptance Criteria:
- Can view full application details',
   'usr_campus_will', 'Will', 'high', '2026-03-15', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_21', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_05',
   '#21 Add review notes field',
   'Story Points: 2 | Epic: Application Pipeline -- Details & Actions | Sprint 2, Week 4

Scope:
- Textarea in modal
- Auto-save on blur
- Save status indicator

Acceptance Criteria:
- Notes save + persist',
   'usr_campus_will', 'Will', 'medium', '2026-03-15', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_22', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_05',
   '#22 Add quick action buttons',
   'Story Points: 2 | Epic: Application Pipeline -- Details & Actions | Sprint 2, Week 4

Scope:
- Accept/Reject in modal
- Confirmation dialog
- Trigger status change + email

Acceptance Criteria:
- Quick actions work correctly',
   'usr_campus_anusha', 'Anusha', 'high', '2026-03-15', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_23', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_05',
   '#23 Build bulk actions',
   'Story Points: 3 | Epic: Application Pipeline -- Details & Actions | Sprint 2, Week 4

Scope:
- Checkbox selection on cards/rows
- Accept Selected / Reject Selected
- Confirm bulk op
- Trigger emails for all

Acceptance Criteria:
- Bulk accept/reject works',
   'usr_campus_anusha', 'Anusha', 'high', '2026-03-15', 'pending', NOW(), NOW(), 'manual'),

-- Sprint 2 / Week 4 — Email Bison Dashboard (Tickets 24-26)

  ('task_gtm_24', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_06',
   '#24 Create CampaignStats model',
   'Story Points: 1 | Epic: Email Bison Dashboard | Sprint 2, Week 4

Scope:
- Prisma schema add
- Fields: programId, emailsSent, opens, replies, clicks, bounces, date
- Run migration

Acceptance Criteria:
- Model exists in DB',
   'usr_campus_logan', 'Logan', 'medium', '2026-03-15', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_25', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_06',
   '#25 Build campaign stats entry form',
   'Story Points: 3 | Epic: Email Bison Dashboard | Sprint 2, Week 4

Scope:
- Page: /dashboard/email-campaigns
- Form for Email Bison metrics
- Save to DB
- Basic validation

Acceptance Criteria:
- Can enter + save campaign stats',
   'usr_campus_arshia', 'Arshia', 'medium', '2026-03-15', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_26', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_06',
   '#26 Create Email Bison dashboard widget',
   'Story Points: 3 | Epic: Email Bison Dashboard | Sprint 2, Week 4

Scope:
- Widget on analytics dashboard
- Bar chart: emails -> replies conversion
- Aggregate stats across campaigns
- Date range filter

Acceptance Criteria:
- Widget displays Email Bison data correctly',
   'usr_campus_arshia', 'Arshia', 'medium', '2026-03-15', 'pending', NOW(), NOW(), 'manual'),

-- Sprint 3 / Week 5 — Conversion Webhook System (Tickets 27-32)

  ('task_gtm_27', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_07',
   '#27 Design webhook API contract',
   'Story Points: 2 | Epic: Conversion Webhook System | Sprint 3, Week 5

Scope:
- Document payload format
- Define auth strategy (API key)
- Document error responses
- Examples in README

Acceptance Criteria:
- API specification complete',
   'usr_campus_logan', 'Logan', 'high', '2026-03-22', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_28', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_07',
   '#28 Add Conversion model',
   'Story Points: 1 | Epic: Conversion Webhook System | Sprint 3, Week 5

Scope:
- Prisma schema update
- Fields: linkId, userId, convertedAt, value, metadata
- Run migration

Acceptance Criteria:
- Model exists, migration successful',
   'usr_campus_logan', 'Logan', 'medium', '2026-03-22', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_29', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_07',
   '#29 Create webhook endpoint',
   'Story Points: 5 | Epic: Conversion Webhook System | Sprint 3, Week 5

Scope:
- POST /api/conversions/webhook
- Validate payload structure
- Authenticate (API key)
- Match linkCode to TrackingLink
- Create Conversion record
- Increment conversion counter

Acceptance Criteria:
- Webhook works via Postman/curl',
   'usr_campus_will', 'Will', 'high', '2026-03-22', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_30', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_07',
   '#30 Add API key management',
   'Story Points: 3 | Epic: Conversion Webhook System | Sprint 3, Week 5

Scope:
- Generate keys per program
- Store hashed in DB
- UI to view/regenerate keys
- Verify keys on webhook

Acceptance Criteria:
- API key auth works',
   'usr_campus_will', 'Will', 'high', '2026-03-22', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_31', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_07',
   '#31 Test webhook integration',
   'Story Points: 2 | Epic: Conversion Webhook System | Sprint 3, Week 5

Scope:
- Postman collection
- Happy path + error cases
- Auth failures
- Document in README

Acceptance Criteria:
- Full test suite passes',
   'usr_campus_anusha', 'Anusha', 'medium', '2026-03-22', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_32', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_07',
   '#32 Add webhook logs UI',
   'Story Points: 2 | Epic: Conversion Webhook System | Sprint 3, Week 5

Scope:
- Show recent webhook attempts
- Display in founder dashboard
- Success/failure status
- Link to related conversion

Acceptance Criteria:
- Can debug webhook issues',
   'usr_campus_anusha', 'Anusha', 'medium', '2026-03-22', 'pending', NOW(), NOW(), 'manual'),

-- Sprint 3 / Week 6 — Conversion Dashboard & Visualization (Tickets 33-37)

  ('task_gtm_33', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_08',
   '#33 Update links API with conversions',
   'Story Points: 2 | Epic: Conversion Dashboard & Visualization | Sprint 3, Week 6

Scope:
- GET /api/links/[id] includes conversions
- Conversion rate = conversions / clicks
- Conversion timeline data

Acceptance Criteria:
- API returns conversion data',
   'usr_campus_will', 'Will', 'medium', '2026-03-29', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_34', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_08',
   '#34 Add conversions to link dashboard',
   'Story Points: 3 | Epic: Conversion Dashboard & Visualization | Sprint 3, Week 6

Scope:
- Conversion count per link
- Conversion rate %
- Update link analytics component
- Add "Conversions" column to table

Acceptance Criteria:
- Conversions visible on links page',
   'usr_campus_arshia', 'Arshia', 'medium', '2026-03-29', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_35', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_08',
   '#35 Create conversion timeline chart',
   'Story Points: 3 | Epic: Conversion Dashboard & Visualization | Sprint 3, Week 6

Scope:
- Line chart conversions over time
- Date range filter
- Recharts + tooltip details

Acceptance Criteria:
- Chart displays conversion trends',
   'usr_campus_arshia', 'Arshia', 'medium', '2026-03-29', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_36', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_08',
   '#36 Add top converting links widget',
   'Story Points: 2 | Epic: Conversion Dashboard & Visualization | Sprint 3, Week 6

Scope:
- Sort links by conversion rate
- Show top 5 on dashboard
- Link to detailed view + key metrics

Acceptance Criteria:
- Widget shows best performers',
   'usr_campus_anusha', 'Anusha', 'medium', '2026-03-29', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_37', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_08',
   '#37 Build CSV upload fallback',
   'Story Points: 3 | Epic: Conversion Dashboard & Visualization | Sprint 3, Week 6

Scope:
- Upload component
- Parse CSV: email, linkCode, date
- Match emails to link codes
- Create conversion records
- Import results (matched/failed)

Acceptance Criteria:
- Can upload CSV and import conversions',
   'usr_campus_will', 'Will', 'high', '2026-03-29', 'pending', NOW(), NOW(), 'manual'),

-- Sprint 4 / Week 7 — Funnel Analytics Dashboard (Tickets 38-42)

  ('task_gtm_38', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_09',
   '#38 Create funnel data aggregation API',
   'Story Points: 3 | Epic: Funnel Analytics Dashboard | Sprint 4, Week 7

Scope:
- GET /api/analytics/funnel
- Query: Email Bison stats, Applications, Conversions
- Drop-off rates between stages
- Date range filtering
- Program filtering

Acceptance Criteria:
- API returns complete funnel data',
   'usr_campus_logan', 'Logan', 'high', '2026-04-05', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_39', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_09',
   '#39 Build funnel chart component',
   'Story Points: 5 | Epic: Funnel Analytics Dashboard | Sprint 4, Week 7

Scope:
- Recharts funnel chart
- Stages: Emails Sent -> Replies -> Applications -> Accepted -> Conversions
- % + absolute counts
- Responsive + tooltips

Acceptance Criteria:
- Funnel displays correctly + looks professional',
   'usr_campus_arshia', 'Arshia', 'high', '2026-04-05', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_40', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_09',
   '#40 Add date range filter to funnel',
   'Story Points: 2 | Epic: Funnel Analytics Dashboard | Sprint 4, Week 7

Scope:
- Date picker + presets (7d, 30d, 90d, All time)
- Update funnel data on change

Acceptance Criteria:
- Filter works',
   'usr_campus_anusha', 'Anusha', 'medium', '2026-04-05', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_41', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_09',
   '#41 Add program comparison view',
   'Story Points: 3 | Epic: Funnel Analytics Dashboard | Sprint 4, Week 7

Scope:
- Multi-select program dropdown
- Side-by-side funnels
- Highlight best/worst + comparative metrics

Acceptance Criteria:
- Can compare program funnels',
   'usr_campus_will', 'Will', 'high', '2026-04-05', 'pending', NOW(), NOW(), 'manual'),

  ('task_gtm_42', 'd7132bd08ff71e079ff53f93', '02f5adb1cc09a4119d15eb6d', 'prj_epic_09',
   '#42 Create funnel dashboard page',
   'Story Points: 2 | Epic: Funnel Analytics Dashboard | Sprint 4, Week 7

Scope:
- Page: /dashboard/funnel
- Header with filters
- Funnel chart + summary cards

Acceptance Criteria:
- Funnel page complete',
   'usr_campus_anusha', 'Anusha', 'medium', '2026-04-05', 'pending', NOW(), NOW(), 'manual');

-- ============================================
-- 6. ADD PROJECT MEMBERS
-- ============================================

-- Epic 1: Table View (Will leads, Anusha + Arshia contribute)
INSERT INTO project_members (id, project_id, user_id, role) VALUES
  ('pm_e1_will', 'prj_epic_01', 'usr_campus_will', 'lead'),
  ('pm_e1_anusha', 'prj_epic_01', 'usr_campus_anusha', 'member'),
  ('pm_e1_arshia', 'prj_epic_01', 'usr_campus_arshia', 'member')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Epic 2: Email Infra (Logan leads, Arshia contributes)
INSERT INTO project_members (id, project_id, user_id, role) VALUES
  ('pm_e2_logan', 'prj_epic_02', 'usr_campus_logan', 'lead'),
  ('pm_e2_arshia', 'prj_epic_02', 'usr_campus_arshia', 'member')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Epic 3: Kanban (Will leads, Logan + Anusha contribute)
INSERT INTO project_members (id, project_id, user_id, role) VALUES
  ('pm_e3_will', 'prj_epic_03', 'usr_campus_will', 'lead'),
  ('pm_e3_logan', 'prj_epic_03', 'usr_campus_logan', 'member'),
  ('pm_e3_anusha', 'prj_epic_03', 'usr_campus_anusha', 'member')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Epic 4: Email Triggers (Arshia leads, Logan + Anusha contribute)
INSERT INTO project_members (id, project_id, user_id, role) VALUES
  ('pm_e4_arshia', 'prj_epic_04', 'usr_campus_arshia', 'lead'),
  ('pm_e4_logan', 'prj_epic_04', 'usr_campus_logan', 'member'),
  ('pm_e4_anusha', 'prj_epic_04', 'usr_campus_anusha', 'member')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Epic 5: Details & Actions (Will leads, Anusha contributes)
INSERT INTO project_members (id, project_id, user_id, role) VALUES
  ('pm_e5_will', 'prj_epic_05', 'usr_campus_will', 'lead'),
  ('pm_e5_anusha', 'prj_epic_05', 'usr_campus_anusha', 'member')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Epic 6: Email Bison (Arshia leads, Logan contributes)
INSERT INTO project_members (id, project_id, user_id, role) VALUES
  ('pm_e6_arshia', 'prj_epic_06', 'usr_campus_arshia', 'lead'),
  ('pm_e6_logan', 'prj_epic_06', 'usr_campus_logan', 'member')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Epic 7: Webhook System (Will leads, Logan + Anusha contribute)
INSERT INTO project_members (id, project_id, user_id, role) VALUES
  ('pm_e7_will', 'prj_epic_07', 'usr_campus_will', 'lead'),
  ('pm_e7_logan', 'prj_epic_07', 'usr_campus_logan', 'member'),
  ('pm_e7_anusha', 'prj_epic_07', 'usr_campus_anusha', 'member')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Epic 8: Conversion Dashboard (Arshia leads, Will + Anusha contribute)
INSERT INTO project_members (id, project_id, user_id, role) VALUES
  ('pm_e8_arshia', 'prj_epic_08', 'usr_campus_arshia', 'lead'),
  ('pm_e8_will', 'prj_epic_08', 'usr_campus_will', 'member'),
  ('pm_e8_anusha', 'prj_epic_08', 'usr_campus_anusha', 'member')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Epic 9: Funnel Analytics (Arshia leads, all contribute)
INSERT INTO project_members (id, project_id, user_id, role) VALUES
  ('pm_e9_arshia', 'prj_epic_09', 'usr_campus_arshia', 'lead'),
  ('pm_e9_logan', 'prj_epic_09', 'usr_campus_logan', 'member'),
  ('pm_e9_will', 'prj_epic_09', 'usr_campus_will', 'member'),
  ('pm_e9_anusha', 'prj_epic_09', 'usr_campus_anusha', 'member')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Epics 10-12: Post-sprint (all team members)
INSERT INTO project_members (id, project_id, user_id, role) VALUES
  ('pm_e10_will', 'prj_epic_10', 'usr_campus_will', 'member'),
  ('pm_e10_anusha', 'prj_epic_10', 'usr_campus_anusha', 'member'),
  ('pm_e10_arshia', 'prj_epic_10', 'usr_campus_arshia', 'member'),
  ('pm_e10_logan', 'prj_epic_10', 'usr_campus_logan', 'member'),
  ('pm_e11_will', 'prj_epic_11', 'usr_campus_will', 'member'),
  ('pm_e11_anusha', 'prj_epic_11', 'usr_campus_anusha', 'member'),
  ('pm_e11_arshia', 'prj_epic_11', 'usr_campus_arshia', 'member'),
  ('pm_e11_logan', 'prj_epic_11', 'usr_campus_logan', 'member'),
  ('pm_e12_will', 'prj_epic_12', 'usr_campus_will', 'member'),
  ('pm_e12_anusha', 'prj_epic_12', 'usr_campus_anusha', 'member'),
  ('pm_e12_arshia', 'prj_epic_12', 'usr_campus_arshia', 'member'),
  ('pm_e12_logan', 'prj_epic_12', 'usr_campus_logan', 'member')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Add Adam as owner on all projects
INSERT INTO project_members (id, project_id, user_id, role) VALUES
  ('pm_e1_adam', 'prj_epic_01', '8c9960a03dda2a6c9aa3932f', 'owner'),
  ('pm_e2_adam', 'prj_epic_02', '8c9960a03dda2a6c9aa3932f', 'owner'),
  ('pm_e3_adam', 'prj_epic_03', '8c9960a03dda2a6c9aa3932f', 'owner'),
  ('pm_e4_adam', 'prj_epic_04', '8c9960a03dda2a6c9aa3932f', 'owner'),
  ('pm_e5_adam', 'prj_epic_05', '8c9960a03dda2a6c9aa3932f', 'owner'),
  ('pm_e6_adam', 'prj_epic_06', '8c9960a03dda2a6c9aa3932f', 'owner'),
  ('pm_e7_adam', 'prj_epic_07', '8c9960a03dda2a6c9aa3932f', 'owner'),
  ('pm_e8_adam', 'prj_epic_08', '8c9960a03dda2a6c9aa3932f', 'owner'),
  ('pm_e9_adam', 'prj_epic_09', '8c9960a03dda2a6c9aa3932f', 'owner'),
  ('pm_e10_adam', 'prj_epic_10', '8c9960a03dda2a6c9aa3932f', 'owner'),
  ('pm_e11_adam', 'prj_epic_11', '8c9960a03dda2a6c9aa3932f', 'owner'),
  ('pm_e12_adam', 'prj_epic_12', '8c9960a03dda2a6c9aa3932f', 'owner')
ON CONFLICT (project_id, user_id) DO NOTHING;

COMMIT;
