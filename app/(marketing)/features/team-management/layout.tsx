import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Team Management | Taskspace",
  description: "Manage teams, roles, and permissions across multiple workspaces. Invite members, assign roles, and control access to your EOS tools.",
  openGraph: {
    title: "Team Management | Taskspace",
    description: "Manage teams, roles, and permissions across multiple workspaces. Invite members, assign roles, and control access to your EOS tools.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
