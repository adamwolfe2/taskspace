/**
 * Hardcoded demo data using a fictional "Horizon Labs" company.
 * Every visitor sees the same read-only data — no localStorage, no mutations.
 */
import type {
  TeamMember,
  Rock,
  AssignedTask,
  EODReport,
  Client,
  Project,
  IdsBoardItem,
  WorkspaceNote,
  ManagerDashboard,
  DirectReport,
  ManagerAlert,
  ManagerInsight,
} from "./types"

// ============================================
// CONSTANTS
// ============================================

export const DEMO_ORG_ID = "demo-org-1"
export const DEMO_WORKSPACE_ID = "demo-ws-1"

// Use local timezone for date strings
function getLocalDateString(offset = 0): string {
  const d = new Date(Date.now() + offset * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const today = getLocalDateString(0)
const yesterday = getLocalDateString(-1)
const twoDaysAgo = getLocalDateString(-2)
const threeDaysAgo = getLocalDateString(-3)
const fourDaysAgo = getLocalDateString(-4)

// ============================================
// TEAM MEMBERS
// ============================================

export const DEMO_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "demo-user-1",
    userId: "demo-user-1",
    name: "Adam Wolfe",
    email: "adam@horizonlabs.io",
    role: "admin",
    department: "Product Engineering",
    jobTitle: "VP Product Engineering",
    joinDate: "2023-06-15",
    status: "active",
    managerId: null,
  },
  {
    id: "demo-user-2",
    userId: "demo-user-2",
    name: "Sarah Chen",
    email: "sarah.chen@horizonlabs.io",
    role: "member",
    department: "Engineering",
    jobTitle: "Senior Engineering Manager",
    joinDate: "2023-08-01",
    status: "active",
    managerId: "demo-user-1",
  },
  {
    id: "demo-user-3",
    userId: "demo-user-3",
    name: "Marcus Williams",
    email: "marcus.w@horizonlabs.io",
    role: "member",
    department: "Design",
    jobTitle: "Design Director",
    joinDate: "2023-09-15",
    status: "active",
    managerId: "demo-user-1",
  },
  {
    id: "demo-user-4",
    userId: "demo-user-4",
    name: "Priya Patel",
    email: "priya.p@horizonlabs.io",
    role: "member",
    department: "Program Management",
    jobTitle: "Program Manager",
    joinDate: "2023-10-01",
    status: "active",
    managerId: "demo-user-1",
  },
  {
    id: "demo-user-5",
    userId: "demo-user-5",
    name: "James O'Brien",
    email: "james.ob@horizonlabs.io",
    role: "member",
    department: "Quality Assurance",
    jobTitle: "QA Lead",
    joinDate: "2023-11-01",
    status: "active",
    managerId: "demo-user-1",
  },
  {
    id: "demo-user-6",
    userId: "demo-user-6",
    name: "Elena Rodriguez",
    email: "elena.r@horizonlabs.io",
    role: "member",
    department: "Data Science",
    jobTitle: "Data Science Lead",
    joinDate: "2024-01-15",
    status: "active",
    managerId: "demo-user-1",
  },
]

// ============================================
// ROCKS (Q1 2026)
// ============================================

export const DEMO_ROCKS: Rock[] = [
  {
    id: "rock-1",
    userId: "demo-user-1",
    userName: "Adam Wolfe",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Launch Horizon XR 2.0 SDK",
    description: "Ship the next-generation SDK with spatial computing APIs, hand-tracking improvements, and new rendering pipeline",
    progress: 75,
    status: "on-track",
    dueDate: "2026-03-31",
    quarter: "Q1 2026",
    createdAt: "2025-12-15",
    updatedAt: today,
    milestones: [
      { id: "m1", text: "Finalize API design", completed: true, completedAt: "2026-01-10" },
      { id: "m2", text: "Beta SDK release to partners", completed: true, completedAt: "2026-01-28" },
      { id: "m3", text: "Performance benchmarks pass", completed: true, completedAt: "2026-02-05" },
      { id: "m4", text: "Developer documentation complete", completed: false },
      { id: "m5", text: "GA release", completed: false },
    ],
  },
  {
    id: "rock-2",
    userId: "demo-user-2",
    userName: "Sarah Chen",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Reduce app crash rate below 0.1%",
    description: "Identify and fix top crash sources, improve error handling, add crash-free rate monitoring",
    progress: 60,
    status: "on-track",
    dueDate: "2026-03-31",
    quarter: "Q1 2026",
    createdAt: "2025-12-15",
    updatedAt: today,
  },
  {
    id: "rock-3",
    userId: "demo-user-3",
    userName: "Marcus Williams",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Redesign Settings app for iOS 20",
    description: "Complete visual overhaul with new navigation patterns, search improvements, and accessibility upgrades",
    progress: 40,
    status: "at-risk",
    dueDate: "2026-03-31",
    quarter: "Q1 2026",
    createdAt: "2025-12-15",
    updatedAt: today,
  },
  {
    id: "rock-4",
    userId: "demo-user-6",
    userName: "Elena Rodriguez",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Ship Horizon AI Phase 3",
    description: "Deploy on-device ML models for advanced Aria, writing tools, and image understanding",
    progress: 85,
    status: "on-track",
    dueDate: "2026-03-31",
    quarter: "Q1 2026",
    createdAt: "2025-12-15",
    updatedAt: today,
  },
  {
    id: "rock-5",
    userId: "demo-user-5",
    userName: "James O'Brien",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Complete Q1 security audit",
    description: "Full security audit of all public-facing APIs, penetration testing, and compliance review",
    progress: 90,
    status: "on-track",
    dueDate: "2026-03-31",
    quarter: "Q1 2026",
    createdAt: "2025-12-15",
    updatedAt: today,
  },
  {
    id: "rock-6",
    userId: "demo-user-2",
    userName: "Sarah Chen",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Migrate CI/CD to new build system",
    description: "Move from legacy Jenkins to new distributed build infrastructure for 3x faster builds",
    progress: 30,
    status: "at-risk",
    dueDate: "2026-03-31",
    quarter: "Q1 2026",
    createdAt: "2025-12-15",
    updatedAt: today,
  },
  {
    id: "rock-7",
    userId: "demo-user-4",
    userName: "Priya Patel",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Launch developer documentation portal",
    description: "New unified docs site with interactive examples, code playgrounds, and AI-powered search",
    progress: 55,
    status: "on-track",
    dueDate: "2026-03-31",
    quarter: "Q1 2026",
    createdAt: "2025-12-15",
    updatedAt: today,
  },
]

// ============================================
// TASKS
// ============================================

