# Technical Lead (Intern) - Taskspace Platform

**Company:** Taskspace (trytaskspace.com)
**Role:** Technical Lead Intern
**Product:** EOS-powered team accountability & productivity SaaS
**Location:** Remote
**Reports to:** Founder / Product Owner

---

## About Taskspace

Taskspace is a multi-tenant SaaS platform that implements the Entrepreneurial Operating System (EOS) methodology for team productivity and accountability. The platform helps leadership teams set quarterly goals (Rocks), track KPIs (Scorecard), run Level 10 meetings, manage issues (IDS process), submit daily EOD reports, and leverage AI-powered insights - all within isolated, customizable workspaces.

**The product is already built and deployed.** We're looking for a tech lead to take it from "functional" to "exceptional" - hardening security, improving performance, expanding integrations, increasing test coverage, and building out the remaining feature roadmap.

---

## What You'll Be Working With

### Core Tech Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 16+ |
| **Language** | TypeScript (strict mode) | ES6 target |
| **Frontend** | React 19, Tailwind CSS v4, Radix UI (shadcn/ui) | Latest |
| **Database** | PostgreSQL (@vercel/postgres prod, pg local) | Vercel Postgres |
| **State Management** | Zustand (client), SWR (data fetching) | Latest |
| **AI/LLM** | Anthropic Claude API (claude-sonnet-4-20250514) | Latest |
| **Payments** | Stripe (subscriptions, checkout, portal, webhooks) | SDK v17+ |
| **Email** | Resend (transactional emails) | Latest |
| **Deployment** | Vercel (serverless + cron + blob storage) | Production |
| **Testing** | Jest 29 + React Testing Library + ts-jest | Latest |
| **Error Tracking** | Sentry (optional) | Latest |
| **Auth** | Custom session-based (bcrypt, httpOnly cookies) | Custom |

### Integration Ecosystem
- **Slack** - Webhook notifications (15+ notification types), daily digests, reminders
- **Google Calendar** - OAuth 2.0 sync, event creation from tasks
- **Asana** - Two-way task/rock sync with webhook listening
- **Stripe** - 3-tier billing (Free/Team/Business), AI credit packs, customer portal
- **Firecrawl** - Website scraping for brand DNA extraction during onboarding
- **Claude AI** - 11+ AI functions (brain dump, digest, insights, prioritization, meeting prep)
- **MCP Server** - Claude Desktop integration (5 tools for task/EOD management)
- **Webhooks** - Custom outbound webhooks with HMAC-SHA256 signing + retry logic

---

## Codebase at a Glance

| Metric | Count |
|--------|-------|
| **Page Routes** | 31 (authenticated + marketing + admin + public) |
| **API Endpoints** | 140+ across 30+ categories |
| **React Components** | 80+ (30 page components + 50+ sub-components) |
| **Database Tables** | 25+ with 30+ migrations |
| **Feature Toggles** | 16 categories (core, productivity, integration, advanced, admin) |
| **DB Layer** | 3,955-line main index + 12 domain repository files |
| **Validation Schemas** | 1,172-line Zod schema file |
| **AI Functions** | 11 Claude-powered features |
| **Email Templates** | 21KB template file with 6+ email types |
| **Environment Variables** | 30+ (configured via Vercel dashboard) |

### Project Structure
```
aimseod/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── (app)/              # Protected app routes
│   ├── (authenticated)/    # Auth-required routes
│   ├── (marketing)/        # Public marketing pages
│   └── api/                # 140+ API endpoints
├── components/             # 27 component directories
│   ├── ui/                 # shadcn/ui base components
│   ├── pages/              # Full page components
│   └── [domain]/           # Domain-specific components
├── lib/                    # Business logic & utilities
│   ├── db/                 # Database layer (repository pattern)
│   ├── auth/               # Auth, rate limiting, feature gates
│   ├── ai/                 # Claude AI integration
│   ├── integrations/       # External service clients
│   ├── api/                # API utilities & client
│   ├── validation/         # Zod schemas & middleware
│   ├── hooks/              # React hooks (workspace, team, permissions)
│   └── utils/              # Date, color, stats, sanitization helpers
├── migrations/             # 30+ SQL migration files
├── mcp-server/             # Claude Desktop MCP integration
├── __tests__/              # Jest test suite
└── scripts/                # Admin & migration scripts
```

---

## The Product: Feature Inventory

### EOS Framework Implementation (Core)
- **Rocks** - Quarterly goal setting with progress tracking, milestones, check-ins, AI bulk import
- **Scorecard** - Weekly KPI metrics with trend charts, goal vs actual, AI insights
- **L10 Meetings** - Structured meeting management with agenda builder, timer, notes, todos, action items
- **IDS Board** - Identify/Discuss/Solve kanban board for issue resolution
- **V/TO** - Vision/Traction Organizer with core values, 10-year target, 3-year picture, marketing strategy
- **People Analyzer** - GWC (Gets It/Wants It/Capacity) assessment framework
- **Accountability Chart** - Interactive org chart with CSV import, rock tracking per person

