import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About | Taskspace",
  description: "Taskspace is the AI-powered EOS management platform built for multi-company founders and builders running teams in true parallel.",
  openGraph: {
    title: "About | Taskspace",
    description: "Taskspace is the AI-powered EOS management platform built for multi-company founders and builders running teams in true parallel.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