export const DEMO_TASKS: AssignedTask[] = [
  {
    id: "task-1",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Review spatial computing API proposals",
    description: "Evaluate three architecture proposals for the new hand-tracking API surface",
    assigneeId: "demo-user-1",
    assigneeName: "Adam Wolfe",
    assignedById: "demo-user-1",
    assignedByName: "Adam Wolfe",
    type: "personal",
    rockId: "rock-1",
    rockTitle: "Launch Horizon XR 2.0 SDK",
    priority: "high",
    dueDate: today,
    status: "in-progress",
    completedAt: null,
    createdAt: threeDaysAgo,
    updatedAt: today,
  },
  {
    id: "task-2",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Triage top 10 crash reports from last week",
    description: "Analyze crash logs and assign owners for the highest-impact crashes",
    assigneeId: "demo-user-2",
    assigneeName: "Sarah Chen",
    assignedById: "demo-user-1",
    assignedByName: "Adam Wolfe",
    type: "assigned",
    rockId: "rock-2",
    rockTitle: "Reduce app crash rate below 0.1%",
    priority: "high",
    dueDate: today,
    status: "in-progress",
    completedAt: null,
    createdAt: twoDaysAgo,
    updatedAt: today,
  },
  {
    id: "task-3",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Finalize Settings app navigation wireframes",
    description: "Complete high-fidelity wireframes for the new Settings app tab structure",
    assigneeId: "demo-user-3",
    assigneeName: "Marcus Williams",
    assignedById: "demo-user-1",
    assignedByName: "Adam Wolfe",
    type: "assigned",
    rockId: "rock-3",
    rockTitle: "Redesign Settings app for iOS 20",
    priority: "high",
    dueDate: yesterday,
    status: "pending",
    completedAt: null,
    createdAt: fourDaysAgo,
    updatedAt: yesterday,
  },
  {
    id: "task-4",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Update project timeline for SDK launch",
    description: "Revise milestones and deadlines based on latest sprint velocity",
    assigneeId: "demo-user-4",
    assigneeName: "Priya Patel",
    assignedById: "demo-user-1",
    assignedByName: "Adam Wolfe",
    type: "assigned",
    rockId: "rock-1",
    rockTitle: "Launch Horizon XR 2.0 SDK",
    priority: "medium",
    dueDate: today,
    status: "pending",
    completedAt: null,
    createdAt: twoDaysAgo,
    updatedAt: twoDaysAgo,
  },
  {
    id: "task-5",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Run penetration tests on new auth endpoints",
    description: "Security testing for the v3 authentication flow",
    assigneeId: "demo-user-5",
    assigneeName: "James O'Brien",
    assignedById: "demo-user-1",
    assignedByName: "Adam Wolfe",
    type: "assigned",
    rockId: "rock-5",
    rockTitle: "Complete Q1 security audit",
    priority: "high",
    dueDate: today,
    status: "in-progress",
    completedAt: null,
    createdAt: threeDaysAgo,
    updatedAt: today,
  },
  {
    id: "task-6",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Train Aria intent classifier on new dataset",
    description: "Fine-tune the on-device model with Q4 user interaction data",
    assigneeId: "demo-user-6",
    assigneeName: "Elena Rodriguez",
    assignedById: "demo-user-1",
    assignedByName: "Adam Wolfe",
    type: "assigned",
    rockId: "rock-4",
    rockTitle: "Ship Horizon AI Phase 3",
    priority: "high",
    dueDate: yesterday,
    status: "completed",
    completedAt: yesterday,
    createdAt: fourDaysAgo,
    updatedAt: yesterday,
  },
  {
    id: "task-7",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Set up staging environment for new build system",
    description: "Configure distributed build agents on the staging cluster",
    assigneeId: "demo-user-2",
    assigneeName: "Sarah Chen",
    assignedById: "demo-user-2",
    assignedByName: "Sarah Chen",
    type: "personal",
    rockId: "rock-6",
    rockTitle: "Migrate CI/CD to new build system",
    priority: "medium",
    dueDate: getLocalDateString(3),
    status: "pending",
    completedAt: null,
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: "task-8",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Write API reference for Horizon XR SDK",
    description: "Document all public APIs with examples and migration guides",
    assigneeId: "demo-user-4",
    assigneeName: "Priya Patel",
    assignedById: "demo-user-1",
    assignedByName: "Adam Wolfe",
    type: "assigned",
    rockId: "rock-7",
    rockTitle: "Launch developer documentation portal",
    priority: "medium",
    dueDate: getLocalDateString(5),
    status: "in-progress",
    completedAt: null,
    createdAt: threeDaysAgo,
    updatedAt: today,
  },
  {
    id: "task-9",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Review accessibility audit findings",
    description: "Go through VoiceOver and Dynamic Type test results for Settings redesign",
    assigneeId: "demo-user-3",
    assigneeName: "Marcus Williams",
    assignedById: "demo-user-5",
    assignedByName: "James O'Brien",
    type: "assigned",
    rockId: "rock-3",
    rockTitle: "Redesign Settings app for iOS 20",
    priority: "medium",
    dueDate: getLocalDateString(2),
    status: "pending",
    completedAt: null,
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: "task-10",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Benchmark ML model inference latency",
    description: "Measure on-device inference times on A18 and HX2 chips",
    assigneeId: "demo-user-6",
    assigneeName: "Elena Rodriguez",
    assignedById: "demo-user-6",
    assignedByName: "Elena Rodriguez",
    type: "personal",
    rockId: "rock-4",
    rockTitle: "Ship Horizon AI Phase 3",
    priority: "high",
    dueDate: today,
    status: "in-progress",
    completedAt: null,
    createdAt: twoDaysAgo,
    updatedAt: today,
  },
  {
    id: "task-11",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Prepare sprint retrospective deck",
    description: "Compile velocity charts, blockers, and wins for team retro",
    assigneeId: "demo-user-4",
    assigneeName: "Priya Patel",
    assignedById: "demo-user-4",
    assignedByName: "Priya Patel",
    type: "personal",
    rockId: null,
    rockTitle: null,
    priority: "normal",
    dueDate: getLocalDateString(1),
    status: "pending",
    completedAt: null,
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "task-12",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Fix memory leak in image pipeline",
    description: "Investigate and resolve the memory growth in the camera preview module",
    assigneeId: "demo-user-2",
    assigneeName: "Sarah Chen",
    assignedById: "demo-user-1",
    assignedByName: "Adam Wolfe",
    type: "assigned",
    rockId: "rock-2",
    rockTitle: "Reduce app crash rate below 0.1%",
    priority: "high",
    dueDate: today,
    status: "completed",
    completedAt: today,
    createdAt: threeDaysAgo,
    updatedAt: today,
  },
  {
    id: "task-13",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Update OWASP compliance checklist",
    description: "Map new endpoints to OWASP Top 10 requirements",
    assigneeId: "demo-user-5",
    assigneeName: "James O'Brien",
    assignedById: "demo-user-5",
    assignedByName: "James O'Brien",
    type: "personal",
    rockId: "rock-5",
    rockTitle: "Complete Q1 security audit",
    priority: "medium",
    dueDate: getLocalDateString(4),
    status: "pending",
    completedAt: null,
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: "task-14",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Design search UI for documentation portal",
    description: "Create mockups for AI-powered search with autocomplete and filters",
    assigneeId: "demo-user-3",
    assigneeName: "Marcus Williams",
    assignedById: "demo-user-4",
    assignedByName: "Priya Patel",
    type: "assigned",
    rockId: "rock-7",
    rockTitle: "Launch developer documentation portal",
    priority: "medium",
    dueDate: getLocalDateString(3),
    status: "in-progress",
    completedAt: null,
    createdAt: twoDaysAgo,
    updatedAt: today,
  },
]

// ============================================
// EOD REPORTS (last 5 days, 3-5 per member)
// ============================================

