import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Accountability Chart | Taskspace",
  description: "Build interactive org charts with role clarity and reporting structure. Visualize your EOS accountability chart in real time.",
  openGraph: {
    title: "Accountability Chart | Taskspace",
    description: "Build interactive org charts with role clarity and reporting structure. Visualize your EOS accountability chart in real time.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
