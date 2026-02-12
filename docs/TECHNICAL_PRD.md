# Taskspace - Technical Product Requirements Document

**Version:** 1.0
**Date:** February 2026
**Status:** Production (v1 deployed, expanding)
**Domain:** trytaskspace.com
**Repository:** github.com/adamwolfe2/aimseod

---

## 1. Product Overview

### What is Taskspace?
Taskspace is a multi-tenant SaaS platform implementing the Entrepreneurial Operating System (EOS) methodology. It provides leadership teams with tools for quarterly goal setting (Rocks), KPI tracking (Scorecard), structured meetings (L10), issue resolution (IDS), daily accountability (EOD reports), and AI-powered team insights.

### Target Users
- **Primary**: Small-to-mid-size businesses (5-100 employees) running EOS
- **Secondary**: Any team wanting structured accountability without EOS certification
- **Personas**: CEOs/Founders, Operations leaders, Team managers, Individual contributors

### Business Model
| Plan | Price | Users | Features |
|------|-------|-------|----------|
| **Free** | $0/mo | 3 max | Core EOS tools, 50 AI credits/mo |
| **Team** | $XX/mo | 25 max | + L10 meetings, IDS, scorecard, analytics, 200 AI credits/mo |
| **Business** | $XX/mo | Unlimited | + Custom branding, API access, SSO, unlimited AI credits |

AI Credit Packs: 500 / 2,000 / 5,000 credits (one-time purchase)

---

## 2. Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────────┐
│                     Vercel Edge                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │Middleware │  │  Cron    │  │   Blob Storage       │  │
│  │(Security,│  │  Jobs    │  │   (File uploads)     │  │
│  │ RateLimit)│  │ (3 jobs)│  │                      │  │
│  └────┬─────┘  └────┬─────┘  └──────────────────────┘  │
│       │              │                                    │
│  ┌────┴──────────────┴──────────────────────────────┐   │
│  │           Next.js App Router                      │   │
│  │  ┌─────────┐  ┌──────────┐  ┌────────────────┐  │   │
│  │  │  Pages  │  │API Routes│  │  Server         │  │   │
│  │  │  (SSR)  │  │  (140+)  │  │  Components     │  │   │
│  │  └─────────┘  └────┬─────┘  └────────────────┘  │   │
│  └─────────────────────┼────────────────────────────┘   │
└────────────────────────┼────────────────────────────────┘
                         │
        ┌────────────────┼────────────────────┐
        │                │                    │
   ┌────┴────┐    ┌──────┴──────┐    ┌───────┴───────┐
   │PostgreSQL│    │  Claude AI  │    │  External     │
   │ (Vercel) │    │ (Anthropic) │    │  Services     │
   │ 25+ tbls │    │  11 funcs   │    │  Stripe,Slack │
   │ 30+ migr │    │             │    │  Asana,GCal   │
   └──────────┘    └─────────────┘    │  Resend,etc   │
                                      └───────────────┘
```

### Data Model (Core Entities)
```
Organization (tenant boundary)
  ├── Users / Members (roles: owner, admin, manager, member)
  ├── Workspaces (isolated team spaces)
  │   ├── Rocks (quarterly goals)
  │   │   └── Milestones / Check-ins
  │   ├── Tasks (action items)
  │   │   ├── Subtasks
  │   │   ├── Comments
  │   │   └── Recurring Templates
  │   ├── EOD Reports (daily accountability)
  │   ├── Meetings (L10 format)
  │   │   ├── Agenda Items
  │   │   ├── Meeting Notes
  │   │   └── Meeting Todos
  │   ├── IDS Board Items (Identify/Discuss/Solve)
  │   ├── Scorecard Metrics + Entries
  │   ├── V/TO (Vision/Traction Organizer)
  │   ├── People Assessments (GWC framework)
  │   ├── Org Chart Employees
  │   ├── Workspace Notes
  │   └── Feature Toggles
  ├── Invitations
  ├── Sessions
  ├── Audit Logs
  ├── Notifications
  ├── Webhook Configs + Deliveries
  ├── AI Suggestions + Credits
  └── Stripe Subscription
