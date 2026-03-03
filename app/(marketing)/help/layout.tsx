import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Help Center | Taskspace",
  description: "Find answers, guides, and resources to get the most out of Taskspace. Learn how to set up rocks, run L10 meetings, submit EOD reports, and more.",
  openGraph: {
    title: "Help Center | Taskspace",
    description: "Find answers, guides, and resources to get the most out of Taskspace. Learn how to set up rocks, run L10 meetings, submit EOD reports, and more.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
