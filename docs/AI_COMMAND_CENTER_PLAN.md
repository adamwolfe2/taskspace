# AIMS AI Command Center - Implementation Plan

## Vision Summary
Transform Adam from a bottleneck manager into a strategic operator with an AI co-pilot that:
- Parses brain dumps into structured task assignments
- Digests 7+ EOD reports into 2-minute summaries
- Surfaces blockers automatically
- Pushes tasks to team via Slack
- Answers natural language queries about team activity
- Challenges thinking with proactive insights

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     AIMS AI Command Center                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Admin      │    │  Team        │    │   Slack      │       │
│  │   Command    │    │  Dashboard   │    │   Bot        │       │
│  │   Center     │    │              │    │              │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   API Layer (Next.js)                    │    │
│  │  /api/claude/*  /api/eod/*  /api/tasks/*  /api/slack/*  │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   AI Processing Layer                    │    │
│  │  - Brain Dump Parser    - EOD Analyzer                   │    │
│  │  - Task Generator       - Query Engine                   │    │
│  │  - Digest Generator     - Insight Engine                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Vercel Postgres Database                    │    │
│  │  users, eod_reports, tasks, rocks, ai_insights, etc.    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Foundation (Day 1)
**Goal**: Get Claude API working with basic EOD parsing

1. **Database Schema Extensions**
   - `admin_brain_dumps` - Store my dumps with processing status
   - `eod_insights` - AI-extracted insights from EOD reports
   - `ai_generated_tasks` - Tasks created by AI (pending approval)
   - Add `skills`, `capacity`, `active_projects` to members

2. **Claude API Integration**
   - `/api/claude/parse-eod` - Extract insights from EOD report
   - `/api/claude/parse-dump` - Parse brain dump into tasks
   - System prompts tuned for team context

3. **Environment Setup**
   - ANTHROPIC_API_KEY
   - Team context prompt with member details

### Phase 2: Command Center UI (Day 2)
**Goal**: Admin can dump text and see AI-generated tasks

1. **Command Center Page** (`/admin/command-center`)
   - Brain dump text area (supports paste from voice transcription)
   - "Process" button → shows loading state
   - Task preview cards with approve/edit/reject
   - One-click "Assign All Approved"

2. **Task Generation Flow**
   ```
   Brain Dump → Claude API → Task Previews → Admin Approval → Database
   ```

### Phase 3: EOD Intelligence (Day 3)
**Goal**: EOD reports get AI-processed automatically

1. **Auto-Processing Pipeline**
   - When EOD submitted → trigger Claude parsing
   - Extract: completed items, blockers, sentiment, categories
   - Store in `eod_insights` table
   - If blocker detected → flag for admin attention

2. **EOD Insights UI**
   - Sentiment indicator on each report
   - Highlighted blockers with suggested actions
   - Cross-team blocker detection ("3 people waiting on GHL access")

### Phase 4: Daily Digest (Day 4)
**Goal**: Automated morning summary of all team activity

1. **Digest Generation**
   - Cron job or manual trigger
   - Aggregates all EOD reports from previous day
   - Generates executive summary (<2 min read)
   - Highlights: wins, blockers, concerns, suggested follow-ups

2. **Digest UI**
   - Dedicated page showing today's digest
   - Links to drill into individual reports
   - "Challenge questions" section

### Phase 5: AI Copilot (Day 5)
**Goal**: Natural language queries about team

1. **Query Interface**
   - Chat-style input
   - Example queries:
     - "What did Kumar work on this week?"
     - "Show all blockers related to MedPros"
     - "Who hasn't submitted EOD in 2 days?"
     - "Compare productivity this week vs last week"

2. **RAG-style Implementation**
   - Query → Extract intent → SQL generation → Claude formatting
   - Context includes: EOD reports, tasks, rocks, member profiles

### Phase 6: Slack Integration (Day 6)
**Goal**: Push notifications and task management via Slack

1. **Outbound Notifications**
   - Task assignments → DM to team member
   - Daily digest → Team channel
   - Blocker alerts → DM to admin

2. **Inbound Commands**
   - `/aims task @person "task description"` - Quick task assignment
   - `/aims status` - Get quick team status
   - Slack button to mark task complete

### Phase 7: Proactive Insights (Day 7)
**Goal**: Claude challenges my thinking

1. **Automated Insights**
   - Workload imbalance detection
   - Stale blocker alerts
   - Pattern recognition across time
   - Suggested optimizations

2. **"Challenge Me" Mode**
   - Claude reviews my task assignments
   - Points out potential issues
   - Asks hard questions

---

## Database Schema

```sql
-- Admin brain dumps for processing
CREATE TABLE admin_brain_dumps (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  admin_id VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  tasks_generated INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI-extracted insights from EOD reports
CREATE TABLE eod_insights (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  eod_report_id VARCHAR(255) NOT NULL,
  completed_items JSONB DEFAULT '[]',
  blockers JSONB DEFAULT '[]',
  sentiment VARCHAR(20),
  sentiment_score INTEGER,
  categories JSONB DEFAULT '[]',
  highlights JSONB DEFAULT '[]',
  ai_summary TEXT,
  follow_up_questions JSONB DEFAULT '[]',
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI-generated tasks pending approval
CREATE TABLE ai_generated_tasks (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  brain_dump_id VARCHAR(255),
  assignee_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  due_date DATE,
  context TEXT,
  status VARCHAR(50) DEFAULT 'pending_approval',
  approved_by VARCHAR(255),
  approved_at TIMESTAMP WITH TIME ZONE,
  pushed_to_slack BOOLEAN DEFAULT FALSE,
  pushed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily digests
CREATE TABLE daily_digests (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  digest_date DATE NOT NULL,
  summary TEXT,
  wins JSONB DEFAULT '[]',
  blockers JSONB DEFAULT '[]',
  concerns JSONB DEFAULT '[]',
  follow_ups JSONB DEFAULT '[]',
  challenge_questions JSONB DEFAULT '[]',
  team_sentiment VARCHAR(20),
  reports_analyzed INTEGER DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, digest_date)
);

-- Add columns to organization_members
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]';
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 100;
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS active_projects JSONB DEFAULT '[]';
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS slack_user_id VARCHAR(255);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_brain_dumps_org ON admin_brain_dumps(organization_id);
CREATE INDEX IF NOT EXISTS idx_eod_insights_report ON eod_insights(eod_report_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_generated_tasks(status);
CREATE INDEX IF NOT EXISTS idx_digests_date ON daily_digests(organization_id, digest_date);
```

---

## API Endpoints

### Claude Processing
- `POST /api/claude/parse-eod` - Parse EOD report into insights
- `POST /api/claude/parse-dump` - Parse brain dump into task assignments
- `POST /api/claude/generate-digest` - Generate daily digest
- `POST /api/claude/query` - Natural language query

### AI Tasks
- `GET /api/ai-tasks` - Get pending AI-generated tasks
- `POST /api/ai-tasks/approve` - Approve task(s)
- `POST /api/ai-tasks/reject` - Reject task(s)
- `POST /api/ai-tasks/push` - Push to team (creates real task + Slack)

### Digests
- `GET /api/digests/today` - Get today's digest
- `POST /api/digests/generate` - Trigger digest generation
- `GET /api/digests/:date` - Get specific date's digest

### Slack
- `POST /api/slack/send-task` - Send task notification
- `POST /api/slack/send-digest` - Send digest to channel
- `POST /api/slack/webhook` - Receive Slack events

---

## Team Context Prompt

The Claude API calls will include rich context about the team:

```
You are an AI assistant helping Adam Wolfe manage his team at Modern Amenities Group.

TEAM MEMBERS:
- Sabbir: GHL automation specialist. High capacity, technical. Active projects: [list]
- Sheenam: SEO specialist. Detail-oriented. Active projects: [list]
- Kumar: N8N workflow developer. Technical, fast learner. Active projects: [list]
- Maureen: RevOps. Strategic thinker. Active projects: [list]
- Ailyn: Newsletter content. Creative. Active projects: [list]
- Marco: Lead list building. Research-focused. Active projects: [list]
- Ivan: Voice AI development. Technical. Active projects: [list]
- Saad: Lead generation. Outbound focused. Active projects: [list]
- Lujan: Real estate operations. Operations-minded. Active projects: [list]

ACTIVE PROJECTS:
- MedPros: Medical professional lead generation campaign
- GHL Setup: GoHighLevel automation for various clients
- Newsletter: Weekly thought leadership content
- Voice AI: AI calling agent development

ADAM'S PRIORITIES:
- Build leverage through systems, not manual work
- Surface blockers fast
- Keep team aligned on quarterly rocks
- Proactive not reactive

When generating tasks:
- Be specific about deliverables
- Include context about WHY this matters
- Consider current workload and skills
- Flag if someone seems overloaded
```

---

## Success Metrics

1. **Time Savings**: <15 min/day on team ops (down from 1-2 hours)
2. **Speed**: Brain dump → task assignments in <30 seconds
3. **Coverage**: Daily digest ready by 9am
4. **Responsiveness**: Blockers surface within 1 hour of EOD
5. **Usability**: Actually used daily (not abandoned)

---

## Files to Create

```
app/
├── api/
│   ├── claude/
│   │   ├── parse-eod/route.ts
│   │   ├── parse-dump/route.ts
│   │   ├── generate-digest/route.ts
│   │   └── query/route.ts
│   ├── ai-tasks/
│   │   └── route.ts
│   ├── digests/
│   │   └── route.ts
│   └── slack/
│       ├── send/route.ts
│       └── webhook/route.ts
├── command-center/
│   └── page.tsx

components/
├── admin/
│   ├── command-center.tsx
│   ├── brain-dump-input.tsx
│   ├── ai-task-preview.tsx
│   ├── daily-digest.tsx
│   └── ai-copilot.tsx
├── dashboard/
│   └── eod-insights.tsx

lib/
├── ai/
│   ├── claude-client.ts
│   ├── prompts.ts
│   ├── eod-parser.ts
│   ├── task-generator.ts
│   └── digest-generator.ts
├── integrations/
│   └── slack.ts
```

---

## Let's Build This.
