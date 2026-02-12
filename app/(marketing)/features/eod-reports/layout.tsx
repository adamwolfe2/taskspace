import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "EOD Reports | Taskspace",
  description: "AI-powered end-of-day reports that parse daily updates, flag escalations, and keep managers informed. Automate accountability across your team.",
  openGraph: {
    title: "EOD Reports | Taskspace",
    description: "AI-powered end-of-day reports that parse daily updates, flag escalations, and keep managers informed. Automate accountability across your team.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
