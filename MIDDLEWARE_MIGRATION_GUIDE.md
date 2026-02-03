# Auth Middleware Migration Guide

**Goal**: Replace inline auth checks with centralized middleware wrappers
**Priority**: P0 (CRITICAL)
**Estimated Effort**: 16-24 hours

---

## Overview

This guide provides step-by-step instructions for migrating API routes from inline authentication checks to the new centralized middleware system.

**Benefits**:
- ✅ Consistent security across all routes
- ✅ Reduced code duplication (eliminate 40+ inline auth checks)
- ✅ Type-safe handler signatures
- ✅ Easier to test and maintain
- ✅ Centralized error handling

---

## Quick Reference

### Import Statement
```typescript
import { withAuth, withAdmin, withOwner, withWorkspaceAccess } from "@/lib/api/middleware"
```

### Before/After Examples

#### Standard Route (Any Authenticated User)
```typescript
// BEFORE
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  // Your logic here
  return NextResponse.json({ success: true, data: "..." })
}

// AFTER
export const GET = withAuth(async (request, auth) => {
  // auth is guaranteed to exist here
  // Your logic here
  return NextResponse.json({ success: true, data: "..." })
})
```

#### Admin-Only Route
```typescript
// BEFORE
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }
  if (!isAdmin(auth)) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    )
  }

  // Your logic here
  return NextResponse.json({ success: true })
}

// AFTER
export const POST = withAdmin(async (request, auth) => {
  // auth exists and auth.member.role is "owner" or "admin"
  // Your logic here
  return NextResponse.json({ success: true })
})
```

#### Workspace-Scoped Route
```typescript
// BEFORE
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get("workspaceId")

  if (!workspaceId) {
    return NextResponse.json(
      { success: false, error: "workspaceId is required" },
      { status: 400 }
    )
  }

  const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
  if (!hasAccess) {
    return NextResponse.json(
      { success: false, error: "No access to workspace" },
      { status: 403 }
    )
  }

  // Your logic here
  return NextResponse.json({ success: true, data: "..." })
}

// AFTER
export const GET = withWorkspaceAccess(async (request, auth, workspaceId) => {
  // auth exists and user has access to workspaceId
  // Your logic here
  return NextResponse.json({ success: true, data: "..." })
})
```

---

## Migration Steps

### Step 1: Audit Route
Before migrating, identify:
1. What authentication is required?
   - Any authenticated user → `withAuth`
   - Admin only → `withAdmin`
   - Owner only → `withOwner`
   - Workspace access → `withWorkspaceAccess`
   - None (public route) → Don't migrate

2. Are there additional checks?
   - Role checks → `withRoleCheck`
   - Custom validation → Keep in handler

### Step 2: Add Import
```typescript
import { withAuth, withAdmin, withOwner } from "@/lib/api/middleware"
```

### Step 3: Replace Handler
Transform the function:
```typescript
// From:
export async function GET(request: NextRequest) { ... }

// To:
export const GET = withAuth(async (request, auth) => { ... })
```

### Step 4: Remove Inline Auth Checks
Delete these lines:
```typescript
// DELETE THIS:
const auth = await getAuthContext(request)
if (!auth) {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  )
}
```

### Step 5: Remove Role Checks (if using withAdmin/withOwner)
```typescript
// DELETE THIS IF USING withAdmin:
if (!isAdmin(auth)) {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 }
  )
}
```

### Step 6: Test Route
```bash
# Test unauthenticated access (should return 401)
curl -X GET http://localhost:3000/api/your-route

# Test authenticated access (should work)
curl -X GET http://localhost:3000/api/your-route \
  -H "Cookie: session_token=YOUR_TOKEN"

# Test admin route as non-admin (should return 403)
curl -X POST http://localhost:3000/api/admin/your-route \
  -H "Cookie: session_token=NON_ADMIN_TOKEN"
```

---

## Route Priority Matrix

### Phase 1: Admin Routes (High Risk) - Priority P0
**Start Here**: Admin routes have the highest security risk

| Route | Method | Current | Target Middleware | Estimated Time |
|-------|--------|---------|-------------------|----------------|
| `/api/admin/emergency-setup` | POST | Inline | `withAdmin` | 15 min |
| `/api/admin/force-workspace-creation` | POST | Inline | `withAdmin` | 15 min |
| `/api/admin/run-migrations` | POST | Inline | `withAdmin` | 15 min |
| `/api/db/seed` | POST | Inline | `withAdmin` | 15 min |
| `/api/db/migrate` | POST | Inline | `withAdmin` | 15 min |

