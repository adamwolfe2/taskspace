// Org Chart Employee Types
export interface OrgChartEmployee {
  id: string
  firstName: string
  lastName: string
  fullName: string
  supervisor: string | null
  department: string
  jobTitle: string
  notes: string
  email?: string
  extraInfo?: string
  rocks?: string // Formatted as "Rock 1: Title\n* task1\n* task2\nRock 2: Title..."
}

export interface OrgChartEmployeeNode extends OrgChartEmployee {
  directReports: OrgChartEmployeeNode[]
  level: number
}

// Parsed rock structure
export interface ParsedRock {
  index: number
  title: string
  bullets: string[]
}

// Rock progress tracking
export interface RockProgress {
  id: string
  employeeName: string
  rockIndex: number
  bulletIndex: number
  completed: boolean
  updatedAt: string
  updatedBy?: string
}

// Chat types
export interface OrgChartChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface ChatResponse {
  response: string
  mentionedEmployees?: string[]
}

// API response types
export interface OrgChartEmployeesResponse {
  success: boolean
  employees?: OrgChartEmployee[]
  error?: string
}

export interface OrgChartStatusResponse {
  success: boolean
  airtable: boolean
  openai: boolean
  message?: string
}

// Avatar color mapping
export type AvatarColor = {
  bg: string
  text: string
}

export const AVATAR_COLORS: Record<string, AvatarColor> = {
  A: { bg: "bg-red-100", text: "text-red-700" },
  B: { bg: "bg-orange-100", text: "text-orange-700" },
  C: { bg: "bg-amber-100", text: "text-amber-700" },
  D: { bg: "bg-yellow-100", text: "text-yellow-700" },
  E: { bg: "bg-lime-100", text: "text-lime-700" },
  F: { bg: "bg-green-100", text: "text-green-700" },
  G: { bg: "bg-emerald-100", text: "text-emerald-700" },
  H: { bg: "bg-teal-100", text: "text-teal-700" },
  I: { bg: "bg-cyan-100", text: "text-cyan-700" },
  J: { bg: "bg-sky-100", text: "text-sky-700" },
  K: { bg: "bg-blue-100", text: "text-blue-700" },
  L: { bg: "bg-indigo-100", text: "text-indigo-700" },
  M: { bg: "bg-violet-100", text: "text-violet-700" },
  N: { bg: "bg-purple-100", text: "text-purple-700" },
  O: { bg: "bg-fuchsia-100", text: "text-fuchsia-700" },
  P: { bg: "bg-pink-100", text: "text-pink-700" },
  Q: { bg: "bg-rose-100", text: "text-rose-700" },
  R: { bg: "bg-red-100", text: "text-red-700" },
  S: { bg: "bg-orange-100", text: "text-orange-700" },
  T: { bg: "bg-amber-100", text: "text-amber-700" },
  U: { bg: "bg-yellow-100", text: "text-yellow-700" },
  V: { bg: "bg-lime-100", text: "text-lime-700" },
  W: { bg: "bg-green-100", text: "text-green-700" },
  X: { bg: "bg-emerald-100", text: "text-emerald-700" },
  Y: { bg: "bg-teal-100", text: "text-teal-700" },
  Z: { bg: "bg-cyan-100", text: "text-cyan-700" },
}
