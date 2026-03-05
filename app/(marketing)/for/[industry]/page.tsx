import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CheckCircle, ArrowRight } from "lucide-react"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.trytaskspace.com"

interface IndustryData {
  name: string
  slug: string
  headline: string
  subheadline: string
  description: string
  challenges: string[]
  useCases: { title: string; description: string }[]
  keyFeatures: string[]
  testimonialContext: string
  metaTitle: string
  metaDescription: string
}

const industries: Record<string, IndustryData> = {
  "saas": {
    name: "SaaS Companies",
    slug: "saas",
    headline: "EOS for SaaS Companies",
    subheadline: "Run your product, growth, and operations teams with the structure that scales.",
    description:
      "SaaS companies run on velocity. But velocity without alignment creates chaos — missed quarters, confused teams, and founders buried in Slack. Taskspace brings EOS discipline to your SaaS operation without slowing you down.",
    challenges: [
      "Cross-functional teams pulling in different directions",
      "Quarterly goals that drift without weekly accountability",
      "Engineering and GTM teams operating with different cadences",
      "Daily standup fatigue with no visibility into actual progress",
      "Founders unable to step back because accountability systems don't exist",
    ],
    useCases: [
      {
        title: "Quarterly Rocks for product sprints",
        description: "Align your product, engineering, and GTM teams to 3–5 quarterly priorities that actually move the needle. Everyone sees the same rocks, progress, and blockers.",
      },
      {
        title: "EOD reports that replace standups",
        description: "Async EOD reports give leadership a daily pulse on output across teams — without a single extra meeting. AI summarizes the report for you.",
      },
      {
        title: "L10 meetings that actually solve issues",
        description: "Stop talking past each other in your weekly leadership sync. The L10 format with built-in IDS gives your team a consistent way to surface and permanently solve business issues.",
      },
      {
        title: "Scorecard visibility into team health",
        description: "Track the 5–10 weekly numbers that tell you how your SaaS is actually performing — not just revenue, but team health indicators like EOD completion, rock progress, and issue backlog.",
      },
    ],
    keyFeatures: [
      "Multi-workspace for product, growth, and ops teams in separate spaces",
      "Slack integration for EOD reminders and task assignments",
      "AI command center for meeting prep and team summaries",
      "Accountability charts that clarify who owns what across the org",
      "Asana integration for engineering task sync",
    ],
    testimonialContext: "SaaS leadership teams from seed-stage startups to Series B companies",
    metaTitle: "EOS for SaaS Companies | Taskspace",
    metaDescription: "Run your SaaS company on EOS. Taskspace gives SaaS teams quarterly rocks, EOD reports, L10 meetings, and AI-powered accountability — built for fast-moving product organizations.",
  },
  "real-estate": {
    name: "Real Estate Teams",
    slug: "real-estate",
    headline: "EOS for Real Estate Teams",
    subheadline: "Bring structure to your brokerage, property management firm, or investment operation.",
    description:
      "Real estate is a relationship business, but it runs on systems. Whether you lead a brokerage, manage a portfolio, or operate a development firm, Taskspace helps your team stay accountable without adding administrative overhead.",
    challenges: [
      "Agents operating independently with no shared accountability system",
      "Transaction coordinators, marketing, and admin in separate silos",
      "Quarterly goals that get buried under day-to-day deal activity",
      "Leadership with no daily visibility into team activity",
      "Managing multiple offices or markets from one seat",
    ],
    useCases: [
      {
        title: "Agent accountability without micromanagement",
        description: "EOD reports give team leads daily visibility into each agent's activity — calls made, deals advanced, client meetings completed — without requiring constant check-ins.",
      },
      {
        title: "Quarterly production goals as Rocks",
        description: "Set quarterly rocks for GCI targets, listings, and expansion priorities. Every team member knows their priority for the quarter, and progress is visible to everyone.",
      },
      {
        title: "L10 meetings that actually surface deal issues",
        description: "Run a consistent weekly leadership meeting that surfaces stalled deals, team issues, and market opportunities — and solves them permanently with IDS.",
      },
      {
        title: "Multi-office management in one view",
        description: "Use Taskspace workspaces to manage multiple offices or markets independently while keeping a unified view of your entire operation.",
      },
    ],
    keyFeatures: [
      "EOD reports for daily agent accountability without micromanagement",
      "Quarterly rocks tied to GCI and production targets",
      "Multi-workspace for managing multiple offices or markets",
      "Accountability charts for brokerage leadership structure",
      "Scorecard tracking for weekly production metrics",
    ],
    testimonialContext: "Real estate teams from boutique brokerages to multi-market operations",
    metaTitle: "EOS for Real Estate Teams | Taskspace",
    metaDescription: "Taskspace brings EOS structure to real estate brokerages and property management firms. EOD reports, rocks, L10 meetings, and accountability charts — built for real estate teams.",
  },
  "professional-services": {
    name: "Professional Services Firms",
    slug: "professional-services",
    headline: "EOS for Professional Services Firms",
    subheadline: "Deliver great client work and build a better business at the same time.",
    description:
      "Consulting firms, law firms, accounting practices, and agencies face a fundamental tension: great client delivery can consume every resource, leaving no bandwidth to work on the business. Taskspace brings EOS discipline to professional services without adding administrative overhead.",
    challenges: [
      "Partners and senior staff fully consumed by client work",
      "Business development goals that stall when client work heats up",
      "No visibility into team utilization and capacity",
      "Quarterly strategic goals that get deferred quarter after quarter",
      "Managing multiple client engagements with no shared accountability layer",
    ],
    useCases: [
      {
        title: "EOD reports for billable and non-billable visibility",
        description: "Know what your team accomplished each day — not just for billing, but for internal business goals. EOD reports give you client delivery accountability and business development visibility in one place.",
      },
      {
        title: "Rocks for the business you are building, not just the clients you serve",
        description: "Set quarterly rocks for the strategic priorities that will grow your firm — new service lines, operational improvements, talent development — and hold leadership accountable to them weekly.",
      },
      {
        title: "L10 meetings that separate issues from noise",
        description: "Stop letting client escalations hijack your leadership meetings. The L10 format gives your partners a consistent weekly cadence that surfaces the real business issues and solves them.",
      },
      {
        title: "Accountability charts for multi-partner firms",
        description: "Clarify who owns client delivery, business development, operations, and people across your partnership structure — without a political reorganization.",
      },
    ],
    keyFeatures: [
      "EOD reports for client and business work visibility",
      "Rocks aligned to firm growth priorities, not just client work",
      "Accountability charts for partnership structures",
      "L10 meeting facilitation with issue resolution",
      "Scorecard for tracking utilization, BD pipeline, and team health",
    ],
    testimonialContext: "Professional services firms from boutique consultancies to mid-size agencies",
    metaTitle: "EOS for Professional Services Firms | Taskspace",
    metaDescription: "Taskspace helps consulting firms, agencies, and law firms run EOS. EOD reports, rocks, L10 meetings, and accountability systems that work alongside great client delivery.",
  },
  "marketing-agencies": {
    name: "Marketing Agencies",
    slug: "marketing-agencies",
    headline: "EOS for Marketing Agencies",
    subheadline: "Build an agency that runs on systems, not on founders.",
    description:
      "Marketing agencies are often great at growing their clients and terrible at growing themselves. Taskspace brings EOS structure to agency operations — so your team stays accountable, clients get consistent delivery, and founders can actually step back.",
    challenges: [
      "Founders doing the work instead of building the business",
      "Client delivery accountability that depends on individual heroics",
      "Quarterly agency growth goals that never become team priorities",
      "Creative and account teams operating with no shared accountability",
      "Leadership visibility that only happens in weekly all-hands calls",
    ],
    useCases: [
      {
        title: "EOD reports for creative and account teams",
        description: "Know what your team shipped each day across every client account. EOD reports give agency leaders visibility into output, blockers, and priorities without requiring constant oversight.",
      },
      {
        title: "Agency growth rocks separate from client work",
        description: "Set quarterly rocks for the agency priorities that matter — new service development, hiring, process improvement, and business development — and track them weekly alongside client delivery.",
      },
      {
        title: "L10 leadership meetings that drive agency growth",
        description: "Stop letting client issues dominate your leadership meetings. The L10 format separates client delivery issues from agency strategic issues and gives each the attention they deserve.",
      },
      {
        title: "Workspace isolation for client teams",
        description: "Use Taskspace workspaces to manage separate teams for different service lines — SEO, paid media, creative, strategy — with unified visibility for leadership.",
      },
    ],
    keyFeatures: [
      "EOD accountability across creative, account, and strategy teams",
      "Rocks for agency growth alongside client delivery goals",
      "Multi-workspace for service line or team separation",
      "Accountability charts for agency leadership structure",
      "L10 meetings designed for agency weekly cadence",
    ],
    testimonialContext: "Marketing agencies from boutique shops to full-service agencies with 50+ team members",
    metaTitle: "EOS for Marketing Agencies | Taskspace",
    metaDescription: "Taskspace brings EOS to marketing agencies. EOD reports, rocks, L10 meetings, and accountability systems that scale with your agency without adding overhead.",
  },
  "construction": {
    name: "Construction Companies",
    slug: "construction",
    headline: "EOS for Construction Companies",
    subheadline: "Build a business that runs as well as your projects.",
    description:
      "Construction companies are operationally complex — multiple projects, subcontractors, regulatory requirements, and tight margins. Taskspace brings EOS structure to construction operations so leadership can get off the job site and into the business.",
    challenges: [
      "Project managers and field teams in silos with no shared accountability",
      "Business development that falls apart when project work heats up",
      "Leadership pulled onto job sites instead of working on the business",
      "Quarterly goals that disappear under day-to-day project demands",
      "Managing multiple projects across multiple teams simultaneously",
    ],
    useCases: [
      {
        title: "EOD reports for project and field team visibility",
        description: "Daily EOD reports from project managers and field supervisors give ownership the daily pulse they need without requiring constant site visits or phone calls.",
      },
      {
        title: "Rocks for business development and operational improvement",
        description: "Set quarterly rocks for the business priorities that don't fit into a project schedule — new market entry, operational systems, key hire, equipment investment — and hold leadership accountable.",
      },
      {
        title: "L10 meetings that surface and solve field issues",
        description: "Weekly leadership L10 meetings with a structured IDS process let your leadership team identify and permanently solve the recurring issues that slow every project down.",
      },
      {
        title: "Accountability charts for ownership and management clarity",
        description: "Clarify who owns project delivery, estimating, business development, finance, and operations across your construction business structure.",
      },
    ],
    keyFeatures: [
      "EOD reports for project and field team daily accountability",
      "Rocks tied to business development and operational improvement",
      "Multi-workspace for managing multiple divisions or regions",
      "Accountability charts for ownership-to-management clarity",
      "Scorecard for tracking safety, quality, and margin metrics",
    ],
    testimonialContext: "Construction companies from specialty contractors to general contractors",
    metaTitle: "EOS for Construction Companies | Taskspace",
    metaDescription: "Taskspace helps construction companies run EOS. EOD reports, rocks, L10 meetings, and accountability systems for project teams and leadership.",
  },
  "e-commerce": {
    name: "E-commerce Businesses",
    slug: "e-commerce",
    headline: "EOS for E-commerce Businesses",
    subheadline: "Run your operations, marketing, and team with the structure to scale.",
    description:
      "E-commerce moves fast and the complexity compounds with every new channel, market, and SKU. Taskspace brings EOS structure to e-commerce operations — keeping your team aligned, accountable, and focused on the priorities that actually drive revenue.",
    challenges: [
      "Marketing, operations, and fulfillment teams working in silos",
      "Quarterly growth goals that get overwhelmed by day-to-day operations",
      "Founders managing every function without a clear leadership team",
      "No daily visibility into team output across marketing and operations",
      "Multiple brands or channels with no shared accountability layer",
    ],
    useCases: [
      {
        title: "EOD reports for marketing and ops teams",
        description: "Daily EOD reports give founders visibility into what their marketing and operations teams shipped — campaigns launched, issues resolved, suppliers contacted — without requiring constant check-ins.",
      },
      {
        title: "Rocks for revenue and operational milestones",
        description: "Set quarterly rocks for major growth initiatives — new channel launches, supplier negotiations, warehouse improvements — and track progress weekly alongside daily operations.",
      },
      {
        title: "L10 leadership meetings that align marketing and ops",
        description: "Weekly L10 meetings with built-in IDS keep your marketing and operations leadership aligned on priorities and help surface the root causes of recurring operational issues.",
      },
      {
        title: "Multi-workspace for managing multiple brands",
        description: "Use Taskspace workspaces to run separate EOS instances for multiple brands or channels while maintaining unified visibility for ownership.",
      },
    ],
    keyFeatures: [
      "EOD reports for marketing, ops, and fulfillment team accountability",
      "Rocks tied to revenue and operational growth milestones",
      "Multi-workspace for multi-brand or multi-channel operations",
      "Accountability charts clarifying marketing vs. ops ownership",
      "Scorecard for weekly revenue, margin, and operational KPIs",
    ],
    testimonialContext: "E-commerce operators from DTC brands to multi-brand portfolio companies",
    metaTitle: "EOS for E-commerce Businesses | Taskspace",
    metaDescription: "Taskspace helps e-commerce companies run EOS. EOD reports, rocks, L10 meetings, and accountability systems for marketing, operations, and leadership teams.",
  },
}