**Total Phase 1**: ~2 hours

---

### Phase 2: Authentication Routes - Priority P0
**Special Case**: Some routes don't need middleware (login, register)

| Route | Method | Action |
|-------|--------|--------|
| `/api/auth/login` | POST | ❌ Skip (public) |
| `/api/auth/register` | POST | ❌ Skip (public) |
| `/api/auth/logout` | POST | ✅ Use `withAuth` |
| `/api/auth/session` | GET | ✅ Use `withAuth` |
| `/api/auth/api-key` | POST | ✅ Use `withAuth` |
| `/api/auth/reset-password` | POST | ❌ Skip (public) |
| `/api/auth/forgot-password` | POST | ❌ Skip (public) |

**Total Phase 2**: ~1 hour

---

### Phase 3: Data Routes (High Volume) - Priority P1
**Focus**: Routes handling user data

| Route | Method | Target Middleware | Notes |
|-------|--------|-------------------|-------|
| `/api/tasks` | GET | `withAuth` | Check workspace access internally |
| `/api/tasks` | POST | `withAuth` | Validate workspaceId in body |
| `/api/tasks/bulk` | POST | `withAuth` | Bulk operations |
| `/api/rocks` | GET | `withAuth` | Check workspace access |
| `/api/rocks` | POST | `withAuth` | Validate workspaceId |
| `/api/rocks/[id]` | GET | `withAuth` | Validate ownership |
| `/api/rocks/[id]` | PUT | `withAuth` | Validate ownership |
| `/api/eod-reports` | GET | `withAuth` | Check workspace |
| `/api/eod-reports` | POST | `withAuth` | Validate workspaceId |
| `/api/members` | GET | `withAuth` | Org members list |
| `/api/workspaces` | GET | `withAuth` | User's workspaces |
| `/api/workspaces/[id]` | GET | `withWorkspaceParam` | Validates access |
| `/api/workspaces/[id]/members` | GET | `withWorkspaceParam` | Member list |

**Total Phase 3**: ~8 hours

---

### Phase 4: Integration Routes - Priority P1
**Note**: Some integrations use webhooks (public) vs API calls (authenticated)

| Route | Method | Target Middleware | Notes |
|-------|--------|-------------------|-------|
| `/api/asana/oauth/callback` | GET | ❌ Skip (OAuth) | Public callback |
| `/api/asana/sync` | POST | `withAuth` | Manual sync |
| `/api/asana/status` | GET | `withAuth` | Check connection |
| `/api/google-calendar/callback` | GET | ❌ Skip (OAuth) | Public callback |
| `/api/google-calendar` | POST | `withAuth` | Export tasks |
| `/api/billing/checkout` | POST | `withAuth` | Stripe checkout |
| `/api/billing/webhook` | POST | ❌ Skip (Webhook) | Stripe signature validation |
| `/api/billing/subscription` | GET | `withAuth` | Get subscription |
| `/api/webhooks` | POST | ❌ Skip (Webhook) | Webhook signature validation |

**Total Phase 4**: ~4 hours

---

### Phase 5: AI Routes - Priority P1
**Note**: AI routes typically need authenticated access + usage tracking

| Route | Method | Target Middleware | Notes |
|-------|--------|-------------------|-------|
| `/api/ai/eod-parse` | POST | `withAuth` | EOD parsing |
| `/api/ai/suggestions` | GET | `withAuth` | Get suggestions |
| `/api/ai/suggestions/[id]/approve` | POST | `withAuth` | Approve suggestion |
| `/api/ai/suggestions/[id]/reject` | POST | `withAuth` | Reject suggestion |
| `/api/ai/suggestions/bulk` | POST | `withAuth` | Bulk approve |
| `/api/ai/query` | POST | `withAuth` | AI query |
| `/api/ai/digest` | POST | `withAuth` | Generate digest |
| `/api/ai/budget-settings` | GET/PUT | `withAuth` | AI budget config |

**Total Phase 5**: ~3 hours

---

### Phase 6: Manager Routes - Priority P2
| Route | Method | Target Middleware | Notes |
|-------|--------|-------------------|-------|
| `/api/manager/dashboard` | GET | `withAuth` | Manager dashboard |
| `/api/manager/direct-reports` | GET | `withAuth` | Direct reports list |

**Total Phase 6**: ~1 hour

---

### Phase 7: Public Routes - Do NOT Migrate
**Important**: These routes should NOT use middleware (remain public)

