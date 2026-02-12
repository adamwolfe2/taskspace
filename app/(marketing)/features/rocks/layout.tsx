import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Quarterly Rocks | Taskspace",
  description: "Track quarterly rocks with milestone progress, status updates, and team alignment. Stay focused on what matters most for your EOS organization.",
  openGraph: {
    title: "Quarterly Rocks | Taskspace",
    description: "Track quarterly rocks with milestone progress, status updates, and team alignment. Stay focused on what matters most for your EOS organization.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