export const DEMO_EOD_REPORTS: EODReport[] = [
  // Adam Wolfe - yesterday
  {
    id: "eod-a1",
    organizationId: DEMO_ORG_ID,
    userId: "demo-user-1",
    date: yesterday,
    tasks: [
      { id: "et1", text: "Reviewed 3 architecture proposals for Horizon XR SDK spatial APIs", rockId: "rock-1", rockTitle: "Launch Horizon XR 2.0 SDK" },
      { id: "et2", text: "Led cross-functional sync with hardware and software teams", rockId: null, rockTitle: null },
      { id: "et3", text: "Approved final milestone plan for Q1 rocks", rockId: null, rockTitle: null },
    ],
    challenges: "Coordination across 3 time zones is slowing API finalization",
    tomorrowPriorities: [
      { id: "ep1", text: "Finalize hand-tracking API surface area", rockId: "rock-1", rockTitle: "Launch Horizon XR 2.0 SDK" },
      { id: "ep2", text: "1:1s with Sarah and Marcus on at-risk items", rockId: null, rockTitle: null },
    ],
    needsEscalation: false,
    escalationNote: null,
    metricValueToday: null,
    submittedAt: `${yesterday}T17:30:00`,
    createdAt: `${yesterday}T17:30:00`,
  },
  // Adam Wolfe - two days ago
  {
    id: "eod-a2",
    organizationId: DEMO_ORG_ID,
    userId: "demo-user-1",
    date: twoDaysAgo,
    tasks: [
      { id: "et4", text: "Conducted quarterly planning review with leadership", rockId: null, rockTitle: null },
      { id: "et5", text: "Interviewed 2 senior engineer candidates", rockId: null, rockTitle: null },
    ],
    challenges: "",
    tomorrowPriorities: [
      { id: "ep3", text: "Review SDK architecture proposals", rockId: "rock-1", rockTitle: "Launch Horizon XR 2.0 SDK" },
    ],
    needsEscalation: false,
    escalationNote: null,
    metricValueToday: null,
    submittedAt: `${twoDaysAgo}T17:15:00`,
    createdAt: `${twoDaysAgo}T17:15:00`,
  },
  // Sarah Chen - yesterday
  {
    id: "eod-s1",
    organizationId: DEMO_ORG_ID,
    userId: "demo-user-2",
    date: yesterday,
    tasks: [
      { id: "et6", text: "Fixed memory leak in camera preview module - reduced allocations by 40%", rockId: "rock-2", rockTitle: "Reduce app crash rate below 0.1%" },
      { id: "et7", text: "Triaged 8 crash reports, identified 3 root causes", rockId: "rock-2", rockTitle: "Reduce app crash rate below 0.1%" },
      { id: "et8", text: "Evaluated Jenkins-to-Bazel migration plan for CI/CD", rockId: "rock-6", rockTitle: "Migrate CI/CD to new build system" },
    ],
    challenges: "Build system migration blocked on infra team provisioning new agents",
    tomorrowPriorities: [
      { id: "ep4", text: "Ship crash fix for top 3 issues to beta", rockId: "rock-2", rockTitle: "Reduce app crash rate below 0.1%" },
      { id: "ep5", text: "Follow up with infra team on build agents", rockId: "rock-6", rockTitle: "Migrate CI/CD to new build system" },
    ],
    needsEscalation: true,
    escalationNote: "Build agent provisioning delayed 2 weeks - may impact CI/CD migration timeline",
    metricValueToday: null,
    submittedAt: `${yesterday}T18:00:00`,
    createdAt: `${yesterday}T18:00:00`,
  },
  // Sarah Chen - two days ago
  {
    id: "eod-s2",
    organizationId: DEMO_ORG_ID,
    userId: "demo-user-2",
    date: twoDaysAgo,
    tasks: [
      { id: "et9", text: "Code reviewed 5 pull requests for crash fixes", rockId: "rock-2", rockTitle: "Reduce app crash rate below 0.1%" },
      { id: "et10", text: "Set up crash monitoring dashboard with new Sentry rules", rockId: "rock-2", rockTitle: "Reduce app crash rate below 0.1%" },
    ],
    challenges: "",
    tomorrowPriorities: [
      { id: "ep6", text: "Debug camera module memory leak", rockId: "rock-2", rockTitle: "Reduce app crash rate below 0.1%" },
    ],
    needsEscalation: false,
    escalationNote: null,
    metricValueToday: null,
    submittedAt: `${twoDaysAgo}T17:45:00`,
    createdAt: `${twoDaysAgo}T17:45:00`,
  },
  // Marcus Williams - yesterday
  {
    id: "eod-m1",
    organizationId: DEMO_ORG_ID,
    userId: "demo-user-3",
    date: yesterday,
    tasks: [
      { id: "et11", text: "Completed 4 screen designs for Settings navigation overhaul", rockId: "rock-3", rockTitle: "Redesign Settings app for iOS 20" },
      { id: "et12", text: "Presented design concepts to accessibility team for feedback", rockId: "rock-3", rockTitle: "Redesign Settings app for iOS 20" },
      { id: "et13", text: "Created search UI mockups for developer portal", rockId: "rock-7", rockTitle: "Launch developer documentation portal" },
    ],
    challenges: "Accessibility team requested significant changes to color contrast ratios - need to rework 6 screens",
    tomorrowPriorities: [
      { id: "ep7", text: "Rework color palette to meet AAA contrast requirements", rockId: "rock-3", rockTitle: "Redesign Settings app for iOS 20" },
      { id: "ep8", text: "Finalize navigation wireframes", rockId: "rock-3", rockTitle: "Redesign Settings app for iOS 20" },
    ],
    needsEscalation: false,
    escalationNote: null,
    metricValueToday: null,
    submittedAt: `${yesterday}T17:20:00`,
    createdAt: `${yesterday}T17:20:00`,
  },
  // Marcus Williams - two days ago
  {
    id: "eod-m2",
    organizationId: DEMO_ORG_ID,
    userId: "demo-user-3",
    date: twoDaysAgo,
    tasks: [
      { id: "et14", text: "Conducted user research sessions with 5 participants", rockId: "rock-3", rockTitle: "Redesign Settings app for iOS 20" },
      { id: "et15", text: "Synthesized research findings into design requirements doc", rockId: "rock-3", rockTitle: "Redesign Settings app for iOS 20" },
    ],
    challenges: "",
    tomorrowPriorities: [
      { id: "ep9", text: "Start high-fidelity designs based on research insights", rockId: "rock-3", rockTitle: "Redesign Settings app for iOS 20" },
    ],
    needsEscalation: false,
    escalationNote: null,
    metricValueToday: null,
    submittedAt: `${twoDaysAgo}T17:00:00`,
    createdAt: `${twoDaysAgo}T17:00:00`,
  },
  // Priya Patel - yesterday
  {
    id: "eod-p1",
    organizationId: DEMO_ORG_ID,
    userId: "demo-user-4",
    date: yesterday,
    tasks: [
      { id: "et16", text: "Updated SDK launch project timeline with new sprint data", rockId: "rock-1", rockTitle: "Launch Horizon XR 2.0 SDK" },
      { id: "et17", text: "Wrote 12 API reference pages for Horizon XR SDK", rockId: "rock-7", rockTitle: "Launch developer documentation portal" },
      { id: "et18", text: "Coordinated with legal on SDK license agreement", rockId: null, rockTitle: null },
    ],
    challenges: "",
    tomorrowPriorities: [
      { id: "ep10", text: "Complete remaining API docs for spatial computing module", rockId: "rock-7", rockTitle: "Launch developer documentation portal" },
      { id: "ep11", text: "Prepare sprint retro materials", rockId: null, rockTitle: null },
    ],
    needsEscalation: false,
    escalationNote: null,
    metricValueToday: null,
    submittedAt: `${yesterday}T17:10:00`,
    createdAt: `${yesterday}T17:10:00`,
  },
  // James O'Brien - yesterday
  {
    id: "eod-j1",
    organizationId: DEMO_ORG_ID,
    userId: "demo-user-5",
    date: yesterday,
    tasks: [
      { id: "et19", text: "Completed penetration testing on authentication v3 endpoints", rockId: "rock-5", rockTitle: "Complete Q1 security audit" },
      { id: "et20", text: "Filed 3 security vulnerability reports (2 medium, 1 low)", rockId: "rock-5", rockTitle: "Complete Q1 security audit" },
      { id: "et21", text: "Reviewed accessibility audit findings for Settings redesign", rockId: null, rockTitle: null },
    ],
    challenges: "",
    tomorrowPriorities: [
      { id: "ep12", text: "Begin API rate limiting audit", rockId: "rock-5", rockTitle: "Complete Q1 security audit" },
      { id: "ep13", text: "Update OWASP compliance matrix", rockId: "rock-5", rockTitle: "Complete Q1 security audit" },
    ],
    needsEscalation: false,
    escalationNote: null,
    metricValueToday: null,
    submittedAt: `${yesterday}T17:45:00`,
    createdAt: `${yesterday}T17:45:00`,
  },
  // James O'Brien - two days ago
  {
    id: "eod-j2",
    organizationId: DEMO_ORG_ID,
    userId: "demo-user-5",
    date: twoDaysAgo,
    tasks: [
      { id: "et22", text: "Set up automated security scanning in CI pipeline", rockId: "rock-5", rockTitle: "Complete Q1 security audit" },
      { id: "et23", text: "Reviewed 4 PRs for security best practices", rockId: null, rockTitle: null },
    ],
    challenges: "",
    tomorrowPriorities: [
      { id: "ep14", text: "Run penetration tests on auth endpoints", rockId: "rock-5", rockTitle: "Complete Q1 security audit" },
    ],
    needsEscalation: false,
    escalationNote: null,
    metricValueToday: null,
    submittedAt: `${twoDaysAgo}T17:30:00`,
    createdAt: `${twoDaysAgo}T17:30:00`,
  },
  // Elena Rodriguez - yesterday
  {
    id: "eod-e1",
    organizationId: DEMO_ORG_ID,
    userId: "demo-user-6",
    date: yesterday,
    tasks: [
      { id: "et24", text: "Completed training run for Aria intent classifier - 4.2% accuracy improvement", rockId: "rock-4", rockTitle: "Ship Horizon AI Phase 3" },
      { id: "et25", text: "Benchmarked inference latency on HX1 chip - meeting 50ms target", rockId: "rock-4", rockTitle: "Ship Horizon AI Phase 3" },
      { id: "et26", text: "Published internal tech talk on federated learning approach", rockId: null, rockTitle: null },
    ],
    challenges: "",
    tomorrowPriorities: [
      { id: "ep15", text: "Start HX2 chip optimization pass", rockId: "rock-4", rockTitle: "Ship Horizon AI Phase 3" },
      { id: "ep16", text: "Review writing tools model accuracy metrics", rockId: "rock-4", rockTitle: "Ship Horizon AI Phase 3" },
    ],
    needsEscalation: false,
    escalationNote: null,
    metricValueToday: null,
    submittedAt: `${yesterday}T18:15:00`,
    createdAt: `${yesterday}T18:15:00`,
  },
  // Elena Rodriguez - two days ago
  {
    id: "eod-e2",
    organizationId: DEMO_ORG_ID,
    userId: "demo-user-6",
    date: twoDaysAgo,
    tasks: [
      { id: "et27", text: "Prepared training dataset for Aria classifier (200k labeled samples)", rockId: "rock-4", rockTitle: "Ship Horizon AI Phase 3" },
      { id: "et28", text: "Optimized model quantization for on-device deployment", rockId: "rock-4", rockTitle: "Ship Horizon AI Phase 3" },
    ],
    challenges: "GPU cluster queue times increasing - may need more capacity",
    tomorrowPriorities: [
      { id: "ep17", text: "Launch training run with new dataset", rockId: "rock-4", rockTitle: "Ship Horizon AI Phase 3" },
    ],
    needsEscalation: false,
    escalationNote: null,
    metricValueToday: null,
    submittedAt: `${twoDaysAgo}T18:00:00`,
    createdAt: `${twoDaysAgo}T18:00:00`,
  },
  // Adam - three days ago
  {
    id: "eod-a3",
    organizationId: DEMO_ORG_ID,
    userId: "demo-user-1",
    date: threeDaysAgo,
    tasks: [
      { id: "et29", text: "Reviewed SDK beta feedback from 3 partner developers", rockId: "rock-1", rockTitle: "Launch Horizon XR 2.0 SDK" },
      { id: "et30", text: "Conducted performance review calibration session", rockId: null, rockTitle: null },
    ],
    challenges: "",
    tomorrowPriorities: [
      { id: "ep18", text: "Quarterly planning with leadership", rockId: null, rockTitle: null },
    ],
    needsEscalation: false,
    escalationNote: null,
    metricValueToday: null,
    submittedAt: `${threeDaysAgo}T17:00:00`,
    createdAt: `${threeDaysAgo}T17:00:00`,
  },
  // Priya - two days ago
  {
    id: "eod-p2",
    organizationId: DEMO_ORG_ID,
    userId: "demo-user-4",
    date: twoDaysAgo,
    tasks: [
      { id: "et31", text: "Set up content management system for docs portal", rockId: "rock-7", rockTitle: "Launch developer documentation portal" },
      { id: "et32", text: "Ran stakeholder alignment meeting for SDK launch plan", rockId: "rock-1", rockTitle: "Launch Horizon XR 2.0 SDK" },
    ],
    challenges: "",
    tomorrowPriorities: [
      { id: "ep19", text: "Write API reference docs for Horizon XR SDK", rockId: "rock-7", rockTitle: "Launch developer documentation portal" },
    ],
    needsEscalation: false,
    escalationNote: null,
    metricValueToday: null,
    submittedAt: `${twoDaysAgo}T17:20:00`,
    createdAt: `${twoDaysAgo}T17:20:00`,
  },
]

