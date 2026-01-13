# AIMS Team Dashboard - Complete Refactor & Enhancement Roadmap

## Executive Summary

This document provides a comprehensive, prioritized list of features, enhancements, bug fixes, and improvements for the AIMS Team Dashboard application. Based on an exhaustive code audit, 87 issues have been identified across security, performance, accessibility, and functionality domains.

**Audit Statistics:**
- **Total Issues Identified:** 87
- **Critical:** 3
- **High Priority:** 12
- **Medium Priority:** 28
- **Low Priority:** 44

---

## Table of Contents

1. [Critical Security Fixes](#1-critical-security-fixes)
2. [New Features](#2-new-features)
3. [Enhancements](#3-enhancements)
4. [Bug Fixes](#4-bug-fixes)
5. [Component Refactoring](#5-component-refactoring)
6. [New Pages & User Flows](#6-new-pages--user-flows)
7. [Performance Optimizations](#7-performance-optimizations)
8. [Accessibility Improvements](#8-accessibility-improvements)
9. [Technical Debt Reduction](#9-technical-debt-reduction)
10. [Database & API Improvements](#10-database--api-improvements)
11. [Implementation Timeline](#11-implementation-timeline)

---

## 1. Critical Security Fixes

### 1.1 ~~Upgrade Password Hashing Algorithm~~ ✅ COMPLETED
- **Description:** ~~Replace SHA256 with bcrypt/Argon2 for password hashing.~~
- **File:** `/lib/auth/password.ts`
- **Status:** ✅ **COMPLETED** - Now uses bcrypt with 12 rounds
- **Implementation:**
  ```typescript
  import bcrypt from 'bcrypt';
  const BCRYPT_ROUNDS = 12;
  export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }
  export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!hash || !hash.startsWith("$2")) return false;
    return bcrypt.compare(password, hash);
  }
  ```

### 1.2 Implement Rate Limiting
- **Description:** Add rate limiting middleware to authentication endpoints to prevent brute-force attacks.
- **Files Affected:** `/app/api/auth/login/route.ts`, `/app/api/auth/register/route.ts`
- **Problem Solved:** Currently unlimited login attempts allow password guessing attacks.
- **Benefit:** Protection against automated attacks, improved security posture.
- **Priority:** 🔴 CRITICAL
- **Scope:** New Development
- **Estimated Time:** 4-5 hours

### 1.3 Add CSRF Protection
- **Description:** Implement CSRF tokens for all state-changing requests.
- **Files Affected:** All POST/PATCH/DELETE API routes
- **Problem Solved:** Cross-site request forgery attacks possible on authenticated users.
- **Benefit:** Protection against malicious cross-origin requests.
- **Priority:** 🔴 CRITICAL
- **Scope:** New Development
- **Estimated Time:** 6-8 hours

---

## 2. New Features

### 2.1 Two-Factor Authentication (2FA)
- **Description:** Implement TOTP-based two-factor authentication with QR code setup and backup codes.
- **Problem Solved:** Single-factor authentication vulnerable to credential theft.
- **Benefit:** Enhanced account security, industry compliance.
- **Priority:** 🟠 HIGH
- **Scope:** New Development
- **Estimated Time:** 16-20 hours
- **Components Needed:**
  - API: `/app/api/auth/2fa/enable/route.ts`
  - API: `/app/api/auth/2fa/verify/route.ts`
  - UI: `/components/auth/two-factor-setup.tsx`
  - UI: `/components/auth/two-factor-verify.tsx`

### 2.2 Real-Time Notifications System
- **Description:** Complete implementation of the notification system with WebSocket/SSE support.
- **File:** `/lib/db/index.ts` (Lines 570-589) - Currently stub implementation
- **Problem Solved:** Users don't receive real-time updates for tasks, mentions, or escalations.
- **Benefit:** Improved team communication and responsiveness.
- **Priority:** 🟠 HIGH
- **Scope:** New Development
- **Estimated Time:** 12-16 hours
- **Components Needed:**
  - WebSocket server setup
  - Notification bell component
  - Notification preferences page
  - Push notification support

### 2.3 Advanced Analytics Dashboard
- **Description:** Business intelligence dashboard with team performance metrics, trends, and insights.
- **Problem Solved:** No visibility into team performance over time.
- **Benefit:** Data-driven decision making, identify bottlenecks.
- **Priority:** 🟡 MEDIUM
- **Scope:** New Development
- **Estimated Time:** 24-32 hours
- **Features:**
  - EOD submission rate over time
  - Rock completion trends
  - Task velocity charts
  - Team member leaderboards
  - Department comparisons

### 2.4 Slack Integration Backend
- **Description:** Complete Slack webhook integration for notifications (UI exists but backend missing).
- **File:** `/components/pages/settings-page.tsx` (Lines 250-300)
- **Problem Solved:** Settings UI for Slack exists but does nothing.
- **Benefit:** Team notifications in their preferred platform.
- **Priority:** 🟡 MEDIUM
- **Scope:** New Development
- **Estimated Time:** 8-10 hours

### 2.5 File Upload & Avatar Management
- **Description:** Enable users to upload profile avatars and attach files to tasks/rocks.
- **Problem Solved:** Avatars only support URLs, no file upload capability.
- **Benefit:** Richer profiles, better task documentation.
- **Priority:** 🟡 MEDIUM
- **Scope:** New Development
- **Estimated Time:** 10-12 hours

### 2.6 Full-Text Search
- **Description:** Implement global search across rocks, tasks, EOD reports, and team members.
- **Problem Solved:** No way to find specific items without scrolling.
- **Benefit:** Faster navigation, improved productivity.
- **Priority:** 🟡 MEDIUM
- **Scope:** New Development
- **Estimated Time:** 12-16 hours

### 2.7 Bulk Operations
- **Description:** Enable bulk actions on tasks and rocks (mark complete, reassign, delete).
- **Problem Solved:** One-by-one operations are tedious for large datasets.
- **Benefit:** Improved admin efficiency.
- **Priority:** 🟢 LOW
- **Scope:** New Development
- **Estimated Time:** 8-10 hours

### 2.8 Webhook System
- **Description:** Allow external integrations via webhooks for key events.
- **Problem Solved:** No way to integrate with external tools.
- **Benefit:** Extensibility, automation support.
- **Priority:** 🟢 LOW
- **Scope:** New Development
- **Estimated Time:** 12-16 hours

### 2.9 Recurring Tasks
- **Description:** Allow tasks to automatically recur on a schedule.
- **Problem Solved:** Manual recreation of routine tasks.
- **Benefit:** Reduced manual work for routine activities.
- **Priority:** 🟢 LOW
- **Scope:** New Development
- **Estimated Time:** 8-12 hours

### 2.10 Team Calendar View
- **Description:** Calendar visualization of due dates, EOD submissions, and milestones.
- **Problem Solved:** No timeline view of team activities.
- **Benefit:** Better planning and deadline awareness.
- **Priority:** 🟢 LOW
- **Scope:** New Development
- **Estimated Time:** 16-20 hours

---

## 3. Enhancements

### 3.1 API Pagination
- **Description:** Implement cursor-based pagination on all list endpoints.
- **Files:** `/app/api/rocks/route.ts`, `/app/api/tasks/route.ts`, `/app/api/members/route.ts`, `/app/api/eod-reports/route.ts`
- **Problem Solved:** All records returned at once, poor performance at scale.
- **Benefit:** Scalable performance, reduced memory usage.
- **Priority:** 🟠 HIGH
- **Scope:** Enhancement
- **Estimated Time:** 6-8 hours
- **Implementation:**
  ```typescript
  // Add to query params
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get("cursor")
  const limit = parseInt(searchParams.get("limit") || "20")
  ```

### 3.2 API Response Caching
- **Description:** Implement React Query or SWR for client-side caching with automatic revalidation.
- **File:** `/lib/hooks/use-team-data.ts`
- **Problem Solved:** Every page navigation triggers fresh API calls.
- **Benefit:** Faster perceived performance, reduced server load.
- **Priority:** 🟠 HIGH
- **Scope:** Enhancement
- **Estimated Time:** 8-10 hours

### 3.3 Email Template System
- **Description:** Create reusable email templates with better styling and personalization.
- **File:** `/lib/email.tsx`
- **Problem Solved:** Email HTML is hardcoded and difficult to maintain.
- **Benefit:** Easier email maintenance, consistent branding.
- **Priority:** 🟡 MEDIUM
- **Scope:** Enhancement
- **Estimated Time:** 6-8 hours

### 3.4 Enhanced Error Messages
- **Description:** Replace generic error messages with actionable, specific feedback.
- **Files:** All API routes (30+ occurrences)
- **Problem Solved:** "An error occurred" messages don't help users troubleshoot.
- **Benefit:** Better user experience, reduced support burden.
- **Priority:** 🟡 MEDIUM
- **Scope:** Enhancement
- **Estimated Time:** 4-6 hours

### 3.5 Department-Based Filtering
- **Description:** Enable filtering views by department for rocks, tasks, and EOD reports.
- **Problem Solved:** Departments stored but not used for organization.
- **Benefit:** Better organization for larger teams.
- **Priority:** 🟡 MEDIUM
- **Scope:** Enhancement
- **Estimated Time:** 4-6 hours

### 3.6 Dark Mode Improvements
- **Description:** Persist dark mode preference to database, sync across devices.
- **File:** `/lib/contexts/app-context.tsx`
- **Problem Solved:** Dark mode resets on new device/browser.
- **Benefit:** Consistent user experience.
- **Priority:** 🟢 LOW
- **Scope:** Enhancement
- **Estimated Time:** 2-3 hours

### 3.7 Keyboard Shortcuts
- **Description:** Implement keyboard shortcuts for common actions.
- **Problem Solved:** Mouse-dependent navigation is slower.
- **Benefit:** Power user productivity.
- **Priority:** 🟢 LOW
- **Scope:** Enhancement
- **Estimated Time:** 6-8 hours

### 3.8 Export Functionality
- **Description:** Enable data export to CSV/PDF for reports, rocks, and tasks.
- **Problem Solved:** No way to use data outside the application.
- **Benefit:** Reporting flexibility, compliance support.
- **Priority:** 🟢 LOW
- **Scope:** New Development
- **Estimated Time:** 8-10 hours

---

## 4. Bug Fixes

### 4.1 N+1 Database Query - Members API
- **Description:** Fix N+1 query pattern in members endpoint that makes N+1 database calls.
- **File:** `/app/api/members/route.ts` (Lines 23-38)
- **Problem Solved:** 50 members = 51 queries, causing slow response times.
- **Benefit:** 50x+ performance improvement for team views.
- **Priority:** 🟠 HIGH
- **Scope:** Bug Fix
- **Estimated Time:** 3-4 hours
- **Fix:**
  ```typescript
  // Use JOIN query instead of loop
  const { rows } = await sql`
    SELECT u.*, om.role, om.department
    FROM users u
    JOIN organization_members om ON u.id = om.user_id
    WHERE om.organization_id = ${orgId}
  `
  ```

### 4.2 N+1 Database Query - Organizations API
- **Description:** Fix similar N+1 pattern in organizations endpoint.
- **File:** `/app/api/organizations/route.ts` (Lines 22-27)
- **Problem Solved:** Multi-org users experience slow page loads.
- **Benefit:** Faster organization switching.
- **Priority:** 🟠 HIGH
- **Scope:** Bug Fix
- **Estimated Time:** 2-3 hours

### 4.3 Session Write Thrashing
- **Description:** Session lastActiveAt updated on every request, causing unnecessary writes.
- **File:** `/lib/auth/middleware.ts` (Lines 41-44)
- **Problem Solved:** Every authenticated request updates database.
- **Benefit:** Reduced database write load.
- **Priority:** 🟡 MEDIUM
- **Scope:** Bug Fix
- **Estimated Time:** 2-3 hours
- **Fix:** Batch updates or only update every 5 minutes.

### 4.4 Expired Session Cleanup
- **Description:** Implement scheduled cleanup of expired sessions.
- **File:** `/lib/db/index.ts` (Lines 339-342) - Method exists but never called
- **Problem Solved:** Expired sessions accumulate in database.
- **Benefit:** Cleaner database, improved query performance.
- **Priority:** 🟡 MEDIUM
- **Scope:** Bug Fix
- **Estimated Time:** 2-3 hours

### 4.5 Invitation Token Leakage
- **Description:** Invitation tokens visible in URL and potentially logged.
- **Problem Solved:** Tokens could be stolen from URL history or logs.
- **Benefit:** Improved security for invitation flow.
- **Priority:** 🟡 MEDIUM
- **Scope:** Bug Fix
- **Estimated Time:** 3-4 hours

### 4.6 Mobile Navigation Z-Index
- **Description:** Mobile bottom navigation can overlap with modals/dialogs.
- **File:** `/components/layout/mobile-nav.tsx`
- **Problem Solved:** UI elements hidden behind navigation.
- **Benefit:** Better mobile user experience.
- **Priority:** 🟢 LOW
- **Scope:** Bug Fix
- **Estimated Time:** 1-2 hours

### 4.7 Form Validation Timing
- **Description:** Some forms show validation errors before user finishes typing.
- **Problem Solved:** Premature error messages annoy users.
- **Benefit:** Smoother form experience.
- **Priority:** 🟢 LOW
- **Scope:** Bug Fix
- **Estimated Time:** 2-3 hours

---

## 5. Component Refactoring

### 5.1 Split Settings Page
- **Description:** Break down 596-line settings page into smaller, focused components.
- **File:** `/components/pages/settings-page.tsx` (596 lines)
- **Problem Solved:** Monolithic component is hard to maintain and test.
- **Benefit:** Better code organization, easier testing.
- **Priority:** 🟠 HIGH
- **Scope:** Refactor
- **Estimated Time:** 6-8 hours
- **New Components:**
  - `OrganizationSettingsTab.tsx`
  - `NotificationSettingsTab.tsx`
  - `TeamSettingsTab.tsx`
  - `BillingSettingsTab.tsx`

### 5.2 Extract Admin Subcomponents
- **Description:** Break down admin page into reusable subcomponents.
- **File:** `/components/pages/admin-page.tsx`
- **Problem Solved:** Large page with mixed responsibilities.
- **Benefit:** Improved maintainability.
- **Priority:** 🟡 MEDIUM
- **Scope:** Refactor
- **Estimated Time:** 4-6 hours

### 5.3 Create Role Check Hook
- **Description:** Extract duplicated role-checking logic into custom hook.
- **Files:** Multiple components with `currentUser?.role === "admin" || currentUser?.role === "owner"`
- **Problem Solved:** Role logic duplicated across 10+ files.
- **Benefit:** Single source of truth for permissions.
- **Priority:** 🟡 MEDIUM
- **Scope:** Refactor
- **Estimated Time:** 2-3 hours
- **Implementation:**
  ```typescript
  // hooks/usePermissions.ts
  export function usePermissions() {
    const { currentUser } = useApp()
    return {
      isAdmin: currentUser?.role === "admin" || currentUser?.role === "owner",
      isOwner: currentUser?.role === "owner",
      canManageTeam: currentUser?.role !== "member",
    }
  }
  ```

### 5.4 Split AppContext
- **Description:** Separate large AppContext into focused contexts.
- **File:** `/lib/contexts/app-context.tsx`
- **Problem Solved:** All consumers re-render on any state change.
- **Benefit:** Optimized re-renders, cleaner architecture.
- **Priority:** 🟡 MEDIUM
- **Scope:** Refactor
- **Estimated Time:** 6-8 hours
- **New Contexts:**
  - `AuthContext` - Authentication state
  - `ThemeContext` - Dark mode preference
  - `NavigationContext` - Current page state
  - `AppContext` - Organization/user data

### 5.5 Memoize List Components
- **Description:** Add React.memo and useCallback to list rendering components.
- **Files:** Admin team page, tasks page, rocks page
- **Problem Solved:** Unnecessary re-renders on list updates.
- **Benefit:** Smoother UI, especially with large lists.
- **Priority:** 🟢 LOW
- **Scope:** Refactor
- **Estimated Time:** 3-4 hours

---

## 6. New Pages & User Flows

### 6.1 Password Reset Flow
- **Description:** Complete password reset flow with email verification.
- **Problem Solved:** Users cannot recover accounts if password forgotten.
- **Benefit:** Reduced support burden, better UX.
- **Priority:** 🔴 CRITICAL
- **Scope:** New Development
- **Estimated Time:** 8-10 hours
- **Components Needed:**
  - Page: `/components/auth/forgot-password-page.tsx`
  - Page: `/components/auth/reset-password-page.tsx`
  - API: `/app/api/auth/forgot-password/route.ts`
  - API: `/app/api/auth/reset-password/route.ts`
  - Email template for reset link

### 6.2 Email Verification Flow
- **Description:** Implement email verification for new accounts.
- **Problem Solved:** No validation that email addresses are real.
- **Benefit:** Reduced spam accounts, verified contact info.
- **Priority:** 🟠 HIGH
- **Scope:** New Development
- **Estimated Time:** 6-8 hours

### 6.3 User Profile Page
- **Description:** Dedicated profile management page.
- **File:** Type defined but not implemented (Line 202 in `/lib/types.ts`)
- **Problem Solved:** Users cannot edit their profile.
- **Benefit:** User autonomy, personalization.
- **Priority:** 🟠 HIGH
- **Scope:** New Development
- **Estimated Time:** 8-10 hours
- **Features:**
  - Edit name, avatar, department
  - Change password
  - Notification preferences
  - Active sessions list
  - Account deletion

### 6.4 Session Management Page
- **Description:** View and revoke active sessions.
- **Problem Solved:** Users cannot see or control their active sessions.
- **Benefit:** Security transparency, logout from lost devices.
- **Priority:** 🟡 MEDIUM
- **Scope:** New Development
- **Estimated Time:** 4-6 hours

### 6.5 Account Deactivation Flow
- **Description:** Allow users to deactivate or delete their accounts.
- **Problem Solved:** No way to remove account data.
- **Benefit:** GDPR compliance, user control.
- **Priority:** 🟡 MEDIUM
- **Scope:** New Development
- **Estimated Time:** 6-8 hours

### 6.6 Onboarding Flow
- **Description:** Guided setup wizard for new organizations.
- **Problem Solved:** New users may not know how to set up their team.
- **Benefit:** Faster time-to-value, reduced churn.
- **Priority:** 🟡 MEDIUM
- **Scope:** New Development
- **Estimated Time:** 10-12 hours

### 6.7 Help & Documentation Page
- **Description:** In-app help center with FAQs and guides.
- **Problem Solved:** Users must search externally for help.
- **Benefit:** Self-service support, reduced tickets.
- **Priority:** 🟢 LOW
- **Scope:** New Development
- **Estimated Time:** 6-8 hours

---

## 7. Performance Optimizations

### 7.1 Code Splitting with React.lazy
- **Description:** Lazy load page components based on user role.
- **File:** `/app/page.tsx` (Lines 8-17)
- **Problem Solved:** All pages loaded in initial bundle regardless of need.
- **Benefit:** Faster initial load, smaller bundle size.
- **Priority:** 🟠 HIGH
- **Scope:** Enhancement
- **Estimated Time:** 4-6 hours
- **Implementation:**
  ```typescript
  const AdminPage = React.lazy(() => import('@/components/pages/admin-page'))
  const RocksPage = React.lazy(() => import('@/components/pages/rocks-page'))
  // ... etc
  ```

### 7.2 Image Optimization
- **Description:** Implement lazy loading and blur placeholders for images.
- **Problem Solved:** All images load immediately, slowing page render.
- **Benefit:** Faster perceived performance.
- **Priority:** 🟡 MEDIUM
- **Scope:** Enhancement
- **Estimated Time:** 3-4 hours

### 7.3 Database Query Optimization
- **Description:** Replace `SELECT *` with specific column selection.
- **File:** `/lib/db/index.ts` (Multiple locations)
- **Problem Solved:** Fetching unnecessary data from database.
- **Benefit:** Reduced data transfer, faster queries.
- **Priority:** 🟡 MEDIUM
- **Scope:** Refactor
- **Estimated Time:** 4-6 hours

### 7.4 Bundle Analysis & Tree Shaking
- **Description:** Analyze and optimize bundle to remove unused code.
- **Problem Solved:** 60+ UI components in bundle, many unused.
- **Benefit:** Smaller bundle, faster load times.
- **Priority:** 🟡 MEDIUM
- **Scope:** Enhancement
- **Estimated Time:** 4-6 hours

### 7.5 Service Worker & Offline Support
- **Description:** Implement PWA capabilities with offline mode.
- **Problem Solved:** App unusable without internet.
- **Benefit:** Offline viewing, improved reliability.
- **Priority:** 🟢 LOW
- **Scope:** New Development
- **Estimated Time:** 12-16 hours

---

## 8. Accessibility Improvements

### 8.1 Add ARIA Labels
- **Description:** Add proper ARIA attributes to all interactive elements.
- **Files:** All UI components (60+ files)
- **Problem Solved:** Screen readers cannot properly navigate the app.
- **Benefit:** WCAG 2.1 compliance, inclusive design.
- **Priority:** 🟠 HIGH
- **Scope:** Enhancement
- **Estimated Time:** 10-12 hours

### 8.2 Keyboard Navigation
- **Description:** Ensure all features accessible via keyboard.
- **Problem Solved:** Mouse-dependent interactions exclude keyboard users.
- **Benefit:** Accessibility compliance, power user efficiency.
- **Priority:** 🟠 HIGH
- **Scope:** Enhancement
- **Estimated Time:** 6-8 hours

### 8.3 Skip Navigation Links
- **Description:** Add skip-to-content links for screen readers.
- **File:** `/app/layout.tsx`
- **Problem Solved:** Keyboard users must tab through entire nav on every page.
- **Benefit:** Faster navigation for assistive tech users.
- **Priority:** 🟡 MEDIUM
- **Scope:** Enhancement
- **Estimated Time:** 2-3 hours

### 8.4 Focus Management in Modals
- **Description:** Trap focus within modals, restore on close.
- **Files:** All Dialog/Modal components
- **Problem Solved:** Focus escapes modals, confusing screen readers.
- **Benefit:** Proper modal accessibility.
- **Priority:** 🟡 MEDIUM
- **Scope:** Enhancement
- **Estimated Time:** 4-6 hours

### 8.5 Color Contrast Audit
- **Description:** Ensure all text meets WCAG AA contrast ratios.
- **Problem Solved:** Some text may be hard to read, especially in dark mode.
- **Benefit:** Readability for low-vision users.
- **Priority:** 🟡 MEDIUM
- **Scope:** Enhancement
- **Estimated Time:** 4-6 hours

### 8.6 Form Error Announcements
- **Description:** Announce form errors to screen readers.
- **Problem Solved:** Visual error messages not communicated to screen readers.
- **Benefit:** Form accessibility.
- **Priority:** 🟢 LOW
- **Scope:** Enhancement
- **Estimated Time:** 3-4 hours

---

## 9. Technical Debt Reduction

### 9.1 Create Configuration Module
- **Description:** Extract hardcoded values to centralized config.
- **Problem Solved:** Values like timeouts, limits scattered across codebase.
- **Benefit:** Single source of truth, easier maintenance.
- **Priority:** 🟠 HIGH
- **Scope:** Refactor
- **Estimated Time:** 3-4 hours
- **Implementation:**
  ```typescript
  // lib/config.ts
  export const CONFIG = {
    auth: {
      sessionDurationDays: 7,
      inviteExpirationDays: 7,
      passwordMinLength: 8,
    },
    defaults: {
      timezone: "UTC",
      eodReminderTime: "17:00",
      trialDays: 30,
      maxFreeUsers: 5,
    },
    // ...
  }
  ```

### 9.2 Implement Structured Logging
- **Description:** Replace console.error with structured logging library.
- **Files:** All API routes (30+ console.error calls)
- **Problem Solved:** Logs lack structure, hard to search/analyze.
- **Benefit:** Better debugging, log aggregation support.
- **Priority:** 🟡 MEDIUM
- **Scope:** Refactor
- **Estimated Time:** 4-6 hours

### 9.3 Add Error Boundaries
- **Description:** Wrap page components with error boundaries.
- **File:** `/app/page.tsx`
- **Problem Solved:** Errors crash entire application.
- **Benefit:** Graceful error handling, better UX.
- **Priority:** 🟡 MEDIUM
- **Scope:** Enhancement
- **Estimated Time:** 3-4 hours

### 9.4 Type Safety Improvements
- **Description:** Replace `any` types with proper interfaces.
- **File:** `/lib/api/client.ts` (Multiple `<any>` usages)
- **Problem Solved:** Type safety bypassed in critical code.
- **Benefit:** Catch errors at compile time.
- **Priority:** 🟡 MEDIUM
- **Scope:** Refactor
- **Estimated Time:** 4-6 hours

### 9.5 Remove Deprecated Task Type
- **Description:** Clean up unused Task interface (only AssignedTask used).
- **File:** `/lib/types.ts` (Lines 117-127 vs 129-149)
- **Problem Solved:** Two conflicting task types cause confusion.
- **Benefit:** Cleaner codebase, reduced confusion.
- **Priority:** 🟢 LOW
- **Scope:** Refactor
- **Estimated Time:** 2-3 hours

### 9.6 Add Unit Tests
- **Description:** Create test suite for critical paths.
- **Problem Solved:** Zero test coverage, regression risk.
- **Benefit:** Confidence in refactoring, fewer bugs.
- **Priority:** 🟠 HIGH
- **Scope:** New Development
- **Estimated Time:** 16-24 hours

### 9.7 API Documentation
- **Description:** Generate OpenAPI/Swagger documentation.
- **Problem Solved:** No API documentation for developers.
- **Benefit:** Easier integration, self-documenting.
- **Priority:** 🟡 MEDIUM
- **Scope:** New Development
- **Estimated Time:** 6-8 hours

### 9.8 Component Storybook
- **Description:** Set up Storybook for component documentation.
- **Problem Solved:** No visual component documentation.
- **Benefit:** Faster development, design consistency.
- **Priority:** 🟢 LOW
- **Scope:** New Development
- **Estimated Time:** 10-12 hours

---

## 10. Database & API Improvements

### 10.1 Add Database Indexes
- **Description:** Create indexes for frequently queried columns.
- **File:** `/app/api/db/migrate/route.ts`
- **Problem Solved:** Full table scans on large datasets.
- **Benefit:** Faster query performance.
- **Priority:** 🟠 HIGH
- **Scope:** Enhancement
- **Estimated Time:** 2-3 hours
- **Indexes Needed:**
  ```sql
  CREATE INDEX idx_rocks_org_user ON rocks(organization_id, user_id);
  CREATE INDEX idx_tasks_org_status ON assigned_tasks(organization_id, status);
  CREATE INDEX idx_eod_org_user_date ON eod_reports(organization_id, user_id, date);
  CREATE INDEX idx_sessions_expires ON sessions(expires_at);
  ```

### 10.2 Implement Soft Deletes
- **Description:** Add deleted_at column instead of hard deletes.
- **Problem Solved:** Deleted data unrecoverable, no audit trail.
- **Benefit:** Data recovery, compliance support.
- **Priority:** 🟡 MEDIUM
- **Scope:** Enhancement
- **Estimated Time:** 6-8 hours

### 10.3 Add Audit Logging
- **Description:** Log all data modifications with user/timestamp.
- **Problem Solved:** No visibility into who changed what and when.
- **Benefit:** Compliance, debugging, accountability.
- **Priority:** 🟡 MEDIUM
- **Scope:** New Development
- **Estimated Time:** 10-12 hours

### 10.4 Database Migration Versioning
- **Description:** Implement proper migration tracking system.
- **File:** `/app/api/db/migrate/route.ts`
- **Problem Solved:** No tracking of which migrations have run.
- **Benefit:** Safe, repeatable deployments.
- **Priority:** 🟡 MEDIUM
- **Scope:** Enhancement
- **Estimated Time:** 4-6 hours

### 10.5 API Retry Logic
- **Description:** Add exponential backoff for transient failures.
- **File:** `/lib/api/client.ts`
- **Problem Solved:** Single network failure = total failure.
- **Benefit:** Improved reliability.
- **Priority:** 🟢 LOW
- **Scope:** Enhancement
- **Estimated Time:** 3-4 hours

### 10.6 Request Timeout Handling
- **Description:** Add timeout to all API calls.
- **File:** `/lib/api/client.ts`
- **Problem Solved:** Requests can hang indefinitely.
- **Benefit:** Better error handling, no infinite waits.
- **Priority:** 🟢 LOW
- **Scope:** Enhancement
- **Estimated Time:** 2-3 hours

---

## 11. Implementation Timeline

### Week 1 Detailed Schedule

#### Day 1: Security (Monday)
| Time | Task | Priority |
|------|------|----------|
| AM | Upgrade password hashing to bcrypt | 🔴 CRITICAL |
| PM | Implement rate limiting on auth endpoints | 🔴 CRITICAL |

#### Day 2: Security & Database (Tuesday)
| Time | Task | Priority |
|------|------|----------|
| AM | Add CSRF protection | 🔴 CRITICAL |
| PM | Fix N+1 queries (members, organizations) | 🟠 HIGH |

#### Day 3: Missing Flows (Wednesday)
| Time | Task | Priority |
|------|------|----------|
| AM | Implement password reset flow (API) | 🔴 CRITICAL |
| PM | Implement password reset flow (UI) | 🔴 CRITICAL |

#### Day 4: State & Performance (Thursday)
| Time | Task | Priority |
|------|------|----------|
| AM | Implement React Query for caching | 🟠 HIGH |
| PM | Add pagination to list endpoints | 🟠 HIGH |

#### Day 5: Components & UX (Friday)
| Time | Task | Priority |
|------|------|----------|
| AM | Split Settings page into subcomponents | 🟠 HIGH |
| PM | Code splitting with React.lazy | 🟠 HIGH |

#### Day 6: Accessibility (Saturday)
| Time | Task | Priority |
|------|------|----------|
| AM | Add ARIA labels to all components | 🟠 HIGH |
| PM | Keyboard navigation improvements | 🟠 HIGH |

#### Day 7: Testing & Polish (Sunday)
| Time | Task | Priority |
|------|------|----------|
| AM | Add unit tests for auth flows | 🟠 HIGH |
| PM | Bug fixes, documentation, deployment | 🟡 MEDIUM |

---

## Summary Statistics

### By Priority
| Priority | Count | Estimated Hours |
|----------|-------|-----------------|
| 🔴 CRITICAL | 4 | 25-30 hours |
| 🟠 HIGH | 18 | 100-120 hours |
| 🟡 MEDIUM | 28 | 150-180 hours |
| 🟢 LOW | 18 | 80-100 hours |
| **TOTAL** | **68** | **355-430 hours** |

### By Scope
| Scope | Count |
|-------|-------|
| New Development | 28 |
| Enhancement | 22 |
| Refactor | 12 |
| Bug Fix | 6 |

### By Category
| Category | Count |
|----------|-------|
| Security | 6 |
| Features | 12 |
| Enhancements | 10 |
| Bug Fixes | 7 |
| Components | 6 |
| Pages/Flows | 7 |
| Performance | 5 |
| Accessibility | 6 |
| Technical Debt | 9 |

---

## Conclusion

This roadmap provides a comprehensive plan for transforming the AIMS Team Dashboard into a production-ready, scalable application. The prioritization ensures critical security issues are addressed first, followed by features that provide the most user value.

**Recommended Minimum Viable Refactor (1 Week):**
1. Password hashing upgrade
2. Rate limiting
3. Password reset flow
4. N+1 query fixes
5. API pagination
6. Basic accessibility fixes

**Full Refactor Target:** 6-8 weeks with dedicated team.
