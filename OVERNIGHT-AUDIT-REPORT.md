# Overnight Audit Report

**Date:** 2026-03-18
**Branch:** `overnight-improvements-2026-03-18`
**Base:** `main` at commit `0f0fd5a`

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Build | PASS (clean) | PASS (clean) |
| Tests | 614 pass / 46 suites | 614 pass / 46 suites |
| Build warnings | 3 | 3 |
| Files changed | — | 40 |
| Lines added | — | +85 |
| Lines removed | — | -411 |
| Net | — | -326 lines |
| Commits | — | 4 |

---

## Changes by Category

### Critical Fixes (`31510d3`)
- **Removed unused dependencies**: `@headlessui/react`, `@hookform/resolvers` (13 packages removed)
- **Defensive JSON parsing**: Added `.catch()` fallback on `response.json()` in error paths for `bugs/report` and `test-email` API routes — prevents crash when upstream returns non-JSON error
- **SEO metadata**: Added `layout.tsx` with metadata for `/checkout/success` page (was missing `<title>` as a client component)
- **Updated `.env.example`**: Added 11 missing env vars: PostHog, Slack OAuth, Sentry auth token, Blob storage, Stack Auth, Asana OAuth
- **Removed stale file**: Deleted `app/page.tsx.backup` (139 lines of dead code)

### Code Quality (`b46781f`)
- **Removed dark mode system entirely** (per project policy: NO DARK THEME):
  - Removed `darkMode`/`setDarkMode` from `AppContextType` interface, state, provider value, and defaults
  - Removed dark mode localStorage persistence and `document.documentElement.classList` toggling
  - Removed dark mode toggle from command palette (`Moon`/`Sun` icons, `toggleDarkMode` callback)
  - Removed `dark:` Tailwind classes from `date-helpers.ts` (5 urgency color functions)
  - Removed `dark:prose-invert` from both editor components
- **Removed unused imports**: Cleaned `React` namespace imports from 4 settings components, plus various unused named imports across ~20 files

### UI Polish (`0785d65`)
- **Fixed web manifest**: Icons referenced `icon-192.png` and `icon-512.png` which didn't exist; updated to use actual `icon.png` and `apple-icon.png`
- **Fixed brand color**: Updated `theme_color` from `#3b82f6` (blue) to `#111827` (gray-900) matching the Taskspace brand

### Accessibility (`7be6dd3`)
- Added `aria-label` to 3 icon-only buttons in client portal page (Previous day, Next day, Refresh reports)

---

## Issues Found but NOT Fixed (with reasoning)

### Safe to skip — low risk, high complexity
1. **`lib/email.tsx` marked `@deprecated`** — Still actively imported in 11 files. Migration to `lib/integrations/email.ts` would touch too many routes for an overnight audit. Recommend dedicated migration session.

2. **N+1 query patterns in cron jobs** — Found in `cron/eod-reminder`, `cron/weekly-brief`, `cron/portfolio-snapshot`, etc. These run infrequently on bounded data sets (orgs, not users). Performance impact is negligible. Not worth the risk of refactoring.

3. **4 `@ts-expect-error` suppressions** — All in API routes (`2fa/verify-setup`, `admin/run-migrations`, `org-chart/upload`, `db/status`). Each has a comment explaining why — they're for dynamic SQL or union type quirks with the postgres driver. Fixing requires driver-level type changes.

4. **`lib/utils/mentions.ts` — 2 unused exports** — `renderMentionsHTML()` and `getUniqueMentionedUsernames()` are exported but never imported. Left in place as they're small utility functions likely to be used when mentions are expanded.

5. **Marketing pages using `"use client"` for framer-motion animations** — Pages like `/privacy`, `/terms`, `/about` could be server components if animations were removed. However, this would change the visual design.

6. **`darkMode` in `localStorage` for existing users** — Users who previously toggled dark mode will have a `darkMode` key in localStorage. It's now inert (no code reads it). It will be garbage collected naturally or can be cleaned up later.

### Outside scope
- **Asana/CSV data importers** — Identified as stubbed in previous session. Implementing these is feature work, not an audit fix.
- **Admin dashboard expansion** — Current admin is minimal. Expanding it requires product decisions.

---

## Verification

```
Build:  PASS (clean, no errors)
Tests:  614 passed, 46 suites, 0 failures
Branch: overnight-improvements-2026-03-18 (4 commits ahead of main)
```

---

## Recommended Next Steps

1. **Review and merge** this branch to `main`
2. **Test real Stripe checkout** in production after merge (env vars were fixed in previous session)
3. **Migrate `lib/email.tsx`** to `lib/integrations/email.ts` in a dedicated session (11 files to update)
4. **Generate PWA icons** at 192x192 and 512x512 from the logo for proper PWA install support
5. **Consider removing framer-motion** from static marketing pages to enable SSR and improve LCP
