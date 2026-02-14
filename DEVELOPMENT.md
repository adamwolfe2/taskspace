# Development Guidelines

## API Requests - CRITICAL

**⚠️ NEVER use direct `fetch()` for API calls!**

All API requests MUST use the API client from `lib/api/client.ts`:

```typescript
// ❌ WRONG - Missing CSRF header
await fetch("/api/endpoint", { method: "POST", ... })

// ✅ CORRECT - Use API client
import { api } from "@/lib/api/client"
await api.yourMethod()
```

**Why?** The API client automatically adds:
- CSRF protection header (`X-Requested-With: XMLHttpRequest`)
- Retry logic
- Error handling
- Proper authentication

**If you MUST use fetch() directly**, include the CSRF header:

```typescript
await fetch("/api/endpoint", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest" // Required!
  },
  body: JSON.stringify(data)
})
```

## Code Review Checklist

- [ ] No direct `fetch()` calls to `/api/*` endpoints
- [ ] All mutations include CSRF header
- [ ] Error handling included
