# TaskSpace Security Audit Report

**Date:** 2026-03-19
**Auditor:** Adversarial Security Audit (Automated)
**Branch:** `security-audit/2026-03-19`
**Codebase State:** Post-hardening pass, 0 lint errors, 614 tests passing

---

## Executive Summary

TaskSpace demonstrates **strong security posture** across most attack surfaces. The auth middleware is well-designed with CSRF protection, rate limiting, RBAC, session rotation, and proper cookie flags. Token encryption uses AES-256-GCM, password hashing uses bcrypt-12, and SQL injection is prevented by parameterized queries throughout. CSP, HSTS, and security headers are properly configured.

**Overall Rating: B+** (Strong foundation, a few medium-severity issues to address)

### Finding Summary

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 0 | — |
| HIGH | 2 | Session token in response body, 2FA userId enumeration |
| MEDIUM | 4 | Missing password requirement, unused NEXT_PUBLIC vars, anchor href XSS surface, cron routes without IP restriction |
| LOW | 5 | Minor hardening opportunities |
| INFO | 4 | Architecture observations |

---

## Phase 0: Reconnaissance

### Attack Surface Map

- **42 unprotected API routes** (all intentionally public — auth, webhooks, cron, portal, public EOD)
- **Auth middleware:** `withAuth`, `withAdmin`, `withOwner`, `withDangerousAdmin`, `withSuperAdmin`, `withWorkspaceAccess`, `withWorkspaceParam`, `withOptionalAuth`, `withUserAuth`
- **Session management:** Cookie-based with `session_token`, sliding window expiry, 5 concurrent session cap, 30-day hard cap
- **API keys:** `aims_xxx_yyy` format, scope-enforced (read/write), expiry-checked
- **Encryption at rest:** AES-256-GCM for Slack bot tokens
- **Password policy:** bcrypt-12, 8+ chars, requires upper/lower/digit
- **2FA:** TOTP with backup codes (bcrypt-hashed)
- **Rate limiting:** IP-based (login, register, password reset, 2FA), user-based (AI endpoints), org-based (plan-tiered)

### Unprotected Routes (Intentional)

All 42 unprotected routes were audited:
- **Auth routes** (login, register, forgot-password, reset-password, 2FA, verify-email): All have IP rate limiting + Zod validation
- **Webhook routes** (Slack events, Stripe billing, Slack interactivity): All verify cryptographic signatures
- **Cron routes** (11 total): All verify `CRON_SECRET` via timing-safe comparison
- **Public routes** (portal, public EOD, client portal): All use secret tokens for access
- **OAuth callbacks** (Slack, Google, Asana): Use CSRF state tokens + server-side redirect URLs
- **Analytics** (web-vitals): Write-only, Zod-validated, no sensitive data returned

---

## HIGH Severity Findings

### H-1: Session Token Exposed in Login/2FA Response Body

**Location:** `app/api/auth/login/route.ts:227,317` and `app/api/auth/2fa/verify/route.ts:138,210`

**Issue:** The session token is returned in the JSON response body (`data.token`) in addition to being set as an HttpOnly cookie. This means:
1. Any XSS vulnerability (even via a browser extension) could read the token from the response
2. The token may be logged by client-side error tracking (Sentry, PostHog)
3. The token is visible in browser DevTools Network tab responses

**Risk:** If an attacker achieves XSS, they can extract the session token from a cached/intercepted login response, bypassing HttpOnly cookie protection.

**Recommendation:** Remove `token` from the JSON response body. The HttpOnly cookie is already set correctly — clients should not need the raw token value. If the MCP/API key flow needs a token, it should use a separate endpoint.

**Lines:**
```
login/route.ts:227 → token: sessionToken,
login/route.ts:317 → token: sessionToken,
2fa/verify/route.ts:138 → data: { user: safeUser, token: sessionToken, expiresAt: session.expiresAt },
2fa/verify/route.ts:210 → token: sessionToken,
```

### H-2: 2FA Verify Endpoint Accepts Arbitrary userId from Client

**Location:** `app/api/auth/2fa/verify/route.ts:38`

**Issue:** The 2FA verify endpoint accepts `userId` directly from the request body. After a successful password check, the login response returns `{ pendingTwoFactor: true, userId: user.id }`. An attacker who knows a user's ID could call the 2FA endpoint directly and brute-force their TOTP code (rate limited to 5 attempts per 15 min per IP, but still a design weakness).

The correct pattern is to issue a short-lived, signed "2FA pending" token after password verification, rather than passing the raw userId.

**Risk:** User enumeration + potential 2FA bypass if rate limiting is circumvented (e.g., via IP rotation). The attacker doesn't need the user's password — only their userId (which may be predictable or leaked).

