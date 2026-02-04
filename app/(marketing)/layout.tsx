import type { Metadata } from "next"
import { MegaMenu } from "@/components/marketing/mega-menu"
import { MarketingFooter } from "@/components/marketing/footer"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.trytaskspace.com"

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Taskspace - Run All Your Teams In True Parallel",
  description: "AI operations infrastructure for multi-company founders & builders. Taskspace lets you manage EOS reports, organize metrics, and keep every team running on EOS.",
  icons: {
    icon: "/icon-light-32x32.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Taskspace - Run All Your Teams In True Parallel",
    description: "AI operations infrastructure for multi-company founders & builders. Taskspace lets you manage EOS reports, organize metrics, and keep every team running on EOS.",
    type: "website",
    url: APP_URL,
    siteName: "Taskspace",
    images: [
      {
        url: `${APP_URL}/2026-02-03_17.24.49.png`,
        width: 1200,
        height: 630,
        alt: "Taskspace - Run All Your Teams In True Parallel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Taskspace - Run All Your Teams In True Parallel",
    description: "AI operations infrastructure for multi-company founders & builders. Taskspace lets you manage EOS reports, organize metrics, and keep every team running on EOS.",
    images: [`${APP_URL}/2026-02-03_17.24.49.png`],
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
