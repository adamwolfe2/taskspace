import type { Metadata } from "next"
import Link from "next/link"
import { CheckIcon, XMarkIcon, SparklesIcon, RocketLaunchIcon, BuildingOffice2Icon } from "@heroicons/react/24/outline"
import { PLANS, FEATURE_CATEGORIES, formatPrice, calculateYearlySavings } from "@/lib/billing/plans"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.trytaskspace.com"

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Pricing | Taskspace - Simple, Transparent Pricing for EOS Teams",
  description: "Choose the perfect plan for your team. From startups to enterprise, Taskspace scales with you. 14-day free trial, no credit card required.",
  openGraph: {
    title: "Pricing | Taskspace",
    description: "Simple, transparent pricing for EOS teams. Start free, scale as you grow.",
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
    description: "Simple, transparent pricing for EOS teams.",
    images: [`${APP_URL}/2026-02-03_17.24.49.png`],
  },
}

const faqs = [
  {
    question: "Can I try Taskspace before paying?",
    answer: "Yes! All plans include a 14-day free trial with no credit card required. You'll have full access to test all features and see if Taskspace is right for your team.",
  },
  {
    question: "What happens when I hit my AI credit limit?",
    answer: "You'll receive a notification when you're approaching your limit. You can either upgrade to a higher plan for more credits, purchase add-on credit packs, or wait until your credits reset at the start of your next billing cycle.",
  },
  {
    question: "Can I change plans later?",
    answer: "Absolutely! You can upgrade or downgrade your plan at any time. Upgrades take effect immediately, and downgrades take effect at the end of your current billing period. We'll prorate any differences.",
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer: "Yes! Annual billing saves you 17-20% compared to monthly billing. For example, Professional is $16/user/month when billed annually vs $20/user/month when billed monthly.",
  },
  {
    question: "What counts as a user?",
    answer: "A user is anyone with an active account in your organization. This includes managers, team members, and admin. Deactivated users don't count toward your limit.",
  },
  {
    question: "Can I use Taskspace for multiple companies?",
    answer: "Yes! The Professional and Enterprise plans include unlimited workspaces, perfect for multi-company founders. Each workspace can represent a different company, department, or team.",
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We use bank-level encryption (AES-256), secure database access, and regular backups. Enterprise plans include SSO, custom security policies, and dedicated support.",
  },
  {
    question: "What integrations are included?",
    answer: "All plans include Slack notifications. Professional+ includes Asana sync and Google Calendar integration. Enterprise includes everything plus SSO/SAML and custom integrations.",
  },
]

const trustLogos = [
  { name: "Asana", icon: "🎯" },
  { name: "Slack", icon: "💬" },
  { name: "Google", icon: "📅" },
  { name: "Stripe", icon: "💳" },
]

