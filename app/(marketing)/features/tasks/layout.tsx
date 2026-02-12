import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Task Management | Taskspace",
  description: "Manage team tasks with priorities, due dates, and rock associations. Keep your EOS team accountable with clear ownership and progress tracking.",
  openGraph: {
    title: "Task Management | Taskspace",
    description: "Manage team tasks with priorities, due dates, and rock associations. Keep your EOS team accountable with clear ownership and progress tracking.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