// ============================================
// CLIENTS
// ============================================

export const DEMO_CLIENTS: Client[] = [
  {
    id: "client-1",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    name: "Horizon Retail",
    description: "Retail operations and in-store technology initiatives",
    contactName: "Angela Brewer",
    contactEmail: "a.brewer@horizonlabs.io",
    industry: "Retail Operations",
    status: "active",
    tags: ["retail", "hardware"],
    customFields: {},
    createdAt: "2025-06-01",
    updatedAt: "2026-01-15",
    projectCount: 1,
    activeProjectCount: 1,
  },
  {
    id: "client-2",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    name: "Horizon Developer Relations",
    description: "Developer programs, tools, and ecosystem partnerships",
    contactName: "David Chen",
    contactEmail: "d.chen@horizonlabs.io",
    industry: "Developer Programs",
    status: "active",
    tags: ["developers", "sdk"],
    customFields: {},
    createdAt: "2025-06-01",
    updatedAt: "2026-01-20",
    projectCount: 2,
    activeProjectCount: 2,
  },
  {
    id: "client-3",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    name: "Horizon Media Services",
    description: "Services including Horizon Stream, Music, News, and Gaming",
    contactName: "Rachel Kim",
    contactEmail: "r.kim@horizonlabs.io",
    industry: "Services",
    status: "active",
    tags: ["services", "ai"],
    customFields: {},
    createdAt: "2025-07-01",
    updatedAt: "2026-01-18",
    projectCount: 1,
    activeProjectCount: 1,
  },
  {
    id: "client-4",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    name: "Horizon Health",
    description: "Health and fitness platform, HealthKit, and wellness features",
    contactName: "Michael Torres",
    contactEmail: "m.torres@horizonlabs.io",
    industry: "Health & Fitness",
    status: "active",
    tags: ["health", "privacy"],
    customFields: {},
    createdAt: "2025-08-01",
    updatedAt: "2026-02-01",
    projectCount: 0,
    activeProjectCount: 0,
  },
]

// ============================================
// PROJECTS
// ============================================

export const DEMO_PROJECTS: Project[] = [
  {
    id: "proj-1",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    clientId: "client-2",
    clientName: "Horizon Developer Relations",
    name: "Horizon XR 2.0 SDK Launch",
    description: "Next-generation spatial computing SDK with new APIs and tools",
    status: "active",
    priority: "high",
    progress: 72,
    startDate: "2025-12-01",
    dueDate: "2026-03-31",
    tags: ["sdk", "vision-pro"],
    customFields: {},
    createdAt: "2025-12-01",
    updatedAt: today,
    taskCount: 8,
    completedTaskCount: 3,
  },
  {
    id: "proj-2",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    clientId: "client-1",
    clientName: "Horizon Retail",
    name: "iOS 20 Settings Redesign",
    description: "Complete visual and UX overhaul of the Settings application",
    status: "active",
    priority: "high",
    progress: 38,
    startDate: "2025-12-15",
    dueDate: "2026-03-31",
    tags: ["ios", "design"],
    customFields: {},
    createdAt: "2025-12-15",
    updatedAt: today,
    taskCount: 12,
    completedTaskCount: 4,
  },
  {
    id: "proj-3",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    clientId: "client-3",
    clientName: "Horizon Media Services",
    name: "Horizon AI Phase 3",
    description: "On-device ML models for Aria, writing tools, and image understanding",
    status: "active",
    priority: "high",
    progress: 85,
    startDate: "2025-10-01",
    dueDate: "2026-03-15",
    tags: ["ai", "ml"],
    customFields: {},
    createdAt: "2025-10-01",
    updatedAt: today,
    taskCount: 15,
    completedTaskCount: 12,
  },
  {
    id: "proj-4",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    clientId: null,
    name: "Q1 Security Hardening",
    description: "Comprehensive security audit and penetration testing for all public APIs",
    status: "active",
    priority: "high",
    progress: 88,
    startDate: "2026-01-01",
    dueDate: "2026-03-31",
    tags: ["security", "compliance"],
    customFields: {},
    createdAt: "2026-01-01",
    updatedAt: today,
    taskCount: 10,
    completedTaskCount: 9,
  },
  {
    id: "proj-5",
    organizationId: DEMO_ORG_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    clientId: "client-2",
    clientName: "Horizon Developer Relations",
    name: "Developer Portal Refresh",
    description: "Unified documentation site with interactive examples and AI-powered search",
    status: "active",
    priority: "medium",
    progress: 50,
    startDate: "2025-11-15",
    dueDate: "2026-03-31",
    tags: ["docs", "developer-tools"],
    customFields: {},
    createdAt: "2025-11-15",
    updatedAt: today,
    taskCount: 14,
    completedTaskCount: 7,
  },
]

// ============================================
// SCORECARD METRICS
// ============================================

export interface DemoScorecardMetric {
  metricId: string
  metricName: string
  metricDescription: string
  ownerId: string
  ownerName: string
  targetValue: number
  targetDirection: "above" | "below" | "exact"
  unit: string
  entries: Record<string, { value: number; status: "green" | "yellow" | "red" | "gray" }>
}

function getScorecardWeeks(): string[] {
  const weeks: string[] = []
  const d = new Date()
  // Go to most recent Monday
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  for (let i = 0; i < 13; i++) {
    const wd = new Date(d.getTime() - i * 7 * 86400000)
    weeks.push(`${wd.getFullYear()}-${String(wd.getMonth() + 1).padStart(2, "0")}-${String(wd.getDate()).padStart(2, "0")}`)
  }
  return weeks
}

