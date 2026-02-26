import type { WorkspaceFeatureToggles } from "./workspace-features"
import {
  TEAM_WORKSPACE_FEATURES,
  CLIENT_REPORTING_WORKSPACE_FEATURES,
  MULTI_COMPANY_WORKSPACE_FEATURES,
  STARTER_WORKSPACE_FEATURES,
} from "./workspace-features"

export interface UseCaseTemplate {
  id: "team" | "client-reporting" | "multi-company" | "custom"
  title: string
  subtitle: string
  description: string
  emoji: string
  features: WorkspaceFeatureToggles
  highlightedFeatures: string[]
}

export const USE_CASE_TEMPLATES: UseCaseTemplate[] = [
  {
    id: "team",
    title: "Managing a team",
    subtitle: "Internal accountability",
    description: "EOD reports, rocks, tasks, scorecards, and L10 meetings for your internal team.",
    emoji: "👥",
    features: TEAM_WORKSPACE_FEATURES,
    highlightedFeatures: ["EOD Reports", "Rocks", "Scorecard", "L10 Meetings"],
  },
  {
    id: "client-reporting",
    title: "Client-facing reports",
    subtitle: "Keep clients in the loop",
    description: "AI-generated EOD reports delivered to clients. Projects, client portal, and branding included.",
    emoji: "📊",
    features: CLIENT_REPORTING_WORKSPACE_FEATURES,
    highlightedFeatures: ["EOD Reports", "Client Portal", "Projects", "Clients"],
  },
  {
    id: "multi-company",
    title: "Multiple companies",
    subtitle: "Parallel org operator",
    description: "Full EOS suite across multiple teams or companies. Rocks, VTO, analytics, and org chart.",
    emoji: "🏢",
    features: MULTI_COMPANY_WORKSPACE_FEATURES,
    highlightedFeatures: ["Rocks", "VTO", "Analytics", "Org Chart"],
  },
  {
    id: "custom",
    title: "Set it up myself",
    subtitle: "Start simple",
    description: "Begin with just the essentials. Enable more features anytime from Settings.",
    emoji: "⚙️",
    features: STARTER_WORKSPACE_FEATURES,
    highlightedFeatures: ["Tasks", "Rocks", "EOD Reports"],
  },
]