### Productivity & Reporting
- **Tasks** - Full task management with kanban board, subtasks, comments, recurring templates, bulk operations, time tracking
- **EOD Reports** - Daily end-of-day submissions with AI-assisted writing, public shareable links, escalation system
- **Dashboard** - Central hub with stats cards, rocks/tasks overview, quick actions, activity feed, focus of the day
- **Manager Dashboard** - Team aggregation view with AI insights, drill-down per direct report, health scoring
- **Analytics** - Date-range charts for rock/task/EOD completion rates, top performers, activity heatmaps, CSV export
- **Productivity Tracking** - Focus blocks, energy levels, EOD streaks, weekly reviews

### AI Command Center
- **Brain Dump** - Unstructured text → structured tasks via Claude
- **AI Task Review** - Approve/reject AI-generated tasks
- **Daily Digest** - AI-generated executive summary of team activity
- **AI Copilot** - Chat interface with full team data context
- **Bulk Rock Import** - Paste text → AI parses into structured quarterly goals
- **Meeting Prep** - Auto-generated talking points from rocks/tasks/issues
- **Scorecard Insights** - Trend analysis and anomaly detection
- **Manager Insights** - Direct report performance analysis
- **Task Prioritization** - AI-powered priority ranking

### Platform & SaaS Infrastructure
- **Multi-Workspace** - Multiple workspaces per organization with independent feature toggles
- **Role-Based Access** - Owner > Admin > Manager > Member hierarchy
- **Billing** - Stripe integration with Free/Team/Business tiers, AI credit system
- **Onboarding** - Guided setup with brand DNA extraction from company website
- **Custom Branding** - Logo, colors, theme customization per workspace
- **Settings** - Profile, org, workspace, notifications, integrations, data export
- **Public Pages** - Marketing site with feature pages, solutions pages, pricing

---

## Security Posture (Current State)

### Strengths
- **Input Validation**: Comprehensive Zod schemas on all 140+ API endpoints (1,172-line schema file)
- **SQL Injection**: Zero risk - all queries use parameterized template literals
- **Authentication**: Session-based with bcrypt (12 rounds), httpOnly/secure/sameSite cookies, 7-day expiration
- **Authorization**: Role-based middleware wrappers (withAuth, withAdmin, withOwner, withWorkspaceAccess)
- **Multi-Tenancy**: Organization-scoped queries, workspace boundary enforcement, returns 404 (not 403) to prevent info leakage
- **Rate Limiting**: Hybrid edge + database-backed limiting (100 auth/min, 1000 API/min per IP)
- **Webhook Security**: HMAC-SHA256 signature verification with timing-safe comparison + timestamp validation
- **Token Encryption**: OAuth tokens encrypted at rest using Web Crypto API
- **Security Headers**: CSP, X-Frame-Options, HSTS, Permissions-Policy on all responses
- **Audit Logging**: Sensitive operations logged with actor, action, resource, timestamp, IP
- **Sensitive Data**: Password hashes never returned in API responses, structured logger auto-redacts secrets

### Areas for Improvement
| Finding | Risk | Recommendation |
|---------|------|----------------|
| No explicit CSRF tokens | Medium | Add CSRF protection for high-risk operations (delete, financial) |
| Public EOD endpoint uses slug as sole auth | Medium | Add optional access tokens for sensitive orgs |
| File upload validates MIME type only | Low | Add server-side magic byte detection |
| CSP allows `unsafe-inline` scripts | Low | Move to nonce-based CSP for inline scripts |
| No automated dependency vulnerability scanning | Low | Add `npm audit` to CI pipeline |

---

## What We Need You To Do

### Immediate Priorities (Month 1-2)

1. **Codebase Familiarization & Audit**
   - Deep-dive into every module, understand the patterns
   - Run the full test suite, identify gaps
   - Set up local development environment
   - Review all 30+ database migrations and understand the schema

2. **Test Coverage Expansion**
   - Current: Basic test suite exists but coverage is incomplete
   - Target: 80%+ coverage on all API routes and business logic
   - Add E2E tests with Playwright for critical user flows
   - Add integration tests for all external service integrations

3. **Security Hardening**
   - Implement CSRF token protection
   - Add magic byte file type validation
   - Harden CSP to nonce-based inline scripts
   - Set up automated `npm audit` in CI
   - Add optional access tokens for public EOD endpoints

4. **Performance Optimization**
   - Profile API response times, optimize slow queries
   - Add database indexes where needed (some exist, more may be needed)
   - Implement Redis/distributed caching (currently in-memory only)
   - Add real-time updates via WebSocket or SSE (currently uses polling)

### Growth Phase (Month 3-6)

5. **Real-Time Features**
   - Replace polling with WebSocket/SSE for live updates
   - Real-time notifications without page refresh
   - Live meeting collaboration (multiple users editing simultaneously)
   - Presence indicators (who's online, who's viewing what)

6. **Advanced Integrations**
   - Deep Slack integration (slash commands, interactive messages, app home)
   - Microsoft Teams integration
   - Zapier/Make connector for no-code workflows
   - SSO/SAML for Business tier (architecture exists, needs implementation)

