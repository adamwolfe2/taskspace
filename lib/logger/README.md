# Structured Logging Guide

This application uses **Pino** for structured logging and **Sentry** for error tracking.

## Quick Start

```typescript
import { logger, createRequestLogger } from '@/lib/logger'

// Basic logging
logger.info('Application started')
logger.warn('Cache miss', { key: 'user:123' })
logger.error('Database connection failed', { error: err.message })

// Request-scoped logging (includes context in all logs)
const reqLogger = createRequestLogger({
  userId: session.userId,
  orgId: session.organizationId,
  requestId: crypto.randomUUID(),
})

reqLogger.info('Processing request')
reqLogger.error('Request failed', { error })
```

## Log Levels

Use the appropriate level for each message:

| Level | When to Use |
|-------|-------------|
| `trace` | Very detailed debugging (disabled in production) |
| `debug` | Debugging information (disabled by default in production) |
| `info` | Normal operations (user actions, successful API calls) |
| `warn` | Unexpected but handled situations (cache miss, retry) |
| `error` | Failures that need attention (DB errors, API failures) |
| `fatal` | Critical errors that may crash the application |

## API Route Usage

```typescript
import { logger, createRequestLogger, logError } from '@/lib/logger'
import { handleAPIError } from '@/lib/api/errors'

export async function POST(request: Request) {
  const reqLogger = createRequestLogger({
    path: '/api/tasks',
    method: 'POST',
  })

  try {
    reqLogger.info('Creating task')

    // ... your logic ...

    reqLogger.info('Task created', { taskId })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAPIError(error, { path: '/api/tasks' })
  }
}
```

## Environment Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Minimum log level | `info` |
| `SENTRY_DSN` | Sentry DSN for error tracking | - |
| `NODE_ENV` | Environment (affects formatting) | `development` |

## Log Output

### Development Mode
Pretty-printed, colored output:
```
[2024-01-15 10:30:45] INFO: User logged in
    userId: "usr_123"
    orgId: "org_456"
```

### Production Mode
JSON output for log aggregation:
```json
{"level":"info","time":"2024-01-15T10:30:45.123Z","msg":"User logged in","userId":"usr_123","orgId":"org_456"}
```

## Sensitive Data Handling

The following fields are automatically redacted:
- `password`, `passwordHash`
- `token`, `sessionToken`
- `apiKey`, `secret`
- `authorization`, `cookie` headers

Never log:
- Passwords or API keys
- Full credit card numbers
- Personal identification numbers
- Raw authentication tokens

## Sentry Integration

Errors are automatically sent to Sentry when:
1. `SENTRY_DSN` environment variable is set
2. The error is a 500+ status code
3. Not in development mode (unless testing)

### Adding Context

```typescript
import * as Sentry from '@sentry/nextjs'

// Add user context
Sentry.setUser({ id: userId, email: userEmail })

// Add custom context
Sentry.setContext('order', { orderId, total })

// Add tags for filtering
Sentry.setTag('feature', 'eod-reports')
```

## Best Practices

1. **Always include context**: Add relevant IDs and metadata
   ```typescript
   logger.info('Task completed', { taskId, userId, duration })
   ```

2. **Use request loggers**: Create a child logger with request context
   ```typescript
   const reqLogger = createRequestLogger({ requestId, userId })
   ```

3. **Log at boundaries**: Log when entering/exiting important operations
   ```typescript
   reqLogger.info('Starting EOD processing')
   // ... processing ...
   reqLogger.info('EOD processing complete', { count })
   ```

4. **Don't over-log**: Avoid logging inside tight loops
   ```typescript
   // Bad
   for (const item of items) {
     logger.debug('Processing item', { item })
   }

   // Good
   logger.debug('Processing items', { count: items.length })
   ```

5. **Use structured data**: Pass objects, not concatenated strings
   ```typescript
   // Bad
   logger.info('User ' + userId + ' created task ' + taskId)

   // Good
   logger.info('User created task', { userId, taskId })
   ```

## Viewing Logs

### Local Development
Logs appear in the terminal with pretty formatting.

### Production (Vercel)
- View in Vercel dashboard → Logs
- Use `vercel logs --follow` for real-time logs

### Sentry
- View errors at [sentry.io](https://sentry.io)
- Filter by environment, tag, or user
- See stack traces and breadcrumbs
