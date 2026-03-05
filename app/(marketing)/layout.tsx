import type { Metadata } from "next"
import { MegaMenu } from "@/components/marketing/mega-menu"
import { MarketingFooter } from "@/components/marketing/footer"
import { CookieConsent } from "@/components/marketing/cookie-consent"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.trytaskspace.com"

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

// FAQ JSON-LD for rich snippet eligibility
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Taskspace?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Taskspace is an AI-powered EOS (Entrepreneurial Operating System) management platform for ADHD founders, multi-company operators, and leadership teams. It includes EOD reports, quarterly rocks, weekly scorecards, Level 10 meetings, IDS issue boards, and accountability charts — all in one place.",
      },
    },
    {
      "@type": "Question",
      "name": "What is EOS (Entrepreneurial Operating System)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "EOS, or the Entrepreneurial Operating System, is a complete business management framework created by Gino Wickman and described in the book 'Traction.' It helps leadership teams clarify, simplify, and achieve their vision using six key components: Vision, People, Data, Issues, Process, and Traction. Taskspace implements the EOS framework digitally.",
      },
    },
    {
      "@type": "Question",
      "name": "How much does Taskspace cost?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Taskspace has a free plan for up to 3 team members with 50 AI credits per month. The Team plan is $9/user/month and supports up to 25 members with integrations and 200 AI credits/user/month. The Business plan is $19/user/month and includes unlimited members, unlimited AI, SSO, custom branding, and API access.",
      },
    },
    {
      "@type": "Question",
      "name": "What is an EOD report?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "An EOD (End-of-Day) report is a daily accountability check-in where team members log what they completed, any blockers they encountered, and their priorities for tomorrow. In Taskspace, EOD reports are submitted via a simple form or Slack prompt, and AI automatically summarizes the team's daily output for leadership.",
      },
    },
    {
      "@type": "Question",
      "name": "What are Rocks in EOS?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "In EOS, Rocks are your 90-day priorities — the 3–7 most important things that must get done this quarter to move the business forward. The term comes from Stephen Covey's 'big rocks' analogy. Taskspace tracks rocks for every team member, shows progress, and connects rocks to weekly scorecard and L10 meeting reviews.",
      },
    },
    {
      "@type": "Question",
      "name": "What is a Level 10 Meeting (L10)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A Level 10 Meeting is a structured 90-minute weekly team meeting used in EOS. It follows a specific 8-part agenda: segue, scorecard review, rock review, customer and employee headlines, to-do review, IDS (Identify, Discuss, Solve), conclude, and rate the meeting out of 10. Taskspace facilitates L10 meetings with a built-in IDS issue board.",
      },
    },
    {
      "@type": "Question",
      "name": "Is Taskspace good for ADHD entrepreneurs?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Taskspace was specifically designed with ADHD founders in mind. The EOS framework provides consistent external structure (rocks, scorecards, L10 meetings) that supports ADHD brains without rigid processes. EOD reports are designed as brain-dump style check-ins, and the platform uses progressive disclosure to reduce cognitive load.",
      },
    },
    {
      "@type": "Question",
      "name": "Can I manage multiple companies in Taskspace?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Taskspace supports multiple workspaces, which allows multi-company founders to run separate EOS instances for each business from one account. Each workspace is fully isolated with its own team members, rocks, scorecards, and meeting history. Team plan and above support multi-workspace.",
      },
    },
  ],
}

// Organization JSON-LD for knowledge graph
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Taskspace",
  "url": APP_URL,
  "logo": `${APP_URL}/icon.png`,
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "support@trytaskspace.com",
    "contactType": "customer support",
  },
  "sameAs": [],
}

// Software JSON-LD for SEO
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <MegaMenu />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
      <CookieConsent />
    </div>
  )
}
