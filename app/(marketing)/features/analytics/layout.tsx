import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Analytics & Insights | Taskspace",
  description: "AI-powered analytics for team performance, reporting rates, and productivity trends. Get actionable insights across your EOS organization.",
  openGraph: {
    title: "Analytics & Insights | Taskspace",
    description: "AI-powered analytics for team performance, reporting rates, and productivity trends. Get actionable insights across your EOS organization.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
