import type React from "react"
import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { PostHogProvider } from "@/components/providers/posthog-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Taskspace - EOS Management Platform | Run All Your Teams In True Parallel",
    template: "%s | Taskspace",
  },
  description: "The all-in-one AI-powered EOS management platform for multi-company founders and leadership teams. EOD reports, quarterly rocks, scorecards, Level 10 meetings, and accountability charts.",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TaskSpace',
  },
  formatDetection: {
    telephone: false,
  },
  keywords: [
    "EOS",
    "Entrepreneurial Operating System",
    "Level 10 meetings",
    "quarterly rocks",
    "scorecard",
    "IDS process",
    "accountability chart",
    "team management",
    "EOD reports",
    "team accountability",
    "EOS software",
    "traction tools",
    "AI productivity",
    "multi-company management",
  ],
  authors: [{ name: "Taskspace Team" }],
  creator: "Taskspace",
  publisher: "Taskspace",
  metadataBase: new URL("https://trytaskspace.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://trytaskspace.com",
    siteName: "Taskspace",
    title: "Taskspace - EOS Management Platform | Run All Your Teams In True Parallel",
    description: "AI-powered EOS management for multi-company founders. EOD reports, rocks, scorecards, L10 meetings, and more. Start free today.",
    images: [
      {
        url: "https://www.trytaskspace.com/2026-02-03_17.24.49.png",
        width: 1200,
        height: 630,
        alt: "Taskspace - Run All Your Teams In True Parallel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Taskspace - EOS Management Platform",
    description: "AI-powered EOS management for multi-company founders. Run all your teams in true parallel.",
    creator: "@taskspace",
    images: ["https://www.trytaskspace.com/2026-02-03_17.24.49.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased" style={{ WebkitTextSizeAdjust: '100%' }}>
        <PostHogProvider>
          {children}
        </PostHogProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