| Route | Method | Reason |
|-------|--------|--------|
| `/api/public/eod/[slug]/[date]` | GET | Public EOD sharing |
| `/api/public/eod/[slug]/week/[date]` | GET | Public weekly EOD |
| `/api/health` | GET | Health check (load balancer) |
| `/api/cron/*` | POST | Vercel cron (uses cron secret) |

---

## Special Cases

### Dynamic Routes with Context
For routes with URL parameters (e.g., `/api/rocks/[id]/route.ts`):

```typescript
// If you need route context (params):
export const GET = withAuth(async (request, auth) => {
  // Access params from the request URL
  const url = new URL(request.url)
  const id = url.pathname.split('/').slice(-2)[0]

  // Your logic
  return NextResponse.json({ success: true, data: "..." })
})

// OR use a wrapper that preserves context:
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  return withAuth(async (req, auth) => {
    const rockId = context.params.id
    // Your logic
    return NextResponse.json({ success: true, data: "..." })
  })(request, context)
}
```

### Multiple Middleware
For routes needing multiple checks:

```typescript
// Option 1: Nested wrappers
export const POST = withAuth(
  withRoleCheck("manager")(async (request, auth) => {
    // Both auth and manager role guaranteed
    return NextResponse.json({ success: true })
  })
)

// Option 2: Manual check inside handler
export const POST = withAuth(async (request, auth) => {
  // Check custom condition
  if (auth.member.department !== "engineering") {
    return NextResponse.json(
      { success: false, error: "Only engineering team" },
      { status: 403 }
    )
  }

  return NextResponse.json({ success: true })
})
```

### Optional Auth
For routes that behave differently for authenticated vs anonymous:

```typescript
import { withOptionalAuth } from "@/lib/api/middleware"

export const GET = withOptionalAuth(async (request, auth) => {
  if (auth) {
    // Authenticated user - return personalized data
    return NextResponse.json({ data: "personalized" })
  } else {
    // Anonymous user - return public data
    return NextResponse.json({ data: "public" })
  }
})
```

---

## Testing Checklist

After migrating each route, test:

- [ ] ✅ Unauthenticated request returns 401
- [ ] ✅ Authenticated request succeeds
- [ ] ✅ Invalid session token returns 401
- [ ] ✅ Expired session returns 401
- [ ] ✅ Admin route rejects non-admin (if using `withAdmin`)
- [ ] ✅ Owner route rejects non-owner (if using `withOwner`)
- [ ] ✅ Workspace route validates access (if using workspace middleware)
- [ ] ✅ API key authentication works (for programmatic access)
- [ ] ✅ Error responses match expected format

---

## Rollback Plan

If issues are discovered after deployment:

1. **Immediate Rollback** (within 5 minutes):
   ```bash
   vercel rollback
   ```

2. **Partial Rollback** (specific routes):
   - Revert specific route files to pre-migration state
   - Keep middleware library (doesn't affect other routes)
   - Test reverted routes

3. **Full Rollback** (if widespread issues):
   - Revert entire PR
   - Remove middleware library
   - Restore all routes to inline auth

---

## Progress Tracking

Create a tracking spreadsheet with columns:
- Route Path
- Method
- Status (Not Started / In Progress / Complete / Tested)
- Middleware Used
- Migrated By
- Tested By
- Notes

---

## Common Pitfalls

### ❌ Don't Do This:
```typescript
// Wrong: Mixing old and new patterns
export const GET = withAuth(async (request, auth) => {
  const auth2 = await getAuthContext(request) // Redundant!
  // ...
})
```

### ❌ Don't Do This:
```typescript
// Wrong: Using withAuth for public routes
export const GET = withAuth(async (request, auth) => {
  // This route should be public!
})
```

### ❌ Don't Do This:
```typescript
// Wrong: Not removing inline checks
export const POST = withAdmin(async (request, auth) => {
  if (!isAdmin(auth)) { // Redundant! withAdmin already checked
    return NextResponse.json(...)
  }
})
```

### ✅ Do This:
```typescript
// Correct: Clean handler with middleware
export const POST = withAdmin(async (request, auth) => {
  // auth.member.role is guaranteed to be "owner" or "admin"
  // Just implement your business logic
  return NextResponse.json({ success: true })
})
```

---

## Support

For questions or issues during migration:
1. Check this guide
2. Review `/lib/api/middleware.ts` source code
3. Look at migrated routes for examples
4. Test incrementally (one route at a time)

---

**Last Updated**: 2026-02-03
**Next Review**: After Phase 1 completion