interface Props {
  params: Promise<{ industry: string }>
}

export function generateStaticParams() {
  return Object.keys(industries).map((slug) => ({ industry: slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { industry: slug } = await params
  const data = industries[slug]
  if (!data) return {}

  return {
    metadataBase: new URL(APP_URL),
    title: data.metaTitle,
    description: data.metaDescription,
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      type: "website",
      url: `${APP_URL}/for/${slug}`,
      siteName: "Taskspace",
    },
    twitter: {
      card: "summary_large_image",
      title: data.metaTitle,
      description: data.metaDescription,
    },
    alternates: {
      canonical: `${APP_URL}/for/${slug}`,
    },
  }
}

export default async function IndustryPage({ params }: Props) {
  const { industry: slug } = await params
  const data = industries[slug]
  if (!data) notFound()

  const baseUrl = "https://trytaskspace.com"

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": data.headline,
    "description": data.description,
    "url": `${baseUrl}/for/${slug}`,
    "about": {
      "@type": "SoftwareApplication",
      "name": "Taskspace",
      "applicationCategory": "BusinessApplication",
      "url": baseUrl,
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
        { "@type": "ListItem", "position": 2, "name": data.name, "item": `${baseUrl}/for/${slug}` },
      ],
    },
  }

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <div className="mx-auto max-w-7xl px-6 pt-24 pb-16 sm:pt-32 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 text-sm mb-6">
            Built for {data.name}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl mb-6">
            {data.headline}
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed mb-4">{data.subheadline}</p>
          <p className="text-base text-gray-500 leading-relaxed mb-8 max-w-2xl">{data.description}</p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/app?page=register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-900 transition-colors"
            >
              Start Free — No Credit Card <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-8 py-3.5 text-sm font-semibold text-black hover:bg-gray-100 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>

      {/* Common challenges */}
      <div className="bg-gray-50 py-20 border-y border-gray-200">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-black mb-2">The challenges {data.name.toLowerCase()} face</h2>
            <p className="text-gray-500 mb-10">Sound familiar? EOS solves all of these.</p>
            <div className="space-y-4">
              {data.challenges.map((challenge) => (
                <div key={challenge} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200">
                  <div className="h-2 w-2 mt-2 rounded-full bg-gray-400 shrink-0" />
                  <p className="text-gray-700">{challenge}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Use cases */}
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-black mb-2">How {data.name.toLowerCase()} use Taskspace</h2>
          <p className="text-gray-500 mb-10">Real workflows for {data.testimonialContext}.</p>
          <div className="space-y-8">
            {data.useCases.map((useCase) => (
              <div key={useCase.title} className="border-l-4 border-black pl-6">
                <h3 className="text-lg font-semibold text-black mb-2">{useCase.title}</h3>
                <p className="text-gray-600 leading-relaxed">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key features */}
      <div className="bg-gray-50 py-20 border-y border-gray-200">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-black mb-2">Features built for your operation</h2>
            <p className="text-gray-500 mb-10">Everything you need to run EOS effectively as a {data.name.toLowerCase().replace(/s$/, "")}.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {data.keyFeatures.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 mt-0.5 shrink-0 text-black" />
                  <p className="text-gray-700 text-sm">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-black sm:text-4xl mb-4">
            Ready to run your {data.name.toLowerCase().replace(/s$/, "")} on EOS?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Taskspace is free for up to 3 team members. No credit card required.
            Get your team running EOS in under an hour.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/app?page=register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-900 transition-colors"
            >
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-8 py-3.5 text-sm font-semibold text-black hover:bg-gray-100 transition-colors"
            >
              View Pricing
            </Link>
          </div>
          <p className="text-gray-500 mt-6 text-sm">
            Free forever plan — 14-day trial on paid plans — Cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
}
