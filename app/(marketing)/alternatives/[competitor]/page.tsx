import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CheckCircle, XCircle, ArrowRight, ArrowLeft } from "lucide-react"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.trytaskspace.com"

// ─── Competitor Data ──────────────────────────────────────────────────────────

interface CompetitorFeature {
  feature: string
  taskspace: string | boolean
  competitor: string | boolean
}

interface CompetitorData {
  name: string
  slug: string
  tagline: string
  heroHeadline: string
  heroSubtext: string
  pricing: string
  taskspacePricing: string
  comparisonRows: CompetitorFeature[]
  reasons: { title: string; body: string }[]
  featureBreakdown: { category: string; items: { label: string; taskspaceNote: string; competitorNote: string }[] }[]
  whoShouldSwitch: string[]
  metaDescription: string
}

const COMPETITORS: Record<string, CompetitorData> = {
  "ninety-io": {
    name: "Ninety.io",
    slug: "ninety-io",
    tagline: "EOS-specific, per-user pricing that adds up fast",
    heroHeadline: "Taskspace vs Ninety.io",
    heroSubtext:
      "Ninety.io was purpose-built for EOS, but it comes with a steep per-user price tag, no AI assistance, and no support for teams running multiple companies. Taskspace delivers every EOS workflow you need — plus AI — starting free.",
    pricing: "$14/user/mo minimum",
    taskspacePricing: "Free (up to 3 members) · $9/user/mo Team · $19/user/mo Business",
    comparisonRows: [
      { feature: "EOS Rocks tracking", taskspace: true, competitor: true },
      { feature: "L10 Meeting facilitation", taskspace: true, competitor: true },
      { feature: "Weekly Scorecard", taskspace: true, competitor: true },
      { feature: "IDS Issue board", taskspace: true, competitor: true },
      { feature: "Accountability Charts", taskspace: true, competitor: true },
      { feature: "AI-powered EOD reports", taskspace: true, competitor: false },
      { feature: "AI accountability assistant", taskspace: true, competitor: false },
      { feature: "Multi-workspace (multiple companies)", taskspace: true, competitor: false },
      { feature: "Slack integration", taskspace: true, competitor: "Limited" },
      { feature: "Asana integration", taskspace: true, competitor: false },
      { feature: "ADHD-friendly design", taskspace: true, competitor: false },
      { feature: "Free plan available", taskspace: true, competitor: false },
      { feature: "Starting price", taskspace: "Free / $9/user/mo", competitor: "$14/user/mo min" },
    ],
    reasons: [
      {
        title: "AI accountability without the complexity",
        body: "Taskspace layers AI directly into daily workflows — EOD brain-dump reports, AI-suggested priorities, and automated blocker detection. Ninety.io has no AI layer. Your team gets structure but not intelligence.",
      },
      {
        title: "Multi-company support from day one",
        body: "If you run more than one business, Ninety.io forces you into a separate account per company. Taskspace's multi-workspace architecture lets you switch between companies instantly from one login with no extra cost on the Business plan.",
      },
      {
        title: "Pricing that scales with small teams",
        body: "Ninety.io charges per user with a minimum commitment that penalizes small teams. Taskspace is free forever for up to 3 members and starts at $9/user/month — roughly a third of what Ninety.io charges at comparable team sizes.",
      },
    ],
    featureBreakdown: [
      {
        category: "EOS Core Tools",
        items: [
          {
            label: "Rocks (Quarterly Goals)",
            taskspaceNote: "Native rocks tracking with owner assignment, progress updates, and on-track/off-track status",
            competitorNote: "Full rocks support — this is Ninety.io's core strength",
          },
          {
            label: "L10 Meetings",
            taskspaceNote: "Structured L10 agenda with integrated scorecard, rocks, and IDS — runs the meeting for you",
            competitorNote: "L10 meeting support present but no AI facilitation",
          },
          {
            label: "Scorecard",
            taskspaceNote: "13-week rolling scorecard with trend indicators and automated red/yellow/green status",
            competitorNote: "Scorecard included but no AI trend analysis",
          },
          {
            label: "IDS (Issues, Discuss, Solve)",
            taskspaceNote: "Native IDS board linked directly to meeting agendas",
            competitorNote: "IDS supported within meetings",
          },
        ],
      },
      {
        category: "AI & Automation",
        items: [
          {
            label: "EOD Reports",
            taskspaceNote: "AI-assisted brain-dump reports — team members speak naturally, AI structures the output",
            competitorNote: "No EOD reporting or AI assistant",
          },
          {
            label: "AI Accountability",
            taskspaceNote: "AI flags blocked rocks, surfaces trends, and prompts managers with nudges",
            competitorNote: "Not available",
          },
        ],
      },
      {
        category: "Integrations",
        items: [
          {
            label: "Slack",
            taskspaceNote: "Native Slack integration — EOD report delivery, rock status pings, meeting reminders",
            competitorNote: "Basic Slack notifications only",
          },
          {
            label: "Asana",
            taskspaceNote: "Sync tasks from L10 meetings and rocks directly to Asana projects",
            competitorNote: "No native Asana integration",
          },
        ],
      },
    ],
    whoShouldSwitch: [
      "Founders running more than one company who need a single operating system",
      "Small teams (under 10 people) frustrated by Ninety.io's per-user minimums",
      "Teams who want AI to reduce the admin burden of EOS reporting",
      "Leaders who want daily accountability without manual check-ins",
      "ADHD founders who need structure that bends to how their brain works",
    ],
    metaDescription:
      "Taskspace vs Ninety.io — compare features, pricing, and AI capabilities. Taskspace starts free and includes AI-powered EOD reports, multi-workspace support, and Slack integration that Ninety.io lacks.",
  },

  "traction-tools": {
    name: "Traction Tools",
    slug: "traction-tools",
    tagline: "Legacy EOS platform with a clunky interface and no AI",
    heroHeadline: "Taskspace vs Traction Tools",
    heroSubtext:
      "Traction Tools has been the default EOS software for years — but the interface is dated, there is no AI layer, and the product has not kept pace with how modern teams actually work. Taskspace is the modern alternative.",
    pricing: "$99–$199/mo flat",
    taskspacePricing: "Free (up to 3 members) · $9/user/mo Team · $19/user/mo Business",
    comparisonRows: [
      { feature: "EOS Rocks tracking", taskspace: true, competitor: true },
      { feature: "L10 Meeting facilitation", taskspace: true, competitor: true },
      { feature: "Weekly Scorecard", taskspace: true, competitor: true },
      { feature: "IDS Issue board", taskspace: true, competitor: true },
      { feature: "Accountability Charts", taskspace: true, competitor: true },
      { feature: "AI-powered EOD reports", taskspace: true, competitor: false },
      { feature: "AI accountability assistant", taskspace: true, competitor: false },
      { feature: "Multi-workspace (multiple companies)", taskspace: true, competitor: false },
      { feature: "Slack integration", taskspace: true, competitor: "Limited" },
      { feature: "Asana integration", taskspace: true, competitor: false },
      { feature: "Modern, clean UI", taskspace: true, competitor: false },
      { feature: "Free plan available", taskspace: true, competitor: false },
      { feature: "Starting price", taskspace: "Free / $9/user/mo", competitor: "$99/mo flat" },
    ],
    reasons: [
      {
        title: "A UI your team will actually use",
        body: "Traction Tools was built in an earlier era of SaaS design. Taskspace was designed from the ground up for modern teams — clean, fast, and ADHD-friendly. Adoption goes up when software gets out of the way.",
      },
      {
        title: "AI that does the work for you",
        body: "Traction Tools provides the EOS structure, but every entry is manual. Taskspace adds an AI layer that converts EOD brain-dumps into structured reports, flags blocked rocks, and surfaces accountability trends automatically.",
      },
      {
        title: "Flexible pricing for any team size",
        body: "Traction Tools uses flat-rate pricing that makes sense for larger organizations but is expensive for growing teams. Taskspace starts free and scales per user — you only pay for who is actually using the product.",
      },
    ],
    featureBreakdown: [
      {
        category: "EOS Core Tools",
        items: [
          {
            label: "Rocks (Quarterly Goals)",
            taskspaceNote: "Rocks with owner assignment, milestones, and on/off track status indicators",
            competitorNote: "Full rocks support — core to Traction Tools",
          },
          {
            label: "L10 Meetings",
            taskspaceNote: "Guided L10 agenda, real-time collaborative editing, post-meeting action items",
            competitorNote: "L10 supported but interface is dated and navigation is slow",
          },
          {
            label: "Scorecard",
            taskspaceNote: "13-week rolling scorecard with color-coded status and AI trend insights",
            competitorNote: "Scorecard present but no trend analysis",
          },
          {
            label: "Accountability Chart",
            taskspaceNote: "Visual org chart with seat/role/responsibility mapping",
            competitorNote: "Accountability chart included",
          },
        ],
      },
      {
        category: "AI & Automation",
        items: [
          {
            label: "EOD Reports",
            taskspaceNote: "AI-powered end-of-day reports — brain dump in plain language, AI structures the output",
            competitorNote: "No EOD reporting module",
          },
          {
            label: "AI Insights",
            taskspaceNote: "AI surfaces blocked items, flags at-risk rocks, and generates weekly summaries",
            competitorNote: "Not available",
          },
        ],
      },
      {
        category: "Integrations & Design",
        items: [
          {
            label: "Slack Integration",
            taskspaceNote: "Full Slack integration with EOD delivery, meeting reminders, and rock status updates",
            competitorNote: "Notification-only Slack integration",
          },
          {
            label: "Mobile & UX",
            taskspaceNote: "Responsive design optimized for mobile and large screens equally",
            competitorNote: "Desktop-first design; mobile experience is limited",
          },
        ],
      },
    ],
    whoShouldSwitch: [
      "Teams frustrated by the Traction Tools interface and looking for a modern alternative",
      "Organizations that want AI to reduce weekly EOS admin time",
      "Growing companies that need per-seat pricing instead of a flat monthly fee",
      "Founders who run multiple companies and need multi-workspace support",
      "Leaders who want daily accountability data without mandatory check-ins",
    ],
    metaDescription:
      "Taskspace vs Traction Tools — compare EOS software features, pricing, and AI capabilities. Taskspace is the modern alternative with AI reports, better UX, and flexible per-seat pricing.",
  },

  "eos-one": {
    name: "EOS One",
    slug: "eos-one",
    tagline: "The official EOS app — feature-limited and expensive for what you get",
    heroHeadline: "Taskspace vs EOS One",
    heroSubtext:
      "EOS One is the officially licensed EOS software, but official does not mean best. It is tightly constrained to the EOS methodology with no room for customization, no AI, and a price point that is hard to justify given the limitations.",
    pricing: "$599+/yr per company",
    taskspacePricing: "Free (up to 3 members) · $9/user/mo Team · $19/user/mo Business",
    comparisonRows: [
      { feature: "EOS Rocks tracking", taskspace: true, competitor: true },
      { feature: "L10 Meeting facilitation", taskspace: true, competitor: true },
      { feature: "Weekly Scorecard", taskspace: true, competitor: true },
      { feature: "IDS Issue board", taskspace: true, competitor: true },
      { feature: "AI-powered EOD reports", taskspace: true, competitor: false },
      { feature: "AI accountability assistant", taskspace: true, competitor: false },
      { feature: "Workflow customization", taskspace: true, competitor: false },
      { feature: "Multi-workspace support", taskspace: true, competitor: false },
      { feature: "Slack integration", taskspace: true, competitor: false },
      { feature: "Asana integration", taskspace: true, competitor: false },
      { feature: "ADHD-friendly design", taskspace: true, competitor: false },
      { feature: "Free plan available", taskspace: true, competitor: false },
      { feature: "Starting price", taskspace: "Free / $9/user/mo", competitor: "$599+/yr" },
    ],
    reasons: [
      {
        title: "EOS structure plus the flexibility to adapt it",
        body: "EOS One locks you into the methodology as written. Real businesses need to adapt. Taskspace gives you the full EOS framework while letting you customize workflows, naming, and cadences to match how your company actually operates.",
      },
      {
        title: "AI-powered tools EOS One does not have",
        body: "EOS One is a digital implementation of the paper EOS tools. Taskspace adds an AI layer on top — automated EOD reporting, AI-generated accountability summaries, and intelligent flagging of at-risk rocks. It is EOS for the AI era.",
      },
      {
        title: "A price structure that makes sense",
        body: "At $599+ per year per company, EOS One is priced for enterprises. Taskspace is free for small teams and starts at $9/user/month for growing ones. For multi-company founders, Taskspace Business covers unlimited workspaces for a single fee.",
      },
    ],
    featureBreakdown: [
      {
        category: "EOS Core Tools",
        items: [
          {
            label: "Rocks (Quarterly Goals)",
            taskspaceNote: "Full rocks tracking with milestones, owners, and progress status",
            competitorNote: "Rocks supported as core EOS feature",
          },
          {
            label: "L10 Meetings",
            taskspaceNote: "Native L10 meeting runner with segue, scorecard review, rocks review, and IDS",
            competitorNote: "L10 meetings supported per official EOS format",
          },
          {
            label: "V/TO (Vision/Traction Organizer)",
            taskspaceNote: "VTO module included for articulating company vision and core values",
            competitorNote: "VTO is core to EOS One's offering",
          },
        ],
      },
      {
        category: "Customization & Flexibility",
        items: [
          {
            label: "Workflow Customization",
            taskspaceNote: "Customize meeting cadences, report templates, scorecard metrics, and rock structure",
            competitorNote: "Strictly follows official EOS methodology — no customization allowed",
          },
          {
            label: "Feature Toggling",
            taskspaceNote: "Enable only the features your team needs — use what works, ignore the rest",
            competitorNote: "All-or-nothing EOS implementation",
          },
        ],
      },
      {
        category: "AI & Integrations",
        items: [
          {
            label: "AI EOD Reports",
            taskspaceNote: "AI converts plain-language brain dumps into structured daily reports",
            competitorNote: "No AI features",
          },
          {
            label: "Integrations",
            taskspaceNote: "Slack, Asana, and API access on Business plan",
            competitorNote: "No third-party integrations",
          },
        ],
      },
    ],
    whoShouldSwitch: [
      "EOS practitioners who want the methodology but need room to adapt it",
      "Teams paying $599+/yr for EOS One and not fully utilizing every feature",
      "Founders running multiple companies who need multi-workspace support",
      "Teams who want AI to reduce the time spent on EOS admin",
      "Organizations that have outgrown EOS One's rigid structure",
    ],
    metaDescription:
      "Taskspace vs EOS One — the official EOS app compared to Taskspace. Better pricing, AI-powered reports, customizable workflows, and multi-workspace support. Free plan available.",
  },

  "clickup-eos": {
    name: "ClickUp",
    slug: "clickup-eos",
    tagline: "A powerful PM tool that was not built for EOS",
    heroHeadline: "Taskspace vs ClickUp for EOS",
    heroSubtext:
      "ClickUp is a capable project management platform, but running EOS inside it requires extensive customization, ongoing maintenance, and significant setup time. Taskspace ships with EOS built in — no configuration required.",
    pricing: "$12/user/mo (Business)",
    taskspacePricing: "Free (up to 3 members) · $9/user/mo Team · $19/user/mo Business",
    comparisonRows: [
      { feature: "Native EOS Rocks tracking", taskspace: true, competitor: false },
      { feature: "Native L10 Meeting runner", taskspace: true, competitor: false },
      { feature: "Native Scorecard", taskspace: true, competitor: false },
      { feature: "Native IDS board", taskspace: true, competitor: false },
      { feature: "Native Accountability Chart", taskspace: true, competitor: false },
      { feature: "AI-powered EOD reports", taskspace: true, competitor: false },
      { feature: "Requires setup/customization", taskspace: false, competitor: true },
      { feature: "Multi-workspace support", taskspace: true, competitor: "Complex" },
      { feature: "Slack integration", taskspace: true, competitor: true },
      { feature: "Asana integration", taskspace: true, competitor: "Via Zapier" },
      { feature: "Zero-config EOS out of the box", taskspace: true, competitor: false },
      { feature: "Free plan available", taskspace: true, competitor: "Limited" },
      { feature: "Starting price (full EOS)", taskspace: "Free / $9/user/mo", competitor: "$12+/user/mo" },
    ],
    reasons: [
      {
        title: "EOS out of the box — no setup required",
        body: "Getting ClickUp to run EOS requires building custom views, templates, automations, and dashboards from scratch — then maintaining them as the tool updates. Taskspace ships with every EOS workflow pre-built. Log in and start your first L10 meeting in under five minutes.",
      },
      {
        title: "No more EOS templates breaking on you",
        body: "ClickUp EOS templates are community-built and break with product updates. The IDS column disappears. The rocks view resets. Taskspace's EOS features are first-class product features — they are maintained, versioned, and tested by the team.",
      },
      {
        title: "AI built for accountability, not task management",
        body: "ClickUp has AI features focused on writing and task generation. Taskspace's AI is built specifically for team accountability — daily EOD report processing, rock status analysis, and leader dashboards that surface what needs attention before the weekly L10.",
      },
    ],
    featureBreakdown: [
      {
        category: "EOS Workflows",
        items: [
          {
            label: "L10 Meetings",
            taskspaceNote: "Structured L10 meeting runner with segue, scorecard review, rocks, and live IDS",
            competitorNote: "No native L10 meeting runner — requires a custom Doc or template",
          },
          {
            label: "Quarterly Rocks",
            taskspaceNote: "Dedicated rocks module with owner, due date, milestones, and on/off track status",
            competitorNote: "No native rocks concept — typically tracked via tasks or lists with custom fields",
          },
          {
            label: "Scorecard",
            taskspaceNote: "13-week rolling scorecard with red/yellow/green status and trend visualization",
            competitorNote: "No native scorecard — built with dashboards and custom fields; complex to maintain",
          },
        ],
      },
      {
        category: "AI",
        items: [
          {
            label: "EOD Reports",
            taskspaceNote: "AI converts plain-language EOD notes into structured reports for managers",
            competitorNote: "AI features focus on content generation and task suggestions — not accountability",
          },
        ],
      },
      {
        category: "Cost & Complexity",
        items: [
          {
            label: "Time to first L10 meeting",
            taskspaceNote: "Under 5 minutes — EOS is pre-configured",
            competitorNote: "Hours to days depending on template setup and customization",
          },
          {
            label: "Ongoing maintenance",
            taskspaceNote: "None — EOS structure is maintained by Taskspace product team",
            competitorNote: "Ongoing maintenance required as ClickUp updates views, automations, and APIs",
          },
        ],
      },
    ],
    whoShouldSwitch: [
      "Teams currently trying to run EOS in ClickUp using community templates",
      "Leaders spending more time maintaining their EOS setup than running EOS",
      "Organizations that want native IDS, rocks, and scorecard without configuration",
      "Founders who want AI accountability on top of standard EOS workflows",
      "Teams that have outgrown the brittleness of custom ClickUp EOS builds",
    ],
    metaDescription:
      "Taskspace vs ClickUp for EOS — why running EOS in ClickUp requires too much setup and maintenance. Taskspace ships with native EOS workflows, AI reports, and no configuration required.",
  },

  "notion-eos": {
    name: "Notion",
    slug: "notion-eos",
    tagline: "Flexible and powerful — but fully manual for EOS",
    heroHeadline: "Taskspace vs Notion for EOS",
    heroSubtext:
      "Notion is one of the most flexible tools in SaaS. But flexibility is not the same as functionality. Running EOS in Notion means building and maintaining your own system — forever. Taskspace has EOS built in.",
    pricing: "$10/user/mo (Plus)",
    taskspacePricing: "Free (up to 3 members) · $9/user/mo Team · $19/user/mo Business",
    comparisonRows: [
      { feature: "Native EOS Rocks tracking", taskspace: true, competitor: false },
      { feature: "Native L10 Meeting runner", taskspace: true, competitor: false },
      { feature: "Native Scorecard", taskspace: true, competitor: false },
      { feature: "Native IDS board", taskspace: true, competitor: false },
      { feature: "Native Accountability Chart", taskspace: true, competitor: false },
      { feature: "AI-powered EOD reports", taskspace: true, competitor: false },
      { feature: "Accountability AI", taskspace: true, competitor: false },
      { feature: "Requires manual setup", taskspace: false, competitor: true },
      { feature: "Slack integration", taskspace: true, competitor: "Limited" },
      { feature: "Asana integration", taskspace: true, competitor: false },
      { feature: "Zero-config EOS", taskspace: true, competitor: false },
      { feature: "Free plan", taskspace: true, competitor: "Very limited" },
      { feature: "Starting price (functional EOS)", taskspace: "Free / $9/user/mo", competitor: "$10+/user/mo" },
    ],
    reasons: [
      {
        title: "Stop maintaining your EOS system and start running it",
        body: "Notion EOS setups are popular — until you realize you are spending two hours per week maintaining the database relations, views, and formulas instead of running your business. Taskspace is EOS-as-software. Everything just works.",
      },
      {
        title: "Accountability requires structure Notion cannot enforce",
        body: "Notion is a blank canvas. EOS accountability requires enforced cadences, status tracking, and escalation logic. Taskspace enforces the structure so your team stays accountable — it is not just a place to write things down.",
      },
      {
        title: "AI that understands EOS context",
        body: "Notion AI is a general-purpose writing assistant. Taskspace AI understands rocks, scorecards, and L10 meetings. It can tell you which rocks are at risk, summarize EOD reports for your leadership team, and flag patterns across your scorecard — without you asking.",
      },
    ],
    featureBreakdown: [
      {
        category: "EOS Structure",
        items: [
          {
            label: "Rocks Tracking",
            taskspaceNote: "Purpose-built rocks module — no setup, no formulas, works on day one",
            competitorNote: "Requires a custom database with properties, filters, and views — breaks when Notion updates",
          },
          {
            label: "L10 Meetings",
            taskspaceNote: "Native L10 runner with integrated scorecard, rocks, and IDS section",
            competitorNote: "Requires a manually maintained Notion page or template — no real-time integration with data",
          },
          {
            label: "Scorecard",
            taskspaceNote: "13-week rolling scorecard with automated trend analysis and status coloring",
            competitorNote: "Built via database and formulas — fragile and requires weekly manual updates",
          },
          {
            label: "Accountability Chart",
            taskspaceNote: "Visual accountability chart with roles, seats, and direct reports",
            competitorNote: "No native org chart — typically done with an embed or third-party tool",
          },
        ],
      },
      {
        category: "AI",
        items: [
          {
            label: "EOD Reports",
            taskspaceNote: "AI processes plain-language daily check-ins into structured team reports",
            competitorNote: "No EOD reporting concept — Notion AI is for writing assistance only",
          },
          {
            label: "Rock Status Intelligence",
            taskspaceNote: "AI flags at-risk rocks and surfaces accountability trends proactively",
            competitorNote: "Not available — Notion AI does not understand EOS concepts",
          },
        ],
      },
    ],
    whoShouldSwitch: [
      "Teams currently running EOS in Notion who spend more time maintaining the system than using it",
      "Founders who want EOS accountability without building it from scratch",
      "Leaders who need AI-powered daily reports without custom Notion automation",
      "Organizations whose Notion EOS setup has become too complex for the whole team to use",
      "Teams that need integrations like Slack and Asana with their EOS data",
    ],
    metaDescription:
      "Taskspace vs Notion for EOS — why building EOS in Notion creates ongoing maintenance burden. Taskspace ships with native EOS workflows, AI accountability, and no setup required.",
  },

  "monday-eos": {
    name: "Monday.com",
    slug: "monday-eos",
    tagline: "Enterprise project management that was not designed for EOS",
    heroHeadline: "Taskspace vs Monday.com for EOS",
    heroSubtext:
      "Monday.com is a powerful work OS — but it is optimized for project tracking, not EOS execution. Running EOS inside Monday.com means heavy setup, expensive per-user pricing, and no native accountability layer for the EOS methodology.",
    pricing: "$12/user/mo (Basic) — $19+/user/mo for EOS-relevant features",
    taskspacePricing: "Free (up to 3 members) · $9/user/mo Team · $19/user/mo Business",
    comparisonRows: [
      { feature: "Native EOS Rocks tracking", taskspace: true, competitor: false },
      { feature: "Native L10 Meeting runner", taskspace: true, competitor: false },
      { feature: "Native Scorecard", taskspace: true, competitor: false },
      { feature: "Native IDS board", taskspace: true, competitor: false },
      { feature: "AI-powered EOD reports", taskspace: true, competitor: false },
      { feature: "Accountability AI", taskspace: true, competitor: false },
      { feature: "Multi-workspace (multiple companies)", taskspace: true, competitor: "Expensive" },
      { feature: "Slack integration", taskspace: true, competitor: true },
      { feature: "Asana integration", taskspace: true, competitor: "Via Zapier" },
      { feature: "EOS-specific workflows", taskspace: true, competitor: false },
      { feature: "Free plan", taskspace: true, competitor: false },
      { feature: "Starting price", taskspace: "Free / $9/user/mo", competitor: "$12+/user/mo" },
    ],
    reasons: [
      {
        title: "Purpose-built for EOS — not retrofitted",
        body: "Monday.com is an excellent tool for general project management. EOS is not general project management. Running EOS in Monday.com means adapting a generic platform to a specific methodology — and that gap shows every week during your L10. Taskspace was built around EOS from the start.",
      },
      {
        title: "EOS accountability is not the same as task tracking",
        body: "Monday.com excels at tracking tasks and project timelines. EOS accountability is about rocks, scorecards, and weekly pulse. These are fundamentally different workflows. Taskspace understands the difference and enforces the EOS cadence — Monday.com cannot do that without heavy customization.",
      },
      {
        title: "Significant cost savings for growing teams",
        body: "Monday.com's pricing is enterprise-oriented. The features EOS teams actually need sit behind Pro or Enterprise tiers. Taskspace's Business plan at $19/user/month gives you everything — including unlimited workspaces and full AI access — typically at 40–60% less than a comparable Monday.com subscription.",
      },
    ],
    featureBreakdown: [
      {
        category: "EOS Workflows",
        items: [
          {
            label: "Quarterly Rocks",
            taskspaceNote: "Native rocks with owner, milestones, on/off track status, and quarterly cycles",
            competitorNote: "No rocks concept — teams typically map rocks to tasks or boards, losing EOS semantics",
          },
          {
            label: "L10 Meetings",
            taskspaceNote: "Guided L10 meeting runner — segue through rocks review, scorecard, IDS in order",
            competitorNote: "No meeting runner — L10s are typically run from a Monday.com doc alongside other boards",
          },
          {
            label: "Scorecard",
            taskspaceNote: "13-week rolling scorecard with automated red/yellow/green and trend visualization",
            competitorNote: "Scorecard can be approximated via dashboards but requires significant setup and ongoing updates",
          },
          {
            label: "IDS (Issues, Discuss, Solve)",
            taskspaceNote: "Native IDS board linked directly to the L10 meeting agenda",
            competitorNote: "No IDS concept — issues tracked as tasks, losing the IDS facilitation structure",
          },
        ],
      },
      {
        category: "AI & Reporting",
        items: [
          {
            label: "EOD Reports",
            taskspaceNote: "AI-powered daily check-ins that surface accountability data for team leads",
            competitorNote: "No EOD reporting module or AI accountability layer",
          },
          {
            label: "AI for EOS",
            taskspaceNote: "AI understands rocks, scorecard trends, and L10 patterns — flags what needs attention",
            competitorNote: "Monday AI is focused on task generation and content writing, not EOS accountability",
          },
        ],
      },
    ],
    whoShouldSwitch: [
      "Teams trying to run EOS in Monday.com who feel the friction every week",
      "Leaders who are paying Monday.com enterprise pricing for project features they do not need for EOS",
      "Organizations that want native IDS, rocks, and L10 without a complex setup",
      "Founders running multiple companies who need multi-workspace support at a reasonable price",
      "Teams that want AI accountability built into their weekly EOS cadence",
    ],
    metaDescription:
      "Taskspace vs Monday.com for EOS — why project management tools fail at EOS accountability. Taskspace has native EOS workflows, AI reports, and better pricing for EOS teams.",
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ competitor: string }>
}

