import type { Metadata } from "next"

const siteConfig = {
  name: "Taskspace",
  description: "Transform how your team tracks progress and achieves goals with AI-powered accountability tools.",
  url: "https://trytaskspace.com",
  ogImage: "https://trytaskspace.com/og-image.png",
  twitterHandle: "@taskspace",
}

export function createMetadata({
  title,
  description,
  path = "",
  image,
  noIndex = false,
}: {
  title: string
  description: string
  path?: string
  image?: string
  noIndex?: boolean
}): Metadata {
  const fullTitle = title === "Home" ? siteConfig.name : `${title} | ${siteConfig.name}`
  const fullUrl = `${siteConfig.url}${path}`
  const ogImage = image || siteConfig.ogImage

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: fullUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: fullUrl,
      siteName: siteConfig.name,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
      creator: siteConfig.twitterHandle,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    icons: {
      icon: [
        { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
        { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
        { url: "/icon.svg", type: "image/svg+xml" },
      ],
      apple: "/apple-icon.png",
    },
  }
}

export const defaultMetadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
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
  authors: [{ name: "Taskspace Team" }],
  creator: "Taskspace",
  publisher: "Taskspace",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: siteConfig.twitterHandle,
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
  verification: {
    google: "your-google-verification-code",
  },
}

// Page-specific metadata configurations
export const pageMetadata = {
  home: createMetadata({
    title: "Home",
    description: "Taskspace - Transform how your team tracks progress and achieves goals with AI-powered end-of-day reports and intelligent accountability tools.",
    path: "",
  }),
  features: createMetadata({
    title: "Features",
    description: "Explore Taskspace features: AI-powered EOD reports, team management, rocks & goals tracking, analytics dashboards, and more.",
    path: "/features",
  }),
  pricing: createMetadata({
    title: "Pricing",
    description: "Simple, transparent pricing for teams of all sizes. Start free and upgrade as you grow. 14-day free trial on all plans.",
    path: "/pricing",
  }),
  about: createMetadata({
    title: "About Us",
    description: "Learn about the Taskspace mission, team, and values. We're building the future of team accountability.",
    path: "/about",
  }),
  contact: createMetadata({
    title: "Contact Us",
    description: "Get in touch with the Taskspace team. We're here to help with questions, demos, and enterprise inquiries.",
    path: "/contact",
  }),
  help: createMetadata({
    title: "Help Center",
    description: "Find answers to common questions and learn how to use Taskspace effectively. Browse our knowledge base or contact support.",
    path: "/help",
  }),
  eodReports: createMetadata({
    title: "EOD Reports",
    description: "AI-powered end-of-day reports that transform how your team communicates progress, blockers, and priorities.",
    path: "/features/eod-reports",
  }),
  teamManagement: createMetadata({
    title: "Team Management",
    description: "Build and manage your organization with powerful team structures, roles, and permissions that scale with your company.",
    path: "/features/team-management",
  }),
  analytics: createMetadata({
    title: "Analytics & Insights",
    description: "Gain deep visibility into team performance with powerful analytics dashboards, trend analysis, and actionable insights.",
    path: "/features/analytics",
  }),
}
