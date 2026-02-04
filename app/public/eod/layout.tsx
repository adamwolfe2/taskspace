import type { Metadata } from "next"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.trytaskspace.com"

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Team EOD Report | Taskspace",
  description: "Live end-of-day team reporting dashboard. Track progress, view completed tasks, and stay aligned with your team's daily activities.",
  icons: {
    icon: "/icon-light-32x32.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Team EOD Report | Taskspace",
    description: "Live end-of-day team reporting dashboard. Track progress, view completed tasks, and stay aligned with your team's daily activities.",
    type: "website",
    url: APP_URL,
    siteName: "Taskspace",
    images: [
      {
        url: `${APP_URL}/2026-02-03_17.24.49.png`,
        width: 1200,
        height: 630,
        alt: "Taskspace - Team EOD Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Team EOD Report | Taskspace",
    description: "Live end-of-day team reporting dashboard. Track progress, view completed tasks, and stay aligned with your team's daily activities.",
    images: [`${APP_URL}/2026-02-03_17.24.49.png`],
  },
}

export default function PublicEODLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
