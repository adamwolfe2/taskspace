import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sales Solution | Taskspace",
  description: "Keep your sales team accountable with daily activity tracking, scorecard metrics, and rock goals for consistent pipeline growth.",
  openGraph: {
    title: "Sales Solution | Taskspace",
    description: "Keep your sales team accountable with daily activity tracking, scorecard metrics, and rock goals for consistent pipeline growth.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
