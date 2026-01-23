import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "AIMS - Team Accountability & Management",
    template: "%s | AIMS",
  },
  description: "Transform how your team tracks progress and achieves goals with AI-powered end-of-day reports, quarterly rocks tracking, and intelligent team analytics.",
  keywords: [
    "team accountability",
    "end of day reports",
    "EOD reports",
    "team management",
    "goal tracking",
    "quarterly rocks",
    "EOS",
    "OKRs",
    "team analytics",
    "AI productivity",
    "remote team management",
  ],
  authors: [{ name: "AIMS Team" }],
  creator: "AIMS",
  publisher: "AIMS",
  metadataBase: new URL("https://aims.io"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aims.io",
    siteName: "AIMS",
    title: "AIMS - Team Accountability & Management",
    description: "Transform how your team tracks progress and achieves goals with AI-powered accountability tools.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AIMS - Team Accountability",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AIMS - Team Accountability & Management",
    description: "Transform how your team tracks progress and achieves goals with AI-powered accountability tools.",
    images: ["/og-image.png"],
    creator: "@aimsapp",
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
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
