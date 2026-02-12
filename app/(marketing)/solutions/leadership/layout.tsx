import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Leadership Solution | Taskspace",
  description: "Run multiple teams from one dashboard with unified visibility, AI insights, and strategic alignment for C-suite and founders.",
  openGraph: {
    title: "Leadership Solution | Taskspace",
    description: "Run multiple teams from one dashboard with unified visibility, AI insights, and strategic alignment for C-suite and founders.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
