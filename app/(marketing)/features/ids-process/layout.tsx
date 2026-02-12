import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "IDS Process | Taskspace",
  description: "Identify, Discuss, and Solve issues efficiently with a structured IDS board. Track resolution and keep your team moving forward.",
  openGraph: {
    title: "IDS Process | Taskspace",
    description: "Identify, Discuss, and Solve issues efficiently with a structured IDS board. Track resolution and keep your team moving forward.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
