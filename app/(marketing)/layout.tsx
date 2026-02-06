import type { Metadata } from "next"
import { MegaMenu } from "@/components/marketing/mega-menu"
import { MarketingFooter } from "@/components/marketing/footer"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://trytaskspace.com"

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Taskspace - EOS Management Platform | Run All Your Teams In True Parallel",
    template: "%s | Taskspace",
  },
  description: "The all-in-one EOS management platform for multi-company founders and leadership teams. AI-powered EOD reports, quarterly rocks, scorecards, Level 10 meetings, and accountability charts.",
  keywords: ["EOS", "Entrepreneurial Operating System", "EOS tools", "Level 10 meetings", "quarterly rocks", "scorecard", "EOD reports", "team management", "accountability chart", "IDS process", "traction", "business management", "AI productivity", "multi-company founders"],
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Taskspace - EOS Management Platform | Run All Your Teams In True Parallel",
    description: "The all-in-one EOS platform with AI-powered EOD reports, rocks tracking, scorecards, L10 meetings, and more. Free forever plan, no credit card required.",
    type: "website",
    url: APP_URL,
    siteName: "Taskspace",
    images: [
      {
        url: `${APP_URL}/2026-02-03_17.24.49.png`,
        width: 1200,
        height: 630,
        alt: "Taskspace - The All-in-One EOS Management Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Taskspace - EOS Management Platform",
    description: "AI-powered EOS management for multi-company founders. EOD reports, rocks, scorecards, L10 meetings, and more. Start free today.",
    images: [`${APP_URL}/2026-02-03_17.24.49.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: APP_URL,
  },
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <MegaMenu />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}
