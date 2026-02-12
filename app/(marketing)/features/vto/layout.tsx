import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Vision/Traction Organizer | Taskspace",
  description: "Define your company vision, core values, and strategic plan with the V/TO. Auto-save keeps your EOS foundation always current.",
  openGraph: {
    title: "Vision/Traction Organizer | Taskspace",
    description: "Define your company vision, core values, and strategic plan with the V/TO. Auto-save keeps your EOS foundation always current.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