export default function PricingPage() {
  const plans = [PLANS.starter, PLANS.professional, PLANS.enterprise]

  return (
    <div className="bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-base font-semibold leading-7 text-blue-600">Pricing</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Choose the perfect plan for your team. Start with a 14-day free trial, then scale as you grow.
            No surprises, no hidden fees.
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 flex justify-center">
          <div className="flex flex-wrap justify-center gap-8 text-gray-400">
            <div className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            <button className="rounded-md bg-white px-6 py-2 text-sm font-semibold text-gray-900 shadow-sm">
              Annual <span className="ml-1 text-green-600">(Save 20%)</span>
            </button>
            <button className="rounded-md px-6 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
              Monthly
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-3xl p-8 ring-1 ${
                plan.popular
                  ? "bg-white ring-2 ring-blue-600 shadow-2xl"
                  : "bg-white ring-gray-200"
              }`}
            >
              {plan.badge && (
                <div className="mb-4 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                  {plan.badge}
                </div>
              )}

              <div className="flex items-center gap-x-4">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                {plan.id === "starter" && <SparklesIcon className="h-6 w-6 text-blue-600" />}
                {plan.id === "professional" && <RocketLaunchIcon className="h-6 w-6 text-blue-600" />}
                {plan.id === "enterprise" && <BuildingOffice2Icon className="h-6 w-6 text-blue-600" />}
              </div>

              <p className="mt-4 text-sm leading-6 text-gray-600">{plan.description}</p>

              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-5xl font-bold tracking-tight text-gray-900">
                  {formatPrice(plan.priceYearly / 12)}
                </span>
                <span className="text-sm font-semibold leading-6 text-gray-600">/user/month</span>
              </p>

              <p className="mt-2 text-xs text-gray-500">
                {plan.id !== "enterprise" ? "Billed annually" : "Minimum 20 seats, annual only"}
              </p>

              {calculateYearlySavings(plan) > 0 && (
                <p className="mt-1 text-xs font-medium text-green-600">
                  Save {formatPrice(calculateYearlySavings(plan))}/year
                </p>
              )}

              <Link
                href={plan.id === "enterprise" ? "/contact" : "/auth/register"}
                className={`mt-6 block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold shadow-sm transition-colors ${
                  plan.popular
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-900 text-white hover:bg-gray-800"
                }`}
              >
                {plan.cta}
              </Link>

              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                <li className="flex gap-x-3">
                  <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                  <span>
                    <strong className="font-semibold text-gray-900">
                      {plan.limits.maxUsers === null ? "Unlimited" : plan.limits.maxUsers}
                    </strong>{" "}
                    users
                  </span>
                </li>
                <li className="flex gap-x-3">
                  <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                  <span>
                    <strong className="font-semibold text-gray-900">
                      {plan.limits.maxWorkspaces === null ? "Unlimited" : plan.limits.maxWorkspaces}
                    </strong>{" "}
                    workspace{plan.limits.maxWorkspaces !== 1 ? "s" : ""}
                  </span>
                </li>
                <li className="flex gap-x-3">
                  <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                  <span>
                    <strong className="font-semibold text-gray-900">
                      {plan.features.unlimitedAI ? "Unlimited" : plan.limits.aiCreditsPerUser}
                    </strong>{" "}
                    AI credits/user
                  </span>
                </li>
                <li className="flex gap-x-3">
                  <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                  <span>{plan.features.responseTime} support</span>
                </li>
                {plan.features.asanaSync && (
                  <li className="flex gap-x-3">
                    <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                    <span>Asana & Google Calendar sync</span>
                  </li>
                )}
                {plan.features.customBranding && (
                  <li className="flex gap-x-3">
                    <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                    <span>Custom branding & API access</span>
                  </li>
                )}
                {plan.features.ssoAuth && (
                  <li className="flex gap-x-3">
                    <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                    <span>SSO/SAML & dedicated support</span>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-24">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Compare all features
          </h2>
          <p className="mt-4 text-center text-lg text-gray-600">
            Everything you need to run EOS like a pro
          </p>

          <div className="mt-12 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Feature</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Starter</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Professional</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {FEATURE_CATEGORIES.map((category) => (
                    <>
                      <tr key={category.name} className="bg-gray-50">
                        <td colSpan={4} className="px-6 py-3 text-sm font-semibold text-gray-900">
                          {category.name}
                        </td>
                      </tr>
                      {category.features.map((feature) => (
                        <tr key={feature.key}>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {feature.label}
                            <span className="ml-2 text-xs text-gray-500">{feature.tooltip}</span>
                          </td>
                          {plans.map((plan) => (
                            <td key={plan.id} className="px-6 py-4 text-center">
                              {renderFeatureValue(plan, feature.key)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Integration Logos (like agents page) */}
        <div className="mt-24">
          <h3 className="text-center text-lg font-semibold text-gray-900">Integrates with your favorite tools</h3>
          <div className="mt-8 flex flex-wrap justify-center gap-8 grayscale hover:grayscale-0 transition-all">
            {trustLogos.map((logo) => (
              <div key={logo.name} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-4 shadow-sm">
                <span className="text-3xl">{logo.icon}</span>
                <span className="text-sm font-medium text-gray-700">{logo.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-32">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Frequently asked questions
          </h2>
          <dl className="mx-auto mt-12 max-w-4xl space-y-8">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-gray-200 bg-white p-8">
                <dt className="text-lg font-semibold leading-7 text-gray-900">{faq.question}</dt>
                <dd className="mt-3 text-base leading-7 text-gray-600">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* CTA Section */}
        <div className="mt-32 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Ready to run your teams in true parallel?
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Start your 14-day free trial today. No credit card required.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/auth/register"
              className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Start Free Trial
            </Link>
            <Link
              href="/contact"
              className="rounded-lg border border-gray-300 bg-white px-8 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function renderFeatureValue(plan: any, featureKey: string): React.ReactNode {
  const value = plan.features[featureKey] || plan.limits[featureKey]

  if (typeof value === "boolean") {
    return value ? (
      <CheckIcon className="mx-auto h-5 w-5 text-green-600" />
    ) : (
      <XMarkIcon className="mx-auto h-5 w-5 text-gray-300" />
    )
  }

  if (featureKey === "maxUsers" || featureKey === "maxWorkspaces" || featureKey === "maxManagers") {
    return (
      <span className="text-sm font-medium text-gray-900">
        {value === null ? "Unlimited" : value}
      </span>
    )
  }

  if (featureKey === "aiCreditsPerUser") {
    return (
      <span className="text-sm font-medium text-gray-900">
        {plan.features.unlimitedAI ? "Unlimited" : value}
      </span>
    )
  }

  return <span className="text-sm text-gray-600">{value}</span>
}
