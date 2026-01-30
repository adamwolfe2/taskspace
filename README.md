# Align - Team Productivity Platform

A multi-tenant SaaS application for team accountability and productivity management.

## Features

- **Multi-tenant architecture** - Organizations with isolated data
- **Role-based access control** - Owner, Admin, and Member roles
- **Rocks (Quarterly Goals)** - Track 90-day objectives with progress
- **Task Management** - Assign and track tasks across team members
- **EOD Reports** - Daily end-of-day reporting with escalation
- **Team Invitations** - Invite members via secure token links

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI)
- **Database**: Vercel Postgres
- **Analytics**: Vercel Analytics

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Vercel account with Postgres database

### Installation

1. Clone the repository:
```bash
git clone https://github.com/adamwolfe2/aimseod.git
cd aimseod
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your Vercel Postgres credentials
```

4. Run development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

### 1. Connect Repository
- Import your GitHub repository in Vercel dashboard

### 2. Add Vercel Postgres
- Go to Storage → Create Database → Postgres
- Link to your project

### 3. Set Environment Variables
Copy variables from your Postgres dashboard:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

Optional:
- `MIGRATION_KEY` - Protect migration endpoint
- `NEXT_PUBLIC_APP_URL` - Your production URL

### 4. Deploy
- Click Deploy
- Vercel will build and deploy automatically

### 5. Run Database Migration
Migrations are run via CLI for security:
```bash
# Set your production database URL
export DATABASE_URL=your-production-database-url

# Run pending migrations
npm run migrate

# Check migration status
npm run migrate:status
```

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create account + organization |
| `/api/auth/login` | POST | User login |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/session` | GET | Get current session |
| `/api/rocks` | GET/POST/PATCH/DELETE | Manage rocks |
| `/api/tasks` | GET/POST/PATCH/DELETE | Manage tasks |
| `/api/eod-reports` | GET/POST/PATCH/DELETE | Manage EOD reports |
| `/api/members` | GET/PATCH/DELETE | Manage team members |
| `/api/invitations` | GET/POST/DELETE | Manage invitations |
| `/api/invitations/accept` | GET/POST | Accept invitation |
| `/api/organizations` | GET/PATCH | Manage organization |
| `/api/db/migrate` | GET | Check migration status (admin only) |

## Security Features

- Password hashing with bcrypt (12 rounds)
- Session-based authentication with httpOnly cookies
- Password hash exclusion from all API responses
- CLI-only database migrations (no HTTP exposure)
- Database-backed rate limiting for auth endpoints
- Multi-tenant data isolation
- Role-based authorization checks

## Scripts

```bash
npm run dev            # Start development server
npm run build          # Build for production
npm run start          # Start production server
npm run lint           # Run ESLint
npm run migrate        # Run database migrations
npm run migrate:status # Check migration status
npm run migrate:create # Create new migration
```

## License

Private - All rights reserved
