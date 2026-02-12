import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Marketing Solution | Taskspace",
  description: "Align marketing execution with strategy through project tracking, cross-functional coordination, and measurable outcomes.",
  openGraph: {
    title: "Marketing Solution | Taskspace",
    description: "Align marketing execution with strategy through project tracking, cross-functional coordination, and measurable outcomes.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