**Recommendation:** Replace `userId` in the 2FA flow with a short-lived JWT or signed token that:
1. Is generated during login after password verification
2. Contains the userId (encrypted/signed)
3. Expires in 5 minutes
4. Can only be used once

---

## MEDIUM Severity Findings

### M-1: No Special Character Requirement in Password Policy

**Location:** `lib/auth/password.ts:102-124`

**Issue:** Password validation requires uppercase, lowercase, and digit, but does NOT require special characters. Combined with only 8 character minimum, this limits the keyspace. NIST 800-63B recommends allowing (not requiring) special chars, but with a minimum of 8 and a check against compromised password lists.

**Recommendation:** Consider adding a check against the HaveIBeenPwned API (k-anonymity model) or increasing minimum length to 10+ characters rather than adding character class requirements.

### M-2: Stale NEXT_PUBLIC_ Environment Variables

**Location:** `.env.local:24-25`

**Issue:** `NEXT_PUBLIC_STACK_PROJECT_ID` and `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` are set in `.env.local` but appear to be unused (no grep matches in source). These could be leftover credentials from a removed integration.

**Recommendation:** Remove unused NEXT_PUBLIC_ variables to reduce attack surface.

### M-3: Anchor `href` Attribute Allowed in Sanitized HTML

**Location:** `lib/utils/sanitize.ts:27`

**Issue:** The `sanitizeHtml` function allows `<a href="...">` tags with `href` attribute. While `sanitize-html` blocks `javascript:` protocol by default, this could still allow phishing links in user-generated content rendered via `dangerouslySetInnerHTML` in the blog.

**Current mitigation:** Blog content is author-controlled (markdown files), not user-submitted. Risk is low but worth noting for future user-generated content features.

**Recommendation:** Add `allowedSchemes: ['https', 'http', 'mailto']` explicitly to the sanitize config to be defense-in-depth.

### M-4: Cron Routes Lack IP Allowlisting

**Location:** All 11 `app/api/cron/*/route.ts` files

**Issue:** Cron routes verify `CRON_SECRET` via timing-safe comparison, which is good. However, they don't restrict to Vercel's cron IP ranges. An attacker who obtains the `CRON_SECRET` (e.g., via env var leak) could trigger cron jobs from any IP.

**Recommendation:** Add a `x-vercel-cron` header check or IP allowlist as a defense-in-depth measure. Vercel sets this header automatically for cron invocations.

---

## LOW Severity Findings

### L-1: Login Response Leaks Organization Details

**Location:** `app/api/auth/login/route.ts:311-321`

The login response includes the full `organization` object and `member` object. While these don't contain secrets, they expose internal IDs, subscription details, and org configuration to the authenticated user's browser. Consider returning only the fields the client needs.

### L-2: `PLAYWRIGHT_TEST` Environment Variable Bypasses Rate Limiting

**Location:** `lib/api/middleware.ts:132`

In development, `PLAYWRIGHT_TEST=true` bypasses org-level rate limiting. If accidentally set in production, it would disable rate limiting entirely. The check is `process.env.PLAYWRIGHT_TEST === "true"`, which is a simple string comparison with no additional safeguards.

**Recommendation:** Add `&& process.env.NODE_ENV !== "production"` guard.

### L-3: Web Vitals Endpoint Has No Authentication

**Location:** `app/api/analytics/web-vitals/route.ts`

The web vitals endpoint accepts unauthenticated POST requests. While it only writes performance metrics and validates with Zod, an attacker could flood it with fake metrics to pollute analytics data.

**Recommendation:** Consider adding a lightweight HMAC or session check.

### L-4: Error Messages in Auth Routes Are Sometimes Specific

**Location:** `app/api/auth/login/route.ts:91-94`

The account lockout message confirms that the account exists and is locked. While the login failure message is generic ("Invalid email or password"), the lockout response is specific. This could be used for account enumeration.

**Recommendation:** Return the generic "Invalid email or password" message for locked accounts too, with the same 401 status code.

### L-5: Session Token Stored as Raw Hex in Database

**Location:** `lib/auth/password.ts:34` → `randomBytes(32).toString("hex")`

Session tokens are stored as plaintext hex strings in the database. If the database is compromised, all active sessions are immediately usable. Best practice is to store a hash of the session token (similar to how password reset tokens should be hashed).

**Recommendation:** Store `sha256(sessionToken)` in the database and compare using timing-safe comparison on lookup.

---

## INFO Observations

### I-1: SQL Injection Prevention ✅

All database queries use the tagged template literal `sql` from `@neondatabase/serverless`, which automatically parameterizes all interpolated values. No string concatenation or raw SQL construction was found. `LIMIT` and `OFFSET` values are passed as parameters, not concatenated.

