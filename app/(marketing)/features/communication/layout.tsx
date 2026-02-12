import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Communication | Taskspace",
  description: "Streamline team communication with workspace notes, notifications, and real-time updates. Keep your EOS team connected and aligned.",
  openGraph: {
    title: "Communication | Taskspace",
    description: "Streamline team communication with workspace notes, notifications, and real-time updates. Keep your EOS team connected and aligned.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
