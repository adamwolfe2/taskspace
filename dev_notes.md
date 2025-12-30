# AIMS EOD Tracker - Development Notes

## Architecture Overview

This document captures key architectural decisions, implementation details, and development notes for the AIMS EOD Tracker project.

### Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TailwindCSS 4
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: PostgreSQL (via Vercel Postgres)
- **Authentication**: Custom JWT-based sessions
- **Validation**: Zod schemas
- **Caching**: In-memory with TTL and LRU eviction
- **Testing**: Jest with ts-jest

---

## Key Architectural Decisions

### 1. Database Layer Architecture

**Decision**: Use a centralized `db` object with typed query helpers rather than an ORM.

**Rationale**:
- Direct SQL provides maximum control and performance
- JSONB columns for flexible schema (labels, recurrence rules, milestones)
- Type safety through TypeScript interfaces
- Simpler debugging and query optimization

**Location**: `lib/db/index.ts`

**Key Tables**:
| Table | Purpose |
|-------|---------|
| `users` | User accounts and authentication |
| `organizations` | Multi-tenant organization data |
| `organization_members` | Team membership with roles |
| `assigned_tasks` | Task management with recurrence |
| `rocks` | Quarterly goals (EOS methodology) |
| `eod_reports` | End-of-day submissions |
| `audit_logs` | Compliance and security tracking |
| `webhook_configs` | External integrations |
| `recurring_task_templates` | Scheduled recurring tasks |

### 2. API Security Architecture

**Decision**: Layered security with validation, authentication, and audit logging.

**Implementation**:

```typescript
// Request flow:
// 1. Auth middleware verifies session
// 2. Zod schema validates request body
// 3. Business logic with role checks
// 4. Audit logging for sensitive operations
// 5. Standardized error responses
```

**Components**:
- `lib/auth/middleware.ts` - Session verification, role extraction
- `lib/validation/middleware.ts` - Request validation with Zod
- `lib/validation/schemas.ts` - Centralized validation schemas
- `lib/api/errors.ts` - Standardized error handling
- `lib/audit/logger.ts` - Audit trail with batched writes

### 3. Caching Strategy

**Decision**: In-memory caching with TTL and LRU eviction.

**Rationale**:
- Serverless functions share memory within execution context
- Reduces database load for frequently accessed data
- TTL prevents stale data
- LRU prevents memory exhaustion

**Implementation**: `lib/cache/index.ts`

**Pre-configured Caches**:
| Cache | TTL | Max Size | Purpose |
|-------|-----|----------|---------|
| `sessionCache` | 5 min | 1000 | Active sessions |
| `orgSettingsCache` | 10 min | 100 | Organization settings |
| `queryCache` | 2 min | 500 | Database query results |
| `userCache` | 5 min | 500 | User profiles |

### 4. Recurring Tasks System

**Decision**: Template-based recurring task generation with a scheduler.

**Implementation**: `lib/scheduler/recurring-tasks.ts`

**Features**:
- Supports daily, weekly, monthly, yearly frequencies
- Custom intervals (every N days/weeks)
- Day-of-week selection for weekly tasks
- Skip weekends option
- End date and max occurrences limits
- Background processing with `processDueTasks()`

**Database Schema**:
```sql
recurring_task_templates:
  - id, organization_id, title, description
  - recurrence_rule (JSONB with frequency, interval, etc.)
  - next_run_date, last_run_date
  - occurrence_count, is_active
```

### 5. Webhook System

**Decision**: Full-featured webhook system with retry logic and delivery tracking.

**Implementation**: `lib/webhooks/dispatcher.ts`

**Features**:
- HMAC-SHA256 signature verification
- Automatic retry with exponential backoff
- Delivery status tracking
- Auto-disable after 10 consecutive failures
- Test endpoint for configuration validation

**Supported Events**:
- `task.created`, `task.updated`, `task.completed`, `task.deleted`
- `rock.created`, `rock.updated`, `rock.completed`
- `eod.submitted`, `eod.approved`
- `member.joined`, `member.removed`

### 6. Bulk Operations

**Decision**: Admin-only bulk operations with transaction support.

**Implementation**: `app/api/tasks/bulk/route.ts`

**Supported Operations**:
- Bulk complete tasks
- Bulk delete tasks
- Bulk reassign to different team member
- Bulk priority change
- Bulk due date change

**Safeguards**:
- Admin/owner role required
- Maximum 100 tasks per operation
- Atomic transactions
- Detailed result reporting (processed, skipped, errors)

---

## API Route Structure

### Authentication
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/login` | POST | User login |
| `/api/auth/signup` | POST | User registration |
| `/api/auth/logout` | POST | Session termination |
| `/api/auth/me` | GET | Current user info |

### Tasks
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/tasks` | GET | List tasks |
| `/api/tasks` | POST | Create task |
| `/api/tasks/[id]` | PATCH | Update task |
| `/api/tasks/[id]` | DELETE | Delete task |
| `/api/tasks/bulk` | POST | Bulk operations |
| `/api/tasks/recurring` | GET/POST/PATCH/DELETE | Recurring templates |

### Rocks (Quarterly Goals)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/rocks` | GET | List rocks |
| `/api/rocks` | POST | Create rock |
| `/api/rocks/[id]` | PATCH | Update rock |
| `/api/rocks/[id]/milestones` | POST | Add milestone |

