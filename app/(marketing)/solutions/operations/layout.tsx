import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Operations Solution | Taskspace",
  description: "Streamline operations across every team with process accountability, daily reports, metrics dashboards, and team coordination.",
  openGraph: {
    title: "Operations Solution | Taskspace",
    description: "Streamline operations across every team with process accountability, daily reports, metrics dashboards, and team coordination.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
