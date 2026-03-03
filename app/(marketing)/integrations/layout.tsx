import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Integrations | Taskspace",
  description: "Connect Taskspace with the tools your team already uses. Asana, Slack, Google Calendar, and 80+ integrations to keep everything in sync.",
  openGraph: {
    title: "Integrations | Taskspace",
    description: "Connect Taskspace with the tools your team already uses. Asana, Slack, Google Calendar, and 80+ integrations to keep everything in sync.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