### EOD Reports
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/eod` | GET | List reports |
| `/api/eod` | POST | Submit report |
| `/api/eod/status` | GET | Submission status |

### Admin
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/audit` | GET/POST | Audit log queries |
| `/api/webhooks` | GET/POST/PATCH/DELETE | Webhook management |
| `/api/export` | GET/POST | Data export |
| `/api/api-keys` | GET/POST/DELETE | API key management |

---

## Error Handling

### Standard Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `INSUFFICIENT_PERMISSIONS` | 403 | Role-based access denied |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `CONFLICT` | 409 | Resource already exists |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Server error |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": {
      "field": "email"
    }
  }
}
```

---

## Testing

### Setup

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
npm run test:coverage # With coverage report
```

### Test Structure

```
__tests__/
├── lib/
│   ├── api/
│   │   └── errors.test.ts
│   ├── cache/
│   │   └── cache.test.ts
│   └── validation/
│       └── middleware.test.ts
```

### Mocking

Global mocks are configured in `jest.setup.js`:
- Database module (`@/lib/db`)
- Environment variables
- Test utilities (`global.testUtils`)

---

## MCP Server Integration

The project includes an MCP (Model Context Protocol) server for Claude Desktop integration.

### Location
`mcp-server/`

### Setup
```bash
cd mcp-server
./setup.sh
```

### Available Tools
- `get_team_eod_status` - Check who has submitted EOD reports
- `get_pending_tasks` - View pending tasks for team members
- `get_rocks_progress` - Track quarterly rock progress
- `create_task` - Create new tasks
- `submit_eod` - Submit EOD reports

---

## Performance Considerations

### Database Indexes

Critical indexes for query performance:

```sql
-- Sessions
idx_sessions_token ON sessions(token)
idx_sessions_user_id ON sessions(user_id)

-- Tasks
idx_tasks_org_id ON assigned_tasks(organization_id)
idx_tasks_assignee ON assigned_tasks(assignee_id)
idx_tasks_recurring_id ON assigned_tasks(recurring_task_id)

-- Audit
idx_audit_logs_created_at ON audit_logs(created_at DESC)
idx_audit_logs_action ON audit_logs(action)
```

### Query Optimization

1. **Pagination**: All list endpoints support pagination with offset/limit
2. **Selective fetching**: Only fetch required columns
3. **Batch operations**: Use transactions for bulk updates
4. **Caching**: Frequently accessed data cached with TTL

---

## Security Considerations

### Authentication
- Sessions stored in database with expiration
- Secure token generation using crypto.randomUUID()
- Password hashing with bcrypt (10 rounds)

### Authorization
- Role-based access control (owner, admin, member)
- Resource ownership validation
- Organization-scoped data access

### Data Protection
- Input sanitization via Zod schemas
- SQL injection prevention with parameterized queries
- XSS prevention through React's default escaping
- CSRF protection via session tokens

### Audit Trail
- All sensitive operations logged
- Includes actor, action, resource, timestamp
- IP address and user agent captured
- Supports compliance requirements

---

## Deployment Notes

### Environment Variables

Required:
```env
POSTGRES_URL=postgres://...
RESEND_API_KEY=re_...       # For email
OPENAI_API_KEY=sk-...       # For AI features
```

Optional:
```env
MIGRATION_KEY=...           # For protected migrations
SLACK_WEBHOOK_URL=...       # For Slack integration
```

### Database Migration

Run migration endpoint:
```bash
curl -X GET https://your-domain.com/api/db/migrate \
  -H "x-migration-key: YOUR_MIGRATION_KEY"
```

---

## Future Improvements

### Planned Features
1. Real-time notifications via WebSocket/SSE
2. Advanced analytics dashboard
3. Custom report builder
4. Slack/Teams deep integration
5. Mobile app API endpoints

### Technical Debt
1. Add more comprehensive API rate limiting
2. Implement distributed caching (Redis) for multi-instance
3. Add OpenTelemetry tracing
4. Improve test coverage to 80%+
5. Add E2E tests with Playwright

---

## Code Style Guidelines

### TypeScript
- Strict mode enabled
- Prefer interfaces over types for object shapes
- Use explicit return types for functions
- Avoid `any`, prefer `unknown`

### API Routes
- Use standardized error responses
- Validate all inputs with Zod
- Log all errors with context
- Return proper HTTP status codes

### Database
- Use parameterized queries
- Always include organization_id filters
- Prefer single queries over multiple roundtrips
- Use transactions for multi-table updates

---

## Changelog

### 2024-12-30
- Added comprehensive audit logging system
- Implemented webhook management and dispatcher
- Created recurring task scheduler
- Added bulk task operations API
- Enhanced export functionality with audit logs
- Set up Jest testing infrastructure
- Created validation middleware with Zod
- Implemented in-memory caching layer
- Added database transaction utilities

### Previous
- Initial project setup with Next.js 16
- Core authentication and authorization
- Task and rock management
- EOD report submission system
- Team management and invitations
- AI Command Center integration
- Calendar ICS export
- MCP server for Claude Desktop

---

*Last updated: 2024-12-30*
