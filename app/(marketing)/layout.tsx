import type { Metadata } from "next"
import { MegaMenu } from "@/components/marketing/mega-menu"
import { MarketingFooter } from "@/components/marketing/footer"
import { CookieConsent } from "@/components/marketing/cookie-consent"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://trytaskspace.com"

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Taskspace — Built for ADHD Founders & Multi-Company Operators",
    template: "%s | Taskspace",
  },
  description: "Structure without rigidity. Taskspace is the AI-powered operating system for ADHD founders and multi-company builders. Brain-dump EOD reports, quarterly rocks, and team accountability — use only what you need.",
  keywords: ["ADHD founders", "ADHD entrepreneur", "ADHD productivity tools", "ADHD business", "EOS", "Entrepreneurial Operating System", "EOS tools", "Level 10 meetings", "quarterly rocks", "scorecard", "EOD reports", "team management", "accountability chart", "multi-company founders", "AI productivity"],
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Taskspace — Built for ADHD Founders & Multi-Company Operators",
    description: "Structure without rigidity. AI-powered EOD reports, quarterly rocks, and team accountability. Use only what you need. Free forever plan.",
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
    title: "Taskspace — Built for ADHD Founders",
    description: "Structure without rigidity. EOD brain dumps, quarterly rocks, and team accountability for founders who run multiple companies at once. Start free.",
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

// JSON-LD structured data for SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Taskspace",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: APP_URL,
  description:
    "Structure without rigidity. Taskspace is the AI-powered operating system for ADHD founders and multi-company builders — EOD reports, quarterly rocks, team accountability, and more. Use only what you need.",
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      description: "3 team members, 50 AI credits/month",
    },
    {
      "@type": "Offer",
      name: "Team",
      price: "9",
      priceCurrency: "USD",
      priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitText: "user" } },
      description: "25 team members, integrations, 200 AI credits/user/month",
    },
    {
      "@type": "Offer",
      name: "Business",
      price: "19",
      priceCurrency: "USD",
      priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitText: "user" } },
      description: "Unlimited members, unlimited AI, SSO, custom branding, API access",
    },
  ],
  featureList: [
    "AI-powered EOD Reports",
    "Quarterly Rocks Tracking",
    "Weekly Scorecard",
    "Level 10 Meetings",
    "Accountability Charts",
    "IDS Issue Tracking",
    "Team Analytics",
    "Slack & Asana Integration",
  ],
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MegaMenu />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
      <CookieConsent />
    </div>
  )
}