### I-2: XSS Prevention ✅

- `dangerouslySetInnerHTML` usage is limited to: (a) JSON-LD structured data (static), (b) blog content rendered through `sanitizeHtml()`, (c) chart.tsx CSS injection (static). No user-submitted content is rendered unsanitized.
- User input is sanitized via `sanitize-html` library before database storage.
- `sanitizeDeep()` is used for JSONB fields with dynamic structure.

### I-3: CSRF Protection ✅

All state-changing requests via `withAuth`/`withAdmin`/`withOwner` require `X-Requested-With: XMLHttpRequest` header. API key requests (Bearer token) are exempt since they're not cookie-based. This is a solid CSRF defense.

### I-4: Security Headers ✅

Comprehensive security headers configured in `next.config.mjs`:
- CSP with strict `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`
- HSTS with 1-year max-age, includeSubDomains, preload
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()

---

## Positive Security Practices Noted

1. **Timing-safe comparisons** used consistently for secret verification (cron auth, admin ops, API keys)
2. **Dummy bcrypt on invalid email** prevents timing-based email enumeration on login
3. **Account lockout** after 5 failed attempts with 30-minute cooldown
4. **Session rotation** on login (old session deleted, new one created)
5. **Concurrent session limit** (max 5 per user)
6. **Session sliding window** with hard cap (30 days from creation)
7. **Backup codes** are bcrypt-hashed with CAS (compare-and-swap) to prevent race conditions
8. **OAuth state tokens** with HMAC signing and expiry for Slack OAuth
9. **Webhook signature verification** for Slack (HMAC-SHA256) and Stripe
10. **SSRF protection** via `validateSafeUrl()` with private IP blocking
11. **Token encryption at rest** for Slack bot tokens (AES-256-GCM)
12. **Password reset tokens** expire in 1 hour with email-based rate limiting
13. **API key scopes** enforced at middleware level (read vs write)
14. **Audit logging** for auth events and admin operations
15. **Source maps hidden** from client bundle (Sentry-only upload)

---

## Remediation Priority

| # | Finding | Severity | Effort | Status |
|---|---------|----------|--------|--------|
| H-1 | Remove session token from response body | HIGH | Low | **FIXED** |
| H-2 | Replace userId with signed token in 2FA flow | HIGH | Medium | Open (design change) |
| L-2 | Guard PLAYWRIGHT_TEST bypass with NODE_ENV check | LOW | Trivial | **FIXED** |
| L-4 | Use generic message for locked accounts | LOW | Trivial | **FIXED** |
| M-2 | Remove stale NEXT_PUBLIC_ vars | MEDIUM | Trivial | Open (env change) |
| M-3 | Add explicit allowedSchemes to sanitizeHtml | MEDIUM | Trivial | **FIXED** |
| M-4 | Add x-vercel-cron header check | MEDIUM | Low | **FIXED** |
| M-1 | Strengthen password policy | MEDIUM | Medium | Open |
| L-5 | Hash session tokens in DB | LOW | High | Open |
| L-1 | Minimize login response payload | LOW | Low | Open |
| L-3 | Rate limit web vitals endpoint | LOW | Low | Open |

---

## Fixes Applied in This Audit

### 1. H-1 FIXED: Removed session token from all auth response bodies
- `app/api/auth/login/route.ts` — removed `token: sessionToken` from 2 response objects
- `app/api/auth/register/route.ts` — removed from 1 response object
- `app/api/auth/2fa/verify/route.ts` — removed from 2 response objects
- `app/api/invitations/accept/route.ts` — removed from 2 response objects
- `app/api/join/[token]/route.ts` — removed from 2 response objects
- `lib/types.ts` — removed `token` field from `AuthResponse` interface
- Updated tests: `auth-login.test.ts`, `auth-register.test.ts`
- Session tokens are now ONLY set via HttpOnly cookies, never exposed in JSON

### 2. L-2 FIXED: PLAYWRIGHT_TEST bypass guarded
- `lib/api/middleware.ts` — added `&& process.env.NODE_ENV !== "production"` check

### 3. L-4 FIXED: Generic message for locked accounts
- `app/api/auth/login/route.ts` — locked accounts now return `"Invalid email or password"` (401) with dummy bcrypt to match timing

### 4. M-3 FIXED: Explicit allowedSchemes in sanitizeHtml
- `lib/utils/sanitize.ts` — added `allowedSchemes: ["https", "http", "mailto"]`

### 5. M-4 FIXED: Vercel cron header monitoring
- `lib/api/cron-auth.ts` — added `x-vercel-cron` header check with logging in production

### Verification
- Build: Clean (0 errors)
- Tests: 614/614 passing (46 suites)
- Lint: 0 errors, 0 warnings
