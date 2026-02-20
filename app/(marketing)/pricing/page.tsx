import type { Metadata } from "next"
import Link from "next/link"
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { PLANS, FEATURE_CATEGORIES, type PlanConfig } from "@/lib/billing/plans"
import { AI_CREDIT_PAYMENT_LINKS, STRIPE_PAYMENT_LINKS } from "@/lib/integrations/stripe-config"
import { PricingCards } from "@/components/marketing/pricing-cards"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.trytaskspace.com"

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Pricing | Taskspace - Simple, Transparent Pricing for EOS Teams",
  description:
    "Choose the perfect Taskspace plan for your EOS team. Free, Team, and Business tiers with AI-powered EOD reports, rocks tracking, scorecards, and L10 meetings. Free forever plan. 14-day free trial on paid plans.",
  openGraph: {
    title: "Pricing | Taskspace - Simple, Transparent Pricing",
    description:
      "Simple, transparent pricing for EOS teams. Free forever plan. Paid plans from $9/user/month.",
    type: "website",
    url: `${APP_URL}/pricing`,
    siteName: "Taskspace",
    images: [
      {
        url: `${APP_URL}/2026-02-03_17.24.49.png`,
        width: 1200,
        height: 630,
        alt: "Taskspace Pricing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing | Taskspace",
    description:
      "Simple, transparent pricing for EOS teams. Start free, scale as you grow.",
    images: [`${APP_URL}/2026-02-03_17.24.49.png`],
  },
}

const faqs = [
  {
    question: "Can I try Taskspace before paying?",
    answer:
      "Yes! Taskspace is free forever for teams of up to 3. Paid plans include a 14-day free trial — just add a card to start, and you won't be charged until day 15. Cancel anytime during your trial.",
  },
  {
    question: "What happens when I hit my AI credit limit?",
    answer:
      "You'll receive a notification when you're approaching your limit. You can either upgrade to a higher plan for more credits, purchase add-on credit packs, or wait until your credits reset at the start of your next billing cycle.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "Absolutely! You can upgrade or downgrade your plan at any time. Upgrades take effect immediately, and downgrades take effect at the end of your current billing period. We'll prorate any differences.",
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer:
      "Yes! Annual billing saves you 20% compared to monthly billing. For example, Team is $7.20/user/month when billed annually vs $9/user/month when billed monthly.",
  },
  {
    question: "What counts as a user?",
    answer:
      "A user is anyone with an active account in your organization. This includes managers, team members, and admins. Deactivated users don't count toward your limit.",
  },
  {
    question: "Can I use Taskspace for multiple companies?",
    answer:
      "Yes! The Business plan includes unlimited workspaces, perfect for multi-company founders. The Team plan includes up to 3 workspaces. Each workspace can represent a different company, department, or team.",
  },
]

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
}