// ─── Static Params ────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return Object.keys(COMPETITORS).map((slug) => ({ competitor: slug }))
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { competitor: slug } = await params
  const data = COMPETITORS[slug]
  if (!data) return {}

  return {
    metadataBase: new URL(APP_URL),
    title: `${data.heroHeadline} | Taskspace`,
    description: data.metaDescription,
    openGraph: {
      title: `${data.heroHeadline} | Taskspace`,
      description: data.metaDescription,
      type: "website",
      url: `${APP_URL}/alternatives/${slug}`,
      siteName: "Taskspace",
    },
    twitter: {
      card: "summary_large_image",
      title: `${data.heroHeadline} | Taskspace`,
      description: data.metaDescription,
    },
    alternates: {
      canonical: `${APP_URL}/alternatives/${slug}`,
    },
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <CheckCircle className="mx-auto h-5 w-5 text-black" aria-label="Yes" />
    ) : (
      <XCircle className="mx-auto h-5 w-5 text-gray-300" aria-label="No" />
    )
  }
  return <span className="text-sm text-gray-700">{value}</span>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CompetitorPage({ params }: Props) {
  const { competitor: slug } = await params
  const data = COMPETITORS[slug]

  if (!data) notFound()

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Taskspace",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: APP_URL,
      description:
        "AI-powered EOS operating system for ADHD founders and multi-company operators.",
      offers: [
        { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
        { "@type": "Offer", name: "Team", price: "9", priceCurrency: "USD" },
        { "@type": "Offer", name: "Business", price: "19", priceCurrency: "USD" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: data.heroHeadline,
      description: data.metaDescription,
      url: `${APP_URL}/alternatives/${slug}`,
      about: [
        { "@type": "SoftwareApplication", name: "Taskspace" },
        { "@type": "SoftwareApplication", name: data.name },
      ],
    },
  ]

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-3 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-black transition-colors">
              Taskspace
            </Link>
            <span>/</span>
            <Link href="/alternatives" className="hover:text-black transition-colors">
              Alternatives
            </Link>
            <span>/</span>
            <span className="text-black font-medium">{data.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-500 text-sm mb-6 uppercase tracking-widest font-medium">
            Taskspace vs {data.name}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl">
            {data.heroHeadline}
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
            {data.heroSubtext}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/app?page=register"
              className="rounded-lg bg-black px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-900 transition-colors"
            >
              Try Taskspace Free
              <ArrowRight className="ml-2 inline-block h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border border-gray-300 bg-white px-8 py-3.5 text-sm font-semibold text-black hover:bg-gray-100 transition-colors"
            >
              See Pricing
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <span>Taskspace: <strong className="text-black">Free / $9 / $19 per user/mo</strong></span>
            <span>{data.name}: <strong className="text-black">{data.pricing}</strong></span>
          </div>
        </div>
      </div>

      {/* Quick Comparison Table */}
      <div className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
              Feature comparison
            </h2>
            <p className="mt-4 text-base text-gray-600">
              Side-by-side overview of how Taskspace and {data.name} compare on the features EOS teams actually use.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-black">Feature</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-black bg-gray-100 w-40">
                      Taskspace
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-500 w-40">
                      {data.name}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {data.comparisonRows.map((row) => (
                    <tr key={row.feature} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 text-sm text-gray-700">{row.feature}</td>
                      <td className="px-6 py-4 text-center bg-gray-50/30">
                        <FeatureValue value={row.taskspace} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <FeatureValue value={row.competitor} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Reasons to Switch */}
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
            3 reasons teams switch from {data.name}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {data.reasons.map((reason, i) => (
            <div key={reason.title} className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-black text-white text-sm font-bold">
                {i + 1}
              </div>
              <h3 className="text-lg font-bold text-black mb-3">{reason.title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{reason.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feature-by-Feature Breakdown */}
      <div className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
              Feature-by-feature breakdown
            </h2>
            <p className="mt-4 text-base text-gray-600">
              A detailed look at how each platform handles the core features EOS teams depend on.
            </p>
          </div>

          <div className="space-y-12">
            {data.featureBreakdown.map((category) => (
              <div key={category.category}>
                <h3 className="text-lg font-bold text-black mb-6 pb-3 border-b border-gray-200">
                  {category.category}
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {category.items.map((item) => (
                    <div
                      key={item.label}
                      className="grid grid-cols-1 rounded-xl border border-gray-200 bg-white overflow-hidden lg:grid-cols-3"
                    >
                      <div className="px-6 py-5 bg-gray-50 border-b border-gray-200 lg:border-b-0 lg:border-r">
                        <p className="text-sm font-semibold text-black">{item.label}</p>
                      </div>
                      <div className="px-6 py-5 border-b border-gray-200 lg:border-b-0 lg:border-r">
                        <p className="text-xs font-semibold uppercase tracking-widest text-black mb-2">
                          Taskspace
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">{item.taskspaceNote}</p>
                      </div>
                      <div className="px-6 py-5">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                          {data.name}
                        </p>
                        <p className="text-sm text-gray-500 leading-relaxed">{item.competitorNote}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Who Should Switch */}
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
              Who should choose Taskspace over {data.name}?
            </h2>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <ul className="space-y-4">
              {data.whoShouldSwitch.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-black" />
                  <span className="text-base text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Pricing Comparison */}
      <div className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
              Pricing comparison
            </h2>
          </div>
          <div className="mx-auto max-w-2xl grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border-2 border-black bg-white p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Taskspace</p>
              <p className="text-2xl font-bold text-black mb-1">Free to start</p>
              <p className="text-sm text-gray-600 mb-6">Then $9/user/mo (Team) or $19/user/mo (Business)</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 shrink-0 text-black" />
                  Free forever for up to 3 members
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 shrink-0 text-black" />
                  14-day free trial on paid plans
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 shrink-0 text-black" />
                  No annual commitment required
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 shrink-0 text-black" />
                  All EOS features included
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{data.name}</p>
              <p className="text-2xl font-bold text-black mb-1">{data.pricing}</p>
              <p className="text-sm text-gray-500 mb-6">No free plan available for full EOS features</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-500">
                  <XCircle className="h-4 w-4 shrink-0 text-gray-300" />
                  No free plan
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-500">
                  <XCircle className="h-4 w-4 shrink-0 text-gray-300" />
                  No AI-powered EOD reports
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-500">
                  <XCircle className="h-4 w-4 shrink-0 text-gray-300" />
                  No multi-workspace included
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-white py-24">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
            Ready to make the switch?
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Import your existing data, invite your team, and run your first L10 meeting in Taskspace within an hour.
            Start free — no credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/app?page=register"
              className="rounded-lg bg-black px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-900 transition-colors"
            >
              Start Free — No Credit Card
            </Link>
            <a
              href="mailto:support@trytaskspace.com"
              className="rounded-lg border border-gray-300 bg-white px-8 py-3.5 text-sm font-semibold text-black hover:bg-gray-100 transition-colors"
            >
              Talk to Sales
            </a>
          </div>
          <p className="text-gray-500 mt-6 text-sm">
            Free forever plan — 14-day free trial on paid plans — Cancel anytime
          </p>
          <div className="mt-8">
            <Link
              href="/alternatives"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              View all EOS software comparisons
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
