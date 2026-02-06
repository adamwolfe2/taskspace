import type { Metadata } from "next"
import Link from "next/link"
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { PLANS, FEATURE_CATEGORIES, formatPrice, calculateYearlySavings, type PlanConfig } from "@/lib/billing/plans"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.trytaskspace.com"

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Pricing | Taskspace - Simple, Transparent Pricing for EOS Teams",
  description:
    "Choose the perfect Taskspace plan for your EOS team. Starter, Professional, and Enterprise tiers with AI-powered EOD reports, rocks tracking, scorecards, and L10 meetings. 14-day free trial, no credit card required.",
  openGraph: {
    title: "Pricing | Taskspace - Simple, Transparent Pricing",
    description:
      "Simple, transparent pricing for EOS teams. Start free, scale as you grow. Plans from $10/user/month.",
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
      "Yes! All plans include a 14-day free trial with no credit card required. You'll have full access to test all features and see if Taskspace is right for your team.",
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
      "Yes! Annual billing saves you 17-20% compared to monthly billing. For example, Professional is $16/user/month when billed annually vs $20/user/month when billed monthly.",
  },
  {
    question: "What counts as a user?",
    answer:
      "A user is anyone with an active account in your organization. This includes managers, team members, and admins. Deactivated users don't count toward your limit.",
  },
  {
    question: "Can I use Taskspace for multiple companies?",
    answer:
      "Yes! The Professional and Enterprise plans include unlimited workspaces, perfect for multi-company founders. Each workspace can represent a different company, department, or team.",
  },
]

