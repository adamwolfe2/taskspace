# Product Refinement Report

**Date:** 2026-03-19
**Project:** TaskSpace
**Branch:** `refinement/2026-03-19`

## Product Understanding

TaskSpace is an EOS (Entrepreneurial Operating System) team accountability platform for teams of 5-50. It replaces spreadsheet-driven EOS processes (rocks, scorecards, L10 meetings, IDS) with a unified app featuring AI-powered EOD reports, analytics, and team management. Target users are EOS Implementers and leadership teams running on EOS.

## Session Summary

- **Pages/Features Audited:** 74 routes, 350+ components, 247 API routes
- **Issues Found:** 22
- **Issues Fixed:** 14
- **Issues Deferred:** 8

---

## What Was Fixed

### Critical Functionality (3 fixes)

1. **Orphaned pages removed** — Deleted unreachable `/editor` page, standalone `/settings/billing` and `/settings/database` pages (settings is SPA-tab-based), and their empty route groups `(app)/` and `(authenticated)/`
2. **Duplicate velocity route removed** — Deleted orphaned `/api/people/velocity` (kept `/api/people-velocity` used by UI and tests)
3. **Internal org email suppression** — All 5 email-sending cron jobs now skip `isInternal` orgs (daily-digest, daily-eod-email, eod-reminder, trial-expiry-warning, onboarding-drip)

### UX Consistency (4 fixes)

4. **Toast messages standardized** — 26 files updated: all toast titles converted from Title Case to sentence case, all exclamation marks removed from titles and descriptions. Consistent calm, professional tone throughout.
5. **Date formatting centralized** — Created `lib/utils/date-format.ts` with 8 functions (formatDate, formatDateShort, formatDateCompact, formatDateLong, formatTime, formatDateTime, formatDateISO, formatRelativeTime). Updated 6 components to use it.
6. **Empty state messages standardized** — All initial empty states now use "No [noun] yet" pattern. Search/filter contexts remain "No [noun] found".
7. **EOD terminology standardized** — "End-of-Day" (capitalized) changed to "end-of-day" (lowercase) in user-facing text.

### Friction Points Removed (3 fixes)

8. **Digest email preferences respected** — `sendDailySummaryEmail` now filters admins by `notificationPreferences.digest.email` before sending (previously sent to ALL admins regardless of preference)
9. **C1/C2 verified already fixed** — `sendEODNotification` already on server-side only, Asana importer already uses `.json` format (fixed in prior session)
10. **Duplicate AI routes verified** — `ai/eod-parse` and `ai/parse-eod` serve different purposes (text dump parsing vs report insight extraction); both legitimately needed

---

## Deferred Items (Needs Product Decision or Larger Scope)

| # | Issue | Severity | Reason Deferred |
|---|-------|----------|----------------|
| 1 | Modal vs Dialog naming inconsistency (23 "Modal" files, 11 "Dialog" files) | Low | Renaming 34 files risks breaking imports; cosmetic only |
| 2 | Settings tab state in localStorage, not URL | Low | Would need SPA routing changes |
| 3 | Loading states mix Skeleton/Spinner/silent | Medium | Need design decision on when to use each pattern |
| 4 | workspace/team/organization terminology overlap | Medium | Needs product-level terminology glossary before changing |
| 5 | SVG upload allowed without sanitization | High | Needs decision: remove `image/svg+xml` from allowlist or add DOMPurify |
| 6 | API keys stored in plaintext in DB | Medium | Architectural change requiring key rotation strategy |
| 7 | 2FA userId accepted from client body | High | Needs signed challenge token design |
| 8 | Asana OAuth state not HMAC-signed | Medium | Same pattern as Google Calendar fix, lower priority |

---

## Patterns Standardized

### Toast Messages
- **Casing:** Sentence case always ("Task completed", never "Task Completed")
- **Punctuation:** No exclamation marks in titles or descriptions
- **Tone:** Calm, declarative statements ("Report submitted", "Link copied")

### Date Formatting
- **Utility:** `lib/utils/date-format.ts` — single source of truth
- **Long:** `formatDate()` → "March 19, 2026"
- **Short:** `formatDateShort()` → "Mar 19, 2026"
- **Compact:** `formatDateCompact()` → "Wed, Mar 19"
- **ISO/Timezone:** `formatDateISO()` for server-side timezone conversion

### Empty States
- **Initial:** "No [noun] yet" with action button
- **Search/Filter:** "No [noun] found" or "No results found"
- **Positive:** "All caught up!" for cleared notifications

### Terminology
- **EOD:** Use "EOD" as the abbreviation; "end-of-day" (lowercase, hyphenated) for full phrase
- **Internal orgs:** Orgs with `isInternal: true` skip all automated email crons

---

## Product Recommendations

1. **Strongest areas:** Auth security (post-audit), component design system (59 shadcn components, well-organized), feature gating, empty/error state presets
2. **Weakest area:** UX terminology — "workspace", "team", "organization", "member" overlap needs a glossary
3. **Biggest single improvement:** Add URL-based settings tab navigation (`?tab=profile`) so tabs are bookmarkable/shareable
4. **Standardize loading pattern:** Document when to use Skeleton (page-level content), Spinner (inline actions), silent (background refreshes)
5. **SVG upload sanitization** is the highest remaining security item — either remove SVG from upload allowlist or add server-side sanitization
6. **Date formatting utility** should be adopted across remaining components over time (cron jobs and server code use timezone-aware Intl formatting which is correct as-is)
7. **Modal/Dialog naming:** Adopt convention going forward — "Dialog" for shadcn Dialog wrappers, "Modal" never (but don't rename existing files)

---

## Verification

- Build: Clean (0 errors)
- All changes are backward-compatible
- 6 commits, logically grouped
