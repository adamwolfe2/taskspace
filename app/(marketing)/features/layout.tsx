import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Features | Taskspace",
  description:
    "Explore all Taskspace features: EOD reports, quarterly rocks, scorecards, L10 meetings, IDS process, org charts, and AI-powered team management.",
  openGraph: {
    title: "Features | Taskspace",
    description:
      "Explore all Taskspace features: EOD reports, quarterly rocks, scorecards, L10 meetings, IDS process, org charts, and AI-powered team management.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
