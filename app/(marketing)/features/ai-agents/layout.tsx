import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI Agents | Taskspace",
  description: "Leverage AI agents for automated EOD parsing, smart insights, and intelligent task recommendations. AI-powered EOS management.",
  openGraph: {
    title: "AI Agents | Taskspace",
    description: "Leverage AI agents for automated EOD parsing, smart insights, and intelligent task recommendations. AI-powered EOS management.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
