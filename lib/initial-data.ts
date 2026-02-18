import type { TeamMember, Rock } from "./types"

// Legacy seed data - NOT CURRENTLY USED (multi-tenant uses database)
// This is generic example/test data only — actual organizations create their own data
type SeedRock = Omit<Rock, "organizationId" | "updatedAt">

export const initialTeamMembers: TeamMember[] = [
  {
    id: "example-admin",
    name: "Team Admin",
    email: "admin@example.com",
    role: "admin",
    department: "Leadership",
    weeklyMeasurable: "Team velocity and delivery metrics",
    joinDate: "2024-01-01",
  },
  {
    id: "example-member-1",
    name: "Alex Developer",
    email: "alex@example.com",
    role: "member",
    department: "Engineering",
    weeklyMeasurable: "# of features shipped",
    joinDate: "2024-02-15",
  },
  {
    id: "example-member-2",
    name: "Jordan Marketing",
    email: "jordan@example.com",
    role: "member",
    department: "Marketing",
    weeklyMeasurable: "# of campaigns launched",
    joinDate: "2024-03-01",
  },
]

export const initialRocks: SeedRock[] = [
  {
    id: "example-r1",
    userId: "example-admin",
    title: "Q1 Revenue Growth",
    description: "Achieve quarterly revenue target with measurable pipeline growth",
    bucket: "Growth",
    outcome: "Hit quarterly revenue target",
    doneWhen: [
      "Revenue target achieved",
      "Pipeline health metrics green",
      "Customer acquisition cost optimized",
    ],
    progress: 0,
    dueDate: "2025-03-31",
    status: "on-track",
    createdAt: "2025-01-01",
  },
  {
    id: "example-r2",
    userId: "example-member-1",
    title: "Platform Feature Launch",
    description: "Ship core features on schedule with quality metrics met",
    bucket: "Engineering",
    outcome: "Core features live in production",
    doneWhen: [
      "All planned features shipped",
      "Test coverage above 80%",
      "Zero critical bugs in production",
    ],
    progress: 0,
    dueDate: "2025-03-31",
    status: "on-track",
    createdAt: "2025-01-01",
  },
  {
    id: "example-r3",
    userId: "example-member-2",
    title: "Marketing Campaign Performance",
    description: "Launch and optimize campaigns to drive qualified leads",
    bucket: "Marketing",
    outcome: "Lead generation targets met",
    doneWhen: [
      "Campaigns launched across all channels",
      "Lead quality score above threshold",
      "Cost per acquisition within budget",
    ],
    progress: 0,
    dueDate: "2025-03-31",
    status: "on-track",
    createdAt: "2025-01-01",
  },
]