export default function PricingPage() {
  const plans = [PLANS.free, PLANS.team, PLANS.business]

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-6 pt-24 pb-16 sm:pt-32 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 text-sm mb-6">
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-black sm:text-6xl">
            One platform. Every EOS tool.
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
            Free forever for small teams. Upgrade when you need full EOS tools.
            14-day free trial on all paid plans.
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="mt-10 flex justify-center">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-black" />
              <span className="text-sm font-medium text-gray-700">
                Free forever plan
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-black" />
              <span className="text-sm font-medium text-gray-700">
                14-day free trial
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-black" />
              <span className="text-sm font-medium text-gray-700">
                Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24">
        <PricingCards plans={plans} />
      </div>

      {/* Feature Comparison Table */}
      <div className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-black sm:text-4xl">
            Compare all features
          </h2>
          <p className="mt-4 text-center text-lg text-gray-600">
            Everything you need to run EOS like a pro
          </p>

          <div className="mt-12 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-black">
                      Feature
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-black">
                      Free
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-black bg-gray-100">
                      Team
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-black">
                      Business
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {FEATURE_CATEGORIES.map((category) => (
                    <>
                      <tr key={category.name} className="bg-gray-50">
                        <td
                          colSpan={4}
                          className="px-6 py-3 text-sm font-semibold text-black"
                        >
                          {category.name}
                        </td>
                      </tr>
                      {category.features.map((feature) => (
                        <tr key={feature.key}>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {feature.label}
                            <span className="ml-2 text-xs text-gray-400">
                              {feature.tooltip}
                            </span>
                          </td>
                          {[PLANS.free, PLANS.team, PLANS.business].map(
                            (plan) => (
                              <td
                                key={plan.id}
                                className={`px-6 py-4 text-center ${
                                  plan.id === "team" ? "bg-gray-50/50" : ""
                                }`}
                              >
                                {renderFeatureValue(plan, feature.key)}
                              </td>
                            )
                          )}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* AI Credit Add-ons */}
      <div className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
              Need more AI credits?
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Purchase additional AI credits for your team anytime.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-lg grid-cols-1 gap-6 sm:grid-cols-3 sm:max-w-none">
            {[
              { name: "500 Credits", price: "$10", credits: 500, link: AI_CREDIT_PAYMENT_LINKS.credits_500, savings: null },
              { name: "2,000 Credits", price: "$30", credits: 2000, link: AI_CREDIT_PAYMENT_LINKS.credits_2000, savings: "Save $10" },
              { name: "5,000 Credits", price: "$60", credits: 5000, link: AI_CREDIT_PAYMENT_LINKS.credits_5000, savings: "Save $40" },
            ].map((pack) => (
              <div key={pack.credits} className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
                <h3 className="text-lg font-semibold text-black">{pack.name}</h3>
                <p className="mt-2 text-3xl font-bold text-black">{pack.price}</p>
                <p className="mt-1 text-sm text-gray-500">one-time purchase</p>
                {pack.savings && (
                  <span className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                    {pack.savings}
                  </span>
                )}
                <Link
                  href={pack.link || "/app?page=register"}
                  className="mt-6 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-black hover:bg-gray-50 transition-colors"
                >
                  Buy Credits
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-black sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-center text-lg text-gray-600">
              Everything you need to know about Taskspace pricing
            </p>

            <dl className="mt-12 space-y-6">
              {faqs.map((faq, _index) => (
                <div
                  key={faq.question}
                  className="rounded-2xl border border-gray-200 bg-white p-8 hover:shadow-sm transition-shadow"
                >
                  <dt className="text-lg font-semibold leading-7 text-black">
                    {faq.question}
                  </dt>
                  <dd className="mt-3 text-base leading-7 text-gray-600">
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Bottom CTA Section */}
      <div className="bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
            Ready to run your teams in true parallel?
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Free forever for small teams. 14-day free trial on paid plans.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href={STRIPE_PAYMENT_LINKS.team?.monthly || "/pricing"}
              className="rounded-lg bg-black px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-900 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/contact"
              className="rounded-lg border border-gray-300 bg-white px-8 py-3.5 text-sm font-semibold text-black hover:bg-gray-100 transition-colors"
            >
              Contact Sales
            </Link>
          </div>
          <p className="text-gray-500 mt-6 text-sm">
            Free forever plan -- 14-day free trial on paid plans -- Cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
}

function renderFeatureValue(
  plan: PlanConfig,
  featureKey: string
): React.ReactNode {
  const features = plan.features as unknown as Record<string, unknown>
  const limits = plan.limits as unknown as Record<string, unknown>
  const value = features[featureKey] ?? limits[featureKey]

  if (typeof value === "boolean") {
    return value ? (
      <CheckIcon className="mx-auto h-5 w-5 text-black" />
    ) : (
      <XMarkIcon className="mx-auto h-5 w-5 text-gray-300" />
    )
  }

  if (
    featureKey === "maxUsers" ||
    featureKey === "maxWorkspaces" ||
    featureKey === "maxManagers"
  ) {
    return (
      <span className="text-sm font-medium text-black">
        {value === null ? "Unlimited" : String(value)}
      </span>
    )
  }

  if (featureKey === "aiCreditsPerUser") {
    return (
      <span className="text-sm font-medium text-black">
        {plan.features.unlimitedAI ? "Unlimited" : String(value)}
      </span>
    )
  }

  return <span className="text-sm text-gray-600">{String(value)}</span>
}
