import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | Taskspace",
  description: "Read the Privacy Policy for Taskspace, the AI-powered EOS management platform.",
  openGraph: {
    title: "Privacy Policy | Taskspace",
    description: "Read the Privacy Policy for Taskspace, the AI-powered EOS management platform.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
