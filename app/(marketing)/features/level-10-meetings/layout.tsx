import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "L10 Meetings | Taskspace",
  description: "Run structured Level 10 meetings with agendas, IDS tracking, and action items. The EOS meeting format, digitized and streamlined.",
  openGraph: {
    title: "L10 Meetings | Taskspace",
    description: "Run structured Level 10 meetings with agendas, IDS tracking, and action items. The EOS meeting format, digitized and streamlined.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
