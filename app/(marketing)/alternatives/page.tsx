import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle, ArrowRight } from "lucide-react"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.trytaskspace.com"

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "EOS Software Alternatives | Why Teams Choose Taskspace",
  description:
    "Comparing EOS tools? See how Taskspace stacks up against Ninety.io, Traction Tools, EOS One, ClickUp, Notion, and Monday.com. AI-powered EOS software with a free plan.",
  openGraph: {
    title: "EOS Software Alternatives | Why Teams Choose Taskspace",
    description:
      "Compare Taskspace vs the top EOS software tools. AI-powered features, better pricing, and ADHD-friendly design.",
    type: "website",
    url: `${APP_URL}/alternatives`,
    siteName: "Taskspace",
  },
  twitter: {
    card: "summary_large_image",
    title: "EOS Software Alternatives | Taskspace",
    description:
      "Compare Taskspace vs Ninety.io, Traction Tools, EOS One, ClickUp, Notion, and Monday.com.",
  },
  alternates: {
    canonical: `${APP_URL}/alternatives`,
  },
}

const competitors = [
  {
    slug: "ninety-io",
    name: "Ninety.io",
    tagline: "EOS-specific but expensive and lacks AI",
    description:
      "Ninety.io was built for EOS teams but charges per-user minimums that add up fast. No AI assistance, no multi-workspace support.",
    pricing: "$14+/user/mo",
  },
  {
    slug: "traction-tools",
    name: "Traction Tools",
    tagline: "Legacy EOS platform with a clunky interface",
    description:
      "Traction Tools has been around for years but the UI hasn't kept pace. No AI assistant, limited customization, and a learning curve that slows teams down.",
    pricing: "$99–$199/mo flat",
  },
  {
    slug: "eos-one",
    name: "EOS One",
    tagline: "Official EOS app — very limited in practice",
    description:
      "The officially licensed EOS app is tightly constrained by the EOS methodology. No customization, no AI, and priced at a premium for what you get.",
    pricing: "$599+/yr",
  },
  {
    slug: "clickup-eos",
    name: "ClickUp (for EOS)",
    tagline: "Generic PM tool that requires heavy customization",
    description:
      "ClickUp can technically run EOS workflows, but only after significant setup. No native EOS structure, no AI accountability, and pricing escalates quickly.",
    pricing: "$12+/user/mo",
  },
  {
    slug: "notion-eos",
    name: "Notion (for EOS)",
    tagline: "Flexible but fully manual — no native EOS support",
    description:
      "Teams try to run EOS in Notion using templates, but there is no native structure, no AI accountability layer, and everything requires manual maintenance.",
    pricing: "$10+/user/mo",
  },
  {
    slug: "monday-eos",
    name: "Monday.com (for EOS)",
    tagline: "Enterprise PM tool with no EOS workflow support",
    description:
      "Monday.com is a capable project management platform, but it was not built for EOS. Complex setup, high cost, and no native EOS concepts.",
    pricing: "$12+/user/mo",
  },
]

const taskspaceFeatures = [
  "AI-powered EOD reports — team accountability on autopilot",
  "Quarterly Rocks tracking built in from day one",
  "L10 Meeting facilitation with native IDS board",
  "Weekly Scorecard with 13-week trend visibility",
  "Accountability Charts — org structure without the spreadsheet",
  "Multi-workspace support for multi-company founders",
  "Slack and Asana integrations out of the box",
  "ADHD-friendly design — structured without being rigid",
]

export default function AlternativesPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <div className="mx-auto max-w-7xl px-6 pt-24 pb-16 sm:pt-32 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 text-sm mb-6">
            EOS software comparisons
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl">
            Looking for a better EOS tool?
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
            Taskspace is the AI-powered EOS operating system built for modern teams.
            See how it compares to the tools you are evaluating right now.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/app?page=register"
              className="rounded-lg bg-black px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-900 transition-colors"
            >
              Start Free — No Credit Card
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border border-gray-300 bg-white px-8 py-3.5 text-sm font-semibold text-black hover:bg-gray-100 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>

      {/* Taskspace quick wins */}
      <div className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-black sm:text-3xl">
              What you get with Taskspace
            </h2>
            <p className="mt-4 text-base text-gray-600">
              Free forever for small teams. No setup required. Everything EOS teams actually need.
            </p>
          </div>
          <ul className="mx-auto max-w-2xl grid grid-cols-1 gap-4 sm:grid-cols-2">
            {taskspaceFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-black" />
                <span className="text-sm text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Competitor cards */}
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
            Compare Taskspace vs alternatives
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Detailed feature-by-feature breakdowns for every major EOS competitor.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {competitors.map((competitor) => (
            <Link
              key={competitor.slug}
              href={`/alternatives/${competitor.slug}`}
              className="group rounded-2xl border border-gray-200 bg-white p-8 hover:border-gray-400 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                    Taskspace vs
                  </p>
                  <h3 className="text-xl font-bold text-black">{competitor.name}</h3>
                </div>
                <ArrowRight className="mt-1 h-5 w-5 text-gray-300 group-hover:text-black transition-colors" />
              </div>
              <p className="mt-2 text-sm font-medium text-gray-500">{competitor.tagline}</p>
              <p className="mt-4 text-sm text-gray-600 leading-relaxed">{competitor.description}</p>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Their pricing: <span className="font-semibold text-gray-700">{competitor.pricing}</span>
                </span>
                <span className="text-xs font-semibold text-black">See comparison</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
            Start free. Switch in minutes.
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Taskspace is free forever for teams up to 3. Paid plans start at $9/user/month —
            a fraction of what most EOS tools charge.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/app?page=register"
              className="rounded-lg bg-black px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-900 transition-colors"
            >
              Get Started Free
            </Link>
            <a
              href="mailto:support@trytaskspace.com"
              className="rounded-lg border border-gray-300 bg-white px-8 py-3.5 text-sm font-semibold text-black hover:bg-gray-100 transition-colors"
            >
              Talk to Sales
            </a>
          </div>
          <p className="text-gray-500 mt-6 text-sm">
            Free forever plan — 14-day free trial on paid plans — Cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
}
