import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Scorecard | Taskspace",
  description: "Track weekly measurables and KPIs with team scorecards. Monitor performance trends and keep your EOS metrics on track.",
  openGraph: {
    title: "Scorecard | Taskspace",
    description: "Track weekly measurables and KPIs with team scorecards. Monitor performance trends and keep your EOS metrics on track.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