7. **Mobile & API**
   - Build out REST API documentation (OpenAPI/Swagger)
   - Mobile-optimized responsive views or React Native app
   - Push notification infrastructure (VAPID keys already configured)
   - Offline-capable progressive web app (PWA)

8. **Observability & DevOps**
   - OpenTelemetry distributed tracing
   - Structured logging pipeline (currently console-based)
   - Health check dashboards
   - Automated deployment pipeline with staging environment
   - Database backup and disaster recovery procedures

---

## Required Technical Skills

### Must Have
- **TypeScript** - Strict mode, generics, discriminated unions, Zod schema inference
- **Next.js App Router** - Server components, route handlers, middleware, layouts, streaming
- **React 19** - Hooks, context, suspense, concurrent features, SWR data fetching
- **PostgreSQL** - Query optimization, indexing, migrations, parameterized queries, transactions
- **REST API Design** - Status codes, pagination, error handling, versioning, rate limiting
- **Authentication & Authorization** - Session management, RBAC, OAuth 2.0 flows, token security
- **Git** - Feature branches, rebasing, conflict resolution, commit hygiene

### Strongly Preferred
- **Tailwind CSS** - Utility-first styling, responsive design, dark mode
- **Stripe** - Subscriptions, webhooks, checkout sessions, customer portal
- **AI/LLM Integration** - Prompt engineering, structured output parsing, token management
- **Claude Code** - AI-assisted development workflow, MCP servers, agentic coding
- **Vercel** - Serverless functions, edge runtime, cron jobs, blob storage, environment management
- **Testing** - Jest, React Testing Library, Playwright, test-driven development
- **Security** - OWASP Top 10, CSP, CSRF, XSS prevention, input sanitization

### Nice to Have
- **EOS Methodology** - Understanding of Rocks, Scorecard, L10, IDS, V/TO, People Analyzer
- **WebSocket/SSE** - Real-time communication protocols
- **Redis** - Distributed caching, pub/sub
- **Sentry** - Error tracking, performance monitoring
- **CI/CD** - GitHub Actions, automated testing pipelines
- **Mobile Development** - React Native or PWA experience
- **Zustand** - Client-side state management

---

## What We're Looking For in a Person

### Technical Qualities
- **Code quality obsession** - Clean, well-typed, well-tested code. You read existing patterns before writing new ones.
- **Security-first mindset** - You think about attack vectors before shipping features. OWASP is second nature.
- **Performance awareness** - You profile before optimizing. You understand N+1 queries, cache invalidation, and connection pooling.
- **Full-stack capability** - Comfortable from database schema design to responsive UI. Can debug a slow query AND a CSS layout issue.
- **AI-native development** - You use Claude Code, Copilot, or similar tools daily. You understand prompt engineering and structured output.

### Work Style
- **Self-directed** - Given a goal, you break it down, plan it, and execute. You don't wait to be told what to do next.
- **Documentation-minded** - You write READMEs, add JSDoc comments on complex functions, and keep dev notes current.
- **Communication** - You explain technical decisions clearly. You flag blockers early. You ask questions when requirements are ambiguous.
- **Iterative** - Ship small, get feedback, iterate. Don't go dark for two weeks on a massive refactor.
- **Cost-conscious** - We're a startup. You understand Vercel pricing, Stripe fees, and API costs. You don't spin up infrastructure you don't need.

---

## Interview / Assessment Areas

### Technical Assessment
1. **Code Review** - Review a PR from the Taskspace codebase. Identify bugs, security issues, and improvement opportunities.
2. **API Design** - Design a new API endpoint for a Taskspace feature (e.g., real-time meeting collaboration). Explain auth, validation, error handling.
3. **Database** - Write a migration for a new feature. Explain indexing strategy and query optimization.
4. **Security** - Walk through how you'd implement CSRF protection in the existing auth system. Explain the trade-offs.
5. **AI Integration** - Build a new Claude-powered feature (e.g., automated rock progress assessment). Handle structured output, error cases, token budgets.

### Practical Exercise
- Clone the Taskspace repo
- Set up local development environment
- Fix a real bug or implement a small feature
- Write tests for existing untested code
- Submit a PR with proper commit messages and description

---

## Compensation & Growth

- **Role**: Technical Lead Intern (path to full-time Tech Lead)
- **Growth**: Direct mentorship from founder, ownership of entire technical direction
- **Impact**: Your code ships to production immediately. Real users, real impact.
- **Learning**: Work across the entire stack - from database migrations to AI prompt engineering to Stripe billing to real-time systems.

---

## How to Apply

1. Review the Taskspace codebase on GitHub
2. Set up local development and explore the product
3. Identify 3 things you'd improve and explain why
4. Submit your application with:
   - GitHub profile
   - Brief description of a complex project you've built
   - Your 3 improvement suggestions for Taskspace
   - Availability and timezone

---

*Taskspace is building the future of team accountability. If you're excited about shipping production SaaS, working with cutting-edge AI, and owning the technical direction of a real product, we want to hear from you.*
