import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact | Taskspace",
  description: "Get in touch with the Taskspace team for sales, support, or to schedule a demo. We're here to help.",
  openGraph: {
    title: "Contact | Taskspace",
    description: "Get in touch with the Taskspace team for sales, support, or to schedule a demo. We're here to help.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
