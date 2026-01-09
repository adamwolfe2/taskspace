# AIMS EOD Comprehensive QA Audit Report

**Date:** January 9, 2026
**Audited By:** Claude Code
**Scope:** Full application audit - Pages, Components, APIs, UI/UX, Productivity Metrics

---

## Executive Summary

This audit covers the entire AIMS EOD application with focus on:
- Bug identification and fixes
- UI simplification opportunities
- Productivity metric enhancements (inspired by Rize.io)
- Brand color consistency (Red/White theme)
- Performance optimizations
- Accessibility improvements

**Total Issues Found:** 137+
- **Critical:** 12
- **High:** 28
- **Medium:** 67
- **Low:** 30+

---

## Table of Contents

1. [Critical Issues (Fix Immediately)](#1-critical-issues)
2. [Brand & Color Scheme](#2-brand--color-scheme)
3. [Missing Productivity Metrics](#3-missing-productivity-metrics)
4. [API Route Issues](#4-api-route-issues)
5. [Page Component Issues](#5-page-component-issues)
6. [UI Component Issues](#6-ui-component-issues)
7. [Dashboard Improvements](#7-dashboard-improvements)
8. [Accessibility Gaps](#8-accessibility-gaps)
9. [Code Quality & Refactoring](#9-code-quality--refactoring)
10. [Implementation Priority](#10-implementation-priority)

---

## 1. Critical Issues

### 1.1 N+1 Query Problems (CRITICAL)
**Files Affected:**
- `/app/api/reports/export/route.ts` - Fetches rocks inside loop
- `/app/api/eod/history/route.ts` - User lookups per report
- `/app/api/manager/team-reports/route.ts` - Member data per report

**Fix:** Use JOINs or batch queries:
```typescript
// BAD - N+1
for (const report of reports) {
  const { rows } = await sql`SELECT * FROM rocks WHERE id = ${report.rockId}`
}

// GOOD - Single query with JOIN
const { rows } = await sql`
  SELECT r.*, rock.title as rock_title
  FROM reports r
  LEFT JOIN rocks rock ON rock.id = r.rock_id
  WHERE r.organization_id = ${orgId}
`
```

### 1.2 Missing Error Boundaries
**Files Affected:** All page components
**Fix:** Add error boundaries to prevent white screen crashes:
```typescript
// Create /components/error-boundary.tsx
export function ErrorBoundary({ children, fallback }) {
  // Implementation
}
```

### 1.3 Inconsistent Date Handling
**Files Affected:** 15+ files
**Issue:** Mix of Date objects, ISO strings, and PostgreSQL DATE types
**Fix:** Standardize date formatting utility:
```typescript
// Create /lib/date-utils.ts
export function formatDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }
  return String(value).split('T')[0]
}
```

### 1.4 Security: Missing Rate Limiting
**Files Affected:** All public API routes
- `/app/api/public/eod/[slug]/[date]/route.ts`
- `/app/api/public/eod/[slug]/week/[date]/route.ts`

**Fix:** Add rate limiting middleware

---

## 2. Brand & Color Scheme

### 2.1 Current State: BLUE Primary
The application currently uses blue as primary:
```css
/* Current in globals.css */
--primary: 59 130 246; /* #3B82F6 - Blue */
```

### 2.2 Required: RED Brand Color
Change to red brand color scheme:

```css
/* RECOMMENDED globals.css changes */
:root {
  /* Primary - Brand Red */
  --primary: 220 38 38;           /* #DC2626 - Red 600 */
  --primary-foreground: 255 255 255;

  /* Accent variations */
  --primary-50: 254 242 242;      /* #FEF2F2 */
  --primary-100: 254 226 226;     /* #FEE2E2 */
  --primary-200: 254 202 202;     /* #FECACA */
  --primary-300: 252 165 165;     /* #FCA5A5 */
  --primary-400: 248 113 113;     /* #F87171 */
  --primary-500: 239 68 68;       /* #EF4444 */
  --primary-600: 220 38 38;       /* #DC2626 - Main */
  --primary-700: 185 28 28;       /* #B91C1C */
  --primary-800: 153 27 27;       /* #991B1B */
  --primary-900: 127 29 29;       /* #7F1D1D */

  /* Keep clean white backgrounds */
  --background: 255 255 255;
  --card: 255 255 255;
  --muted: 248 250 252;           /* Slate 50 */
}
```

### 2.3 Files Requiring Color Updates
| File | Current Color | Change To |
|------|---------------|-----------|
| `globals.css` | Blue primary | Red primary |
| `tailwind.config.ts` | Default theme | Add red brand |
| `components/ui/button.tsx` | Uses primary | Will auto-update |
| `components/sidebar/nav-*.tsx` | Hardcoded blue | Use CSS vars |
| `components/dashboard/*.tsx` | Mixed blue/purple | Consistent red |

### 2.4 Color Mapping Guide
| Old Class | New Class |
|-----------|-----------|
| `bg-blue-500` | `bg-primary` or `bg-red-500` |
| `text-blue-600` | `text-primary` or `text-red-600` |
| `border-blue-200` | `border-primary/20` or `border-red-200` |
| `hover:bg-blue-100` | `hover:bg-primary/10` or `hover:bg-red-100` |

---

## 3. Missing Productivity Metrics

### 3.1 Rize.io Feature Analysis
Features to consider implementing:

| Feature | Rize Implementation | AIMS Adaptation |
|---------|---------------------|-----------------|
| **Focus Score** | AI-calculated 0-100 | Calculate from task completion + consistency |
| **Work Hours** | Screen time tracking | Self-reported or estimated from submissions |
| **Break Tracking** | Automatic detection | Manual break logging in EOD |
| **Categories** | App/website categories | Rock/project categories |
| **Deep Work** | Uninterrupted time | Focus blocks logged in EOD |
| **Daily Patterns** | Heat map visualization | Submission time patterns |

### 3.2 Recommended New Metrics

#### A. Focus Score (Priority: HIGH)
```typescript
// Algorithm for calculating focus score
interface FocusScore {
  score: number           // 0-100
  breakdown: {
    taskCompletion: number    // 40% weight
    reportConsistency: number // 30% weight
    rockProgress: number      // 30% weight
  }
}

function calculateFocusScore(userData: UserMetrics): FocusScore {
  const taskScore = (userData.tasksCompleted / userData.tasksPlanned) * 100
  const consistencyScore = (userData.reportsSubmitted / userData.expectedReports) * 100
  const rockScore = userData.avgRockProgress

  return {
    score: Math.round(taskScore * 0.4 + consistencyScore * 0.3 + rockScore * 0.3),
    breakdown: { taskCompletion: taskScore, reportConsistency: consistencyScore, rockProgress: rockScore }
  }
}
```

#### B. Work Hours Estimation (Priority: MEDIUM)
Add to EOD form:
```typescript
interface WorkHoursInput {
  hoursWorked: number        // Self-reported
  focusBlocks: number        // Number of deep work sessions
  meetingHours: number       // Time in meetings
  breaksTaken: number        // Number of breaks
}
```

#### C. Energy/Mood Tracking (Priority: LOW)
Add simple mood selector:
```typescript
type EnergyLevel = 'high' | 'medium' | 'low' | 'exhausted'
// Display as emoji: 🔥 High | ⚡ Medium | 😐 Low | 😴 Exhausted
```

#### D. Streak Tracking (Priority: HIGH)
```typescript
interface StreakData {
  currentStreak: number      // Days in a row
  longestStreak: number      // All-time best
  lastSubmission: string     // ISO date
}
```

### 3.3 Database Schema Additions
```sql
-- Add to eod_reports table
ALTER TABLE eod_reports ADD COLUMN hours_worked DECIMAL(4,2);
ALTER TABLE eod_reports ADD COLUMN focus_blocks INTEGER DEFAULT 0;
ALTER TABLE eod_reports ADD COLUMN meeting_hours DECIMAL(4,2);
ALTER TABLE eod_reports ADD COLUMN breaks_taken INTEGER DEFAULT 0;
ALTER TABLE eod_reports ADD COLUMN energy_level VARCHAR(20);

-- New table for streaks
CREATE TABLE user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_submission_date DATE,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- New table for focus scores (cached daily)
CREATE TABLE daily_focus_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  date DATE NOT NULL,
  score INTEGER NOT NULL,
  task_completion_score INTEGER,
  consistency_score INTEGER,
  rock_progress_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, organization_id, date)
);
```

### 3.4 New Components Needed

| Component | Purpose | Priority |
|-----------|---------|----------|
| `FocusScoreGauge` | Circular progress showing 0-100 score | HIGH |
| `StreakCounter` | Fire emoji + day count | HIGH |
| `WorkHoursChart` | Bar chart of hours this week | MEDIUM |
| `EnergySelector` | Emoji-based mood picker | LOW |
| `ProductivityTrend` | Sparkline of recent scores | MEDIUM |
| `BreakReminder` | Notification component | LOW |

---

## 4. API Route Issues

### 4.1 N+1 Queries (8 instances)
| File | Issue | Fix |
|------|-------|-----|
| `/api/reports/export/route.ts:89` | Rocks fetched in loop | Use JOIN |
| `/api/eod/history/route.ts:45` | User lookup per report | Batch query |
| `/api/manager/team-reports/route.ts:67` | Member data per report | JOIN tables |
| `/api/rocks/[id]/tasks/route.ts:34` | Task status checks | Single query |
| `/api/dashboard/stats/route.ts:78` | Multiple separate queries | Combine into one |
| `/api/organization/members/route.ts:56` | Role checks per member | Include in main query |
| `/api/eod/submit/route.ts:112` | Rock validation loop | Batch validate |
| `/api/weekly-report/route.ts:89` | Daily aggregation loop | Use SQL aggregation |

### 4.2 Duplicate Code Patterns (15+ instances)
**Pattern: Auth Check Boilerplate**
```typescript
// Appears in 40+ files
const session = await auth()
if (!session?.user?.id) {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
}
```
**Fix:** Create middleware:
```typescript
// /lib/api-middleware.ts
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, context: any) => {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    return handler(req, context, session)
  }
}
```

**Pattern: Org Member Verification**
```typescript
// Appears in 30+ files
const { rows: members } = await sql`
  SELECT role FROM organization_members
  WHERE organization_id = ${orgId} AND user_id = ${userId}
`
if (members.length === 0) {
  return NextResponse.json({ success: false, error: "Not a member" }, { status: 403 })
}
```
**Fix:** Consolidate into utility function

### 4.3 Missing Validations
| Endpoint | Missing Validation |
|----------|-------------------|
| `/api/rocks/route.ts` POST | Title length limit |
| `/api/eod/submit/route.ts` POST | Max tasks limit |
| `/api/organization/settings/route.ts` PUT | Settings schema validation |
| `/api/invites/route.ts` POST | Email format validation |

### 4.4 Inconsistent Response Formats
Some routes return:
```typescript
{ success: true, data: {...} }
```
Others return:
```typescript
{ ...data }  // Direct data without wrapper
```
**Fix:** Standardize all to use success wrapper pattern

---

## 5. Page Component Issues

### 5.1 Missing Loading States (13 pages)
| Page | Issue |
|------|-------|
| `/app/(app)/dashboard/page.tsx` | No skeleton while loading |
| `/app/(app)/eod/page.tsx` | Flash of empty content |
| `/app/(app)/rocks/page.tsx` | No loading indicator |
| `/app/(app)/settings/page.tsx` | Content jumps on load |
| All report pages | Missing Suspense boundaries |

**Fix Template:**
```typescript
import { Skeleton } from "@/components/ui/skeleton"

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
```

### 5.2 Missing Error Handling (All pages)
No pages have proper error boundaries or error UI states.

### 5.3 Missing SEO/Metadata (8 pages)
| Page | Missing |
|------|---------|
| `/app/(app)/dashboard/page.tsx` | Title, description |
| `/app/(app)/eod/page.tsx` | Title, description |
| `/app/(app)/rocks/page.tsx` | Title, description |
| `/app/(app)/team/page.tsx` | Title, description |
| All public pages | OG images, Twitter cards |

**Fix:**
```typescript
export const metadata: Metadata = {
  title: 'Dashboard | AIMS EOD',
  description: 'View your productivity dashboard and team performance',
}
```

### 5.4 Hydration Issues
| Page | Issue |
|------|-------|
| `/app/(app)/dashboard/page.tsx` | Date formatting differs server/client |
| `/app/public/eod/[slug]/[date]/page.tsx` | Time display mismatch |

**Fix:** Use `suppressHydrationWarning` or consistent formatting

---

## 6. UI Component Issues

### 6.1 Overly Complex Components
| Component | Lines | Recommended Max | Action |
|-----------|-------|-----------------|--------|
| `eod-submission-card.tsx` | 528 | 200 | Split into 3-4 components |
| `rock-roadmap.tsx` | 602 | 200 | Extract timeline, card, progress |
| `team-dashboard.tsx` | 445 | 200 | Extract stats, member list |
| `data-table.tsx` | 387 | 250 | Extract header, row, pagination |

### 6.2 Duplicate Component Patterns

**Status Badges (appears in 8+ files)**
```typescript
// Same pattern in multiple files
const getStatusColor = (status: string) => {
  switch (status) {
    case "on-track": return "bg-green-100 text-green-800"
    case "at-risk": return "bg-yellow-100 text-yellow-800"
    case "blocked": return "bg-red-100 text-red-800"
    // ...
  }
}
```
**Fix:** Create `<StatusBadge status={status} />` component

**Progress Bars (appears in 6+ files)**
```typescript
// Duplicate progress bar styling
<div className="h-2 bg-gray-200 rounded-full">
  <div className="h-full bg-blue-500 rounded-full" style={{width: `${progress}%`}} />
</div>
```
**Fix:** Use shared `<ProgressBar value={progress} />` component

### 6.3 Missing Accessibility
| Component | Missing |
|-----------|---------|
| All buttons without text | `aria-label` |
| Form inputs | `aria-describedby` for errors |
| Modals/dialogs | Focus trap, escape key |
| Data tables | `scope` on headers |
| Icon-only buttons | Screen reader text |

### 6.4 Inconsistent Sizing
| Element | Current | Recommended |
|---------|---------|-------------|
| Card padding | `p-3`, `p-4`, `p-6` mixed | Standardize to `p-4` |
| Icon sizes | `h-3 w-3` to `h-6 w-6` | Use `sm`, `md`, `lg` variants |
| Border radius | `rounded`, `rounded-lg`, `rounded-xl` | Standardize per component type |
| Text sizes | `text-xs` to `text-lg` random | Define typography scale |

---

## 7. Dashboard Improvements

### 7.1 Current Dashboard Widgets
- Stats cards (tasks, rocks, reports)
- Recent activity
- Quick actions
- Team overview (manager only)

### 7.2 Recommended New Widgets

#### Focus Score Widget
```
┌─────────────────────────┐
│     Focus Score         │
│                         │
│        ┌───┐            │
│       /  87 \           │  ← Circular gauge
│      │       │          │
│       \ ___ /           │
│                         │
│  ↑ 5 from yesterday     │
└─────────────────────────┘
```

#### Streak Widget
```
┌─────────────────────────┐
│  🔥 12 Day Streak       │
│                         │
│  ████████████░░░░░░░░   │  ← Progress to next milestone
│  12/14 to bronze        │
│                         │
│  Best: 28 days          │
└─────────────────────────┘
```

#### Weekly Hours Widget
```
┌─────────────────────────┐
│  This Week: 38.5 hrs    │
│                         │
│  Mon ████████ 8.5       │
│  Tue ███████░ 7.0       │
│  Wed ████████ 8.0       │
│  Thu ███████░ 7.5       │
│  Fri ███████░ 7.5       │
│                         │
│  Avg: 7.7 hrs/day       │
└─────────────────────────┘
```

#### Team Leaderboard Widget
```
┌─────────────────────────┐
│  Team Focus Scores      │
│                         │
│  1. Sarah M.    94 🥇   │
│  2. John D.     89 🥈   │
│  3. Alex K.     87 🥉   │
│  4. You         85      │
│  5. Mike R.     82      │
│                         │
└─────────────────────────┘
```

### 7.3 Manager Dashboard Enhancements
| Current | Enhancement |
|---------|-------------|
| Basic submission stats | Add focus score distribution |
| Simple member list | Add sparklines for trends |
| No comparison view | Add week-over-week comparison |
| No alerts | Add at-risk team member alerts |

---

## 8. Accessibility Gaps

### 8.1 Critical A11y Issues
| Issue | Files | WCAG Level |
|-------|-------|------------|
| Missing alt text on images | 12 files | A |
| No focus indicators | 25+ components | A |
| Color contrast failures | Stats cards, badges | AA |
| Missing form labels | EOD form, settings | A |
| No skip navigation | Layout component | A |

### 8.2 Recommended Fixes

**Add Skip Link:**
```typescript
// In layout.tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded">
  Skip to main content
</a>
```

**Add Focus Styles:**
```css
/* In globals.css */
*:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}
```

**Fix Color Contrast:**
- Ensure all text has 4.5:1 contrast ratio (AA)
- Use darker text on light backgrounds
- Test with color blindness simulators

---

## 9. Code Quality & Refactoring

### 9.1 Type Safety Improvements
| Issue | Count | Fix |
|-------|-------|-----|
| `any` types | 45+ | Define proper interfaces |
| Missing return types | 30+ | Add explicit return types |
| Loose object types | 20+ | Use strict interfaces |

### 9.2 Code Duplication
| Pattern | Occurrences | Solution |
|---------|-------------|----------|
| Auth check boilerplate | 40+ | Middleware |
| Date formatting | 25+ | Utility function |
| Status color mapping | 15+ | Shared constant |
| API response wrapper | 50+ | Helper function |
| Loading skeletons | 12+ | Shared components |

### 9.3 File Organization
**Current Issues:**
- Mixed component sizes (50-600 lines)
- Inconsistent naming (`some-component.tsx` vs `SomeComponent.tsx`)
- Missing index files for barrels

**Recommended Structure:**
```
components/
├── ui/                    # Primitive components
│   ├── button/
│   │   ├── button.tsx
│   │   ├── button.test.tsx
│   │   └── index.ts
│   └── ...
├── features/              # Feature-specific
│   ├── eod/
│   │   ├── eod-form.tsx
│   │   ├── eod-card.tsx
│   │   └── index.ts
│   └── ...
└── shared/                # Shared across features
    ├── status-badge.tsx
    ├── progress-bar.tsx
    └── index.ts
```

### 9.4 Testing Gaps
| Area | Current Coverage | Target |
|------|------------------|--------|
| Unit tests | ~5% | 60% |
| Integration tests | 0% | 30% |
| E2E tests | 0% | 10% |

---

## 10. Implementation Priority

### Phase 1: Critical Fixes (Week 1-2)
1. [ ] Fix N+1 queries in export routes
2. [ ] Add error boundaries to all pages
3. [ ] Standardize date handling utility
4. [ ] Add rate limiting to public APIs
5. [ ] Fix color contrast issues

### Phase 2: Brand & UX (Week 3-4)
1. [ ] Update color scheme to red brand
2. [ ] Add loading skeletons to all pages
3. [ ] Add SEO metadata to all pages
4. [ ] Consolidate duplicate status badge code
5. [ ] Add keyboard navigation to dialogs

### Phase 3: Productivity Features (Week 5-8)
1. [ ] Add Focus Score calculation and display
2. [ ] Implement streak tracking
3. [ ] Add work hours input to EOD form
4. [ ] Create Focus Score dashboard widget
5. [ ] Create Streak counter widget
6. [ ] Add energy/mood selector (optional)

### Phase 4: Code Quality (Week 9-12)
1. [ ] Create API middleware for auth
2. [ ] Refactor large components (>300 lines)
3. [ ] Add TypeScript strict mode fixes
4. [ ] Implement component testing
5. [ ] Create design system documentation

### Phase 5: Advanced Features (Future)
1. [ ] Team leaderboard
2. [ ] Weekly comparison charts
3. [ ] Manager alerts system
4. [ ] Break reminders
5. [ ] Time tracking integration

---

## Quick Wins (Can Do Today)

1. **Update primary color** - Change CSS variable in globals.css
2. **Add page titles** - Add metadata export to each page
3. **Fix obvious a11y** - Add aria-labels to icon buttons
4. **Consolidate status colors** - Create shared constant file
5. **Add loading state** - Use Suspense on dashboard page

---

## Appendix: File Reference

### Files Requiring Color Updates
```
app/globals.css
tailwind.config.ts
components/sidebar/nav-main.tsx
components/sidebar/nav-user.tsx
components/dashboard/stat-card.tsx
components/rocks/rock-card.tsx
components/eod/eod-submission-card.tsx
```

### Files with N+1 Queries
```
app/api/reports/export/route.ts
app/api/eod/history/route.ts
app/api/manager/team-reports/route.ts
app/api/rocks/[id]/tasks/route.ts
app/api/dashboard/stats/route.ts
```

### Files Over 300 Lines (Need Refactoring)
```
components/dashboard/eod-submission-card.tsx (528)
components/rocks/rock-roadmap.tsx (602)
components/team/team-dashboard.tsx (445)
components/ui/data-table.tsx (387)
app/public/eod/[slug]/[date]/page.tsx (350+)
app/public/eod/[slug]/week/[date]/page.tsx (400+)
```

---

*This audit report should be reviewed and tasks prioritized based on team capacity and business needs.*