export function getDemoScorecardData() {
  const weeks = getScorecardWeeks()
  const currentWeek = weeks[0]

  const metrics: DemoScorecardMetric[] = [
    {
      metricId: "metric-1",
      metricName: "App Crash Rate",
      metricDescription: "Percentage of sessions that end in a crash",
      ownerId: "demo-user-2",
      ownerName: "Sarah Chen",
      targetValue: 0.1,
      targetDirection: "below",
      unit: "%",
      entries: Object.fromEntries(weeks.map((w, i) => [w, {
        value: Math.max(0.05, 0.18 - i * 0.005 + (Math.sin(i) * 0.02)),
        status: (0.18 - i * 0.005) < 0.1 ? "green" as const : (0.18 - i * 0.005) < 0.15 ? "yellow" as const : "red" as const,
      }])),
    },
    {
      metricId: "metric-2",
      metricName: "Sprint Velocity",
      metricDescription: "Story points completed per sprint",
      ownerId: "demo-user-4",
      ownerName: "Priya Patel",
      targetValue: 85,
      targetDirection: "above",
      unit: "pts",
      entries: Object.fromEntries(weeks.map((w, i) => [w, {
        value: Math.round(78 + Math.sin(i * 0.8) * 12 + i * 0.5),
        status: (78 + Math.sin(i * 0.8) * 12 + i * 0.5) >= 85 ? "green" as const : (78 + Math.sin(i * 0.8) * 12 + i * 0.5) >= 75 ? "yellow" as const : "red" as const,
      }])),
    },
    {
      metricId: "metric-3",
      metricName: "Code Review Turnaround",
      metricDescription: "Average time to complete code reviews",
      ownerId: "demo-user-2",
      ownerName: "Sarah Chen",
      targetValue: 24,
      targetDirection: "below",
      unit: "hrs",
      entries: Object.fromEntries(weeks.map((w, i) => [w, {
        value: Math.round((20 + Math.sin(i) * 8) * 10) / 10,
        status: (20 + Math.sin(i) * 8) <= 24 ? "green" as const : (20 + Math.sin(i) * 8) <= 32 ? "yellow" as const : "red" as const,
      }])),
    },
    {
      metricId: "metric-4",
      metricName: "Test Coverage",
      metricDescription: "Percentage of code covered by automated tests",
      ownerId: "demo-user-5",
      ownerName: "James O'Brien",
      targetValue: 90,
      targetDirection: "above",
      unit: "%",
      entries: Object.fromEntries(weeks.map((w, i) => [w, {
        value: Math.round((87 + i * 0.3 + Math.sin(i) * 1.5) * 10) / 10,
        status: (87 + i * 0.3) >= 90 ? "green" as const : (87 + i * 0.3) >= 85 ? "yellow" as const : "red" as const,
      }])),
    },
    {
      metricId: "metric-5",
      metricName: "Customer Satisfaction",
      metricDescription: "Average developer satisfaction score from feedback surveys",
      ownerId: "demo-user-1",
      ownerName: "Adam Wolfe",
      targetValue: 4.5,
      targetDirection: "above",
      unit: "/5",
      entries: Object.fromEntries(weeks.map((w, i) => [w, {
        value: Math.round((4.3 + Math.sin(i * 0.5) * 0.3) * 10) / 10,
        status: (4.3 + Math.sin(i * 0.5) * 0.3) >= 4.5 ? "green" as const : (4.3 + Math.sin(i * 0.5) * 0.3) >= 4.0 ? "yellow" as const : "red" as const,
      }])),
    },
  ]

  // Build the summary for current week
  const summary = metrics.map((m) => ({
    metricId: m.metricId,
    metricName: m.metricName,
    metricDescription: m.metricDescription,
    ownerId: m.ownerId,
    ownerName: m.ownerName,
    targetValue: m.targetValue,
    targetDirection: m.targetDirection,
    unit: m.unit,
    currentValue: m.entries[currentWeek]?.value ?? null,
    currentStatus: m.entries[currentWeek]?.status ?? ("gray" as const),
  }))

  const stats = {
    green: summary.filter((s) => s.currentStatus === "green").length,
    yellow: summary.filter((s) => s.currentStatus === "yellow").length,
    red: summary.filter((s) => s.currentStatus === "red").length,
    gray: summary.filter((s) => s.currentStatus === "gray").length,
    total: summary.length,
  }

  const trends = {
    weeks,
    metrics: metrics.map((m) => ({
      metric: {
        id: m.metricId,
        name: m.metricName,
        targetValue: m.targetValue,
        targetDirection: m.targetDirection,
        unit: m.unit,
        ownerName: m.ownerName,
      },
      entries: m.entries,
    })),
  }

  return { summary, stats, redMetrics: summary.filter((s) => s.currentStatus === "red"), weekStart: currentWeek, canEdit: false, trends }
}

// ============================================
// IDS BOARD
// ============================================

export const DEMO_IDS_ITEMS: IdsBoardItem[] = [
  {
    id: "ids-1",
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Build times increased 30% after Xcode update",
    description: "Team reporting significantly slower CI builds since Xcode 17.2 upgrade",
    columnName: "identify",
    orderIndex: 0,
    itemType: "issue",
    createdBy: "demo-user-2",
    createdByName: "Sarah Chen",
    createdAt: twoDaysAgo,
    updatedAt: twoDaysAgo,
  },
  {
    id: "ids-2",
    workspaceId: DEMO_WORKSPACE_ID,
    title: "New hire onboarding takes 3+ weeks",
    description: "Recent hires report confusing setup docs and too many manual steps",
    columnName: "identify",
    orderIndex: 1,
    itemType: "issue",
    createdBy: "demo-user-4",
    createdByName: "Priya Patel",
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
  },
  {
    id: "ids-3",
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Should we adopt SwiftUI for all new screens?",
    description: "Currently a mix of UIKit and SwiftUI. Need to decide on standard going forward.",
    columnName: "discuss",
    orderIndex: 0,
    itemType: "issue",
    createdBy: "demo-user-3",
    createdByName: "Marcus Williams",
    assignedTo: "demo-user-2",
    assignedToName: "Sarah Chen",
    createdAt: fourDaysAgo,
    updatedAt: yesterday,
  },
  {
    id: "ids-4",
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Vendor contract renewal for crash analytics tool",
    description: "Current Sentry contract expires in 6 weeks. Evaluate alternatives or renew.",
    columnName: "discuss",
    orderIndex: 1,
    itemType: "issue",
    createdBy: "demo-user-1",
    createdByName: "Adam Wolfe",
    createdAt: twoDaysAgo,
    updatedAt: twoDaysAgo,
  },
  {
    id: "ids-5",
    workspaceId: DEMO_WORKSPACE_ID,
    title: "GPU cluster capacity for ML training",
    description: "Queue times increasing as more teams adopt on-device ML. Need capacity plan.",
    columnName: "discuss",
    orderIndex: 2,
    itemType: "issue",
    createdBy: "demo-user-6",
    createdByName: "Elena Rodriguez",
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: "ids-6",
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Automated regression test suite for Settings app",
    description: "Agreed to build XCTest-based suite covering top 50 user flows. James to lead, target 2 weeks.",
    columnName: "solve",
    orderIndex: 0,
    itemType: "issue",
    createdBy: "demo-user-5",
    createdByName: "James O'Brien",
    assignedTo: "demo-user-5",
    assignedToName: "James O'Brien",
    createdAt: fourDaysAgo,
    updatedAt: yesterday,
  },
  {
    id: "ids-7",
    workspaceId: DEMO_WORKSPACE_ID,
    title: "Cross-team API standards document",
    description: "Published API design guidelines. All new endpoints must follow RESTful conventions with versioning.",
    columnName: "solve",
    orderIndex: 1,
    itemType: "issue",
    createdBy: "demo-user-1",
    createdByName: "Adam Wolfe",
    assignedTo: "demo-user-4",
    assignedToName: "Priya Patel",
    createdAt: threeDaysAgo,
    updatedAt: yesterday,
  },
]

// ============================================
// VTO DATA
// ============================================

export interface DemoVTOData {
  coreValues: string[]
  coreFocus: { purpose?: string; niche?: string }
  tenYearTarget: { target?: string }
  marketingStrategy: { targetMarket?: string; threeUniques?: string; provenProcess?: string; guarantee?: string }
  threeYearPicture: { revenue?: string; profit?: string; description?: string }
  oneYearPlan: { revenue?: string; profit?: string; goals?: string[] }
  quarterlyRocks: string[]
  issuesList: string[]
  lastEditedBy: string | null
  updatedAt: string
}

