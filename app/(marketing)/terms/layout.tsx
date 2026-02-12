import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service | Taskspace",
  description: "Read the Terms of Service for Taskspace, the AI-powered EOS management platform.",
  openGraph: {
    title: "Terms of Service | Taskspace",
    description: "Read the Terms of Service for Taskspace, the AI-powered EOS management platform.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
