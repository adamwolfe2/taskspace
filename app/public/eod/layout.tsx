import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Team EOD Report | AIMS",
  description: "Live end-of-day team reporting dashboard. Track progress, view completed tasks, and stay aligned with your team's daily activities.",
  icons: {
    icon: "/icon-light-32x32.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Team EOD Report | AIMS",
    description: "Live end-of-day team reporting dashboard. Track progress, view completed tasks, and stay aligned with your team's daily activities.",
    type: "website",
    images: [
      {
        url: "/2026-02-03_17.24.49.png", // Marketing site image
        width: 1200,
        height: 630,
        alt: "AIMS EOD Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Team EOD Report | AIMS",
    description: "Live end-of-day team reporting dashboard. Track progress, view completed tasks, and stay aligned with your team's daily activities.",
    images: ["/2026-02-03_17.24.49.png"],
  },
}

export default function PublicEODLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