export const DEMO_VTO: DemoVTOData = {
  coreValues: [
    "Innovation — Push boundaries in everything we create",
    "Simplicity — The ultimate sophistication",
    "Excellence — Sweat every detail",
    "Privacy — A fundamental human right",
    "Accessibility — Technology for everyone",
  ],
  coreFocus: {
    purpose: "Creating the best products that enrich people's daily lives",
    niche: "Premium consumer technology and services that integrate hardware, software, and services seamlessly",
  },
  tenYearTarget: {
    target: "Every Horizon device powered by on-device AI, enabling deeply personal and private computing experiences for users worldwide",
  },
  marketingStrategy: {
    targetMarket: "Creative professionals, developers, and consumers who value premium experiences and privacy",
    threeUniques: "1. Seamless hardware-software integration\n2. Industry-leading privacy and security\n3. World-class design and user experience",
    provenProcess: "Design → Prototype → Test with users → Iterate → Ship → Measure → Improve",
    guarantee: "Every product we ship meets the highest standards of quality, privacy, and accessibility",
  },
  threeYearPicture: {
    revenue: "$500B",
    profit: "$130B",
    description: "Horizon AI available across all devices. Horizon XR established as the leading spatial computing platform. Services revenue exceeds $120B. Carbon neutral across entire supply chain.",
  },
  oneYearPlan: {
    revenue: "$420B",
    profit: "$110B",
    goals: [
      "Launch Horizon AI Phase 3 with on-device ML across all platforms",
      "Ship Horizon XR 2.0 SDK and grow developer ecosystem to 10,000+ spatial apps",
      "Achieve 99.9% crash-free rate across all first-party apps",
      "Complete iOS 20 redesign initiative (Settings, Health, Home)",
      "Reach 1 billion active subscribers across all services",
    ],
  },
  quarterlyRocks: [
    "Launch Horizon XR 2.0 SDK (Adam)",
    "Reduce crash rate below 0.1% (Sarah)",
    "Redesign Settings for iOS 20 (Marcus)",
    "Ship Horizon AI Phase 3 (Elena)",
    "Complete Q1 security audit (James)",
    "Migrate CI/CD to new build system (Sarah)",
    "Launch developer documentation portal (Priya)",
  ],
  issuesList: [
    "Build times increased 30% after Xcode update",
    "New hire onboarding too slow (3+ weeks)",
    "GPU cluster capacity constraints for ML training",
    "SwiftUI vs UIKit standardization decision needed",
    "Vendor contract renewals (Sentry, Datadog) in 6 weeks",
  ],
  lastEditedBy: "Adam Wolfe",
  updatedAt: yesterday,
}

// ============================================
// ORG CHART
// ============================================

export interface DemoOrgChartEmployee {
  id: string
  name: string
  title: string
  department: string
  managerId: string | null
  avatar?: string
  seats: Array<{
    name: string
    bullets: string[]
  }>
}

export const DEMO_ORG_CHART: DemoOrgChartEmployee[] = [
  {
    id: "demo-user-1",
    name: "Adam Wolfe",
    title: "VP Product Engineering",
    department: "Product Engineering",
    managerId: null,
    seats: [
      {
        name: "VP Product Engineering",
        bullets: [
          "Set product engineering vision and strategy",
          "Lead cross-functional technical initiatives",
          "Drive quarterly planning and OKR process",
          "Manage engineering leadership team",
          "Own developer experience and platform quality",
        ],
      },
    ],
  },
  {
    id: "demo-user-2",
    name: "Sarah Chen",
    title: "Senior Engineering Manager",
    department: "Engineering",
    managerId: "demo-user-1",
    seats: [
      {
        name: "Senior Engineering Manager",
        bullets: [
          "Lead platform stability and reliability",
          "Manage CI/CD infrastructure and build systems",
          "Own crash-free rate and performance metrics",
          "Mentor engineering team leads",
          "Drive code quality standards and review processes",
        ],
      },
    ],
  },
  {
    id: "demo-user-3",
    name: "Marcus Williams",
    title: "Design Director",
    department: "Design",
    managerId: "demo-user-1",
    seats: [
      {
        name: "Design Director",
        bullets: [
          "Lead all product design initiatives",
          "Own design system and component library",
          "Conduct user research and usability testing",
          "Ensure accessibility across all products",
          "Collaborate with engineering on feasibility",
        ],
      },
    ],
  },
  {
    id: "demo-user-4",
    name: "Priya Patel",
    title: "Program Manager",
    department: "Program Management",
    managerId: "demo-user-1",
    seats: [
      {
        name: "Program Manager",
        bullets: [
          "Coordinate cross-team project delivery",
          "Manage SDK launch timelines and milestones",
          "Own developer documentation and portal",
          "Track sprint velocity and team metrics",
          "Facilitate stakeholder communication",
        ],
      },
    ],
  },
  {
    id: "demo-user-5",
    name: "James O'Brien",
    title: "QA Lead",
    department: "Quality Assurance",
    managerId: "demo-user-1",
    seats: [
      {
        name: "QA Lead",
        bullets: [
          "Lead security audits and compliance reviews",
          "Own automated testing strategy",
          "Conduct penetration testing on public APIs",
          "Review PRs for security best practices",
          "Manage accessibility testing program",
        ],
      },
    ],
  },
  {
    id: "demo-user-6",
    name: "Elena Rodriguez",
    title: "Data Science Lead",
    department: "Data Science",
    managerId: "demo-user-1",
    seats: [
      {
        name: "Data Science Lead",
        bullets: [
          "Lead Horizon AI ML model development",
          "Optimize on-device inference performance",
          "Own model training pipeline and infrastructure",
          "Drive federated learning initiatives",
          "Benchmark model quality and latency metrics",
        ],
      },
    ],
  },
]

// ============================================
// WORKSPACE NOTES
// ============================================

export const DEMO_NOTES: WorkspaceNote = {
  id: "note-1",
  workspaceId: DEMO_WORKSPACE_ID,
  content: `# Product Engineering Team Notes

## Weekly L10 Meeting Agenda
- Segue (5 min)
- Scorecard review (5 min)
- Rock review (5 min)
- Customer/Employee headlines (5 min)
- To-Do list review (5 min)
- IDS (60 min)
- Conclude (5 min)

## Team Agreements
1. **EOD reports due by 6 PM** in your local timezone
2. **Code reviews** completed within 24 hours of request
3. **All new endpoints** follow REST API design guidelines v3
4. **Security review required** for any public-facing API changes
5. **Accessibility testing** included in all design handoffs

## Key Links
- Horizon XR SDK Documentation: internal-wiki/vp-sdk
- CI/CD Dashboard: builds.internal/dashboard
- Crash Analytics: sentry.internal/horizon-eng
- Design System: figma.com/horizon-design-system

## Q1 2026 Focus Areas
- Ship Horizon XR 2.0 SDK to GA
- Reduce crash rate to <0.1%
- Complete iOS 20 Settings redesign
- Horizon AI Phase 3 deployment
- Security hardening across all public APIs
`,
  lastEditedBy: "demo-user-1",
  createdAt: "2026-01-02",
  updatedAt: yesterday,
}

// ============================================
// PEOPLE ASSESSMENTS (GWC)
// ============================================

export interface DemoPeopleAssessment {
  employeeId: string
  employeeName: string
  getsIt: boolean
  wantsIt: boolean
  hasCapacity: boolean
  coreValuesRating: string
  rightPersonRightSeat: "right" | "wrong" | "unsure"
  assessmentCount: number
  latestAssessmentId: string
  latestNotes: string | null
  updatedAt: string
}