export default function PricingPage() {
  const plans = [PLANS.starter, PLANS.professional, PLANS.enterprise]

  return (
    <div className="bg-white">
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
            Start with a 14-day free trial on any plan. No credit card required.
            Scale as your team grows.
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="mt-10 flex justify-center">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-black" />
              <span className="text-sm font-medium text-gray-700">
                14-day free trial
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-black" />
              <span className="text-sm font-medium text-gray-700">
                No credit card required
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
        <div className="mx-auto grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3 items-start">
          {plans.map((plan) => {
            const isPopular = plan.popular
            const isEnterprise = plan.id === "enterprise"

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-8 ${
                  isPopular
                    ? "bg-black text-white ring-2 ring-black shadow-2xl lg:scale-105 lg:z-10 lg:p-10"
                    : "bg-white text-black ring-1 ring-gray-200"
                }`}
              >
                {/* Most Popular Badge */}
                {plan.badge && isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="rounded-full bg-white text-black px-4 py-1.5 text-xs font-bold uppercase tracking-wide shadow-lg border border-gray-200">
                      Most Popular
                    </div>
                  </div>
                )}

                {plan.badge && !isPopular && (
                  <div className="mb-4 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    {plan.badge}
                  </div>
                )}

                <h3
                  className={`text-2xl font-bold ${
                    isPopular ? "text-white" : "text-black"
                  }`}
                >
                  {plan.name}
                </h3>

                <p
                  className={`mt-3 text-sm leading-6 ${
                    isPopular ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {plan.description}
                </p>

                <p className="mt-6 flex items-baseline gap-x-1">
                  <span
                    className={`text-5xl font-bold tracking-tight ${
                      isPopular ? "text-white" : "text-black"
                    }`}
                  >
                    {formatPrice(plan.priceYearly / 12)}
                  </span>
                  <span
                    className={`text-sm font-semibold leading-6 ${
                      isPopular ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    /user/month
                  </span>
                </p>

                <p
                  className={`mt-1 text-xs ${
                    isPopular ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {isEnterprise
                    ? "Minimum 20 seats, billed annually"
                    : "Billed annually"}
                </p>

                {calculateYearlySavings(plan) > 0 && (
                  <p
                    className={`mt-1 text-xs font-medium ${
                      isPopular ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Save {formatPrice(calculateYearlySavings(plan))}/user/year
                    vs monthly
                  </p>
                )}

                <Link
                  href={
                    isEnterprise ? "/contact" : "/app?page=register"
                  }
                  className={`mt-8 block w-full rounded-lg px-4 py-3.5 text-center text-sm font-semibold shadow-sm transition-colors ${
                    isPopular
                      ? "bg-white text-black hover:bg-gray-100"
                      : "bg-black text-white hover:bg-gray-800"
                  }`}
                >
                  {plan.cta}
                </Link>

                <ul
                  role="list"
                  className={`mt-8 space-y-3 text-sm leading-6 ${
                    isPopular ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  <li className="flex gap-x-3">
                    <CheckIcon
                      className={`h-6 w-5 flex-none ${
                        isPopular ? "text-white" : "text-black"
                      }`}
                    />
                    <span>
                      <strong
                        className={`font-semibold ${
                          isPopular ? "text-white" : "text-black"
                        }`}
                      >
                        {plan.limits.maxUsers === null
                          ? "Unlimited"
                          : plan.limits.maxUsers}
                      </strong>{" "}
                      users
                    </span>
                  </li>
                  <li className="flex gap-x-3">
                    <CheckIcon
                      className={`h-6 w-5 flex-none ${
                        isPopular ? "text-white" : "text-black"
                      }`}
                    />
                    <span>
                      <strong
                        className={`font-semibold ${
                          isPopular ? "text-white" : "text-black"
                        }`}
                      >
                        {plan.limits.maxWorkspaces === null
                          ? "Unlimited"
                          : plan.limits.maxWorkspaces}
                      </strong>{" "}
                      workspace{plan.limits.maxWorkspaces !== 1 ? "s" : ""}
                    </span>
                  </li>
                  <li className="flex gap-x-3">
                    <CheckIcon
                      className={`h-6 w-5 flex-none ${
                        isPopular ? "text-white" : "text-black"
                      }`}
                    />
                    <span>
                      <strong
                        className={`font-semibold ${
                          isPopular ? "text-white" : "text-black"
                        }`}
                      >
                        {plan.features.unlimitedAI
                          ? "Unlimited"
                          : plan.limits.aiCreditsPerUser}
                      </strong>{" "}
                      AI credits/user
                    </span>
                  </li>
                  <li className="flex gap-x-3">
                    <CheckIcon
                      className={`h-6 w-5 flex-none ${
                        isPopular ? "text-white" : "text-black"
                      }`}
                    />
                    <span>{plan.features.responseTime} support</span>
                  </li>
                  {plan.features.asanaSync && (
                    <li className="flex gap-x-3">
                      <CheckIcon
                        className={`h-6 w-5 flex-none ${
                          isPopular ? "text-white" : "text-black"
                        }`}
                      />
                      <span>Asana & Google Calendar sync</span>
                    </li>
                  )}
                  {plan.features.customBranding && (
                    <li className="flex gap-x-3">
                      <CheckIcon
                        className={`h-6 w-5 flex-none ${
                          isPopular ? "text-white" : "text-black"
                        }`}
                      />
                      <span>Custom branding & API access</span>
                    </li>
                  )}
                  {plan.features.ssoAuth && (
                    <li className="flex gap-x-3">
                      <CheckIcon
                        className={`h-6 w-5 flex-none ${
                          isPopular ? "text-white" : "text-black"
                        }`}
                      />
                      <span>SSO/SAML & dedicated support</span>
                    </li>
                  )}
                </ul>
              </div>
            )
          })}
        </div>
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
                      Starter
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-black bg-gray-100">
                      Professional
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-black">
                      Enterprise
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
                          {[PLANS.starter, PLANS.professional, PLANS.enterprise].map(
                            (plan) => (
                              <td
                                key={plan.id}
                                className={`px-6 py-4 text-center ${
                                  plan.id === "professional" ? "bg-gray-50/50" : ""
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

      {/* FAQ Section */}
      <div className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-black sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-center text-lg text-gray-600">
              Everything you need to know about Taskspace pricing
            </p>

            <dl className="mt-12 space-y-6">
              {faqs.map((faq, index) => (
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
      <div className="bg-black py-24">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to run your teams in true parallel?
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Start your 14-day free trial today. No credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/app?page=register"
              className="rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-black shadow-sm hover:bg-gray-100 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/contact"
              className="rounded-lg border border-gray-600 bg-transparent px-8 py-3.5 text-sm font-semibold text-white hover:bg-gray-900 transition-colors"
            >
              Contact Sales
            </Link>
          </div>
          <p className="text-gray-500 mt-6 text-sm">
            Join 500+ teams already running on EOS with Taskspace
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
