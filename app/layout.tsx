import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Taskspace - EOS Management Platform",
    template: "%s | Taskspace",
  },
  description: "The all-in-one platform for implementing the Entrepreneurial Operating System. Manage teams, track rocks, run Level 10 meetings, and drive accountability.",
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
    title: "Taskspace - EOS Management Platform",
    description: "The all-in-one platform for implementing the Entrepreneurial Operating System. Run on EOS with confidence.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Taskspace - EOS Management Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Taskspace - EOS Management Platform",
    description: "The all-in-one platform for implementing the Entrepreneurial Operating System.",
    images: ["/og-image.png"],
    creator: "@taskspace",
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