export const DEMO_PEOPLE_ASSESSMENTS: DemoPeopleAssessment[] = [
  {
    employeeId: "demo-user-2",
    employeeName: "Sarah Chen",
    getsIt: true,
    wantsIt: true,
    hasCapacity: true,
    coreValuesRating: "+/+/+/+/+",
    rightPersonRightSeat: "right",
    assessmentCount: 3,
    latestAssessmentId: "assess-1",
    latestNotes: "Consistently exceeds expectations. Strong technical leadership and mentoring.",
    updatedAt: yesterday,
  },
  {
    employeeId: "demo-user-3",
    employeeName: "Marcus Williams",
    getsIt: true,
    wantsIt: true,
    hasCapacity: false,
    coreValuesRating: "+/+/+/+/-",
    rightPersonRightSeat: "unsure",
    assessmentCount: 2,
    latestAssessmentId: "assess-2",
    latestNotes: "Excellent design work but struggling with capacity. Settings redesign timeline at risk. May need to offload documentation portal design work.",
    updatedAt: twoDaysAgo,
  },
  {
    employeeId: "demo-user-4",
    employeeName: "Priya Patel",
    getsIt: true,
    wantsIt: true,
    hasCapacity: true,
    coreValuesRating: "+/+/+/+/+",
    rightPersonRightSeat: "right",
    assessmentCount: 2,
    latestAssessmentId: "assess-3",
    latestNotes: "Strong program management. Keeps projects on track and communicates well across teams.",
    updatedAt: twoDaysAgo,
  },
  {
    employeeId: "demo-user-5",
    employeeName: "James O'Brien",
    getsIt: true,
    wantsIt: true,
    hasCapacity: true,
    coreValuesRating: "+/+/+/+/+",
    rightPersonRightSeat: "right",
    assessmentCount: 3,
    latestAssessmentId: "assess-4",
    latestNotes: "Security audit ahead of schedule. Proactive about identifying vulnerabilities. Great addition to the team.",
    updatedAt: threeDaysAgo,
  },
  {
    employeeId: "demo-user-6",
    employeeName: "Elena Rodriguez",
    getsIt: true,
    wantsIt: true,
    hasCapacity: true,
    coreValuesRating: "+/+/+/+/+",
    rightPersonRightSeat: "right",
    assessmentCount: 2,
    latestAssessmentId: "assess-5",
    latestNotes: "Horizon AI Phase 3 tracking ahead of plan. ML model quality improvements are impressive.",
    updatedAt: twoDaysAgo,
  },
]

// ============================================
// MANAGER DASHBOARD
// ============================================

export function getDemoManagerDashboard(): ManagerDashboard {
  const directReports: DirectReport[] = DEMO_TEAM_MEMBERS.filter((m) => m.id !== "demo-user-1").map((member) => {
    const memberRocks = DEMO_ROCKS.filter((r) => r.userId === member.id)
    const memberTasks = DEMO_TASKS.filter((t) => t.assigneeId === member.id)
    const completedTasks = memberTasks.filter((t) => t.status === "completed")
    const pendingTasks = memberTasks.filter((t) => t.status === "pending")
    const overdueTasks = memberTasks.filter((t) => t.dueDate && t.dueDate < today && t.status !== "completed")
    const memberReports = DEMO_EOD_REPORTS.filter((r) => r.userId === member.id)
    const latestReport = memberReports[0]

    return {
      id: member.id,
      userId: member.userId || member.id,
      name: member.name,
      email: member.email,
      department: member.department,
      jobTitle: member.jobTitle,
      status: member.status || "active",
      joinDate: member.joinDate,
      metrics: {
        totalTasks: memberTasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: pendingTasks.length,
        overdueTasks: overdueTasks.length,
        taskCompletionRate: memberTasks.length > 0 ? Math.round((completedTasks.length / memberTasks.length) * 100) : 0,
        tasksCompletedThisWeek: completedTasks.length,
        tasksCompletedLastWeek: Math.max(1, completedTasks.length - 1),
        avgTasksPerWeek: Math.round(memberTasks.length * 0.7),
        totalRocks: memberRocks.length,
        onTrackRocks: memberRocks.filter((r) => r.status === "on-track").length,
        atRiskRocks: memberRocks.filter((r) => r.status === "at-risk").length,
        blockedRocks: memberRocks.filter((r) => r.status === "blocked").length,
        completedRocks: memberRocks.filter((r) => r.status === "completed").length,
        avgRockProgress: memberRocks.length > 0 ? Math.round(memberRocks.reduce((s, r) => s + r.progress, 0) / memberRocks.length) : 0,
        eodSubmittedToday: memberReports.some((r) => r.date === today),
        eodStreakDays: memberReports.length >= 2 ? memberReports.length + 3 : memberReports.length,
        eodSubmissionRateLast30Days: 85 + Math.floor(Math.random() * 15),
        lastEodDate: latestReport?.date,
        escalationsThisMonth: memberReports.filter((r) => r.needsEscalation).length,
        blockersMentioned: memberReports.filter((r) => r.challenges && r.challenges.length > 0).length,
      },
      recentActivity: {
        lastActive: yesterday,
        recentTasksCompleted: completedTasks.slice(0, 3).map((t) => ({
          id: t.id,
          title: t.title,
          completedAt: t.completedAt || today,
          rockTitle: t.rockTitle || undefined,
        })),
        recentEodSummary: latestReport ? latestReport.tasks.map((t) => t.text).join("; ") : undefined,
        upcomingDeadlines: memberTasks
          .filter((t) => t.dueDate && t.status !== "completed")
          .slice(0, 3)
          .map((t) => ({
            id: t.id,
            title: t.title,
            type: "task" as const,
            dueDate: t.dueDate!,
            priority: t.priority === "low" ? undefined : t.priority,
          })),
      },
      rocks: memberRocks.map((r) => ({
        id: r.id,
        title: r.title,
        progress: r.progress,
        status: r.status,
        dueDate: r.dueDate,
        quarter: r.quarter,
      })),
      eodStatus: {
        submittedToday: memberReports.some((r) => r.date === today),
        lastSubmittedAt: latestReport?.submittedAt,
        lastSubmittedDate: latestReport?.date,
        streakDays: memberReports.length >= 2 ? memberReports.length + 3 : memberReports.length,
        needsEscalation: latestReport?.needsEscalation ?? false,
        escalationNote: latestReport?.escalationNote || undefined,
        tasksReported: latestReport?.tasks.length,
        prioritiesSet: latestReport?.tomorrowPriorities.length,
      },
    }
  })

  const alerts: ManagerAlert[] = [
    {
      id: "alert-1",
      type: "at_risk",
      severity: "high",
      title: "Settings Redesign at risk",
      description: "Marcus Williams' rock 'Redesign Settings app for iOS 20' is at 40% with 7 weeks remaining",
      memberId: "demo-user-3",
      memberName: "Marcus Williams",
      relatedItemId: "rock-3",
      relatedItemType: "rock",
      createdAt: yesterday,
    },
    {
      id: "alert-2",
      type: "escalation",
      severity: "high",
      title: "Build agent provisioning delayed",
      description: "Sarah Chen escalated: Build system migration blocked on infra team - 2 week delay",
      memberId: "demo-user-2",
      memberName: "Sarah Chen",
      relatedItemId: "eod-s1",
      relatedItemType: "eod",
      createdAt: yesterday,
    },
    {
      id: "alert-3",
      type: "at_risk",
      severity: "medium",
      title: "CI/CD migration at risk",
      description: "Sarah Chen's rock 'Migrate CI/CD to new build system' is at 30% progress",
      memberId: "demo-user-2",
      memberName: "Sarah Chen",
      relatedItemId: "rock-6",
      relatedItemType: "rock",
      createdAt: twoDaysAgo,
    },
    {
      id: "alert-4",
      type: "overdue_task",
      severity: "medium",
      title: "Overdue: Finalize Settings navigation wireframes",
      description: "Marcus Williams has a task due yesterday that hasn't been completed",
      memberId: "demo-user-3",
      memberName: "Marcus Williams",
      relatedItemId: "task-3",
      relatedItemType: "task",
      createdAt: today,
    },
  ]

  const insights: ManagerInsight[] = [
    {
      id: "insight-1",
      type: "performance",
      title: "Elena Rodriguez ahead of schedule",
      description: "Horizon AI Phase 3 is at 85% with 7 weeks remaining. Consider reassigning capacity to support at-risk rocks.",
      priority: "medium",
      actionable: true,
      suggestedAction: "Discuss with Elena if she can support Marcus on Settings accessibility work",
    },
    {
      id: "insight-2",
      type: "workload",
      title: "Marcus Williams may be overloaded",
      description: "Managing Settings redesign (at-risk) and contributing to documentation portal. Accessibility rework added unplanned scope.",
      priority: "high",
      actionable: true,
      suggestedAction: "Consider reassigning documentation portal design work to free up capacity",
    },
    {
      id: "insight-3",
      type: "pattern",
      title: "Team EOD submission rate strong",
      description: "5 out of 5 direct reports submitted EOD reports yesterday. Team consistency remains high.",
      priority: "low",
      actionable: false,
    },
  ]

  return {
    manager: {
      id: "demo-user-1",
      name: "Adam Wolfe",
      email: "adam@horizonlabs.io",
      department: "Product Engineering",
      jobTitle: "VP Product Engineering",
    },
    teamSummary: {
      totalMembers: 5,
      activeMembers: 5,
      totalPendingTasks: DEMO_TASKS.filter((t) => t.status === "pending").length,
      totalOverdueTasks: DEMO_TASKS.filter((t) => t.dueDate && t.dueDate < today && t.status !== "completed").length,
      avgTaskCompletionRate: 42,
      tasksCompletedThisWeek: DEMO_TASKS.filter((t) => t.status === "completed").length,
      totalActiveRocks: DEMO_ROCKS.filter((r) => r.status !== "completed").length,
      rocksOnTrack: DEMO_ROCKS.filter((r) => r.status === "on-track").length,
      rocksAtRisk: DEMO_ROCKS.filter((r) => r.status === "at-risk").length,
      rocksBlocked: DEMO_ROCKS.filter((r) => r.status === "blocked").length,
      avgRockProgress: Math.round(DEMO_ROCKS.reduce((s, r) => s + r.progress, 0) / DEMO_ROCKS.length),
      eodSubmissionRateToday: 0,
      eodSubmissionRate7Days: 90,
      avgEodStreak: 8,
      teamSentiment: "neutral",
      activeEscalations: 1,
      unaddressedBlockers: 2,
    },
    directReports,
    alerts,
    insights,
  }
}