```

### Authentication & Authorization

**Auth Flow:**
1. User registers (email + password) or accepts invitation
2. Password hashed with bcrypt (12 rounds)
3. Session created in DB (7-day TTL, cryptographic token)
4. Token set as httpOnly/secure/sameSite=lax cookie
5. Middleware validates session on every request
6. Multi-session support (max 5 per user)

**RBAC Hierarchy:**
```
owner  (4) ─── Full access, billing, org deletion
admin  (3) ─── Team management, feature toggles, analytics
manager(2) ─── Direct report views, manager dashboard
member (1) ─── Personal tasks, rocks, EOD submissions
```

**API Key Authentication:**
- Format: `aims_<random>_<random>` (Bearer token)
- Used by MCP server and external integrations
- Tracked with `lastUsedAt` timestamps
- Organization membership verified on each request

---

## 3. Feature Specifications

### 3.1 Dashboard
**Purpose:** Central hub showing user's daily priorities and team status

**Components:**
- Stats cards: Rocks completed, tasks done, EOD completion rate
- My Rocks section with progress bars and status filters
- Assigned tasks with quick-action buttons
- EOD submission card with AI-assisted writing
- Weekly EOD calendar showing submission history
- Quick actions bar (create task, create rock, submit EOD)
- Focus of the day selector
- Activity feed (recent team actions)

**Data Sources:** Rocks table, tasks table, EOD reports, activity logs

### 3.2 Rock Management (Quarterly Goals)
**Purpose:** Track quarterly objectives per EOS methodology

**Capabilities:**
- Create/edit/delete rocks with title, description, owner, due date, quarter
- Progress tracking (0-100%) with visual progress bar
- Status: Not Started → On Track → Behind → At Risk → Complete
- Milestones: Sub-goals within a rock
- Check-ins: Regular progress logging with notes
- AI bulk import: Paste text → Claude parses into structured rocks
- Link rocks to tasks for traceability
- Filter by: quarter, owner, status, workspace

**API Endpoints:** 8 routes (CRUD + check-in + complete + parse + bulk + move)

### 3.3 Task Management
**Purpose:** Day-to-day action item tracking

**Capabilities:**
- Kanban board view (drag-drop between status columns)
- List view with sorting and filtering
- Subtasks with reordering (drag-drop)
- Task comments with @mention support
- Recurring task templates (daily, weekly, custom)
- Bulk operations: complete, delete, reassign, change priority/due date
- Time tracking per task
- Rock association (link task to quarterly goal)
- Priority levels: Low, Medium, High, Urgent

**API Endpoints:** 12 routes (CRUD + bulk + recurring + subtasks + comments + reorder)

### 3.4 EOD Reports (Daily Accountability)
**Purpose:** End-of-day reporting for team transparency

**Capabilities:**
- Structured daily report: accomplishments, blockers, tomorrow's plan
- AI-assisted report generation from text dump
- Edit window: 24 hours after submission
- Public shareable links (slug-based, no auth required)
- Weekly summary view (public)
- Escalation system: flag reports needing attention
- Manager review with AI insights
- Streak tracking (consecutive submission days)
- Cron-based email reminders (daily at configurable time)
- Submission status tracking per team member

**API Endpoints:** 6 routes (CRUD + verify + status)

### 3.5 L10 Meetings
**Purpose:** Structured meeting format per EOS Level 10 methodology

**Capabilities:**
- Meeting creation with date, time, attendees, type (L10, 1-on-1, custom)
- Agenda builder with timed sections
- Live meeting timer per agenda item
- Meeting notes (rich text editor)
- Todo items with assignee and due date
- Section management (Segue, Scorecard, Rock Review, Headlines, IDS, Conclude)
- AI meeting prep: auto-generated talking points from rocks/tasks/issues
- AI meeting notes summary

**API Endpoints:** 10 routes (CRUD + start + end + agenda + notes + todos + sections)

### 3.6 Scorecard (KPI Tracking)
**Purpose:** Weekly metric tracking per EOS Scorecard methodology

**Capabilities:**
- Custom metric definitions (name, owner, weekly goal, unit)
- Weekly data entry (always ending on Friday per EOS standard)
- 8-week rolling view with trend charts
- Goal vs actual comparison with color coding (green/yellow/red)
- AI insights: anomaly detection, trend analysis
- Summary statistics: % on track, % off track
- Export to CSV

**API Endpoints:** 8 routes (metrics CRUD + entries + summary + trends)

### 3.7 IDS Board (Issue Resolution)
**Purpose:** Identify, Discuss, Solve framework for team issues

**Capabilities:**
- Kanban board with 3 columns: Identify → Discuss → Solve
- Item types: Issue, Rock (linked), Custom
- Drag-and-drop between columns
- Assignee and description per item
- Resolution tracking

**API Endpoints:** 5 routes (CRUD + move + resolve)

### 3.8 V/TO (Vision/Traction Organizer)
**Purpose:** Strategic planning document per EOS framework

**Sections:**
- Core Values (list)
- Core Focus (purpose + niche)
- 10-Year Target
- Marketing Strategy (target market, 3 uniques, proven process, guarantee)
- 3-Year Picture (revenue, profit, description)
- 1-Year Plan (revenue, profit, goals)
- Issues List

**Features:** Auto-save, last-edited tracking, collapsible sections

**API Endpoints:** 2 routes (GET + POST)

### 3.9 People Analyzer (GWC Assessment)
**Purpose:** Evaluate team members using EOS GWC framework

**Dimensions:**
- Gets It (understands role and goals)
- Wants It (motivated for the position)
- Capacity (time and ability)
- Core Values Alignment (1-5 rating)
- Right Person, Right Seat (yes/no/maybe)

**Features:** Assessment history, notes per assessment, comparison view

**API Endpoints:** 5 routes (CRUD + history)

### 3.10 Org Chart (Accountability Chart)
**Purpose:** Visual team hierarchy with performance tracking

**Capabilities:**
- Interactive tree visualization (pan, zoom)
- CSV upload wizard for bulk import
- Employee cards with rock progress
- Employee detail modal (metrics, capacity, rocks)
- Search and highlight
- Auto-refresh: employees every 30s, progress every 10s
- AI chat: query org data in natural language

**API Endpoints:** 7 routes (employees + upload + rocks + sync + progress + status + chat)

### 3.11 AI Command Center
**Purpose:** Central hub for all AI-powered features

**Tabs:**
1. **Brain Dump** - Paste unstructured text → AI extracts tasks with assignments
2. **AI Task Review** - Approve/reject queue for AI-generated tasks
3. **Daily Digest** - AI summary of team activity for selected date
4. **AI Copilot** - Chat with full team data context
5. **Bulk Rock Import** - Paste text → AI parses into structured rocks

**Budget Controls:** Monthly AI credit limits, usage tracking, per-function costs

**API Endpoints:** 14 routes (brain-dump + digest + query + suggestions + prioritize + meeting-prep + eod-parse + tasks + scorecard-insights + manager-insights + meeting-notes + slack + budget-settings)

### 3.12 Manager Dashboard
**Purpose:** Aggregated team performance view for managers

**Features:**
- Grid or list view of direct reports
- Per-person cards: name, role, rock progress, task stats, EOD status
- Status indicators: on-track, needs-attention
- AI team health analysis (good/warning/critical)
- Drill-down detail sheet per person
- Filtering by name and status

**API Endpoints:** 3 routes (dashboard + direct-reports + detail)

### 3.13 Analytics
**Purpose:** Historical performance tracking and trends

**Charts:**
- Rock completion rate (line chart over time)
- Task completion rate (line chart over time)
- EOD submission rate (line chart over time)
- Top performers (ranked list with scores)
- Activity heatmap (by day of week)
- Goal vs actual comparison (bar chart)

**Controls:** Date range (7d, 30d, 90d, 1y), workspace selector, CSV export

**API Endpoints:** 2 routes (analytics data + dashboard metrics)

### 3.14 Productivity Suite
**Purpose:** Personal productivity tools

**Features:**
- Focus blocks (time blocking with task association)
- Energy level tracking (daily mood/energy logging)
- Focus score calculation
- EOD submission streaks with gamification
- Productivity dashboard (aggregated stats)

**API Endpoints:** 7 routes (focus-blocks CRUD + energy + focus-score + streak + dashboard)

### 3.15 Settings & Administration
**Purpose:** Platform configuration and management

**Settings Tabs:**
1. Profile (name, email, avatar)
2. Organization (name, timezone)
3. Workspace (current workspace settings)
4. Workspace Features (toggle 16+ feature categories)
5. Branding (logo, colors, theme)
6. Notifications (email + Slack preferences)
7. Integrations & API (API keys, webhooks, third-party)
8. Data Export (CSV/PDF download)
9. Billing (plan, usage, Stripe portal)
10. Team Management (members, roles, invitations)

**Admin Tools:**
- Database migration runner
- Data diagnostics
- Emergency workspace setup
- Force migration

---

## 4. Integration Specifications

### 4.1 Stripe Billing
**Webhook Events:**
- `checkout.session.completed` → Activate subscription
- `customer.subscription.created/updated/deleted` → Sync plan status
- `invoice.paid` → Record payment
- `invoice.payment_failed` → Alert admin, grace period

**Customer Portal:** Self-service plan changes, payment method updates, invoice history

### 4.2 Slack
**Outbound Notifications (15+ types):**
- Task assignments, EOD escalations, daily digests
- Blocker alerts, missing report reminders
- Team health updates, full EOD reports

**Security:** HMAC-SHA256 webhook signature verification, 5-min timestamp window

### 4.3 Google Calendar
**OAuth 2.0 Flow:** Authorization → code exchange → token storage (encrypted)
**Sync:** Tasks → calendar events, meetings → calendar events
**Token Management:** Automatic refresh, encrypted storage per workspace

### 4.4 Asana
**Two-Way Sync:** Tasks ↔ Asana tasks, Rocks ↔ Asana projects
**Webhook Listening:** Real-time change detection from Asana
**User Mapping:** Email-based matching between platforms
**Security:** HMAC-SHA256 signature verification, handshake protocol

### 4.5 Claude AI (Anthropic)
**Model:** claude-sonnet-4-20250514
**11 AI Functions:** Brain dump, EOD parsing, daily digest, natural language queries, scorecard insights, meeting prep, task prioritization, manager insights, meeting notes, brand color extraction, EOD text parsing
**Token Tracking:** Input/output tokens tracked per call for credit billing
**Error Handling:** Graceful fallback on API failures, budget enforcement

### 4.6 Webhooks (Custom Outbound)
**Event Types:** Task, rock, EOD, member, meeting events
**Security:** HMAC-SHA256 signature generation
**Reliability:** Exponential backoff retry (up to 10 failures before auto-disable)
**Tracking:** Delivery status in `webhook_deliveries` table

### 4.7 MCP Server (Claude Desktop)
**Tools Available:**
1. `get_team_eod_status` - Check today's EOD submissions
2. `get_pending_tasks` - View pending tasks
3. `get_rocks_progress` - Track quarterly goal progress
4. `create_task` - Create new tasks
5. `submit_eod` - Submit EOD reports

**Auth:** API key-based (`aims_*` format)

---

## 5. Infrastructure & Operations

### Deployment
- **Platform:** Vercel (serverless)
- **Database:** Vercel Postgres
- **File Storage:** Vercel Blob
- **Domain:** trytaskspace.com
- **Environment:** Production + Local development

### Cron Jobs (Vercel Cron)
| Job | Schedule | Purpose |
|-----|----------|---------|
| EOD Reminder | Weekdays 5pm | Email reminders for missing EOD reports |
| Daily Digest | Weekdays 8am | AI-generated team summary email |
| Daily EOD Email | Daily midnight | Process and send EOD compilation |

### Monitoring
- **Error Tracking:** Sentry (optional)
- **Logging:** Structured JSON logs with auto-redaction of secrets
- **Health Check:** `/api/health` endpoint
- **Audit Trail:** All sensitive operations logged to `audit_logs` table

### Security Infrastructure
| Control | Implementation |
|---------|---------------|
| Input Validation | Zod schemas on all endpoints (1,172-line schema file) |
| SQL Injection | Parameterized queries (template literals) |
| XSS | React auto-escaping + CSP headers |
| Auth | bcrypt + httpOnly session cookies |
| RBAC | Role middleware on all protected routes |
| Rate Limiting | Edge + DB hybrid (100-1000 req/min per IP) |
| Webhook Auth | HMAC-SHA256 with timing-safe comparison |
| Token Security | OAuth tokens encrypted at rest |
| Headers | CSP, HSTS, X-Frame-Options, Permissions-Policy |
| Secrets | Auto-redacted in logs, never in API responses |

### Caching
| Cache | TTL | Max Size | Purpose |
|-------|-----|----------|---------|
| Sessions | 5 min | 1,000 | Avoid DB hit per request |
| Org Settings | 10 min | 100 | Reduce settings queries |
| Query Cache | 2 min | 500 | General query caching |
| User Cache | 5 min | 500 | User profile caching |

---

## 6. Technical Roadmap

### Phase 1: Hardening (Month 1-2)
- [ ] Achieve 80%+ test coverage (API routes, business logic, components)
- [ ] Add E2E tests with Playwright (auth flow, task CRUD, EOD submission, meeting management)
- [ ] Implement CSRF token protection on mutation endpoints
- [ ] Add server-side file type validation (magic bytes)
- [ ] Harden CSP to nonce-based inline scripts
- [ ] Set up CI/CD with automated testing (GitHub Actions)
- [ ] Add `npm audit` to CI pipeline
- [ ] Performance profiling and query optimization
- [ ] Database index audit and optimization

### Phase 2: Real-Time & Performance (Month 3-4)
- [ ] WebSocket/SSE implementation for live updates
- [ ] Real-time meeting collaboration (concurrent editing)
- [ ] Presence indicators (online status, active page)
- [ ] Distributed caching with Redis (replace in-memory)
- [ ] Database connection pooling optimization
- [ ] Image optimization and CDN strategy
- [ ] Service worker for offline capabilities (PWA)

### Phase 3: Integrations & Scale (Month 5-6)
- [ ] Deep Slack integration (slash commands, interactive messages, app home tab)
- [ ] Microsoft Teams integration
- [ ] Zapier connector (triggers + actions)
- [ ] SSO/SAML implementation for Business tier
- [ ] API rate limiting per customer (not just IP)
- [ ] OpenAPI/Swagger documentation auto-generation
- [ ] Webhook retry improvements (dead letter queue)

### Phase 4: Mobile & Advanced (Month 7+)
- [ ] React Native mobile app OR progressive web app
- [ ] Push notifications (VAPID infrastructure exists)
- [ ] Advanced analytics: custom report builder
- [ ] Role-based dashboard customization
- [ ] White-label option for agencies
- [ ] Multi-language support (i18n)
- [ ] OpenTelemetry distributed tracing
- [ ] Automated database backup procedures

---

## 7. Development Environment

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ (local) or Vercel Postgres (production)
- npm or yarn
- Git

### Setup
```bash
git clone https://github.com/adamwolfe2/aimseod.git
cd aimseod
cp .env.example .env.local
# Fill in environment variables (30+ vars)
npm install
npm run migrate
npm run dev
```

### Key Commands
```bash
npm run dev              # Start development server
npm run build            # Production build
npm test                 # Run test suite
npm run test:watch       # Tests in watch mode
npm run test:coverage    # Coverage report
npm run test:ci          # CI mode (2 workers)
npm run migrate          # Run pending DB migrations
npm run migrate:down     # Rollback last migration
npm run migrate:create   # Create new migration
npm run migrate:status   # Check migration status
```

### Environment Variables (30+)
See `.env.example` (97 lines) for complete reference. Major groups:
- **Database:** `POSTGRES_URL`
- **Auth:** Session config, `TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`
- **AI:** `ANTHROPIC_API_KEY`
- **Billing:** `STRIPE_*` (secret key, publishable key, webhook secret, price IDs, payment links)
- **Email:** `RESEND_API_KEY`, `EMAIL_FROM`
- **Integrations:** Google Calendar OAuth, Asana webhook secret, Slack signing secret
- **Scraping:** `FIRECRAWL_API_KEY`
- **Push:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- **App:** `NEXT_PUBLIC_APP_URL`, `NODE_ENV`

---

## 8. Key Technical Decisions & Rationale

| Decision | Choice | Why |
|----------|--------|-----|
| Auth approach | Custom sessions (not NextAuth/Clerk) | Full control over session management, MCP/API key support, no vendor lock-in |
| Database | Raw SQL with parameterized queries (not Prisma/Drizzle) | Maximum query control, no ORM overhead, direct migration management |
| State management | Zustand + SWR (not Redux) | Lightweight, TypeScript-native, SWR handles server state elegantly |
| UI components | shadcn/ui + Radix (not Material UI) | Customizable, accessible, no style lock-in, Tailwind-native |
| AI model | Claude Sonnet (not GPT-4) | Better structured output, JSON mode, cost-effective for our use cases |
| Deployment | Vercel (not AWS/GCP) | Zero-config Next.js deployment, built-in Postgres/Blob/Cron, cost-effective at our scale |
| Styling | Tailwind CSS v4 (not CSS modules/styled-components) | Utility-first, fast iteration, excellent DX with TypeScript |
| Testing | Jest (not Vitest) | Mature ecosystem, good React Testing Library support, familiar to most developers |

---

*This document is a living reference. Update as features are built, decisions change, and the product evolves.*