// ============================================
// ANALYTICS DATA
// ============================================

export interface DemoAnalyticsData {
  rockCompletionData: Array<{ date: string; completed: number }>
  taskCompletionData: Array<{ date: string; completed: number; created: number }>
  eodSubmissionData: Array<{ date: string; submissions: number }>
  metrics: {
    rockCompletionRate: number
    taskCompletionRate: number
    eodCompletionRate: number
    totalRocks: number
    completedRocks: number
    totalTasks: number
    completedTasks: number
    totalReports: number
  }
  topPerformers: Array<{
    userId: string
    name: string
    avatar: string | null
    tasksCompleted: number
    rocksCompleted: number
    eodReports: number
    score: number
  }>
  activityByDayOfWeek: Array<{ day: string; avgTasks: number; avgReports: number }>
}

export function getDemoAnalyticsData(days = 30): DemoAnalyticsData {
  const rockCompletionData: Array<{ date: string; completed: number }> = []
  const taskCompletionData: Array<{ date: string; completed: number; created: number }> = []
  const eodSubmissionData: Array<{ date: string; submissions: number }> = []

  for (let i = days - 1; i >= 0; i--) {
    const date = getLocalDateString(-i)
    const dayOfWeek = new Date(Date.now() - i * 86400000).getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    rockCompletionData.push({
      date,
      completed: isWeekend ? 0 : Math.floor(Math.random() * 2),
    })
    taskCompletionData.push({
      date,
      completed: isWeekend ? Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 5),
      created: isWeekend ? Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 4),
    })
    eodSubmissionData.push({
      date,
      submissions: isWeekend ? 0 : 4 + Math.floor(Math.random() * 2),
    })
  }

  return {
    rockCompletionData,
    taskCompletionData,
    eodSubmissionData,
    metrics: {
      rockCompletionRate: 71,
      taskCompletionRate: 78,
      eodCompletionRate: 92,
      totalRocks: 7,
      completedRocks: 0,
      totalTasks: DEMO_TASKS.length,
      completedTasks: DEMO_TASKS.filter((t) => t.status === "completed").length,
      totalReports: DEMO_EOD_REPORTS.length,
    },
    topPerformers: [
      { userId: "demo-user-6", name: "Elena Rodriguez", avatar: null, tasksCompleted: 14, rocksCompleted: 0, eodReports: 22, score: 95 },
      { userId: "demo-user-5", name: "James O'Brien", avatar: null, tasksCompleted: 12, rocksCompleted: 0, eodReports: 21, score: 90 },
      { userId: "demo-user-2", name: "Sarah Chen", avatar: null, tasksCompleted: 11, rocksCompleted: 0, eodReports: 20, score: 87 },
      { userId: "demo-user-4", name: "Priya Patel", avatar: null, tasksCompleted: 10, rocksCompleted: 0, eodReports: 19, score: 84 },
      { userId: "demo-user-3", name: "Marcus Williams", avatar: null, tasksCompleted: 8, rocksCompleted: 0, eodReports: 18, score: 78 },
    ],
    activityByDayOfWeek: [
      { day: "Mon", avgTasks: 5.2, avgReports: 4.8 },
      { day: "Tue", avgTasks: 6.1, avgReports: 5.0 },
      { day: "Wed", avgTasks: 5.8, avgReports: 4.9 },
      { day: "Thu", avgTasks: 5.5, avgReports: 4.7 },
      { day: "Fri", avgTasks: 4.3, avgReports: 4.5 },
      { day: "Sat", avgTasks: 0.5, avgReports: 0.1 },
      { day: "Sun", avgTasks: 0.3, avgReports: 0.0 },
    ],
  }
}

// ============================================
// CALENDAR EVENTS (derived from tasks/rocks)
// ============================================

// Calendar page uses tasks/rocks/eodReports from useTeamData - no separate data needed

// ============================================
// COMMAND CENTER (AI) DEMO DATA
// ============================================

export interface DemoCommandCenterData {
  aiTasks: Array<{
    id: string
    title: string
    description: string
    assigneeId: string
    assigneeName: string
    priority: string
    status: "pending_approval" | "approved" | "rejected"
    context: string
    createdAt: string
  }>
  dailyDigest: {
    summary: string
    wins: Array<{ text: string; memberName: string; memberId: string }>
    blockers: Array<{ text: string; memberName: string; memberId: string; severity: string }>
    concerns: Array<{ text: string; type: string }>
    teamSentiment: string
    reportsAnalyzed: number
    generatedAt: string
  }
}

export const DEMO_COMMAND_CENTER: DemoCommandCenterData = {
  aiTasks: [
    {
      id: "ai-task-1",
      title: "Investigate Xcode 17.2 build time regression",
      description: "Build times increased 30% after the Xcode update. Profile and identify root cause.",
      assigneeId: "demo-user-2",
      assigneeName: "Sarah Chen",
      priority: "high",
      status: "pending_approval",
      context: "Identified from IDS board issue and team reports of slower CI builds",
      createdAt: yesterday,
    },
    {
      id: "ai-task-2",
      title: "Create onboarding automation script",
      description: "Automate dev environment setup steps to reduce onboarding from 3 weeks to 3 days",
      assigneeId: "demo-user-4",
      assigneeName: "Priya Patel",
      priority: "medium",
      status: "pending_approval",
      context: "Multiple new hires reported long onboarding. IDS board item flagged.",
      createdAt: yesterday,
    },
    {
      id: "ai-task-3",
      title: "Schedule accessibility review for Settings redesign",
      description: "Formal accessibility review needed before moving to high-fidelity implementation",
      assigneeId: "demo-user-3",
      assigneeName: "Marcus Williams",
      priority: "high",
      status: "pending_approval",
      context: "Marcus mentioned accessibility team requested significant changes to color contrast",
      createdAt: today,
    },
  ],
  dailyDigest: {
    summary: "Productive day across the team. 5 of 5 team members submitted EOD reports. Key progress on Horizon AI Phase 3 and security audit. Settings redesign facing accessibility challenges that need attention.",
    wins: [
      { text: "Fixed memory leak in camera module - 40% reduction in allocations", memberName: "Sarah Chen", memberId: "demo-user-2" },
      { text: "Aria intent classifier improved by 4.2% accuracy", memberName: "Elena Rodriguez", memberId: "demo-user-6" },
      { text: "Completed penetration testing on auth v3 endpoints", memberName: "James O'Brien", memberId: "demo-user-5" },
    ],
    blockers: [
      { text: "Build agent provisioning delayed 2 weeks - CI/CD migration impacted", memberName: "Sarah Chen", memberId: "demo-user-2", severity: "high" },
      { text: "Accessibility rework needed on 6 screens - unplanned scope for Settings redesign", memberName: "Marcus Williams", memberId: "demo-user-3", severity: "medium" },
    ],
    concerns: [
      { text: "Marcus may be overloaded with Settings redesign + docs portal design", type: "workload" },
      { text: "CI/CD migration at 30% - may miss Q1 deadline without infra team support", type: "deadline" },
    ],
    teamSentiment: "neutral",
    reportsAnalyzed: 5,
    generatedAt: today,
  },
}

// ============================================
// DEMO TOAST MESSAGE
// ============================================

export const DEMO_READONLY_MESSAGE = "Demo mode — changes not saved. Sign up for a free account to use all features!"
